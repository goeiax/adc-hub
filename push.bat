@echo off
rem Kirim perubahan terbaru ke GitHub. Klik dua kali setelah sesi pengeditan.
rem Aman dijalankan kapan saja: .gitignore mencegah data pasien & kredensial ikut.
cd /d "%~dp0"
echo === Menyalin form terbaru ke www\ ===
copy /Y "..\ADC_Form1_Registrasi_Anamnesis_Pasien.html" www\ >nul
copy /Y "..\ADC_Form2_Asesmen_Umum_Dokter.html" www\ >nul
copy /Y "..\ADC_Panduan_Pengisian_Form.html" www\ >nul
copy /Y "..\ADC_Form_Asesmen_Slimming_SpGK.html" www\ >nul
copy /Y "..\ADC_SkinQualityProgram_Journey_Outcome_Tracker.html" www\ >nul
echo === Status ===
git add -A
git status --short
git diff --cached --quiet && echo Tidak ada perubahan baru untuk di-commit. || git commit -m "Update %date% %time:~0,5%"
echo === Push ke GitHub (cabang aktif; main hanya lewat pull request) ===
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CABANG=%%b
if "%CABANG%"=="main" (
  echo DITOLAK: Anda di cabang main. Pindah ke dev: git checkout dev
  pause
  exit /b 1
)
git push -u origin %CABANG%
echo Buka pull request dev ^> main: https://github.com/goeiax/adc-hub/compare/main...%CABANG%
echo.
pause
