# ============================================================================
# buat-sertifikat.ps1 — sertifikat HTTPS self-signed untuk ADC Hub (Windows, tanpa OpenSSL)
# Jalankan di PowerShell sebagai Administrator, dari folder adc-hub:
#   powershell -ExecutionPolicy Bypass -File tools\buat-sertifikat.ps1 -Nama hub-adc -IP 192.168.1.10
# Hasil: hub.pfx di folder adc-hub (passphrase kosong) -> server.js otomatis jalan di HTTPS.
# Di tiap tablet/PC: buka https://IP:3777 sekali, terima peringatan sertifikat (atau pasang hub.cer
# sebagai "Trusted Root" supaya tidak ada peringatan). Berlaku 5 tahun; ulangi bila IP hub berubah.
# ============================================================================
param(
  [string]$Nama = "adc-hub",
  [string[]]$IP = @(),
  [string]$Keluar = (Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "hub.pfx")
)
$dns = @($Nama, "localhost") + $IP
$cert = New-SelfSignedCertificate -DnsName $dns -CertStoreLocation "Cert:\LocalMachine\My" `
  -FriendlyName "ADC Hub $Nama" -NotAfter (Get-Date).AddYears(5) -KeyExportPolicy Exportable `
  -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256
$pwd = ConvertTo-SecureString -String "" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $Keluar -Password $pwd | Out-Null
Export-Certificate -Cert $cert -FilePath ($Keluar -replace '\.pfx$', '.cer') | Out-Null
Write-Host "Sertifikat dibuat: $Keluar (dan hub.cer untuk dipasang di tablet). Restart hub (start.bat)."
