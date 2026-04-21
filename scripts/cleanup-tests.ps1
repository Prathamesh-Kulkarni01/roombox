$ports = @(9003, 8080, 9099)

foreach ($port in $ports) {
    Write-Host "Checking port $port..."
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "Killing process(es) on port ${port}: $process"
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Port $port is clear."
    }
}

Write-Host "Cleanup complete."
