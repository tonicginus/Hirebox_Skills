---
name: hirebox-headhunting-quotation
description: Generate bilingual Hirebox headhunting service quotations in DOCX and PDF for different clients, positions, and work regions. Use when a user requests a Hirebox headhunting quotation, needs a quotation from a role requirement, provides a salary budget, or asks to estimate the applicable fee rate from current role-and-region market salary research.
---

# Hirebox Headhunting Quotation

Generate the quotation with `scripts/generate_quotation.py`. Keep the quotation-standard appendix fixed; only populate the quotation body with the customer and role-specific information.

## Inputs

Read [input-schema.md](references/input-schema.md). Require the client, project, role, work location, headcount, key requirements, and one salary basis.

- Use the client salary budget whenever it is supplied.
- If no client budget is supplied, research the current salary range for the role and work region before generating. Use primary or credible local recruitment/salary sources, retain the source URLs and retrieval date in `market_sources`, and label the input as `market_research`.
- Quote in THB. Convert a monthly salary range to annual salary by multiplying by 12.

## Generate

1. Create a UTF-8 JSON input file from the schema.
2. Run:

```powershell
python .\scripts\generate_quotation.py --input .\quote-input.json --output-dir .\outputs
```

3. Inspect both output files. Confirm that the main quotation has the supplied client and role values, the calculated estimated service-rate text, and the quotation date.
4. Confirm that the appendix starts with `报价标准附件 / Appendix: Quotation Standards` and remains fixed. Do not add customer data, market research notes, or custom clauses to the appendix.

## Pricing Rules

- Up to THB 300,000: 10%, 60 days.
- THB 300,000 to THB 900,000: 15%, 60 days.
- THB 900,000 to THB 1,800,000: 20%, 90 days.
- Above THB 1,800,000: 25%, 90 days.

For a salary range that crosses a pricing threshold, show the applicable estimated fee-rate range and state that the final rate follows the candidate's confirmed annual remuneration. Do not add a calculated service-fee amount to the quotation body.

## Validation

The script fails if mandatory inputs are absent, a market-research input has no sources, or the DOCX appendix would change. Render the produced PDF and visually check page headers, footers, table borders, the rate/guarantee columns, and the complete appendix before delivery.
