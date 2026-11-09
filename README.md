# Billing Tukik 🐢

Billing Tukik adalah aplikasi **billing warnet tiruan** yang berjalan di browser.
Bentuk dan rasanya dibuat seperti program billing di warnet tahun 2000-an:
ada layar **operator** untuk penjaga warnet dan layar **pelanggan** untuk komputer yang disewa,
lengkap dengan maskot Tukik si penyu kecil.

Aplikasi ini dibuat untuk kanal YouTube **Kode Kenangan**, yang membangun ulang aplikasi
dan game nostalgia Indonesia dengan bantuan AI.

> **Penting:** Billing Tukik dibuat untuk **nostalgia dan belajar**, bukan untuk dipakai
> sebagai billing warnet sungguhan.

## Coba langsung di browser

Tidak perlu memasang apa pun:

- Layar operator: <https://kode-kenangan.github.io/billing-tukik/>
- Layar pelanggan PC 1: <https://kode-kenangan.github.io/billing-tukik/pelanggan.html?pc=1>

Buka keduanya di **browser yang sama** (misalnya dua tab di Chrome), lalu mulai sesi
PC 1 dari layar operator. Layar pelanggan akan ikut terbuka dan waktunya berjalan.

## Cara membuka di komputer sendiri

1. Klik tombol hijau **Code** di halaman repositori ini, lalu pilih **Download ZIP**.
2. Ekstrak file ZIP itu ke folder mana saja.
3. Klik dua kali `index.html` untuk membuka layar operator.
4. Klik dua kali `pelanggan.html` untuk membuka layar pelanggan.
   Nomor PC bisa diatur lewat menu Admin di layar pelanggan, atau dengan menambahkan
   `?pc=2` (dan seterusnya) di akhir alamat.

Tidak ada server, database, atau instalasi. Semua berjalan di browser.

## Fitur

- **Layar operator** dengan daftar PC: status, lama main, sisa waktu, dan tagihan.
- **Tarif per jam** dengan hitungan per blok menit, plus tarif malam.
- **Paket waktu**, termasuk paket dengan jam berlaku (contoh: Paket Begadang 22:00–05:00)
  dan password paket untuk pelanggan.
- **Tambah waktu**, **pindah PC**, serta **buka atau kunci semua PC** sekaligus.
- **Kantin**: catat pesanan makanan dan minuman ke tagihan PC.
- **Kasir dan struk** yang bisa dicetak.
- **Kirim pesan** dari operator ke satu PC atau semua PC, beserta log pesannya.
- **Laporan hari ini**: pendapatan dan daftar transaksi.
- **Setup**: nama dan alamat warnet, tarif, paket, menu kantin, bunyi, dan password admin
  (bawaannya `admin`).
- **Mode uji**: 1 menit berjalan dalam 1 detik, cocok untuk mencoba tanpa menunggu lama.
- **Layar pelanggan** dengan layar kunci, login paket, kotak sisa waktu, dan tombol Stop.

## Batasan

- **Halaman web tidak bisa benar-benar mengunci Windows.** Layar kunci pelanggan hanyalah
  tampilan di browser; pelanggan tetap bisa menutup tab atau pindah jendela.
- **Operator dan pelanggan harus dibuka di satu browser yang sama, di komputer yang sama.**
  Kedua layar tersambung lewat penyimpanan browser (localStorage), bukan lewat jaringan.
  Jadi Billing Tukik tidak bisa menghubungkan beberapa komputer seperti billing asli.
- Data tersimpan di browser. Menghapus data situs atau memakai mode penyamaran akan
  membuat data hilang.

## Tonton pembuatannya

Proses pembuatan aplikasi ini bisa ditonton di kanal YouTube **Kode Kenangan**:
<https://www.youtube.com/channel/UCnzeiraFoxHOospwO58ka0g>

## Lisensi

Kode ini memakai [lisensi MIT](LICENSE). Kamu bebas memakai, mengubah, dan membagikannya.
