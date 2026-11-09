// data.js — menyimpan keadaan semua PC, log, transaksi, dan aksi yang mengubahnya.
// Tidak menyentuh tampilan, karena layar operator dan layar pelanggan memakai file yang sama.
//
// Kedua layar terhubung lewat localStorage. Setiap jendela memegang salinan data di memori,
// jadi sebelum mengubah apa pun ia harus memanggil segarkan() supaya tidak menimpa
// perubahan dari jendela lain.

const DataWarnet = (function () {
  const JUMLAH_PC = 8;
  const BATAS_LOG = 2000;
  const BATAS_PESAN = 50;
  const NAMA_BAWAAN = "Tamu";

  const KUNCI_PC = "billingTukik.v1";
  const KUNCI_LOG = "billingTukik.log.v1";
  const KUNCI_TRANSAKSI = "billingTukik.transaksi.v1";
  const KUNCI_OPERATOR = "billingTukik.operator.v1";
  const KUNCI_PASSWORD = "billingTukik.passwordPaket.v1";
  const KUNCI_KONTROL = "billingTukik.kontrol.v1";
  const KUNCI_PESAN = "billingTukik.pesan.v1";
  const AWALAN_PESAN_DIBACA = "billingTukik.pesanDibaca.pc";

  // Sesi dari versi awal belum menyimpan tarif; versi itu selalu memakai angka ini.
  const TARIF_VERSI_AWAL = { tarifPerJam: 3000, menitBlok: 15, tarifMalamPerJam: 3000 };

  // Teks terakhir yang dikenal jendela ini untuk setiap kunci penyimpanan.
  const teksDikenal = {};

  function baca(kunci, bawaan) {
    try {
      const teks = localStorage.getItem(kunci);
      teksDikenal[kunci] = teks;
      const isi = JSON.parse(teks);
      return isi === null ? bawaan : isi;
    } catch (galat) {
      // Penyimpanan diblokir atau rusak: mulai dari kosong.
      return bawaan;
    }
  }

  function tulis(kunci, nilai) {
    try {
      const teks = JSON.stringify(nilai);
      localStorage.setItem(kunci, teks);
      teksDikenal[kunci] = teks;
    } catch (galat) {
      // Aplikasi tetap jalan, hanya saja data hilang kalau halaman di-refresh.
    }
  }

  // Benar kalau jendela lain sudah mengubah isi kunci ini.
  function berubah(kunci) {
    try {
      return localStorage.getItem(kunci) !== teksDikenal[kunci];
    } catch (galat) {
      // Penyimpanan diblokir: tetap pakai yang ada di memori.
      return false;
    }
  }

  // Sesi lama dipakai hanya kalau isinya masih masuk akal.
  function sesiValid(sesi) {
    const dasar =
      sesi &&
      typeof sesi.nama === "string" &&
      Number.isFinite(sesi.mulai) &&
      Object.hasOwn(Tarif.JENIS_SESI, sesi.jenis) &&
      Tarif.biayaValid(sesi.tarif || TARIF_VERSI_AWAL);
    if (!dasar || sesi.jenis !== "paket") return dasar;
    return Boolean(sesi.paket) && Number.isInteger(sesi.paket.harga) && Number.isFinite(sesi.batasAkhir);
  }

  function muatPc() {
    const isi = baca(KUNCI_PC, []);
    const tersimpan = Array.isArray(isi) ? isi : [];

    const hasil = [];
    for (let nomor = 1; nomor <= JUMLAH_PC; nomor++) {
      const lama = tersimpan.find((pc) => pc && pc.nomor === nomor);
      const sesi = lama && sesiValid(lama.sesi) ? lama.sesi : null;
      if (sesi && !sesi.tarif) sesi.tarif = TARIF_VERSI_AWAL;
      hasil.push({ nomor, sesi });
    }
    return hasil;
  }

  function muatDaftar(kunci) {
    const isi = baca(kunci, []);
    return Array.isArray(isi) ? isi : [];
  }

  function muatOperator() {
    const isi = baca(KUNCI_OPERATOR, null);
    if (isi && typeof isi.nama === "string" && isi.nama) return isi;
    return { nama: "Operator", keluar: false };
  }

  function muatKontrol() {
    const isi = baca(KUNCI_KONTROL, null);
    return { terkunci: Boolean(isi && isi.terkunci) };
  }

  const daftarPc = muatPc();
  const log = muatDaftar(KUNCI_LOG);
  const transaksi = muatDaftar(KUNCI_TRANSAKSI);
  const passwordPaket = muatDaftar(KUNCI_PASSWORD);
  const pesan = muatDaftar(KUNCI_PESAN);
  const operator = muatOperator();
  const kontrol = muatKontrol();
  let revisiLog = 0;

  // Mengisi ulang sebuah daftar tanpa mengganti wadahnya, karena file lain memegang wadah itu.
  function gantiIsi(daftar, baru) {
    daftar.splice(0, daftar.length, ...baru);
  }

  // Mengambil perubahan dari jendela lain. Yang tidak berubah tidak dibaca ulang.
  function segarkan() {
    Pengaturan.segarkan();

    if (berubah(KUNCI_PC)) {
      muatPc().forEach((baru, i) => {
        daftarPc[i].sesi = baru.sesi;
      });
    }
    if (berubah(KUNCI_LOG)) {
      gantiIsi(log, muatDaftar(KUNCI_LOG));
      revisiLog++;
    }
    if (berubah(KUNCI_TRANSAKSI)) gantiIsi(transaksi, muatDaftar(KUNCI_TRANSAKSI));
    if (berubah(KUNCI_PASSWORD)) gantiIsi(passwordPaket, muatDaftar(KUNCI_PASSWORD));
    if (berubah(KUNCI_PESAN)) gantiIsi(pesan, muatDaftar(KUNCI_PESAN));
    if (berubah(KUNCI_OPERATOR)) Object.assign(operator, muatOperator());
    if (berubah(KUNCI_KONTROL)) Object.assign(kontrol, muatKontrol());
  }

  function simpanPc() {
    tulis(KUNCI_PC, daftarPc);
  }

  function simpanOperator() {
    tulis(KUNCI_OPERATOR, operator);
  }

  function simpanTransaksi() {
    tulis(KUNCI_TRANSAKSI, transaksi);
  }

  function ambilPc(nomor) {
    return daftarPc.find((pc) => pc.nomor === nomor);
  }

  // --- Log ---

  function catat(teks) {
    segarkan();
    log.push({ waktu: Date.now(), operator: operator.nama, teks });
    if (log.length > BATAS_LOG) log.splice(0, log.length - BATAS_LOG);
    revisiLog++;
    tulis(KUNCI_LOG, log);
  }

  // --- Status dan tagihan ---

  // Satu PC selalu berada di salah satu keadaan: "mati", "aktif", atau "bayar".
  function statusPc(pc) {
    if (!pc.sesi) return "mati";
    return pc.sesi.selesai ? "bayar" : "aktif";
  }

  // Lama dan biaya sebuah sesi saat ini. Kalau sudah selesai, angkanya berhenti.
  function tagihan(sesi) {
    const detik = Tarif.hitungDetik(sesi.mulai, sesi.selesai || Tarif.waktuSesi(sesi));
    const { biaya, rincian } = Tarif.hitung(sesi, detik);
    const biayaTransaksi = (sesi.kantin || []).reduce((jumlah, b) => jumlah + b.harga * b.jumlah, 0);
    return { detik, rincian, biayaInternet: biaya, biayaTransaksi, total: biaya + biayaTransaksi };
  }

  function jumlahAktif() {
    return daftarPc.filter((pc) => statusPc(pc) === "aktif").length;
  }

  // --- Sesi ---

  // Isi sesi yang sama untuk semua cara memulai. Sesi di mode uji langsung memakai jam cepat.
  function sesiBaru(nama, jenis, mulai, tambahan) {
    const pengaturan = Pengaturan.ambil();
    const sesi = {
      nama,
      jenis,
      mulai,
      selesai: null,
      tarif: { ...pengaturan.biaya },
      kantin: [],
      ...tambahan,
    };
    if (pengaturan.modeUji.aktif) {
      sesi.uji = true;
      Tarif.setelJam(sesi, Tarif.KALI_UJI, mulai);
    }
    return sesi;
  }

  function mulaiSesi(nomor, nama, jenis) {
    segarkan();
    const pc = ambilPc(nomor);
    if (pc.sesi) return;
    pc.sesi = sesiBaru(nama, jenis, Date.now());
    simpanPc();
    catat(`PC ${nomor} mulai sesi ${Tarif.JENIS_SESI[jenis].label} oleh ${nama}`);
  }

  function cariPaket(namaPaket) {
    return Pengaturan.ambil().paket.find((p) => p.nama === namaPaket);
  }

  function galatJamPaket(paket) {
    if (Tarif.paketBerlaku(paket, Pengaturan.waktuCekPaket())) return null;
    return `${paket.nama} hanya bisa dipilih pukul ${Tarif.labelJamBerlaku(paket)}.`;
  }

  // Lama waktu yang didapat dari sebuah paket kalau dipakai sekarang, dalam milidetik.
  function durasiPaketMs(paket, real = Date.now()) {
    const acuan = Pengaturan.waktuCekPaket(real);
    return Tarif.batasAkhirPaket(paket, acuan) - acuan;
  }

  function sesiPaket(nama, paket) {
    const mulai = Date.now();
    return sesiBaru(nama, "paket", mulai, {
      paket: { nama: paket.nama, harga: paket.harga, durasiMenit: paket.durasiMenit },
      batasAkhir: mulai + durasiPaketMs(paket, mulai),
      tambahan: [],
      habis: false,
      diperingatkan: false,
    });
  }

  // Login paket dari layar pelanggan. Mengembalikan teks galat, atau null kalau berhasil.
  function mulaiPaket(nomor, nama, namaPaket, password) {
    segarkan();
    const pc = ambilPc(nomor);
    if (pc.sesi) return "PC ini sedang dipakai.";
    if (kontrol.terkunci) return "PC ini sedang dikunci operator.";

    const paket = cariPaket(namaPaket);
    if (!paket) return "Paket itu sudah tidak tersedia.";

    const galatJam = galatJamPaket(paket);
    if (galatJam) return galatJam;

    const urutan = passwordPaket.findIndex((p) => p.paket === namaPaket && p.password === password);
    if (urutan === -1) return "Password salah.";

    // Password hanya berlaku sekali.
    passwordPaket.splice(urutan, 1);
    tulis(KUNCI_PASSWORD, passwordPaket);

    pc.sesi = sesiPaket(nama, paket);
    simpanPc();
    catat(`PC ${nomor} mulai ${paket.nama} oleh ${nama}, password ${password} terpakai`);
    return null;
  }

  // Operator membuka paket langsung, tanpa password. Mengembalikan teks galat, atau null.
  function mulaiPaketOperator(nomor, nama, namaPaket) {
    segarkan();
    const pc = ambilPc(nomor);
    if (pc.sesi) return "PC ini sedang dipakai.";

    const paket = cariPaket(namaPaket);
    if (!paket) return "Paket itu sudah tidak tersedia.";

    const galatJam = galatJamPaket(paket);
    if (galatJam) return galatJam;

    pc.sesi = sesiPaket(nama, paket);
    simpanPc();
    catat(`PC ${nomor} mulai ${paket.nama} oleh ${nama}, dibuka operator`);
    return null;
  }

  function selesaiSesi(nomor) {
    segarkan();
    const pc = ambilPc(nomor);
    if (statusPc(pc) !== "aktif") return;
    pc.sesi.selesai = Tarif.waktuSesi(pc.sesi);
    simpanPc();
    catat(`PC ${nomor} selesai, tagihan ${Tarif.formatRupiah(tagihan(pc.sesi).total)}`);
  }

  // Sisa waktu paket dalam detik utuh.
  function sisaDetik(sesi) {
    return Math.max(0, Math.ceil((sesi.batasAkhir - Tarif.waktuSesi(sesi)) / 1000));
  }

  // --- Tambah waktu dan pindah PC ---

  // Mengembalikan teks galat, atau null kalau berhasil.
  function tambahWaktu(nomor, namaPaket) {
    segarkan();
    const pc = ambilPc(nomor);
    if (statusPc(pc) !== "aktif" || pc.sesi.jenis !== "paket") return "Sesi paket di PC ini sudah berakhir.";

    const paket = cariPaket(namaPaket);
    if (!paket) return "Paket itu sudah tidak tersedia.";

    const galatJam = galatJamPaket(paket);
    if (galatJam) return galatJam;

    const sesi = pc.sesi;
    const durasiMs = durasiPaketMs(paket);
    // Titik jam dipindah ke sekarang dulu, karena perhitungan rem mode uji memakai batas akhir.
    if (sesi.jamUji) Tarif.setelJam(sesi, sesi.jamUji.kali);
    sesi.batasAkhir += durasiMs;
    if (!sesi.tambahan) sesi.tambahan = [];
    sesi.tambahan.push({ nama: paket.nama, harga: paket.harga });

    // Kalau sisa waktunya sudah lega lagi, peringatan boleh muncul sekali lagi nanti.
    const sisa = sisaDetik(sesi);
    if (sisa > Pengaturan.ambil().peringatan.menit * 60) sesi.diperingatkan = false;
    simpanPc();

    const bertambah = Tarif.formatDurasi(Math.round(durasiMs / 60000));
    kirimPesan(`${paket.nama} ditambahkan, waktu bertambah ${bertambah}. Sisa waktu sekarang ${Tarif.formatLama(sisa)}.`, {
      untuk: nomor,
      judul: "Waktu Bertambah",
    });
    catat(`PC ${nomor} tambah waktu ${paket.nama}, sisa ${Tarif.formatLama(sisa)}`);
    return null;
  }

  // Memindahkan sesi utuh, jadi waktu, biaya, dan pesanan kantinnya ikut. Mengembalikan galat atau null.
  function pindahPc(dari, ke) {
    segarkan();
    const asal = ambilPc(dari);
    const tujuan = ambilPc(ke);
    if (statusPc(asal) !== "aktif") return `Sesi di PC ${dari} sudah berakhir.`;
    if (!tujuan || tujuan.sesi) return `PC ${ke} sedang dipakai.`;

    tujuan.sesi = asal.sesi;
    asal.sesi = null;
    simpanPc();
    catat(`Pelanggan ${tujuan.sesi.nama} pindah dari PC ${dari} ke PC ${ke}`);
    return null;
  }

  // --- Kantin ---

  // Harga disalin saat dipesan, jadi tidak ikut berubah kalau menu diubah di Setup.
  function tambahKantin(nomor, namaBarang) {
    segarkan();
    const pc = ambilPc(nomor);
    if (!pc.sesi) return `PC ${nomor} tidak punya tagihan.`;
    const barang = Pengaturan.ambil().kantin.find((b) => b.nama === namaBarang);
    if (!barang) return "Barang itu sudah tidak ada di menu.";

    if (!pc.sesi.kantin) pc.sesi.kantin = [];
    const sama = pc.sesi.kantin.find((b) => b.nama === barang.nama && b.harga === barang.harga);
    if (sama) sama.jumlah++;
    else pc.sesi.kantin.push({ nama: barang.nama, harga: barang.harga, jumlah: 1 });
    simpanPc();
    catat(`PC ${nomor} pesan ${barang.nama} ${Tarif.formatRupiah(barang.harga)}`);
    return null;
  }

  // Membatalkan satu buah dari baris pesanan ke sekian.
  function batalKantin(nomor, urutan) {
    segarkan();
    const pc = ambilPc(nomor);
    const barang = pc.sesi && pc.sesi.kantin ? pc.sesi.kantin[urutan] : null;
    if (!barang) return "Pesanan itu sudah tidak ada.";

    barang.jumlah--;
    if (barang.jumlah === 0) pc.sesi.kantin.splice(urutan, 1);
    simpanPc();
    catat(`PC ${nomor} batal pesan ${barang.nama}`);
    return null;
  }

  // --- Mode uji ---

  // Sesi yang sedang berjalan ikut berganti kecepatan tanpa melompat, dan tetap ditandai
  // sebagai sesi uji walau mode uji dimatikan lagi sebelum sesinya selesai.
  function aturModeUji(aktif) {
    segarkan();
    for (const pc of daftarPc) {
      if (statusPc(pc) !== "aktif") continue;
      if (aktif) {
        pc.sesi.uji = true;
        Tarif.setelJam(pc.sesi, Tarif.KALI_UJI);
      } else if (pc.sesi.jamUji) {
        Tarif.setelJam(pc.sesi, 1);
      }
    }
    simpanPc();
    catat(aktif ? "Mode uji dinyalakan" : "Mode uji dimatikan");
  }

  // Mengakhiri paket yang waktunya sudah lewat. Layar pelanggan memeriksa PC-nya sendiri tepat
  // waktu. Layar operator memberi tenggang, dan baru mengambil alih kalau jendela pelanggan
  // tertutup, supaya kejadian yang sama tidak tercatat dua kali.
  function periksaPaketHabis({ nomor = null, tenggangMs = 0 } = {}) {
    for (const pc of daftarPc) {
      if (nomor !== null && pc.nomor !== nomor) continue;
      if (statusPc(pc) !== "aktif" || pc.sesi.jenis !== "paket") continue;
      if (Tarif.waktuSesi(pc.sesi) < pc.sesi.batasAkhir + tenggangMs) continue;

      // Lama pemakaian berhenti tepat di batas, walau baru terdeteksi sesudahnya.
      pc.sesi.selesai = pc.sesi.batasAkhir;
      pc.sesi.habis = true;
      simpanPc();
      catat(`PC ${pc.nomor} waktu paket habis, tagihan ${Tarif.formatRupiah(tagihan(pc.sesi).total)}`);
    }
  }

  function tandaiPeringatan(nomor) {
    segarkan();
    const pc = ambilPc(nomor);
    if (statusPc(pc) !== "aktif" || pc.sesi.diperingatkan) return;
    pc.sesi.diperingatkan = true;
    simpanPc();
    catat(`PC ${nomor} mendapat peringatan sisa waktu paket`);
  }

  // Mencatat pembayaran dan mengosongkan PC. Mengembalikan transaksi, atau null kalau ditolak.
  function bayar(nomor, uang) {
    segarkan();
    const pc = ambilPc(nomor);
    if (statusPc(pc) !== "bayar") return null;

    const sesi = pc.sesi;
    const t = tagihan(sesi);
    if (uang < t.total) return null;

    const { nama, alamat } = Pengaturan.ambil().warnet;
    const baru = {
      nomor,
      nama: sesi.nama,
      jenis: sesi.jenis,
      mulai: sesi.mulai,
      selesai: sesi.selesai,
      detik: t.detik,
      rincian: t.rincian,
      biayaInternet: t.biayaInternet,
      biayaTransaksi: t.biayaTransaksi,
      kantin: sesi.kantin || [],
      uji: Boolean(sesi.uji),
      total: t.total,
      uang,
      kembalian: uang - t.total,
      dibayar: Date.now(),
      operator: operator.nama,
      warnet: { nama, alamat },
      strukTerbuka: true,
    };

    transaksi.push(baru);
    pc.sesi = null;
    simpanTransaksi();
    simpanPc();
    catat(
      `PC ${nomor} dibayar ${Tarif.formatRupiah(baru.total)}, ` +
        `uang ${Tarif.formatRupiah(uang)}, kembalian ${Tarif.formatRupiah(baru.kembalian)}`
    );
    return baru;
  }

  // --- Password paket ---

  // Empat angka acak yang belum dipakai password lain.
  function usulPassword() {
    let usul;
    do {
      usul = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    } while (passwordPaket.some((p) => p.password === usul));
    return usul;
  }

  // Mengembalikan teks galat, atau null kalau berhasil.
  function buatPasswordPaket(namaPaket, password) {
    segarkan();
    if (!password) return "Password belum diisi.";
    if (!Pengaturan.ambil().paket.some((p) => p.nama === namaPaket)) return "Pilih paket dulu.";
    if (passwordPaket.some((p) => p.password === password)) return "Password itu masih aktif, pakai yang lain.";

    passwordPaket.push({ paket: namaPaket, password, dibuat: Date.now() });
    tulis(KUNCI_PASSWORD, passwordPaket);
    return null;
  }

  // --- Kunci dan pesan dari operator ---

  function aturKunciSemua(terkunci) {
    segarkan();
    kontrol.terkunci = terkunci;
    tulis(KUNCI_KONTROL, kontrol);
  }

  function semuaTerkunci() {
    return kontrol.terkunci;
  }

  // untuk: nomor PC tujuan, atau null untuk semua PC. judul: judul kotak di layar pelanggan.
  function kirimPesan(teks, { untuk = null, judul = "Pesan dari Operator" } = {}) {
    segarkan();
    const terakhir = pesan.length ? pesan[pesan.length - 1].id : 0;
    const id = Math.max(Date.now(), terakhir + 1);
    // Pesan khusus untuk PC yang jendelanya belum pernah dibuka harus tetap menunggu di sana.
    if (untuk !== null && bacaPesanDibaca(untuk) === null) tandaiPesanDibaca(untuk, id - 1);
    pesan.push({ id, teks, untuk, judul });
    if (pesan.length > BATAS_PESAN) pesan.splice(0, pesan.length - BATAS_PESAN);
    tulis(KUNCI_PESAN, pesan);
  }

  function bacaPesanDibaca(nomor) {
    try {
      return localStorage.getItem(AWALAN_PESAN_DIBACA + nomor);
    } catch (galat) {
      // Penyimpanan diblokir: anggap belum pernah dibaca.
      return null;
    }
  }

  // Pesan yang belum dibaca sebuah PC. Saat PC pertama kali dibuka, pesan lama tidak
  // ikut muncul; sesudah itu pesan tetap menunggu walau jendelanya sedang tertutup.
  function pesanBelumDibaca(nomor) {
    const dibaca = bacaPesanDibaca(nomor);
    if (dibaca === null) {
      const terakhir = pesan.length ? pesan[pesan.length - 1].id : 0;
      tandaiPesanDibaca(nomor, terakhir);
      return [];
    }
    return pesan.filter((p) => p.id > Number(dibaca) && (p.untuk == null || p.untuk === nomor));
  }

  function tandaiPesanDibaca(nomor, id) {
    try {
      localStorage.setItem(AWALAN_PESAN_DIBACA + nomor, String(id));
    } catch (galat) {
      // Penyimpanan diblokir: pesan bisa muncul lagi setelah refresh.
    }
  }

  // --- Struk ---

  function strukTertunda() {
    return transaksi.find((t) => t.strukTerbuka) || null;
  }

  function tutupStruk(t) {
    segarkan();
    // Daftar bisa saja sudah dibaca ulang, jadi transaksinya dicari lagi.
    const sama = transaksi.find((x) => x.dibayar === t.dibayar && x.nomor === t.nomor) || t;
    sama.strukTerbuka = false;
    simpanTransaksi();
  }

  // --- Laporan ---

  function transaksiHariIni() {
    const hariIni = new Date().toDateString();
    return transaksi.filter((t) => new Date(t.dibayar).toDateString() === hariIni);
  }

  // --- Operator ---

  function gantiOperator(nama) {
    segarkan();
    const lama = operator.nama;
    if (nama === lama) return;
    operator.nama = nama;
    simpanOperator();
    catat(`Operator berganti dari ${lama} ke ${nama}`);
  }

  function aturKeluar(keluar) {
    segarkan();
    operator.keluar = keluar;
    simpanOperator();
    catat(keluar ? `Operator ${operator.nama} keluar` : `Operator ${operator.nama} masuk lagi`);
  }

  return {
    JUMLAH_PC,
    NAMA_BAWAAN,
    daftarPc,
    log,
    operator,
    segarkan,
    ambilPc,
    catat,
    revisiLog: () => revisiLog,
    statusPc,
    tagihan,
    jumlahAktif,
    mulaiSesi,
    mulaiPaket,
    mulaiPaketOperator,
    selesaiSesi,
    sisaDetik,
    tambahWaktu,
    pindahPc,
    tambahKantin,
    batalKantin,
    aturModeUji,
    periksaPaketHabis,
    tandaiPeringatan,
    bayar,
    usulPassword,
    buatPasswordPaket,
    aturKunciSemua,
    semuaTerkunci,
    kirimPesan,
    pesanBelumDibaca,
    tandaiPesanDibaca,
    strukTertunda,
    tutupStruk,
    transaksiHariIni,
    gantiOperator,
    aturKeluar,
  };
})();
