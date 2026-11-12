@echo off
rem Jembatan akses-luar (Tailscale) untuk ADC Hub di PC Windows. Aman dijalankan berulang kali.
rem Baca RENCANA-AKSES-LUAR-TAILSCALE.md. Port lain: akses-luar.bat 3780
setlocal
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=3777
where tailscale >nul 2>&1
if errorlevel 1 (
  echo Tailscale belum terpasang. Unduh dari https://tailscale.com/download, login, lalu jalankan lagi.
  pause
  exit /b 1
)
if exist hub.pfx echo PERINGATAN: hub.pfx ada. Di belakang Tailscale hub harus http biasa - pindahkan hub.pfx lalu restart hub.
echo Menyalakan jembatan https ke hub (port %PORT%)...
tailscale serve --bg --https=443 http://127.0.0.1:%PORT%
if errorlevel 1 (
  echo Gagal. Pastikan sudah login Tailscale dan MagicDNS + HTTPS Certificates aktif di https://login.tailscale.com/admin/dns
  pause
  exit /b 1
)
echo.
tailscale serve status
echo.
echo Alamat di atas berfungsi dari jaringan mana pun untuk perangkat yang sudah login Tailscale.
echo Mematikan: tailscale serve --https=443 off
pause
