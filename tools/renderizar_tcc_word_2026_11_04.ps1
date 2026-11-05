# Atualiza campos e exporta apenas a cópia revisada. Não fecha Word do usuário.
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskDocx = Join-Path $taskRoot 'docs\tcc\TCC_Escolta_UNITAU_ATUALIZADO_2026-11-04.docx'
$taskPdf = [IO.Path]::ChangeExtension($taskDocx, '.pdf')
$taskApp = $null
$taskDoc = $null
try {
    $taskApp = New-Object -ComObject Word.Application
    $taskApp.Visible = $false
    $taskApp.DisplayAlerts = 0
    $taskApp.AutomationSecurity = 3
    $taskDoc = $taskApp.Documents.Open($taskDocx, $false, $false, $false)
    $taskDoc.TrackRevisions = $false
    $taskDoc.ShowRevisions = $false
    $taskDoc.Fields.Update() | Out-Null
    $taskDoc.Repaginate()
    foreach ($taskToc in $taskDoc.TablesOfContents) { $taskToc.Update() }
    $taskDoc.Repaginate()
    $taskMainStart = $null
    foreach ($taskPara in $taskDoc.Paragraphs) {
        if ($taskPara.OutlineLevel -eq 1 -and $taskPara.Range.Text.Trim() -eq '1 INTRODUÇÃO') {
            $taskMainStart = $taskPara.Range.Start
            break
        }
    }
    if ($null -eq $taskMainStart) { throw 'Introdução com nível de título não localizada.' }
    $taskCaptions = @{}
    foreach ($taskPara in $taskDoc.Paragraphs) {
        $taskText = $taskPara.Range.Text.Trim()
        if ($taskPara.Range.Start -ge $taskMainStart -and $taskText -match '^(Figura|Quadro) \d+ – ') {
            $taskCaptions[$taskText] = $taskPara.Range.Information(3)
        }
    }
    foreach ($taskPara in $taskDoc.Paragraphs) {
        if ($taskPara.Range.Start -ge $taskMainStart) { break }
        $taskText = $taskPara.Range.Text.Trim()
        if ($taskCaptions.ContainsKey($taskText)) {
            # Não substituir a marca final: o Word herdaria a quebra de página
            # do próximo título e separaria o último item da sua lista.
            $taskEntry = $taskPara.Range.Duplicate
            $taskEntry.End = $taskEntry.End - 1
            $taskEntry.Text = $taskText + "`t" + $taskCaptions[$taskText]
            $taskPara.TabStops.ClearAll()
            $taskPara.TabStops.Add($taskApp.CentimetersToPoints(16), 2, 1) | Out-Null
        }
    }
    $taskDoc.Repaginate()
    foreach ($taskToc in $taskDoc.TablesOfContents) { $taskToc.UpdatePageNumbers() }
    $taskDoc.Save()
    # PDF sem balões de revisão/comentários, otimizado para impressão.
    $taskDoc.ExportAsFixedFormat($taskPdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
    [pscustomobject]@{ Pages = $taskDoc.ComputeStatistics(2); Tables = $taskDoc.Tables.Count; Figures = $taskDoc.InlineShapes.Count; Comments = $taskDoc.Comments.Count; Pdf = $taskPdf } | Format-List
} finally {
    if ($null -ne $taskDoc) { $taskDoc.Close(0) }
    if ($null -ne $taskApp) { $taskApp.Quit() }
    if ($null -ne $taskDoc) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskDoc) | Out-Null }
    if ($null -ne $taskApp) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskApp) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
