---
name: hirebox-invoice-template
description: Generate Hirebox service invoice DOCX files from the fixed Word template. Use when the user gives buyer/recipient invoice information and service fee line items, asks to issue an invoice, create a Hirebox invoice, reuse the Hirebox invoice template, or produce a Word service invoice with automatic subtotal, VAT 7%, and grand total.
---

# Hirebox Invoice Template

## Workflow

1. Use `assets/haibei-service-invoice-template.docx` as the source template.
2. Collect or infer the output filename, buyer information, payment due field, and up to 4 fee lines.
3. Create a JSON input file for `scripts/create_invoice.ps1`.
4. Run the script with the JSON and output path.
5. Reopen the output structurally and verify:
   - buyer fields were replaced;
   - fee rows match the input;
   - subtotal, VAT 7%, and grand total match the input amounts;
   - the source template remains unchanged.

## Template Rules

- Deliver a `.docx`; do not generate a PDF unless the user asks for one.
- Preserve the existing header, logo, footer, colors, table layout, centered service-description and amount columns, and fillable-form behavior.
- Keep the settlement currency in the invoice information field as `泰铢 / THB`.
- Do not add currency text in the service amount table.
- Use invoice number format `INV-HB-YYYYMMDDNNN`, for example `INV-HB-20260707001`.
- Keep VAT fixed at 7% unless the user explicitly instructs otherwise.
- The amount column uses Word form fields named `Amount1` through `Amount4`; changing an amount and exiting the field recalculates subtotal, VAT, and grand total.
- If more than 4 fee lines are required, ask whether to extend the template or combine lines before editing.

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

The script requires Microsoft Word COM on Windows because it fills the Word template reliably and refreshes the final document structure. The bundled template itself remains a fillable form with automatic subtotal, VAT, and grand total behavior for manual reuse.
