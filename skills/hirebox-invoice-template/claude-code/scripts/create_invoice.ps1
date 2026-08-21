param(
    [Parameter(Mandatory=$true)]
    [string]$InputJson,

    [Parameter(Mandatory=$true)]
    [string]$OutputDocx,

    [string]$TemplatePath
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillDir = Split-Path -Parent $scriptDir
if (-not $TemplatePath) {
    $TemplatePath = Join-Path $skillDir "assets\haibei-service-invoice-template.docx"
}

$inputPath = (Resolve-Path -LiteralPath $InputJson).Path
$template = (Resolve-Path -LiteralPath $TemplatePath).Path
$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDocx)
$data = Get-Content -LiteralPath $inputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$items = @($data.items)

if ($items.Count -eq 0) {
    throw "At least one invoice item is required."
}

$outDir = Split-Path -Parent $output
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}
Copy-Item -LiteralPath $template -Destination $output -Force

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Open($output)

    try {
        if ($doc.ProtectionType -ne -1) {
            $doc.Unprotect()
        }
    } catch {}

    function Get-FormFieldByName($name) {
        for ($i = 1; $i -le $doc.FormFields.Count; $i++) {
            $field = $doc.FormFields.Item($i)
            if ($field.Name -eq $name) {
                return $field
            }
        }
        throw "Missing form field: $name"
    }

    function Get-RangeStyle($range) {
        return @{
            FontName = $range.Font.Name
            FontNameFarEast = $range.Font.NameFarEast
            FontSize = $range.Font.Size
            Bold = $range.Font.Bold
            Italic = $range.Font.Italic
            Color = $range.Font.Color
            Alignment = $range.ParagraphFormat.Alignment
        }
    }

    function Apply-RangeStyle($range, $style) {
        $range.Font.Name = $style.FontName
        $range.Font.NameFarEast = $style.FontNameFarEast
        $range.Font.Size = $style.FontSize
        $range.Font.Bold = $style.Bold
        $range.Font.Italic = $style.Italic
        $range.Font.Color = $style.Color
        $range.Font.NameBi = $style.FontName
        $range.Font.SizeBi = $style.FontSize
        $range.Font.BoldBi = $style.Bold
        $range.Font.ItalicBi = $style.Italic
        $range.ParagraphFormat.Alignment = $style.Alignment
    }

    function Set-FormFieldValue($name, $value) {
        $field = Get-FormFieldByName $name
        $style = Get-RangeStyle $field.Range
        $field.Result = [string]$value
        Apply-RangeStyle $field.Range $style
    }

    function Set-CellTextPreserveStyle($table, $row, $col, $value, $referenceCell) {
        if ($null -eq $referenceCell) {
            $referenceCell = $table.Cell($row, $col)
        }
        $style = Get-RangeStyle $referenceCell.Range
        $verticalAlignment = $referenceCell.VerticalAlignment

        $range = $table.Cell($row, $col).Range
        $range.End = $range.End - 1
        $range.Text = [string]$value

        $targetRange = $table.Cell($row, $col).Range
        $targetRange.End = $targetRange.End - 1
        Apply-RangeStyle $targetRange $style
        $table.Cell($row, $col).VerticalAlignment = $verticalAlignment
    }

    Set-FormFieldValue "InvoiceNo" $data.invoice_no
    Set-FormFieldValue "IssueDate" $data.issue_date
    Set-FormFieldValue "BuyerName" $data.buyer_name
    Set-FormFieldValue "BuyerAddress" $data.buyer_address
    Set-FormFieldValue "BuyerTaxId" $data.buyer_tax_id
    Set-FormFieldValue "PaymentDue" $data.payment_due

    $table = $doc.Tables.Item(2)
    $templateItemRows = 4
    $referenceCells = @{}
    for ($col = 1; $col -le 5; $col++) {
        $referenceCells[$col] = $table.Cell(5, $col)
    }

    if ($items.Count -gt $templateItemRows) {
        $extraRows = $items.Count - $templateItemRows
        for ($i = 1; $i -le $extraRows; $i++) {
            $subtotalRow = $table.Rows.Item($table.Rows.Count - 2)
            $newRow = $table.Rows.Add($subtotalRow)
            $newRow.HeightRule = $table.Rows.Item(5).HeightRule
            $newRow.Height = $table.Rows.Item(5).Height
            for ($col = 1; $col -le 5; $col++) {
                Set-CellTextPreserveStyle $table ($newRow.Index) $col "" $referenceCells[$col]
            }
        }
    }

    for ($i = 1; $i -le $templateItemRows; $i++) {
        $row = $i + 1
        if ($i -le $items.Count) {
            $item = $items[$i - 1]
            Set-CellTextPreserveStyle $table $row 1 $i $referenceCells[1]
            Set-FormFieldValue "ItemDesc$i" $item.description
            Set-FormFieldValue "Qty$i" $item.quantity
            Set-FormFieldValue "UnitPrice$i" $item.unit_price
            Set-FormFieldValue "Amount$i" ("{0:N2}" -f [decimal]$item.amount)
        } else {
            Set-CellTextPreserveStyle $table $row 1 "" $referenceCells[1]
            Set-FormFieldValue "ItemDesc$i" ""
            Set-FormFieldValue "Qty$i" ""
            Set-FormFieldValue "UnitPrice$i" ""
            Set-FormFieldValue "Amount$i" ""
        }
    }

    if ($items.Count -gt $templateItemRows) {
        for ($i = $templateItemRows + 1; $i -le $items.Count; $i++) {
            $row = $i + 1
            $item = $items[$i - 1]
            Set-CellTextPreserveStyle $table $row 1 $i $referenceCells[1]
            Set-CellTextPreserveStyle $table $row 2 $item.description $referenceCells[2]
            Set-CellTextPreserveStyle $table $row 3 $item.quantity $referenceCells[3]
            Set-CellTextPreserveStyle $table $row 4 $item.unit_price $referenceCells[4]
            Set-CellTextPreserveStyle $table $row 5 ("{0:N2}" -f [decimal]$item.amount) $referenceCells[5]
        }
    }

    $subtotal = [decimal]0
    foreach ($item in $items) {
        $subtotal += [decimal]$item.amount
    }
    $vat = [math]::Round($subtotal * [decimal]0.07, 2)
    $total = [math]::Round($subtotal + $vat, 2)
    $subtotalRowIndex = $table.Rows.Count - 2
    Set-CellTextPreserveStyle $table $subtotalRowIndex 5 ("{0:N2}" -f $subtotal) $table.Cell($subtotalRowIndex, 5)
    Set-CellTextPreserveStyle $table ($subtotalRowIndex + 1) 5 ("{0:N2}" -f $vat) $table.Cell($subtotalRowIndex + 1, 5)
    Set-CellTextPreserveStyle $table ($subtotalRowIndex + 2) 5 ("{0:N2}" -f $total) $table.Cell($subtotalRowIndex + 2, 5)

    $sealTable = $doc.Tables.Item(4)
    $sealDateText = (($sealTable.Cell(3, 1).Range.Text -replace '[\r\a]', '').Trim())
    $sealDateText = [regex]::Replace($sealDateText, '\d{4}-\d{2}-\d{2}', [string]$data.issue_date)
    Set-CellTextPreserveStyle $sealTable 3 1 $sealDateText $sealTable.Cell(3, 1)
    $sealTable.Rows.Alignment = 0
    $sealTable.Range.ParagraphFormat.Alignment = 0
    $sealTable.Rows.AllowBreakAcrossPages = 0
    for ($rowIndex = 1; $rowIndex -lt $sealTable.Rows.Count; $rowIndex++) {
        $sealTable.Rows.Item($rowIndex).Range.ParagraphFormat.KeepWithNext = -1
    }
    $sealTable.Rows.Item($sealTable.Rows.Count).Range.ParagraphFormat.KeepWithNext = 0
    if ($sealTable.Range.Start -gt 0) {
        $beforeSeal = $doc.Range($sealTable.Range.Start - 1, $sealTable.Range.Start - 1)
        $beforeSeal.Paragraphs.Item(1).Format.KeepWithNext = -1
    }

    try { $doc.FormFields.Shaded = $false } catch {}
    $doc.Save()
    $doc.Close($true)
    $doc = $null
    Write-Output $output
} finally {
    if ($doc -ne $null) {
        try { $doc.Close($false) | Out-Null } catch {}
    }
    if ($word -ne $null) {
        try { $word.Quit() | Out-Null } catch {}
    }
}
