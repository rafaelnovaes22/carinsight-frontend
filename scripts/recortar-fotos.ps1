# Baixa as fotos dos carros da Renatinhu's e tira a faixa com o telefone, a marca d'agua e as barras pretas.
# Roda de novo quando entrar carro novo: so processa foto que ainda nao existe em fotos/renatinhus.
# Foto fora do padrao 640x480 nao e recortada: fica listada no fim para alguem olhar.
# O telefone tambem aparece na fachada e na placa interna da loja. Isso muda foto a foto: depois de recortar,
# olhe as fotos novas e anote em cortes-extras.json quantos pixels a mais tirar do topo. Depois rode com -Refazer.
param(
    [string]$Api = 'https://api.carinsight.com.br',
    [string]$Loja = "Renatinhu's Cars",
    [int]$Topo = 64,
    [int]$Base = 62,
    [int]$Qualidade = 90,
    [switch]$Refazer
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'fotos\renatinhus'
$manifesto = Join-Path $raiz 'fotos-recortadas.js'
$cortesExtras = Get-Content (Join-Path $PSScriptRoot 'cortes-extras.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$origemDasFotos = 'https://www.armazena.net/site_externo/emp_394/fotos/'
New-Item -ItemType Directory -Force $destino | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$parametros = New-Object System.Drawing.Imaging.EncoderParameters 1
$parametros.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Qualidade)

# Coluna escura de cima a baixo faz parte da barra preta acrescentada na foto.
function Test-ColunaPreta($imagem, [int]$x, [int]$yIni, [int]$yFim) {
    for ($y = $yIni; $y -lt $yFim; $y += 10) {
        $p = $imagem.GetPixel($x, $y)
        if ($p.R -gt 24 -or $p.G -gt 24 -or $p.B -gt 24) { return $false }
    }
    return $true
}

function Save-Recorte([string]$entrada, [string]$saida, [int]$extra) {
    $imagem = New-Object System.Drawing.Bitmap $entrada
    try {
        if ($imagem.Width -ne 640 -or $imagem.Height -ne 480) { return $false }
        $yFim = $imagem.Height - $Base
        $inicio = $Topo + $extra
        $limite = [int]($imagem.Width / 3)
        $esquerda = 0
        while ($esquerda -lt $limite -and (Test-ColunaPreta $imagem $esquerda $Topo $yFim)) { $esquerda++ }
        $direita = $imagem.Width
        while (($imagem.Width - $direita) -lt $limite -and (Test-ColunaPreta $imagem ($direita - 1) $Topo $yFim)) { $direita-- }

        $largura = $direita - $esquerda
        $altura = $yFim - $inicio
        $recorte = New-Object System.Drawing.Bitmap $largura, $altura
        $graficos = [System.Drawing.Graphics]::FromImage($recorte)
        try {
            $alvo = New-Object System.Drawing.Rectangle 0, 0, $largura, $altura
            $fonte = New-Object System.Drawing.Rectangle $esquerda, $inicio, $largura, $altura
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
$novas = 0
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
                Invoke-WebRequest -UseBasicParsing -Uri $midia.url -OutFile $temporario
                $extra = 0
                $chave = [System.IO.Path]::GetFileNameWithoutExtension($nome)
                if ($cortesExtras.PSObject.Properties.Name -contains $chave) { $extra = [int]$cortesExtras.$chave }
                if (-not (Save-Recorte $temporario $saida $extra)) {
                    $foraDoPadrao.Add($midia.url)
                    continue
                }
                $novas++
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

Write-Host "carros: $(@($carros).Count) | fotos: $($nomes.Count) | novas: $novas | fora do padrao: $($foraDoPadrao.Count)"
$foraDoPadrao | ForEach-Object { Write-Host "  sem recorte: $_" }
