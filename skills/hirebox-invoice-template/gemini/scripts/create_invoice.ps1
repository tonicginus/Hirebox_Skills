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

    function Set-TextField($name, $value) {
        $field = Get-FormFieldByName $name
        $range = $field.Range
        $range.End = $range.End - 1
        $range.Text = [string]$value
    }

    function Set-NumberField($name, $value) {
        $field = Get-FormFieldByName $name
        $range = $field.Range
        $range.End = $range.End - 1
        $range.Text = ("{0:N2}" -f [decimal]$value)
    }

    function Set-CellText($table, $row, $col, $value) {
        $range = $table.Cell($row, $col).Range
        $range.End = $range.End - 1
        $range.Text = [string]$value
    }

    Set-TextField "InvoiceNo" $data.invoice_no
    Set-TextField "IssueDate" $data.issue_date
    Set-TextField "BuyerName" $data.buyer_name
    Set-TextField "BuyerAddress" $data.buyer_address
    Set-TextField "BuyerTaxId" $data.buyer_tax_id
    Set-TextField "PaymentDue" $data.payment_due

    $table = $doc.Tables.Item(2)
    $items = @($data.items)
    if ($items.Count -gt 4) {
        throw "The template supports up to 4 fee lines; got $($items.Count)."
    }

    for ($i = 1; $i -le 4; $i++) {
        $row = $i + 1
        if ($i -le $items.Count) {
            $item = $items[$i - 1]
            Set-TextField "ItemDesc$i" $item.description
            Set-TextField "Qty$i" $item.quantity
            Set-TextField "UnitPrice$i" $item.unit_price
            Set-NumberField "Amount$i" $item.amount
        } else {
            Set-TextField "ItemDesc$i" "待填写"
            Set-TextField "Qty$i" "待填写"
            Set-TextField "UnitPrice$i" "待填写"
            Set-NumberField "Amount$i" 0
        }

        foreach ($col in @(2, 5)) {
            try {
                $table.Cell($row, $col).Range.ParagraphFormat.Alignment = 1
            } catch {}
        }
    }

    foreach ($row in 6..8) {
        foreach ($col in @(2, 5)) {
            try {
                $table.Cell($row, $col).Range.ParagraphFormat.Alignment = 1
            } catch {}
        }
    }

    $subtotal = 0
    foreach ($item in $items) {
        $subtotal += [decimal]$item.amount
    }
    $vat = [math]::Round($subtotal * 0.07, 2)
    $total = [math]::Round($subtotal + $vat, 2)
    Set-CellText $table 6 5 ("{0:N2}" -f $subtotal)
    Set-CellText $table 7 5 ("{0:N2}" -f $vat)
    Set-CellText $table 8 5 ("{0:N2}" -f $total)

    try { $doc.FormFields.Shaded = $false } catch {}
    $doc.Save()
    $doc.Close($true)
    Write-Output $output
} finally {
    if ($doc -ne $null) {
        try { $doc.Close($false) | Out-Null } catch {}
    }
    if ($word -ne $null) {
        try { $word.Quit() | Out-Null } catch {}
    }
}
