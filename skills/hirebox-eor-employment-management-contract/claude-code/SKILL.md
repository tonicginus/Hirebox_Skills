---
name: hirebox-eor-employment-management-contract
description: "Create or revise a Hirebox Thai-Chinese employment-management (EOR) service contract. Use when the user selects this contract template, requests a Hirebox EOR employment-management contract, or invokes $hirebox-eor-employment-management-contract."
---

# Hirebox EOR Employment Management Contract

Create or revise a Thai-Chinese EOR contract from the maintained final template. Keep the retained reference unchanged during normal contract creation.

## Single authority and source selection

1. Read `artifact-template.json` and `assets/template-quality-gate.json` before drafting.
2. `多语言合同文本模板/海钡人力雇佣管理EOR服务合同模板_中泰双语.docx` is the only final authority for this Skill's content and appearance. `assets/reference.docx` is its byte-synchronized reusable copy. Do not substitute an earlier EOR template or a generic visual master.
3. Work from a copy of `assets/reference.docx`; preserve all unaffected package parts, tables, headers, footers, page furniture, and bilingual sequencing.
4. Read [@documents](plugin://documents@openai-primary-runtime) and follow its template-render-and-verify workflow.
5. Never invent party facts, fees, taxes, dates other than the stated defaults, term lengths, payment arrangements, governing law, or other commercial/legal commitments. Retain an explicit placeholder when a required fact is unconfirmed.

## Required cover, defaults, and preamble

- Retain the corresponding Thai title and use the Chinese title exactly as `海钡人力 雇佣管理（EOR）专项服务协议`.
- Use contract-number default `HB-EOR-YYYYMMDD-XXX`. At generation time replace only `YYYYMMDD` with the generation date; retain the `XXX` serial-number placeholder unless the user provides it.
- Use the Party B business-license city as the default signing place; the current default is `กรุงเทพมหานคร / 曼谷市`. Use the contract-generation date as the default signing time.
- Before Article 1, retain the final template's party-information title/table, both party descriptions, bilingual preamble, the Chinese recitals, and the purpose of the services purchased under this agreement. The Thai recital must expressly state that Party B agrees to provide Party A with employment/hiring (EOR) management services.
- Treat all anchors in `assets/template-quality-gate.json` as mandatory source coverage. Preserve all clauses, the signature page, and both qualification-evidence appendices unless the user explicitly requests an identified removal.

## Bilingual typography and layout

- Every Chinese text run must explicitly resolve to `SimSun`: cover bilingual description, party-information headings and tables, Thai-Chinese clause headings, body, headers, footers, signature page, and appendices.
- Thai text runs must use `Leelawadee UI`. A run containing Thai and Chinese characters is prohibited: split it into Thai-only and Chinese-only runs, preserving the source paragraph/run properties and visual pairing.
- When editing, use the matching template role and retain its blue bold bilingual-heading treatment, Chinese body indentation/line spacing/background/left rule, tabs, manual breaks, table geometry, headers, and footers. Do not rebuild tables with generic defaults.
- Preserve bilingual meaning, sequence, and clause numbers. For a requested change, edit only the matched Thai/Chinese counterparts and leave unrelated text and layout untouched.

## Pagination, signatures, and evidence

- Keep the cover page, signature page, Appendix 1, and Appendix 2 on independent pages. Keep a Thai-Chinese clause pair together whenever it fits.
- The signature page must start on a new page and retain its bilingual authorization heading, explanatory statement, and six-row/two-column signature table without splitting the statement/table.
- For supplied Party A/B DBD or company-registration evidence, retain the source in the company `source-material` folder and insert a complete, legible, proportionally scaled first-page image after its matching appendix anchor. If evidence is absent, retain the template placeholder and identify the missing source in the delivery note.

## Verification and cleanup

1. Reopen the completed DOCX. Verify required anchors, table structure, confirmed facts, default fields, requested bilingual edits, and that no unrequested content was deleted.
2. Apply `assets/template-quality-gate.json`: all Chinese runs explicitly `SimSun`; mixed Thai-Chinese runs `0`; required title, party-table, preamble/framework-order, clause, signature, and appendix anchors exist; signature and both appendices start independently.
3. Render the finished DOCX to PDF/PNG and inspect every page: cover, party table, preamble, all clauses, signature page, and both appendices. Fix and re-render every font, glyph, spacing, table, header/footer, page-break, or evidence-image defect.
4. Retain only source inputs, concise QA evidence, maintained scripts, and the authoritative final deliverable; remove drafts, superseded test copies, conversion caches, and rendered inspection files.
