param(
    [string]$Stem = 'Banner_Escolta_CICTED_FINAL',
    [switch]$AlignDiagramBaseline
)
$ErrorActionPreference = 'Stop'
$outputDirectory = Join-Path $PSScriptRoot 'impressao'
$pptPath = Join-Path $outputDirectory ($Stem + '.pptx')
$pdfPath = Join-Path $outputDirectory ('assets/exportacao_' + $Stem + '.pdf')
$pngPath = Join-Path $outputDirectory ($Stem + '_PREVIA.png')
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open($pptPath, $false, $false, $false)
    if ($AlignDiagramBaseline) {
        $references = $presentation.Slides.Item(1).Shapes.Item(70).TextFrame2.TextRange
        $source = $presentation.Slides.Item(1).Shapes.Item(95).TextFrame2.TextRange
        $adjustment = ($references.BoundTop + $references.BoundHeight) - ($source.BoundTop + $source.BoundHeight)
        for ($index = 71; $index -le 95; $index++) {
            $shape = $presentation.Slides.Item(1).Shapes.Item($index)
            $shape.Top += $adjustment
        }
        $presentation.Save()
        Write-Output ('Ajuste fino vertical (pt): ' + $adjustment)
    }
    $bounds = @()
    foreach ($shape in $presentation.Slides.Item(1).Shapes) {
        if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
            $range = $shape.TextFrame2.TextRange
            $frame = $shape.TextFrame2
            $availableHeight = $shape.Height - $frame.MarginTop - $frame.MarginBottom
            $bounds += [PSCustomObject]@{
                name = $shape.Name
                text = $range.Text
                height = $shape.Height
                availableHeight = $availableHeight
                textHeight = $range.BoundHeight
                textTop = $range.BoundTop
                textBottom = $range.BoundTop + $range.BoundHeight
                availableWidth = $shape.Width - $frame.MarginLeft - $frame.MarginRight
                textWidth = $range.BoundWidth
                overflow = ($range.BoundHeight -gt ($availableHeight + 1))
            }
        }
    }
    $bounds | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputDirectory ('auditoria_textos_' + $Stem + '.json')) -Encoding utf8
    # PDF em intenção de impressão. Texto e SVG permanecem vetoriais.
    $printRange = $presentation.PrintOptions.Ranges.Add(1, 1)
    $presentation.ExportAsFixedFormat($pdfPath, 2, 2, $false, 1, 1, $false, $printRange, 4, '', $true, $true, $true, $false, $false)
    $presentation.Slides.Item(1).Export($pngPath, 'PNG', 2700, 3600)
    Write-Output $pdfPath
    Write-Output ('Overflow: ' + (($bounds | Where-Object overflow | ConvertTo-Json -Compress)))
} finally {
    if ($null -ne $presentation) {
        $presentation.Close()
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    }
    $app.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
