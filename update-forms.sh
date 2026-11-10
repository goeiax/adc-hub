#!/bin/sh
# Salin versi form terbaru ke www/ yang disajikan hub (padanan update-forms.bat).
# Sumber default: folder induk (Marketing) seperti di PC pengembangan. Di PC klinik, yang biasanya
# hanya menerima folder www/ baru, cukup timpa isi www/ — atau beri folder sumber sebagai argumen:
#   ./update-forms.sh /media/usb/adc-forms
# Server tidak perlu di-restart; di perangkat staf cukup tutup & buka lagi form.
cd "$(dirname "$0")" || exit 1
SRC="${1:-..}"
n=0
for f in \
  ADC_Form1_Registrasi_Anamnesis_Pasien.html \
  ADC_Form2_Asesmen_Umum_Dokter.html \
  ADC_Panduan_Pengisian_Form.html \
  ADC_Form_Asesmen_Slimming_SpGK.html \
  ADC_SkinQualityProgram_Journey_Outcome_Tracker.html; do
  if [ -f "$SRC/$f" ]; then cp -f "$SRC/$f" www/ && echo "diperbarui: $f" && n=$((n+1)); else echo "tidak ada di sumber: $f"; fi
done
[ "$n" -gt 0 ] || { echo "Tidak ada form yang disalin dari $SRC"; exit 1; }
