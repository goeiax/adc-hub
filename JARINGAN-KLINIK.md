# Checklist jaringan klinik untuk ADC Hub — untuk teknisi

**Tujuan:** semua PC dan tablet staf, di ruangan mana pun dan lewat Wi-Fi mana pun di
klinik, bisa membuka ADC Hub dengan **satu alamat tetap**: `http://adc-hub.lan:3777/`

**Kondisi klinik:** 2 penyedia internet, 1 router MikroTik, 4–5 router Wi-Fi.
**Perkiraan waktu:** 1–2 jam. Kerjakan **di luar jam praktik** — Wi-Fi akan putus sebentar.

> Lalu lintas tablet ↔ hub tidak keluar gedung. Dua penyedia internet **bukan** penyebab
> hub tidak terbuka; penyebab yang umum adalah tiap router Wi-Fi membuat jaringannya sendiri.

---

## A. Periksa kondisi sekarang (jangan ubah apa pun dulu)

- [ ] **A1.** Sambungkan HP ke tiap Wi-Fi bergantian, catat alamat IP-nya.

  | Nama Wi-Fi (SSID) | Lokasi | IP yang didapat HP | Gateway |
  |---|---|---|---|
  | | | | |
  | | | | |
  | | | | |
  | | | | |
  | | | | |

  Bila tiga angka pertama **berbeda** antar Wi-Fi (mis. `192.168.1.x` dan `192.168.0.x`),
  router Wi-Fi masih mode *router* → kerjakan bagian C.
- [ ] **A2.** Di MikroTik (WinBox/WebFig), catat: IP LAN MikroTik `__________`,
      rentang DHCP `__________ – __________`, jumlah lease terpakai `____`.
- [ ] **A3.** Catat tiap router Wi-Fi: merek/tipe, kabel dari MikroTik masuk ke port
      **WAN** atau **LAN**, DHCP-nya hidup atau mati.
- [ ] **A4.** Catat server hub: tersambung **kabel** atau Wi-Fi, IP sekarang `__________`,
      MAC address `__________________`.
- [ ] **A5.** **Ekspor cadangan konfigurasi MikroTik** sebelum mengubah apa pun
      (Files ▸ Backup, dan `/export file=sebelum-adc-hub`). Simpan salinannya di luar router.

## B. MikroTik — satu-satunya router dan DHCP

- [ ] **B1.** Pastikan rentang DHCP cukup untuk semua perangkat (staf + tablet + PC +
      printer). Bila kurang, lebarkan pool-nya.
- [ ] **B2.** Sisihkan blok alamat **di luar pool DHCP** untuk perangkat tetap:
      server hub, printer, dan tiap access point.
- [ ] **B3.** **Kunci alamat server hub**: IP ▸ DHCP Server ▸ Leases ▸ pilih server ▸
      *Make Static* (atau isi IP statis di server). IP hub: `__________`
- [ ] **B4.** **Beri nama untuk hub**: IP ▸ DNS ▸ Static ▸ tambah
      `adc-hub.lan` → IP hub. Centang *Allow Remote Requests* di IP ▸ DNS.
- [ ] **B5.** Di IP ▸ DHCP Server ▸ Networks, isi **DNS Servers = IP LAN MikroTik**,
      supaya semua perangkat bertanya nama ke MikroTik.
- [ ] **B6.** Kunci juga alamat **printer** meja perawat (Make Static). IP printer: `__________`

## C. Router Wi-Fi — jadikan access point biasa (ulangi untuk tiap unit)

- [ ] **C1.** Ubah ke mode **Access Point / Bridge** bila tersedia di menunya.
- [ ] **C2.** Bila mode itu tidak ada: **matikan DHCP server**-nya, beri IP LAN tetap dari
      blok B2, lalu **pindahkan kabel dari MikroTik ke port LAN** (bukan port WAN).
- [ ] **C3.** **Matikan** *AP isolation / client isolation / wireless isolation* pada
      Wi-Fi staf. Bila hidup, tablet tidak bisa menjangkau hub.
- [ ] **C4.** Samakan **nama Wi-Fi staf dan kata sandinya** di semua unit, keamanan
      WPA2/WPA3 yang sama, supaya perangkat berpindah ruangan tanpa putus.
- [ ] **C5.** Atur kanal 2,4 GHz bergantian **1 / 6 / 11** antar unit yang berdekatan;
      5 GHz boleh otomatis.

  | Unit | Lokasi | IP tetap | Mode AP ✓ | DHCP mati ✓ | Isolasi mati ✓ |
  |---|---|---|---|---|---|
  | 1 | | | | | |
  | 2 | | | | | |
  | 3 | | | | | |
  | 4 | | | | | |
  | 5 | | | | | |

## D. Server hub

- [ ] **D1.** Server tersambung **kabel** ke MikroTik atau switch (bukan Wi-Fi).
- [ ] **D2.** Firewall server mengizinkan port **3777/TCP** dari jaringan lokal
      (Linux: `sudo ufw allow 3777/tcp`).
- [ ] **D3.** Layanan hub hidup otomatis saat boot (`sudo systemctl status adc-hub`).
- [ ] **D4.** Server tidak tidur/hibernate; BIOS diatur menyala lagi setelah listrik pulih.
- [ ] **D5.** Disarankan: UPS kecil untuk server + MikroTik.

## E. Wi-Fi tamu / pasien (bila ada)

- [ ] **E1.** Wi-Fi tamu berada di jaringan **terpisah** (VLAN atau bridge sendiri) dengan
      aturan firewall yang **menolak** akses ke jaringan staf dan ke IP hub.
- [ ] **E2.** Perangkat staf **tidak** memakai Wi-Fi tamu.

## F. Dua penyedia internet

- [ ] **F1.** Tidak perlu diubah agar hub jalan. Bila kedua jalur internet mati, form dan
      hub tetap berfungsi di dalam klinik; hanya pencarian NeoSoft, reminder WhatsApp dan
      akses dari luar yang berhenti.
- [ ] **F2.** **Kunci server hub ke satu jalur** (mangle / routing rule berdasarkan IP hub),
      supaya koneksi ke database NeoSoft selalu keluar dari IP publik yang sama.
      Jalur dipakai: `__________` · IP publik: `__________`
- [ ] **F3.** Catat IP publik **kedua** jalur dan apakah statis:
      ISP 1 `__________` (statis / berubah) · ISP 2 `__________` (statis / berubah).
      Berikan keduanya ke vendor NeoSoft bila akun database dibatasi per IP.
- [ ] **F4.** **Jangan** membuat port forwarding 3777 dari internet ke hub.

## G. Uji setelah selesai

- [ ] **G1.** Dari PC mana pun: `ping adc-hub.lan` → dibalas oleh IP hub.
- [ ] **G2.** Dari **setiap ruangan / setiap access point**, buka
      `http://adc-hub.lan:3777/` → halaman "Pilih form", baris bawah "Hub: tersambung ✓".
- [ ] **G3.** Berjalan antar ruangan sambil form terbuka: chip **HUB** tetap hijau.
- [ ] **G4.** Dari HP di **Wi-Fi tamu**: alamat hub **tidak** terbuka.
- [ ] **G5.** Form 1: isi No. RM pasien lama → identitas terisi dari NeoSoft
      (membuktikan server keluar ke internet).
- [ ] **G6.** Cetak satu halaman dari PC dokter ke printer meja perawat.
- [ ] **G7.** Matikan lalu nyalakan server: hub hidup sendiri, alamat tetap sama.
- [ ] **G8.** Ekspor cadangan konfigurasi MikroTik yang **baru**.

## H. Serah terima ke klinik

- [ ] **H1.** Tiap perangkat: bookmark / pintasan layar utama ke `http://adc-hub.lan:3777/`.
- [ ] **H2.** Tiap browser memasukkan **kunci hub** dan **masuk** sekali lagi
      (alamat baru dianggap situs baru). PC dokter: izinkan **pop-up** untuk alamat ini.
- [ ] **H3.** Serahkan catatan ini beserta: IP hub, IP printer, nama dan sandi Wi-Fi staf,
      dan lokasi cadangan konfigurasi MikroTik.

---

## Bila masih bermasalah

| Gejala | Periksa |
|---|---|
| Hub terbuka lewat IP, tidak lewat `adc-hub.lan` | B4 dan B5: perangkat belum memakai MikroTik sebagai DNS. Putus-sambung Wi-Fi supaya mengambil pengaturan baru. Sebagian ponsel memakai "Private DNS" — matikan untuk Wi-Fi klinik. |
| Hub terbuka di satu ruangan, tidak di ruangan lain | Access point ruangan itu masih mode router (C1/C2) atau isolasi masih hidup (C3). |
| HP mendapat IP `192.168.0.x` padahal MikroTik `192.168.88.x` | Masih ada router Wi-Fi yang DHCP-nya hidup (C2). |
| Sebagian perangkat tidak dapat IP | Pool DHCP habis (B1), atau dua DHCP server bertabrakan. |
| Hub tidak terbuka dari mana pun | Layanan hub mati (D3) atau firewall server (D2). Uji di server: `curl http://localhost:3777/api/ping`. |
| Pencarian NeoSoft gagal, lainnya normal | Server tidak bisa keluar ke internet port 3306, atau NeoSoft membatasi IP (F2/F3). Lihat `sudo journalctl -u adc-hub \| grep -i neosoft`. |

**Akses dari luar klinik** tidak termasuk checklist ini. Pilihannya (Tailscale, atau
WireGuard di MikroTik bila ada IP publik) dibahas terpisah dengan pemilik klinik.
