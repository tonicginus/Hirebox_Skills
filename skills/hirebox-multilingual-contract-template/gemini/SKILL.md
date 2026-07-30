---
name: hirebox-multilingual-contract-template
description: Create or revise Hirebox (海钡人力) bilingual and multilingual recruitment, headhunting, EOR, and HR-service contracts from the approved general Word master and multilingual layout reference. Use whenever the user needs paired Chinese, Thai, English, or other multilingual contract clauses, matching clause numbers, language order, or multilingual DOCX layout verification.
---

# Hirebox Multilingual Contract Template

Create a formal, editable bilingual or multilingual Hirebox contract. Use this skill when the contract needs paired clauses in two or more languages. For a single-language or standard business contract, use `$hirebox-general-contract-template`.

## Required References

Read [海钡合同样式规范.md](references/海钡合同样式规范.md) in full before drafting.

- Resolve the Git root and use `海钡合同撰写/海钡通用合同模板_英文中文.docx` as the global visual-style master. It governs page setup, branding, cover, fonts, headers, footers, party-information table, signature table, colours, and page-break behavior.
- `assets/reference.docx` is the retained multilingual layout reference. Use it for language pairing, ordering, clause numbering, and multilingual pagination; it does not override the global style master.
- `assets/preview.png` is a visual cue, not a substitute for rendering the generated DOCX.

## Required Input

Collect the contract type, language order, legal and signing details for both parties, business background, services, deliverables, fees, currency, tax, invoicing, payment, guarantee terms, dates, governing-law clauses, attachments, and signature fields. Use explicit placeholders for unconfirmed information. Do not invent legal or commercial facts.

## Workflow

1. Confirm the intended language order and whether the request is a new contract or revision.
2. Clone the global style master and select the multilingual layout reference; never modify either retained source file.
3. Keep each substantive clause in adjacent language pairs with identical numbering. Do not mix languages inside a clause or separate a language pair across pages.
4. Preserve all supplied legal and commercial content. Add fee and annex tables in fixed layout; centre amounts, rates, dates, and short fields horizontally and vertically.
5. Keep the cover, signature page, and every attachment on separate pages. Preserve the six-row, two-column signature-table pattern and complete authorization text.
6. Reopen the DOCX and verify source content, paired numbering, tables, headers, footers, attachments, and the absence of unresolved technical fields such as `FORMTEXT`.
7. Render every page to PDF or PNG. Correct missing glyphs, language-pair mismatches, overflow, clipping, table alignment, and bad pagination before delivery.

## Cross-Computer Portability

Before use on another computer, verify this skill's version and `contentHash` through Hirebox Skill Manager. Confirm the Git-root style master matches the SHA-256 baseline in the style specification. Do not distribute credentials, connector sessions, local paths, generated previews, or client contracts.
