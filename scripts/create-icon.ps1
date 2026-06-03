Add-Type -AssemblyName System.Drawing

function New-MarkdownIcon {
    param([string]$OutputPath)

    $sizes = @(16, 32, 48, 256)
    $pngDataList = [System.Collections.Generic.List[byte[]]]::new()

    foreach ($sz in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        # ── background ────────────────────────────────────────────────────────
        $bg = [System.Drawing.Color]::FromArgb(255, 28, 28, 42)
        $g.Clear($bg)

        if ($sz -ge 32) {
            # Rounded rectangle background
            $r    = [int]($sz * 0.18)
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $path.AddArc(0,         0,         $r*2, $r*2, 180, 90)
            $path.AddArc($sz-$r*2,  0,         $r*2, $r*2, 270, 90)
            $path.AddArc($sz-$r*2,  $sz-$r*2,  $r*2, $r*2,   0, 90)
            $path.AddArc(0,         $sz-$r*2,  $r*2, $r*2,  90, 90)
            $path.CloseFigure()

            $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 30, 46))
            $g.Clear([System.Drawing.Color]::Transparent)
            $g.FillPath($bgBrush, $path)
            $bgBrush.Dispose()
            $path.Dispose()
        }

        # ── draw "md" or "M" text ─────────────────────────────────────────────
        $label    = if ($sz -le 20) { "M" } else { "md" }
        $fontSize = [float]($sz * $(if ($sz -le 20) { 0.60 } else { 0.42 }))

        $families = @("Cascadia Code","Consolas","Courier New")
        $font = $null
        foreach ($fam in $families) {
            try {
                $font = New-Object System.Drawing.Font($fam, $fontSize, [System.Drawing.FontStyle]::Bold)
                break
            } catch { }
        }
        if (-not $font) {
            $font = New-Object System.Drawing.Font([System.Drawing.FontFamily]::GenericMonospace, $fontSize, [System.Drawing.FontStyle]::Bold)
        }

        # Teal accent (same colour used in the app)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 78, 201, 176))

        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment     = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $rect = New-Object System.Drawing.RectangleF(0, 0, $sz, $sz)
        $g.DrawString($label, $font, $textBrush, $rect, $sf)

        $sf.Dispose(); $font.Dispose(); $textBrush.Dispose(); $g.Dispose()

        # Capture PNG bytes
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngDataList.Add($ms.ToArray())
        $ms.Dispose(); $bmp.Dispose()
    }

    # ── write .ico (ICONDIR + ICONDIRENTRYs + PNG data) ──────────────────────
    $fs = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)

    $bw.Write([uint16]0)               # idReserved
    $bw.Write([uint16]1)               # idType = 1 (icon)
    $bw.Write([uint16]$sizes.Count)    # idCount

    # data starts after: 6-byte header + (16 bytes * count) entries
    $offset = [uint32](6 + $sizes.Count * 16)

    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $w    = [byte]$(if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] })
        $data = $pngDataList[$i]
        $bw.Write($w)                        # bWidth  (0 = 256)
        $bw.Write($w)                        # bHeight (0 = 256)
        $bw.Write([byte]0)                   # bColorCount
        $bw.Write([byte]0)                   # bReserved
        $bw.Write([uint16]1)                 # wPlanes
        $bw.Write([uint16]32)                # wBitCount
        $bw.Write([uint32]$data.Length)      # dwBytesInRes
        $bw.Write([uint32]$offset)           # dwImageOffset
        $offset += [uint32]$data.Length
    }

    foreach ($data in $pngDataList) { $bw.Write($data) }
    $bw.Flush(); $bw.Dispose(); $fs.Dispose()

    Write-Host "  Icon written -> $OutputPath"
}

New-MarkdownIcon -OutputPath (Join-Path $PSScriptRoot "..\icon.ico")
