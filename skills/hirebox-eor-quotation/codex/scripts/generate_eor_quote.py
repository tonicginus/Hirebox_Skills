from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

from lxml import etree


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"
CORE_NS = {
    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dcterms": "http://purl.org/dc/terms/",
    "xsi": "http://www.w3.org/2001/XMLSchema-instance",
}


def w(tag: str) -> str:
    return f"{{{W_NS}}}{tag}"


def node_text(node) -> str:
    return "".join(node.xpath(".//w:t/text()", namespaces=NS))


def set_paragraph_text(paragraph, text: str) -> None:
    text_nodes = paragraph.xpath(".//w:t", namespaces=NS)
    if not text_nodes:
        run = etree.SubElement(paragraph, w("r"))
        text_nodes = [etree.SubElement(run, w("t"))]
    text_nodes[0].text = text
    text_nodes[0].set(XML_SPACE, "preserve")
    for node in text_nodes[1:]:
        node.text = ""


def set_cell_lines(cell, lines: list[str]) -> None:
    paragraphs = cell.xpath("./w:p", namespaces=NS)
    if len(paragraphs) < len(lines):
        raise ValueError("Template cell does not contain enough styled paragraphs")
    for index, paragraph in enumerate(paragraphs):
        set_paragraph_text(paragraph, lines[index] if index < len(lines) else "")


def body_paragraph(root, prefix: str):
    body = root.find("w:body", NS)
    for paragraph in body.findall("w:p", NS):
        if node_text(paragraph).strip().startswith(prefix):
            return paragraph
    raise ValueError(f"Template paragraph not found: {prefix}")


def rows(table):
    return table.xpath("./w:tr", namespaces=NS)


def cells(row):
    return row.xpath("./w:tc", namespaces=NS)


def table_by_first_cell(root, prefix: str):
    for table in root.xpath("/w:document/w:body/w:tbl", namespaces=NS):
        table_rows = rows(table)
        if table_rows:
            first_cells = cells(table_rows[0])
            if first_cells and node_text(first_cells[0]).strip().startswith(prefix):
                return table
    raise ValueError(f"Template table not found: {prefix}")


def set_core_text(root, prefix: str, local: str, text: str) -> None:
    node = root.find(f"{prefix}:{local}", CORE_NS)
    if node is None:
        node = etree.SubElement(root, f"{{{CORE_NS[prefix]}}}{local}")
    node.text = text


def parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("quotation date must be YYYY-MM-DD") from exc


def parse_money(value: str) -> Decimal:
    try:
        amount = Decimal(value.replace(",", ""))
    except InvalidOperation as exc:
        raise argparse.ArgumentTypeError("fixed monthly remuneration must be a number") from exc
    if amount <= 0:
        raise argparse.ArgumentTypeError("fixed monthly remuneration must be greater than zero")
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    rounded = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if rounded == rounded.to_integral():
        return f"{int(rounded):,}"
    return f"{rounded:,.2f}"


def safe_filename(value: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value).strip(" .")
    return cleaned[:120] or "Hirebox_EOR_Quotation"


def locate_soffice() -> str:
    for candidate in ("soffice", "libreoffice"):
        found = shutil.which(candidate)
        if found:
            return found
    if os.name == "nt":
        for candidate in (
            Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "LibreOffice/program/soffice.com",
            Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "LibreOffice/program/soffice.exe",
            Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "LibreOffice/program/soffice.com",
        ):
            if candidate.exists():
                return str(candidate)
    raise RuntimeError("LibreOffice soffice was not found; PDF generation is unavailable")


def export_pdf(docx_path: Path, output_dir: Path) -> Path:
    soffice = locate_soffice()
    profile = Path(tempfile.mkdtemp(prefix="hirebox_eor_lo_"))
    try:
        command = [
            soffice,
            f"-env:UserInstallation={profile.resolve().as_uri()}",
            "--headless",
            "--nologo",
            "--nodefault",
            "--norestore",
            "--nolockcheck",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            str(output_dir),
            str(docx_path),
        ]
        env = os.environ.copy()
        env["SAL_DISABLE_OPENCL"] = "1"
        env["SAL_ENABLESKIA"] = "0"
        result = subprocess.run(command, capture_output=True, text=True, timeout=60, env=env)
        pdf_path = output_dir / f"{docx_path.stem}.pdf"
        if result.returncode != 0 or not pdf_path.exists() or pdf_path.stat().st_size == 0:
            raise RuntimeError(
                "LibreOffice PDF export failed: "
                + (result.stderr.strip() or result.stdout.strip() or f"exit {result.returncode}")
            )
        return pdf_path
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def generate(args) -> tuple[Path, Path]:
    template = Path(args.template).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    project_name = args.project_name or f"{args.position} EOR 雇佣管理项目"
    quotation_date = args.quotation_date
    fixed = args.fixed_monthly_remuneration_thb
    management_fee = fixed * Decimal("0.15")
    deposit_amounts = {m: fixed * Decimal(m) for m in (2, 3, 5, 8, 10, 12, 16)}
    output_name = safe_filename(args.output_name or f"海钡人力_{args.client_name}_{args.position}_EOR服务报价单")
    docx_path = output_dir / f"{output_name}.docx"

    with zipfile.ZipFile(template, "r") as zin:
        document_root = etree.fromstring(zin.read("word/document.xml"))
        metadata = table_by_first_cell(document_root, "客户名称")
        metadata_rows = rows(metadata)
        set_cell_lines(cells(metadata_rows[0])[1], [args.client_name])
        set_cell_lines(cells(metadata_rows[1])[1], [project_name])
        chinese_date = f"{quotation_date.year}年{quotation_date.month}月{quotation_date.day}日"
        english_date = quotation_date.strftime("%-d %B %Y") if os.name != "nt" else quotation_date.strftime("%#d %B %Y")
        set_cell_lines(cells(metadata_rows[3])[1], [f"{chinese_date} / {english_date}"])

        employment = table_by_first_cell(document_root, "雇佣岗位")
        employment_rows = rows(employment)
        set_cell_lines(cells(employment_rows[0])[1], [args.position])
        set_cell_lines(cells(employment_rows[1])[1], [str(args.headcount)])
        set_cell_lines(cells(employment_rows[2])[1], [args.work_location])
        set_cell_lines(cells(employment_rows[3])[1], [
            f"THB {money(fixed)} / 人 / 月",
            f"THB {money(fixed)} per employee per month",
        ])
        set_cell_lines(cells(employment_rows[4])[1], [
            f"EOR 管理费：THB {money(management_fee)} / 人 / 月（15% x F，未税）；工资及法定雇主成本按实结算。",
            f"首期保证金：THB {money(deposit_amounts[2])}（2 x F，可退还）；员工业务费用按实结算，除另有书面约定外不加收 15% 管理费。",
            f"Monthly EOR management fee: THB {money(management_fee)} per employee per month (15% x F, before tax); payroll and statutory employer costs are settled at actual cost.",
            f"Initial deposit: THB {money(deposit_amounts[2])} (2 x F, refundable); employee business expenses are settled at actual cost without the 15% management fee unless otherwise agreed in writing.",
        ])

        signing = body_paragraph(document_root, "签署日期 / Date:")
        set_paragraph_text(signing, f"签署日期 / Date:   {quotation_date.year}.{quotation_date.month}.{quotation_date.day}")
        eor_heading = body_paragraph(document_root, "雇佣管理（EOR）服务报价")
        forced_break = eor_heading.find("w:pPr/w:pageBreakBefore", NS)
        if forced_break is not None:
            forced_break.getparent().remove(forced_break)

        fee_table = table_by_first_cell(document_root, "固定月薪酬 F")
        fee_rows = rows(fee_table)
        set_cell_lines(cells(fee_rows[1])[1], [
            f"15% x F = THB {money(management_fee)} / 人 / 月（未税）。",
            f"15% x F = THB {money(management_fee)} per employee per month before tax.",
        ])

        deposit_table = table_by_first_cell(document_root, "连续工龄")
        deposit_rows = rows(deposit_table)
        for row_index, multiplier in enumerate((2, 3, 5, 8, 10, 12, 16), start=1):
            target_cell = cells(deposit_rows[row_index])[2]
            existing = target_cell.xpath("./w:p", namespaces=NS)
            suffix = [node_text(p) for p in existing[1:] if node_text(p).strip()]
            lines = [f"{multiplier} x F = THB {money(deposit_amounts[multiplier])}"] + suffix
            set_cell_lines(target_cell, lines)

        core_root = etree.fromstring(zin.read("docProps/core.xml"))
        title = f"{args.client_name} {args.position} EOR 服务报价单"
        set_core_text(core_root, "dc", "title", title)
        set_core_text(core_root, "dc", "subject", "Hirebox Employer of Record Service Quotation")
        set_core_text(core_root, "dc", "creator", "HIREBOX CO., LTD.")
        set_core_text(core_root, "dc", "description", project_name)
        set_core_text(core_root, "cp", "lastModifiedBy", "HIREBOX CO., LTD.")
        modified = core_root.find("dcterms:modified", CORE_NS)
        if modified is not None:
            modified.text = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

        replacements = {
            "word/document.xml": etree.tostring(document_root, xml_declaration=True, encoding="UTF-8", standalone=True),
            "docProps/core.xml": etree.tostring(core_root, xml_declaration=True, encoding="UTF-8", standalone=True),
        }
        temp_docx = output_dir / f".{output_name}.{uuid.uuid4().hex}.tmp.docx"
        try:
            with zipfile.ZipFile(temp_docx, "w") as zout:
                for info in zin.infolist():
                    zout.writestr(info, replacements.get(info.filename, zin.read(info.filename)))
            with zipfile.ZipFile(temp_docx, "r") as check:
                if check.testzip() is not None:
                    raise RuntimeError("Generated DOCX package is corrupt")
            os.replace(temp_docx, docx_path)
        finally:
            temp_docx.unlink(missing_ok=True)

    pdf_path = export_pdf(docx_path, output_dir)
    return docx_path, pdf_path


def build_parser() -> argparse.ArgumentParser:
    script_dir = Path(__file__).resolve().parent
    skill_template = script_dir.parent / "assets" / "reference.docx"
    project_template = script_dir.parent / "outputs" / "海钡人力_雇佣管理EOR服务报价单模板.docx"
    default_template = skill_template if skill_template.is_file() else project_template
    parser = argparse.ArgumentParser(description="Generate Hirebox EOR quotation DOCX and PDF files")
    parser.add_argument("--client-name", required=True)
    parser.add_argument("--project-name")
    parser.add_argument("--position", required=True)
    parser.add_argument("--headcount", required=True, type=int)
    parser.add_argument("--work-location", required=True)
    parser.add_argument("--fixed-monthly-remuneration-thb", required=True, type=parse_money)
    parser.add_argument("--quotation-date", required=True, type=parse_date)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--output-name")
    parser.add_argument("--template", default=str(default_template))
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.headcount <= 0:
        raise SystemExit("headcount must be greater than zero")
    docx_path, pdf_path = generate(args)
    print(json.dumps({"docx": str(docx_path), "pdf": str(pdf_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
