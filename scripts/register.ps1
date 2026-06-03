param(
    [Parameter(Mandatory)]
    [string]$InstallDir
)

$exe = Join-Path $InstallDir "mark-dawn.exe"

if (-not (Test-Path $exe)) {
    Write-Error "Exe not found at: $exe"
    exit 1
}

$cmd = "`"$exe`" `"%1`""

# ── ProgID ───────────────────────────────────────────────────────────────────
$progId = "HKCU:\Software\Classes\MarkDawn.mdfile"

New-Item         -Path $progId                            -Force | Out-Null
Set-ItemProperty -Path $progId -Name "(default)"          -Value "Markdown Document"

New-Item         -Path "$progId\DefaultIcon"              -Force | Out-Null
Set-ItemProperty -Path "$progId\DefaultIcon" -Name "(default)" -Value "$exe,0"

New-Item         -Path "$progId\shell\open"               -Force | Out-Null
Set-ItemProperty -Path "$progId\shell\open" -Name "(default)"  -Value "Open with mark-dawn"

New-Item         -Path "$progId\shell\open\command"       -Force | Out-Null
Set-ItemProperty -Path "$progId\shell\open\command" -Name "(default)" -Value $cmd

# ── Extensions ───────────────────────────────────────────────────────────────
foreach ($ext in @(".md", ".markdown")) {
    New-Item         -Path "HKCU:\Software\Classes\$ext" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Classes\$ext" -Name "(default)" -Value "MarkDawn.mdfile"
}

# ── Notify the shell (refreshes icons/associations without reboot) ────────────
$code = @'
using System;
using System.Runtime.InteropServices;
public class Shell {
    [DllImport("shell32.dll")] public static extern void SHChangeNotify(int e, uint f, IntPtr a, IntPtr b);
}
'@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
[Shell]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)

Write-Host "  File association registered OK."
