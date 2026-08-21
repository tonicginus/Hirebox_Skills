---
name: hirebox-exclusive-recruitment-contract
description: "Create a Hirebox Thai-Chinese exclusive recruitment service contract from the retained Word template. Use for exclusive or sole-agency recruitment cooperation, exclusive retained-search positions, or $hirebox-exclusive-recruitment-contract. Do not use for ordinary non-exclusive recruitment or headhunting contracts."
---

# Hirebox Exclusive Recruitment Contract

Create a new Thai-Chinese exclusive recruitment contract from the retained template. Keep `assets/reference.docx` unchanged.

## Scope

- Use this skill only when the cooperation is exclusive or sole-agency recruitment.
- The retained template makes exclusivity position-specific: it applies only to positions identified in the attached Position Information Form. Do not expand it to all of the client's positions, affiliates, countries, or future vacancies unless the user explicitly approves that broader scope.
- If the requested cooperation is non-exclusive, use `$hirebox-recruitment-headhunting-contract` instead of silently deleting the exclusive terms.

## Workflow

1. Read `artifact-template.json` and resolve its paths relative to this skill directory.
2. Load [@documents](plugin://documents@openai-primary-runtime) and use its retained-reference workflow with `assets/reference.docx`.
3. Treat the user's instructions, supplied corporate records, and approved commercial terms as the factual inputs. Do not invent party data, signatories, positions, fees, dates, or authority.
4. Before editing, scan placeholders in body paragraphs, tables, headers, footers, shapes, content controls, and fields. Fill every value supported by the inputs or verified Hirebox entity data; leave only genuinely unknown material fields as clear placeholders and report them.
5. Confirm the exclusive positions, country or region, target headcount, job information, exclusivity period, fee schedule, prepayment treatment, guarantee conditions, contracting parties, authorized signatories, signing place, and signing date.
6. Preserve the coupled exclusive-commercial mechanism unless the user expressly approves a change:
   - clause 1.7 restricts the client from recruiting the listed positions itself or appointing a third party without prior written consent;
   - clause 2.2 requires the first candidate batch within ten working days and at least three candidates per week for an exclusive position;
   - clause 3.6 requires a THB 10,000 prepayment per position, credits it against the successful placement fee, refunds it if the exclusive search is unsuccessful, and makes it non-refundable if the client recruits itself or appoints a third party.
7. When any approved change affects one language, update the paired Thai and Chinese clause to the same legal and commercial meaning. Use the approved revised Chinese wording as the content authority when the user supplies Chinese revisions, while preserving unmentioned wording and layout.
8. Unless the user supplies different terms, use the generation date in the applicable local timezone as the signing date; set the effective date to the first day of that calendar month; set the term to thirty-six consecutive calendar months; and set the expiry date to the day before the third anniversary of the effective date.
9. Unless the user supplies an approved contract number, generate `HB-YYYY-MMDDNN`, using the lowest unused two-digit daily sequence found in the available approved register and current output set. If uniqueness cannot be verified, use `01` only provisionally and report that limitation.
10. Unless the user supplies another signing place, use the city in the verified registered address of the selected Hirebox contracting entity. For the retained Thailand template and `HIREBOX CO., LTD.`, use Bangkok.
11. For each party with a supplied DBD or equivalent registration record, keep that source unchanged and append only the matching party's legible key first page under its qualification attachment heading.
12. Clone or import the reference rather than rebuilding its visual system. Reopen the result structurally, verify the exclusive clauses and bilingual pairing, render every page, inspect the page images, and return the final DOCX.

## Fidelity

Preserve the template's legal and commercial content, page setup, sections, styles, lists, tables, headers, footers, recurring elements, and Thai-Chinese ordering except for user-approved changes. User instructions control explicit deviations; the retained reference controls all unmentioned content and formatting.
