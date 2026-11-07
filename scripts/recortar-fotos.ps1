# Gera as fotos dos carros da Renatinhu's sem nenhum contato da loja, sem cortar o carro.
# O fornecedor guarda cada foto em versoes: -1 traz a tarja com telefone e a marca d'agua, -0 e a mesma foto limpa.
# Por isso parte da -0 e so tira as barras pretas laterais. Nao corta em cima nem embaixo.
# Telefone, site, Instagram e o numero do endereco ainda aparecem na fachada e nas faixas internas. Isso muda foto a foto:
# olhe as fotos novas ampliadas e anote em retoques.json as areas a borrar. Depois rode com -Refazer.
# Roda de novo quando entrar carro novo: so processa foto que ainda nao existe em fotos/renatinhus.
param(
    [string]$Api = 'https://api.carinsight.com.br',
    [string]$Loja = "Renatinhu's Cars",
    [int]$Qualidade = 95,
    [switch]$Refazer
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'fotos\renatinhus'
$manifesto = Join-Path $raiz 'fotos-recortadas.js'
$retoques = Get-Content (Join-Path $PSScriptRoot 'retoques.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$origemDasFotos = 'https://www.armazena.net/site_externo/emp_394/fotos/'
New-Item -ItemType Directory -Force $destino | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parametros = New-Object System.Drawing.Imaging.EncoderParameters 1
$parametros.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Qualidade)

# Coluna escura de cima a baixo faz parte da barra preta acrescentada na foto.
function Test-ColunaPreta($imagem, [int]$x) {
    for ($y = 0; $y -lt $imagem.Height; $y += 10) {
        $p = $imagem.GetPixel($x, $y)
        if ($p.R -gt 24 -or $p.G -gt 24 -or $p.B -gt 24) { return $false }
    }
    return $true
}

# Borra a area reduzindo e ampliando de volta, com a borda suave para nao parecer um remendo.
function Add-Borrao($imagem, [int]$x, [int]$y, [int]$largura, [int]$altura) {
    $x = [Math]::Max(0, $x)
    $y = [Math]::Max(0, $y)
    $largura = [Math]::Min($largura, $imagem.Width - $x)
    $altura = [Math]::Min($altura, $imagem.Height - $y)
    if ($largura -lt 2 -or $altura -lt 2) { return }

    $fonte = New-Object System.Drawing.Rectangle $x, $y, $largura, $altura
    $mini = New-Object System.Drawing.Bitmap ([Math]::Max(2, [int]($largura / 12))), ([Math]::Max(2, [int]($altura / 12)))
    $grande = New-Object System.Drawing.Bitmap $largura, $altura
    $gMini = [System.Drawing.Graphics]::FromImage($mini)
    $gGrande = [System.Drawing.Graphics]::FromImage($grande)
    try {
        $gMini.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
        $gMini.DrawImage($imagem, (New-Object System.Drawing.Rectangle 0, 0, $mini.Width, $mini.Height), $fonte, [System.Drawing.GraphicsUnit]::Pixel)
        $gGrande.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gGrande.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gGrande.DrawImage($mini, 0, 0, $largura, $altura)

        $faixa = 5
        for ($j = 0; $j -lt $altura; $j++) {
            for ($i = 0; $i -lt $largura; $i++) {
                # A borda da foto nao precisa de transicao: o que encosta nela sai inteiro.
                $distX = [Math]::Min($(if ($x -eq 0) { $faixa } else { $i }), $(if ($x + $largura -ge $imagem.Width) { $faixa } else { $largura - 1 - $i }))
                $distY = [Math]::Min($j, $altura - 1 - $j)
                $peso = [Math]::Min(1.0, ([Math]::Min($distX, $distY) + 1) / $faixa)
                $a = $imagem.GetPixel($x + $i, $y + $j)
                $b = $grande.GetPixel($i, $j)
                $imagem.SetPixel($x + $i, $y + $j, [System.Drawing.Color]::FromArgb(
                    [int]($a.R * (1 - $peso) + $b.R * $peso),
                    [int]($a.G * (1 - $peso) + $b.G * $peso),
                    [int]($a.B * (1 - $peso) + $b.B * $peso)))
            }
        }
    } finally {
        $gMini.Dispose()
        $gGrande.Dispose()
        $mini.Dispose()
        $grande.Dispose()
    }
}

function Save-Foto([string]$entrada, [string]$saida, $retoque) {
    $original = New-Object System.Drawing.Bitmap $entrada
    $imagem = New-Object System.Drawing.Bitmap $original
    $original.Dispose()
    try {
        if ($imagem.Width -ne 640 -or $imagem.Height -ne 480) { return $false }
        $limite = [int]($imagem.Width / 2)
        $esquerda = 0
        while ($esquerda -lt $limite -and (Test-ColunaPreta $imagem $esquerda)) { $esquerda++ }
        $direita = $imagem.Width
        while (($imagem.Width - $direita) -lt $limite -and (Test-ColunaPreta $imagem ($direita - 1))) { $direita-- }

        $areas = @()
        $yFim = $imagem.Height
        if ($retoque -is [array]) {
            $areas = $retoque
        } elseif ($retoque) {
            $areas = @($retoque.areas)
            if ($retoque.fimY) { $yFim = [int]$retoque.fimY }
        }
        foreach ($area in $areas) {
            switch ($area[0]) {
                'E' { Add-Borrao $imagem $esquerda ([int]$area[2]) ([int]$area[1]) ([int]$area[3] - [int]$area[2]) }
                'D' { Add-Borrao $imagem ($direita - [int]$area[1]) ([int]$area[2]) ([int]$area[1]) ([int]$area[3] - [int]$area[2]) }
                'A' { Add-Borrao $imagem ([int]$area[1]) ([int]$area[2]) ([int]$area[3]) ([int]$area[4] - [int]$area[2]) }
                default { throw "area desconhecida em retoques.json: $($area[0])" }
            }
        }

        $largura = $direita - $esquerda
        $recorte = New-Object System.Drawing.Bitmap $largura, $yFim
        $graficos = [System.Drawing.Graphics]::FromImage($recorte)
        try {
            $alvo = New-Object System.Drawing.Rectangle 0, 0, $largura, $yFim
            $fonte = New-Object System.Drawing.Rectangle $esquerda, 0, $largura, $yFim
            $graficos.DrawImage($imagem, $alvo, $fonte, [System.Drawing.GraphicsUnit]::Pixel)
            $recorte.Save($saida, $codec, $parametros)
        } finally {
            $graficos.Dispose()
            $recorte.Dispose()
        }
        return $true
    } finally {
        $imagem.Dispose()
    }
}

$carros = (Invoke-RestMethod "$Api/vehicles?limit=100").data | Where-Object { $_.dealer.name -eq $Loja }
if (-not $carros) { throw 'nenhum carro da loja no estoque' }

$nomes = New-Object System.Collections.Generic.List[string]
$novas = New-Object System.Collections.Generic.List[string]
$foraDoPadrao = New-Object System.Collections.Generic.List[string]
$temporario = [System.IO.Path]::GetTempFileName()
try {
    foreach ($carro in $carros) {
        $detalhe = Invoke-RestMethod "$Api/vehicles/$($carro.id)"
        foreach ($midia in $detalhe.media) {
            if ($midia.type -eq 'VIDEO' -or -not $midia.url.StartsWith($origemDasFotos)) { continue }
            $nome = $midia.url.Substring($origemDasFotos.Length)
            $saida = Join-Path $destino $nome
            if ($Refazer -or -not (Test-Path $saida)) {
                $limpa = $midia.url -replace '-\d+\.jpg$', '-0.jpg'
                Invoke-WebRequest -UseBasicParsing -Uri $limpa -OutFile $temporario
                $chave = [System.IO.Path]::GetFileNameWithoutExtension($nome)
                $retoque = $null
                if ($retoques.PSObject.Properties.Name -contains $chave) { $retoque = $retoques.$chave }
                if (-not (Save-Foto $temporario $saida $retoque)) {
                    $foraDoPadrao.Add($midia.url)
                    continue
                }
                $novas.Add($nome)
            }
            $nomes.Add($nome)
        }
    }
} finally {
    Remove-Item $temporario -ErrorAction SilentlyContinue
}

$lista = ($nomes | Sort-Object -Unique | ForEach-Object { "    `"$_`"" }) -join ",`n"
$conteudo = "// Gerado por scripts/recortar-fotos.ps1. Nao editar a mao.`nwindow.FotosRecortadas = {`n  origem: `"$origemDasFotos`",`n  destino: `"/fotos/renatinhus/`",`n  nomes: [`n$lista`n  ]`n};`n"
[System.IO.File]::WriteAllText($manifesto, $conteudo, (New-Object System.Text.UTF8Encoding $false))

Write-Host "carros: $(@($carros).Count) | fotos: $($nomes.Count) | processadas: $($novas.Count) | fora do padrao: $($foraDoPadrao.Count)"
if (-not $Refazer -and $novas.Count) {
    Write-Host 'Fotos novas: olhe ampliadas e anote em retoques.json o que mostrar contato da loja.'
    $novas | ForEach-Object { Write-Host "  nova: $_" }
}
$foraDoPadrao | ForEach-Object { Write-Host "  sem copia: $_" }
