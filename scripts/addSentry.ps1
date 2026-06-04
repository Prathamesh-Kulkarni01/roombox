$targetDirs = @(
    "c:\A Projects\roombox\src\lib\actions",
    "c:\A Projects\roombox\src\services",
    "c:\A Projects\roombox\src\app\api"
)

$totalProcessed = 0
$totalModified = 0

foreach ($dir in $targetDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Recurse -Include *.ts,*.tsx
        foreach ($file in $files) {
            $totalProcessed++
            $content = [System.IO.File]::ReadAllText($file.FullName)
            $originalContent = $content

            # Regex to match catch(err) { or catch (err: any) {
            # In PowerShell, we can use the .NET Regex class for multi-line support and complex replacements
            $regex = [regex]'(?s)catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*[^)]+)?\s*\)\s*\{'
            
            $content = $regex.Replace($content, {
                param($match)
                $errVar = $match.Groups[1].Value
                return $match.Value + "`n    Sentry.captureException($errVar);"
            })

            # Primitive dedup just in case
            $dedupRegex = [regex]'(?s)Sentry\.captureException\(([^)]+)\);\s*Sentry\.captureException\(\1\);'
            $content = $dedupRegex.Replace($content, 'Sentry.captureException($1);')

            if ($content -ne $originalContent) {
                if (-not $content.Contains("@sentry/nextjs")) {
                    $content = "import * as Sentry from '@sentry/nextjs';`n" + $content
                }
                [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
                $totalModified++
            }
        }
    }
}

Write-Host "Processed $totalProcessed files, modified $totalModified files."
