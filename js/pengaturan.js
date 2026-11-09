// pengaturan.js — konfigurasi warnet yang diatur lewat menu Setup.

const Pengaturan = (function () {
  const KUNCI_SIMPAN = "billingTukik.pengaturan.v1";

  // Isi penyimpanan terakhir yang dikenal jendela ini, untuk mengenali perubahan dari jendela lain.
  let teksTerakhir;

  function bawaan() {
    return {
      warnet: { nama: "Warnet Kenangan", alamat: "Jl. Baris Waktu No. 1" },
      biaya: { tarifPerJam: 3000, menitBlok: 15, tarifMalamPerJam: 3000 },
      paket: [
        { nama: "Paket 1 Jam", durasiMenit: 60, harga: 3000, jamMulai: "", jamSelesai: "" },
        { nama: "Paket 2 Jam", durasiMenit: 120, harga: 5000, jamMulai: "", jamSelesai: "" },
        { nama: "Paket Begadang", durasiMenit: 420, harga: 10000, jamMulai: "22:00", jamSelesai: "05:00" },
      ],
      keamanan: { passwordAdmin: "admin" },
      kantin: [
        { nama: "Indomie", harga: 5000 },
        { nama: "Es Teh", harga: 3000 },
        { nama: "Kopi", harga: 3000 },
        { nama: "Air Mineral", harga: 3000 },
      ],
      peringatan: { menit: 5 },
      bunyi: { aktif: true },
      modeUji: { aktif: false, jamUji: "" },
      struk: { kertas: "58", cetakOtomatis: false },
    };
  }

  function muat() {
    const hasil = bawaan();
    try {
      teksTerakhir = localStorage.getItem(KUNCI_SIMPAN);
      const isi = JSON.parse(teksTerakhir);
      if (isi) {
        Object.assign(hasil.warnet, isi.warnet);
        if (Tarif.biayaValid(isi.biaya)) hasil.biaya = isi.biaya;
        if (Array.isArray(isi.paket)) hasil.paket = isi.paket;
        Object.assign(hasil.keamanan, isi.keamanan);
        // Pengaturan dari versi lama belum punya bagian di bawah ini, jadi tetap memakai bawaan.
        if (Array.isArray(isi.kantin)) hasil.kantin = isi.kantin;
        Object.assign(hasil.peringatan, isi.peringatan);
        Object.assign(hasil.bunyi, isi.bunyi);
        Object.assign(hasil.modeUji, isi.modeUji);
        Object.assign(hasil.struk, isi.struk);
      }
    } catch (galat) {
      // Penyimpanan diblokir atau rusak: pakai pengaturan bawaan.
    }
    return hasil;
  }

  let isi = muat();

  function ambil() {
    return isi;
  }

  function ganti(baru) {
    isi = baru;
    try {
      const teks = JSON.stringify(isi);
      localStorage.setItem(KUNCI_SIMPAN, teks);
      teksTerakhir = teks;
    } catch (galat) {
      // Aplikasi tetap jalan, hanya saja pengaturan hilang kalau halaman di-refresh.
    }
  }

  // Membaca ulang kalau jendela lain mengubah pengaturan.
  function segarkan() {
    try {
      if (localStorage.getItem(KUNCI_SIMPAN) !== teksTerakhir) isi = muat();
    } catch (galat) {
      // Penyimpanan diblokir: tetap pakai yang ada di memori.
    }
  }

  function cekPassword(password) {
    return password === isi.keamanan.passwordAdmin;
  }

  // Waktu untuk mengecek jam berlaku paket. Saat mode uji punya jam uji, jam itulah yang dipakai.
  function waktuCekPaket(real = Date.now()) {
    const { aktif, jamUji } = isi.modeUji;
    if (!aktif || !jamUji) return real;
    const [jam, menit] = jamUji.split(":").map(Number);
    const t = new Date(real);
    t.setHours(jam, menit, 0, 0);
    return t.getTime();
  }

  // Menjalankan fungsi berulang: tiap 1 detik, atau lebih rapat saat mode uji supaya angkanya
  // tidak melompat satu menit sekali. Dipakai layar operator dan layar pelanggan.
  function detak(fungsi) {
    fungsi();
    setTimeout(() => detak(fungsi), isi.modeUji.aktif ? 100 : 1000);
  }

  return { ambil, ganti, segarkan, cekPassword, waktuCekPaket, detak };
})();
