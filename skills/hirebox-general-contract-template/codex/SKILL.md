---
name: hirebox-general-contract-template
description: Create or revise formal Hirebox (海钡人力) single-language or standard business contracts from the approved 海钡通用合同模板, including recruitment, headhunting, EOR, staffing, HR consulting, training, platform, partner, and MOU agreements. Use for Chinese, English, Thai, or standard business-contract DOCX work; use $hirebox-multilingual-contract-template when a contract requires paired bilingual or multilingual clauses.
---

# Hirebox General Contract Template

Create a formal, editable Hirebox business-contract DOCX from the approved general style master. Use this skill for single-language contracts and standard business contracts; route paired bilingual or multilingual clauses to `$hirebox-multilingual-contract-template`.

## Required references

Read [海钡合同样式规范.md](references/海钡合同样式规范.md) in full before drafting.

- Resolve the Git root and clone `海钡合同撰写/海钡通用合同模板_英文中文.docx`; never overwrite the source master.
- Use the master for the page system, cover, fonts, colours, headers, footers, party-information table, signature table, and visual QA baseline.
- Use `assets/reference.docx` only as a retained multilingual layout layer when it matches the requested language combination. It never replaces the general style master.

## Required input

Collect the contract type and languages; both parties' legal and signing information; business background; services, deliverables, milestones, acceptance, and responsibilities; fees, currency, tax, invoicing, payment, and guarantee terms; contract dates and duration; applicable legal clauses; and attachments. Use explicit placeholders for any unconfirmed field. Never invent commercial, tax, identity, or legal facts.

## Workflow

1. Confirm whether this is a new contract or a revision, and record the content sources and selected language order.
2. Create the output from a clone of the general style master. Keep cover, signature page, and each attachment on separate pages.
3. Populate the cover and party-information table. Keep parties, contract name, number, and dates consistent across the cover, header, body, and signing table.
4. Draft full business clauses. In bilingual or multilingual contracts, keep matching clause numbers and adjacent language pairs; do not mix languages inside one clause.
5. Create fixed-layout service and fee tables. Centre amounts, percentages, dates, and short fields horizontally and vertically. Put guarantee-period units in table headers only.
6. Preserve the six-row, two-column signature-table structure and sufficient seal/signature space.
7. Reopen the DOCX and verify all source terms, tables, attachments, headers, footers, and placeholders. Remove unresolved technical fields such as `FORMTEXT`.
8. Render every page to PDF or PNG. Correct glyph loss, overflow, clipping, broken tables, bad pagination, or language-pair mismatches before delivery.

## Cross-computer portability

Synchronize through Hirebox Skill Manager using the skill version and `contentHash`. On another computer, locate the Git-root general style master and compare it with the SHA-256 baseline in the style specification. If the master has changed, re-extract and validate the specification before producing client-facing work. Do not distribute credentials, client contracts, or local session data.
