---
name: hirebox-eor-employment-management-contract
description: "Create or revise a Hirebox Thai-Chinese employment-management (EOR) service contract. Use when the user selects this contract template, requests a Hirebox EOR employment-management contract, or invokes $hirebox-eor-employment-management-contract."
---

# Hirebox EOR Employment Management Contract

Create a contract from the maintained Thai-Chinese EOR template. Keep the retained reference unchanged during normal contract creation.

## Authority and source selection

1. Read `artifact-template.json` and `assets/template-quality-gate.json`.
2. Use the project-owned template `海钡合同撰写/海钡人力雇佣管理EOR服务合同模板.docx` as the effective business-template authority when available. The retained `assets/reference.docx` is the synchronized reusable copy and fallback; it is not a replacement for the project-owned template.
3. Apply this hierarchy: Hirebox global visual master -> Thai-Chinese language-layout rules -> this EOR business template -> user-confirmed facts and requested clause changes.
4. Read [@documents](plugin://documents@openai-primary-runtime) and follow its template-render-and-verify workflow.
5. Never invent party facts, fees, taxes, dates, term lengths, payment arrangements, governing law, or other commercial/legal commitments. Keep an explicit placeholder when a required fact is not confirmed.

## Preserve the contract body

- Treat every anchor listed in `assets/template-quality-gate.json` as required source coverage.
- Preserve the party-information table, bilingual preamble, all service, fee, payment, responsibility, term, termination, data-compliance, anti-bribery, and miscellaneous clauses, the signature page, and both qualification-evidence appendices unless the user explicitly asks to remove exact content.
- Replace party placeholders only with confirmed information. Do not delete an entire preamble, clause, or appendix because one field is unavailable.
- For a requested clause change, alter only the relevant Thai/Chinese counterpart paragraphs and preserve unrelated language, numbering, tables, headers, footers, and recurring page elements.
- Preserve bilingual pairing, meaning, sequence, and clause numbers. Do not convert paired content into a single-language paragraph.

## Mixed Thai-Chinese typography and layout

- Chinese text must use `SimSun`, including Chinese-only paragraphs, table cells, headings, clause counterparts, and appendices.
- Thai text must use `Leelawadee UI`. In mixed Thai-Chinese paragraphs or headings, split Thai and Chinese text into separate runs where needed; do not apply Thai font to a complete run containing Chinese.
- When adding or restoring a paragraph, copy paragraph and run properties from the matching role in the template before replacing text. Do not create an unformatted `Normal` paragraph for headings, body counterparts, signature statements, or appendices.
- Keep bilingual headings in the template's blue, bold treatment. Keep Chinese body counterparts with the prescribed indentation, line spacing, background, and left emphasis rule.
- Retain tabs, manual breaks, table geometry, headers, and footers. Do not rebuild existing tables with generic defaults.

## Pagination and signing

- Keep the cover page, signature page, and each appendix on their required standalone pages.
- Keep each Thai-Chinese clause pair together whenever it fits on one page.
- The signature page must retain the bilingual authorization heading, explanatory statements, and the six-row, two-column signature table. The heading must start on a new page, and the statement/table must not split across pages.
- Do not use empty paragraphs, fixed row heights, or unnecessary page breaks to manufacture whitespace. Remove only newly introduced pagination controls that create avoidable gaps.

## Party qualification evidence appendices

- When the user supplies a Party A DBD/company-registration source file, keep the original source in that company's source-material folder and insert a legible image of its first page into Appendix 1, `甲方主体资格证明`.
- When the user supplies a Party B DBD/company-registration source file, keep the original source in that company's source-material folder and insert a legible image of its first page into Appendix 2, `乙方主体资格证明`.
- For a PDF source, render page 1 to an image; for an image source, use its first page. Insert the rendered source page itself, not a text recreation or screenshot of extracted data.
- Preserve the full page ratio, avoid cropping or stretching, and keep each appendix title and image together. Do not place Party B evidence in the Party A section or vice versa.
- If evidence is not supplied, retain the corresponding placeholder and state the missing source in the delivery note. Never silently omit an appendix or fabricate evidence.

## Company folders and verification

1. Keep each company in its own directory with source-material, work-file, and delivery-file folders; retain supplied evidence in source-material and place the final DOCX in delivery-file.
2. Reopen the finished DOCX and verify all required anchors, confirmed party facts, requested clause changes, table counts/structure, and absence of deleted content that was not requested.
3. Run the font checks in `assets/template-quality-gate.json`: every Chinese run must resolve to `SimSun`; mixed Thai-Chinese headings and body paragraphs must retain Thai `Leelawadee UI` and Chinese `SimSun`.
4. When qualification evidence was supplied, verify that the final DOCX contains the correct embedded first-page image after the matching appendix anchor. Render each appendix and confirm the image is readable, complete, correctly oriented, not cropped, stretched, or split across pages.
5. Render the final DOCX to PDF/PNG and inspect every page: cover, party-information table, preamble, all EOR clauses, signature page, and both appendices. Fix and re-render if any glyph, font, spacing, table, header/footer, page-break, or evidence-image defect appears.
6. After verification, keep only source inputs, concise QA evidence, maintained scripts, and the authoritative final deliverable; remove drafts, superseded test copies, and conversion caches.
