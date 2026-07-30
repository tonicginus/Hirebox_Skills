---
name: hirebox-candidate-resume
description: Generate a Hirebox candidate resume from any uploaded original candidate resume file such as PDF, DOCX, image, spreadsheet, or pasted text. Use when the user asks to standardize a candidate resume in the Hirebox format, produce DOCX/PDF candidate resume deliverables, or run the Hirebox resume fact-consistency check.
---

# Hirebox Candidate Resume

## Objective

Create a polished Hirebox candidate resume from one candidate's original resume. The final deliverables are:

1. A content consistency check report.
2. A Word `.docx` candidate resume that includes the candidate's contact information.
3. A PDF candidate resume that does not include the candidate's contact information.

The governing rule is: **only use facts supported by the original resume**. The Hirebox template controls style and organization only; it must not delete resume facts merely because the fixed template lacks a matching section, and it must not add unsupported content.

## Required Inputs

- Candidate original resume in any practical format: PDF, DOCX, PNG/JPG screenshot, XLSX, TXT, Markdown, or pasted text.
- Hirebox logo if supplied. If not supplied, use an explicitly available Hirebox logo from the current workspace only when clearly present.

Optional:

- Output folder or filename preference.
- Whether to suppress contact information in both versions. Default is Word includes contact information and PDF excludes it.

## Interaction Mode

- Support interactive use. If the user invokes this skill or the `/hirebox-candidate-resume` command with an uploaded resume file or an explicit resume file path, start the full workflow automatically.
- If the user only invokes the skill/command without attaching or identifying a candidate resume, do not start extraction or create placeholder files. Ask exactly: `请上传候选人简历文件`.
- If multiple candidate resume files are present and the intended one is ambiguous, ask a brief clarification before processing.

## Output Naming

Use candidate-name-based filenames when the name is known:

- Check report: `<候选人姓名>_内容一致性校验报告.md`
- Word with contact information: `<候选人姓名>_海钡人力候选人简历_含联系方式.docx`
- PDF without contact information: `<候选人姓名>_海钡人力候选人简历.pdf`

Do not include `无联系方式` or similar wording in the PDF filename. The PDF content still must exclude contact information.

Do not leave intermediate files as deliverables. If a no-contact DOCX is needed only as the PDF export source, treat it as a temporary internal file and delete it after the PDF is successfully exported. Do not return or preserve files named with `PDF源`, `无联系方式`, or similar internal wording unless PDF export fails and the temporary file is needed for troubleshooting.

## Workflow

### 1. Extract Source Facts

Use the most reliable local extractor available:

- PDF: `pypdf`, PyMuPDF/`fitz`, `pdfplumber`, OCR when needed.
- DOCX: `python-docx`.
- Image: visual inspection and OCR if available; when OCR is weak, manually read from the image.
- XLSX: `openpyxl`.
- Text/Markdown: direct parsing.

Preserve a source-fact map with:

- Basic information: name, alternate name, gender, age/birth year, location, nationality, marital status, education, languages.
- Contact information: phone, email, WeChat/Line/WhatsApp, address. Keep this separate for Word/PDF handling.
- Summary/profile facts.
- Work history: dates, company, industry, position, responsibilities, achievements, tools, stakeholders.
- Education and training.
- Certificates.
- Skills/tools/languages.
- Other original sections such as hobbies, personal strengths, awards, projects, publications, self-evaluation.

If extraction has uncertainty, mark it as `待核验` or omit it from polished claims. Do not silently guess.

### 2. Analyze and Refine

Condense the resume into concise, client-readable Chinese while keeping factual alignment:

- Remove repetition and merge overlapping statements.
- Keep original quantitative results and dates exactly unless formatting is normalized.
- Reframe long task lists into compact responsibility/result statements.
- Add section headings dynamically when the source resume contains content that should be retained, such as `其他信息`, `个人爱好`, `证书`, `培训经历`, or `代表项目`.
- Do not add recommendation language, interview advice, consultant opinions, fit scores, or job-match analysis unless explicitly requested.
- Do not infer degree level, years of experience, management scope, language fluency, or job seniority unless the original resume states or directly supports it.
- Candidate-facing resume deliverables must not expose process/source wording such as `原简历`, `原始简历`, `基于原始简历`, `未列明`, `待补充`, or phrases like `基于原始简历提炼，去除重复描述，突出可转化价值`. Use polished, outward-facing wording only. If a date or field is absent, prefer `/` in tables; otherwise omit the field when omission does not remove a meaningful resume fact. Use `待核验` only when the uncertainty itself must be shown.

### 3. Generate the Hirebox-Style DOCX

Use the Hirebox visual style:

- Header contains the Hirebox logo aligned right.
- Do not place another Hirebox logo inside the resume body.
- Title: `海钡人力候选人简历`.
- Subtitle: `Hirebox Candidate Profile`.
- Use a clean blue/navy Hirebox palette, concise badge row, section titles, tables, and bullets.
- Do not include visible instructions, placeholders, or template-only text in candidate deliverables.
- Do not include a consultant summary, 顾问建议, 推荐结论, 说明, or confidentiality note inside the body unless the user asks.
- Do not include process notes in the resume body. Section subtitles should be candidate-facing, such as `核心经历与能力概览`; otherwise omit subtitles.

Recommended base sections, adjusted to actual source facts:

1. 候选人概览
2. 履历摘要
3. 核心能力画像
4. 工作经历
5. 代表项目/代表业务场景 if source supports it
6. 教育背景
7. 证书与培训 if source supports it
8. 工具与专业技能
9. 其他信息 if source supports it

The Word version must include contact information if it existed in the original resume. Prefer a controlled row/section such as `联系方式` in 候选人概览 or a separate compact section.

### 4. Internal Consistency Check

Before exporting PDF, compare the generated resume against the source-fact map. Produce a check report with:

- `总体结论`: pass/fail or pass with minor issues.
- `事实一致性`: unsupported additions, softened/changed meanings, wrong dates/names/companies.
- `遗漏检查`: source sections or key facts omitted; explain if intentionally suppressed, e.g. contact info from PDF.
- `表达精炼`: whether text is concise without distorting facts.
- `版本处理`: Word includes contacts, PDF excludes contacts.
- `修订记录`: issues found and how they were fixed.

If the check finds issues, revise the DOCX content and run the check again. Continue until no material issue remains or clearly explain any unresolved uncertainty.

### 5. Export PDF Without Contact Information

After the check passes:

1. Create a temporary PDF-safe version of the resume with contact information removed only if needed for export.
2. Export that no-contact version to PDF.
3. Ensure the Word final version contains contact information again.
4. After the PDF is successfully created and verified, delete the temporary no-contact/PDF-source DOCX. The final deliverables must remain only the check report, the Word resume with contact information, and the PDF resume without contact information.

Use Microsoft Word COM automation on Windows when available for highest layout fidelity. If Word export fails, try LibreOffice/soffice. If neither is available, report the blocker and still provide the DOCX and check report.

### 6. Final Deliverables

Return links to:

- Content check report, preferably `.md` or `.docx`.
- Final Word resume with contact information.
- Final PDF resume without contact information.

Mention any extraction uncertainty briefly. Do not ask the user to copy/save files; the user shares the same filesystem.

## Reusable Script

Prefer using or adapting `scripts/hirebox_resume_builder.py` to create DOCX files with consistent styling. The script expects candidate data to be prepared by Codex after source extraction and analysis; it does not replace the source-fact consistency judgment.

Read `references/fact_check_rules.md` when writing the check report or when deciding whether a statement is supported by the original resume.
