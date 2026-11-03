param([string]$Source = (Join-Path $PSScriptRoot '../brand/neon-logo.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$neonIconRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../icons'))
[IO.Directory]::CreateDirectory($neonIconRoot) | Out-Null
$neonSourceImage = [Drawing.Image]::FromFile([IO.Path]::GetFullPath($Source))
try {
    $neonSizes = @{
        'icon-192.png' = 192; 'icon-512.png' = 512; 'icon-maskable-512.png' = 512
        'apple-touch-icon.png' = 180; 'icon-1024.png' = 1024
        'android-48.png' = 48; 'android-72.png' = 72; 'android-96.png' = 96
        'android-144.png' = 144; 'android-192.png' = 192
    }
    foreach ($neonEntry in $neonSizes.GetEnumerator()) {
        $neonSize = $neonEntry.Value
        $neonBitmap = [Drawing.Bitmap]::new($neonSize, $neonSize, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $neonGraphics = [Drawing.Graphics]::FromImage($neonBitmap)
        try {
            $neonGraphics.Clear([Drawing.Color]::FromArgb(8, 5, 26))
            $neonGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $neonGraphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $neonPadding = if ($neonEntry.Key -eq 'icon-maskable-512.png') { [int]($neonSize * 0.08) } else { 0 }
            $neonAvailable = $neonSize - 2 * $neonPadding
            $neonScale = [Math]::Min($neonAvailable / $neonSourceImage.Width, $neonAvailable / $neonSourceImage.Height)
            $neonWidth = [int]($neonSourceImage.Width * $neonScale)
            $neonHeight = [int]($neonSourceImage.Height * $neonScale)
            $neonTarget = [Drawing.Rectangle]::new([int](($neonSize - $neonWidth) / 2), [int](($neonSize - $neonHeight) / 2), $neonWidth, $neonHeight)
            $neonGraphics.DrawImage($neonSourceImage, $neonTarget)
            $neonBitmap.Save((Join-Path $neonIconRoot $neonEntry.Key), [Drawing.Imaging.ImageFormat]::Png)
            Write-Output "$($neonEntry.Key): ${neonSize}x${neonSize}"
        } finally { $neonGraphics.Dispose(); $neonBitmap.Dispose() }
    }
} finally { $neonSourceImage.Dispose() }
