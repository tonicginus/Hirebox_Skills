---
name: hirebox-invoice-template
description: Generate Hirebox service invoice DOCX files from the fixed Word template with any number of service lines, preserved template formatting, automatic subtotal, VAT 7%, and grand total. Use when the user gives buyer information and fee line items, asks to issue a Hirebox invoice or pro forma invoice, or requests reuse of the Hirebox invoice template.
---

# Hirebox Invoice Template

## Workflow

1. Use `assets/haibei-service-invoice-template.docx` as the source template.
2. Collect or infer the output filename, buyer information, payment due field, and every fee line supplied by the user.
3. Create a JSON input file for `scripts/create_invoice.ps1`.
4. Run the script with the JSON and output path.
5. Reopen the output structurally and verify:
   - buyer fields were replaced;
   - the number, order, descriptions, and amounts of fee rows exactly match the input;
   - subtotal, VAT 7%, and grand total match the input amounts;
   - inserted values retain the template font, size, and alignment;
   - unused template rows contain no placeholders;
   - the seller-seal table remains left-aligned and uses the invoice issue date;
   - the source template remains unchanged.

## Template Rules

- Deliver a `.docx`; do not generate a PDF unless the user asks for one.
- Preserve the existing header, logo, footer, colors, table layout, fonts, font sizes, alignments, and fillable-form behavior.
- Keep basic-information values in the exact font, size, and left alignment defined by the template.
- Keep service-item cells in the exact font, size, and centered alignment defined by the template.
- Keep every cell in the seller-seal table left-aligned. Set its date to the invoice issue date.
- Keep the settlement currency in the invoice information field as `泰铢 / THB`.
- Do not add currency text in the service amount table.
- Use invoice number format `INV-HB-YYYYMMDDNNN`, for example `INV-HB-20260707001`.
- Keep VAT fixed at 7% unless the user explicitly instructs otherwise.
- Treat the template's four item rows as an initial layout, not a maximum. Insert one matching row for each item beyond four before the subtotal row.
- Write one invoice row for every user-supplied item, in the supplied order. Never merge, omit, split, or reorder items merely to fit the initial four rows.
- When fewer than four items are supplied, keep the unused template rows but clear their sequence numbers and every placeholder/value cell.
- Retain the first four Word form-field rows. Generate additional rows with matching visible formatting, and write all totals explicitly.

## JSON Input

Use this schema with `scripts/create_invoice.ps1`:

```json
{
  "invoice_no": "INV-HB-20260707001",
  "issue_date": "2026-07-07",
  "buyer_name": "Buyer legal name",
  "buyer_address": "Buyer address",
  "buyer_tax_id": "Buyer tax or registration number",
  "payment_due": "待填写",
  "items": [
    {"description": "服务内容 / Description", "quantity": "1", "unit_price": "100.00", "amount": 100.00}
  ]
}
```

## Script Usage

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create_invoice.ps1 -InputJson input.json -OutputDocx output.docx
```

The script requires Microsoft Word COM on Windows. It preserves the bundled template, retains the first four fillable rows, expands the service table when needed, clears unused placeholders, and writes calculated totals into the output document.
