---
name: hirebox-project-quotation
description: Generate bilingual Hirebox project-wide commercial quotations from one or more service quotes, using the retained branded Word template. Use when the user asks to combine EOR, recruitment, visa, BPO, payroll, outsourcing, or other service modules into one integrated quotation with a consolidated summary and independently separated project appendices, delivered as DOCX and PDF.
---

# 海钡人力项目全案报价

Use `assets/reference.docx` as the visual and structural template. This asset is a de-identified, compact version of the retained quotation layout: it contains no customer name, project name, date, or customer-specific prices. Never treat its placeholder rows as commercial defaults.

## Required input

Collect only missing critical fields; do not invent customer facts, scope, prices, dates, taxes, or approval outcomes.

- Client name and project name.
- Quotation date, currency, validity period, and tax treatment when applicable.
- One or more service modules. For each module capture: module name, in-scope services, deliverables, exclusions, price, pricing unit, payment milestone, term/schedule, assumptions, third-party costs, and source quotation or note.
- Whether module prices are additive. If they are not comparable or are alternatives, label them as options and do not sum them.
- Signatory/issuer details only when the user asks to change the retained HireBox issuer/footer.

For a structured payload, use `references/input-schema.md` and validate it with `scripts/validate_quote_payload.py`.

## Output contract

Produce one integrated quotation package by default:

1. Main quotation: a concise bilingual project overview, client/project metadata, one summary row per service module, total/subtotal only when mathematically valid, shared commercial terms, and a clear note distinguishing included, excluded, and third-party services.
2. Project appendices: one independently segmented appendix per module. Each appendix contains that module's detailed pricing rule, scope, deliverables, assumptions, payment terms, and exceptions. Start each appendix on a deliberate page break; do not allow a table header to be stranded at the bottom of the previous page.
3. Deliver both `.docx` and `.pdf` with the same descriptive filename. If the user explicitly requests separately downloadable attachments, also split the appendices into separate files without changing their wording or amounts.

Suggested filename:
`海钡人力_{客户名}_{项目名}_全案报价单.docx` and `.pdf`.

## Workflow

### 1. Normalize and reconcile service quotes

- Preserve each source module's wording, amount, unit, and payment trigger unless the user asks for a change.
- Separate service delivery, client responsibilities, exclusions, and third-party referrals.
- Detect duplicate or overlapping modules. Keep them separate when they have different commercial rules; mark alternatives instead of silently adding them.
- Build a single module register before editing the document. The register is the source of truth for the summary and every appendix.

### 2. Populate the retained template

- Copy `assets/reference.docx` to the output path; never overwrite the asset.
- Replace all generic headings, module rows, date placeholders, and placeholder amounts with the current request.
- Keep the Hirebox logo, bilingual hierarchy, table widths, footer, colors, and established typography.
- Remove every template placeholder and any leftover customer/project information before delivery.

### 3. Compose the integrated summary

- Use one clear row per service module with: module name, short scope/deliverable summary, price/unit, and payment milestone.
- Show `小计 / Subtotal` per pricing group and `合计 / Grand Total` only when the modules are additive and share a currency/unit basis.
- For alternatives, show `方案 A / Option A`, `方案 B / Option B`, etc., and state that the options are not cumulative.
- Keep detailed rules out of the summary table; move them to the corresponding appendix.

### 4. Compose independent appendices

- Label appendices sequentially (`附件 A`, `附件 B`, ...), matching the module register exactly.
- Give each appendix its own bilingual heading, detailed table, service boundaries, assumptions, price/payment rule, and third-party-cost note.
- Insert a page break before each appendix. Keep a complete table row together when it fits; remove unnecessary `keep with next` or page-break settings that create avoidable whitespace.
- If a module is too large for one page, repeat the table header and split only between logical rows.

### 5. Verify and export

- Reopen the saved DOCX and check headings, all module names, amounts, currencies, payment triggers, dates, totals, exclusions, and appendix order.
- Confirm that source customer names, old project names, old dates, old prices, and placeholders are absent.
- Render every DOCX page to PNG using the document rendering workflow when available. Inspect for clipping, overlap, broken tables, orphaned headers, excessive gaps, blank pages, and footer/header drift.
- Export the PDF with the available Word or LibreOffice path. Render every PDF page and inspect it independently. Do not claim visual verification when only structural extraction was possible.
- Keep only final deliverables in the requested output directory; remove previews and temporary files.

## Commercial safety rules

- Never infer a total from incompatible currencies, units, periods, or alternative options.
- Never copy one customer's prices, dates, role names, or responsibilities into another quotation.
- Treat prices, schedules, prepayment, transfer fees, taxes, validity, and service boundaries as critical fields requiring exact verification.
- Preserve separate BPO, agency recruitment, EOR, visa, payroll, and referral rules when their responsibilities or fee triggers differ.

## Bundled resources

- `assets/reference.docx`: de-identified branded Word template.
- `references/input-schema.md`: payload fields and a worked multi-module example.
- `scripts/validate_quote_payload.py`: deterministic preflight validation for structured quote inputs.
