---
name: hirebox-recruitment-headhunting-contract
description: "Create a Hirebox Thai-Chinese recruitment and headhunting service contract from the retained Word template. Use when the user requests a Hirebox recruitment or headhunting contract, selects this contract template, or invokes $hirebox-recruitment-headhunting-contract."
---

# Hirebox Recruitment and Headhunting Contract

Create a new document from this template. Keep the retained reference file unchanged.

## Workflow

1. Read `artifact-template.json` and resolve its paths relative to this skill directory.
2. Load [@documents](plugin://documents@openai-primary-runtime) and invoke its reference/template workflow with the retained file.
3. Treat the user's prompt and available sources as the content input. Do not invent facts merely to fill a template slot.
4. Before editing, scan every placeholder in body paragraphs, all tables, headers, footers, shapes, content controls, and fields. Fill every placeholder for which the user, supplied sources, contract defaults, or verified Hirebox entity data provides a value. Keep only genuinely unknown material fields as clear placeholders and report them.
5. Unless the user supplies different terms, use the generation date in the applicable local timezone as the signing date; set the effective date to the first day of that calendar month; set the term to thirty-six (36) consecutive calendar months; and set the expiry date to the day before the third anniversary of the effective date. For example, a document generated on 2026-08-05 defaults to an effective period from 2026-08-01 through 2029-07-31.
6. Unless the user provides an approved contract number, generate the contract/version number as `HB-YYYY-MMDDNN`, where `YYYY-MMDD` is the generation date and `NN` is the two-digit daily sequence. Check the available approved contract register and current output set for that date, then use the lowest unused sequence beginning at `01`. If no authoritative register or output set is accessible, use `01` only as a provisional default, report that sequence uniqueness remains unverified, and preserve any explicitly supplied approved number.
7. Unless the user supplies another signing place, use the city in the verified registered address of the selected Hirebox contracting entity. For the retained Thailand template and `HIREBOX CO., LTD.`, use Bangkok. Do not use a Thailand default for another entity or country.
8. For every party whose qualification attachment includes a Thailand Department of Business Development (DBD) or equivalent company-registration record, keep the supplied source unchanged and append only that party's key first page, clearly legible and proportionally scaled, under the matching party's attachment heading. Do not append the full record, omit a known party's core page, or place one party's evidence under another party's heading.
9. Clone or import the reference instead of replacing its visual system with generic defaults.
10. Render and verify the finished document, then return the final artifact.

## Fidelity

Preserve page setup, sections, styles, lists, tables, headers, footers, and recurring page elements.

User instructions control requested content and explicit deviations. The retained reference controls layout and formatting where the user has not requested a change.
