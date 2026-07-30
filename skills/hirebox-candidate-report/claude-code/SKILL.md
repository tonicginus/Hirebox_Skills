---
name: hirebox-candidate-report
description: "Create professional Hirebox candidate recommendation reports from a client job requirement and a candidate resume. Use when the user asks to generate, revise, or standardize a candidate recommendation report based on two core inputs: customer position requirements and candidate resume, especially for finance, tax, audit, consulting, manufacturing, or cross-border roles."
---

# Hirebox Candidate Report

## Interactive Inputs

When the user invokes this skill without complete source materials, use an interactive supplement flow:

1. Prompt the user: `请上传岗位描述 JD` and accept text, DOCX, PDF, XLSX, screenshot, or pasted JD.
2. Prompt the user: `请上传候选人简历` and accept text, DOCX, PDF, XLSX, or screenshot.
3. After both source files are present, prompt the user to supplement hunter consultant information.
   - Required: consultant name.
   - Required: at least one contact method from phone, email, WeChat, Line, or another direct contact channel.
   - Optional: consultant title, company signature, service notes.

Do not produce the final report until the JD and resume are both available. If consultant information is missing after the user has provided the JD and resume, ask for it once. If the user explicitly asks to proceed without it, include only non-contact consultant placeholders and mark the missing consultant fields as `待补充`.

Required source inputs:

1. Client job requirement: text, DOCX, PDF, XLSX, screenshot, or pasted JD.
2. Candidate resume: text, DOCX, PDF, XLSX, or screenshot.

Optional inputs:

- Consultant name, phone, email, WeChat, title.
- Output format preference. Default to Word `.docx` plus exported `.pdf`.

The Hirebox logo is fixed to `assets/HIREBOX_LOGO_PNG.png` inside this skill. Do not ask the user for a logo. Use it only in the report page header. Do not place a large logo in the cover/body area.

Candidate contact information must be excluded from the report. Do not include candidate phone, email, WeChat, Line, address, or other direct contact fields, even if those details appear in the resume. It is acceptable to state that candidate contact details are handled separately by Hirebox outside the report.

## Core Workflow

1. Extract source facts from the job requirement and resume.
   - For XLSX use `openpyxl` when available.
   - For PDF use `pypdf`, `PyMuPDF`, or another reliable extractor when available.
   - For DOCX use `python-docx`.
   - If a dependency is missing and extraction is important, install/request approval according to the environment rules.
2. Build a factual evidence map.
   - Job side: company, location, title, reporting line, responsibilities, must-have requirements, preferred requirements, salary/benefits, hiring purpose.
   - Candidate side: education, certificates, industry background, roles, achievements, systems, language, projects, management scope, contact details.
3. Think like a senior headhunter, not a resume summarizer.
   - Explain why the candidate can help the client solve this role's business problem.
   - Translate experience into job-relevant value.
   - Identify gaps honestly and convert them into interview validation points or onboarding support suggestions.
4. Generate a polished, consistent report.
   - Produce `.docx` and export the final `.docx` to `.pdf` with a layout-faithful office converter.
   - For PDF export, use WPS Writer/Microsoft Word native export when available; if that fails, try LibreOffice/soffice. Do not create an image-rendered or separately laid-out PDF fallback because it will not match the Word layout.
   - Use the fixed Hirebox logo only in the page header.
   - Use tables for overview, match matrix, risks, and consultant information.
   - Keep tone professional, evidence-based, and client-facing.
5. Validate the output.
   - Confirm the file exists and can be opened/read by `python-docx`.
   - Check no duplicated header logos or footer text.
   - Check candidate and client names are correct.

## Report Standard

Use this section order unless the user asks otherwise:

1. Cover
   - No large logo in cover/body; the fixed Hirebox logo appears only in the page header.
   - Report title: `人才推荐报告 / Candidate Recommendation Report`.
   - Recommended role, candidate name, client company, report date, confidentiality note.
2. 顾问推荐结论
   - 1-2 paragraphs with decisive recommendation.
   - Include overall recommendation score or tier.
   - State whether to proceed, proceed with validation, or not recommend.
3. 候选人概览
   - Name, gender if known, location/city if relevant, education, certificates, current/last role, years of experience, representative companies.
   - Exclude all candidate contact information.
4. 岗位理解
   - Describe the role's real success factors beyond the pasted JD.
   - Mention business context, hiring difficulty, and likely hidden requirements.
5. 岗位匹配度矩阵
   - Columns: 岗位关键要求 / 匹配判断 / 事实依据与顾问判断.
   - Use clear judgments: 高度匹配, 部分匹配, 待验证, 不匹配.
6. 核心推荐理由
   - 4-6 bullets, each tied to role needs and resume facts.
7. 关键履历佐证
   - Use candidate's employment/project history as evidence.
8. 对客户的可落地价值
   - Explain how the candidate can create value after joining.
9. 匹配风险与补强建议
   - Never hide gaps.
   - For each gap include interview verification or onboarding mitigation.
10. 建议面试问题
   - Include role-specific case questions and motivation/stability questions.
11. 录用与入职建议
   - Include recommended interview flow, pre-onboarding material, first 30/60/90 day goals if useful.
12. 猎头顾问信息
   - Hirebox, consultant name, at least one consultant contact method, consultant role/title if provided, notes, service commitment.

## Writing Rules

- Write in Chinese unless the user asks otherwise.
- Do not invent facts. Mark unclear items as `待验证`.
- Distinguish resume evidence from consultant inference.
- Exclude all candidate contact details from the cover, overview, source summaries, tables, and final response.
- Avoid generic praise such as “综合素质优秀” unless supported by evidence.
- For gaps, use professional framing:
  - `简历未直接体现...`
  - `建议面试重点验证...`
  - `可通过...在入职前/前三个月补位...`
- For strong matches, connect the dots:
  - `岗位需要 X；候选人在 Y 场景中做过 Z，因此可转化为...`
- Use realistic scoring. Do not give 95+ unless nearly all must-haves are directly proven.
- If the role is sales-free but includes brand influence, describe professional content output, training, forums, and customer trust instead of sales performance.

## Reusable Builder

Use `scripts/report_builder.py` when producing a Word report. It expects a JSON payload containing:

- `output_path`
- `pdf_output_path` optional; defaults to the same path as `output_path` with `.pdf`
- `logo_path` optional; if omitted, the builder uses `assets/HIREBOX_LOGO_PNG.png`
- `cover`
- `score_cards`
- `sections`

Read `references/report_schema.md` only when you need the JSON schema or example payload.

The builder controls typography, tables, header/footer, duplicate-safe header/footer handling, fixed header logo placement, contact-field sanitization, and layout-faithful PDF export. Codex should still perform the professional analysis and write the report content.

## Validation Checklist

Before final response:

- Generated `.docx` exists.
- Exported `.pdf` exists and is produced by WPS Writer, Microsoft Word, or LibreOffice/soffice native conversion. If no layout-faithful converter is available, do not create a mismatched fallback PDF; state the blocker clearly.
- `python-docx` can load it.
- Header/footer are not duplicated.
- Fixed Hirebox logo appears in the page header only, not as a large cover/body logo.
- Logo is embedded if supplied.
- Job title, client company, candidate name, and report date are correct.
- No candidate phone, email, WeChat, Line, or other direct contact information appears in the report.
- Report includes recommendation conclusion, match matrix, risks, interview questions, and consultant information.
- Final response links the generated `.docx` and `.pdf` files with absolute local paths.
