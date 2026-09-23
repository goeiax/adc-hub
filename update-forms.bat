@echo off
rem Salin versi form terbaru dari folder induk (Marketing) ke www\ yang disajikan hub.
rem Jalankan setiap kali form diperbarui. Server tidak perlu di-restart.
cd /d "%~dp0"
copy /Y "..\ADC_Form1_Registrasi_Anamnesis_Pasien.html" www\ >nul && echo Form 1 diperbarui
copy /Y "..\ADC_Form2_Asesmen_Umum_Dokter.html" www\ >nul && echo Form 2 diperbarui
copy /Y "..\ADC_Panduan_Pengisian_Form.html" www\ >nul && echo Panduan diperbarui
pause
