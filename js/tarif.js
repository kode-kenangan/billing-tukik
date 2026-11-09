// tarif.js — semua aturan hitung biaya dan format angka ada di sini.
// Jenis sesi baru cukup ditambahkan sebagai isi baru di JENIS_SESI.

const Tarif = (function () {
  const JAM_MALAM_MULAI = 22;
  const JAM_MALAM_SELESAI = 5;

  // Mode uji: 1 menit berjalan dalam 1 detik. Pada 30 detik terakhir paket, waktu kembali
  // ke kecepatan normal supaya hitungan mundur terakhir masih sempat dilihat dan ditolong.
  const KALI_UJI = 60;
  const REM_UJI_MS = 30000;

  // Waktu menurut sebuah sesi. Sesi biasa memakai jam asli. Sesi yang pernah kena mode uji
  // punya jam sendiri (sesi.jamUji), jadi jam di dinding warnet tetap benar.
  // Hasilnya dihitung langsung dari data sesi, sehingga semua jendela selalu mendapat angka sama.
  function waktuSesi(sesi, real = Date.now()) {
    const jam = sesi.jamUji;
    if (!jam) return real;

    const lewat = Math.max(0, real - jam.titikReal);
    const biasa = jam.titikSesi + lewat;
    if (jam.kali === 1) return biasa;

    const cepat = jam.titikSesi + lewat * jam.kali;
    if (sesi.jenis !== "paket") return cepat;

    const titikRem = sesi.batasAkhir - REM_UJI_MS;
    if (cepat <= titikRem) return cepat;
    if (jam.titikSesi >= titikRem) return biasa;
    const lewatSampaiRem = (titikRem - jam.titikSesi) / jam.kali;
    return titikRem + (lewat - lewatSampaiRem);
  }

  // Mengatur kecepatan jam sesi mulai dari sekarang, tanpa membuat waktunya melompat.
  function setelJam(sesi, kali, real = Date.now()) {
    sesi.jamUji = { titikReal: real, titikSesi: waktuSesi(sesi, real), kali };
  }

  // Tulisan tanda mode uji di kedua layar.
  function labelModeUji({ jamUji }) {
    const jam = jamUji ? `, jam uji ${jamUji.replace(":", ".")}` : "";
    return `MODE UJI (1 menit = 1 detik${jam})`;
  }

  // Harga satu blok, dibulatkan ke atas kalau hasilnya pecahan.
  function hargaBlok(tarifPerJam, menitBlok) {
    return Math.ceil((tarifPerJam * menitBlok) / 60);
  }

  function jamMalam(waktu) {
    const jam = new Date(waktu).getHours();
    return jam >= JAM_MALAM_MULAI || jam < JAM_MALAM_SELESAI;
  }

  // Daftar jenis sesi. Setiap jenis punya cara hitung sendiri.
  // sesi.tarif adalah salinan tarif saat sesi dimulai, jadi tidak berubah di tengah jalan.
  const JENIS_SESI = {
    personal: {
      label: "Personal",
      hitung(sesi, detik) {
        const { tarifPerJam, tarifMalamPerJam, menitBlok } = sesi.tarif;
        const detikBlok = menitBlok * 60;
        // Blok pertama langsung terhitung sejak detik nol, lalu dibulatkan ke atas.
        const jumlahBlok = Math.max(1, Math.ceil(detik / detikBlok));

        // Setiap blok memakai tarif sesuai jam saat blok itu dimulai.
        let blokSiang = 0;
        let blokMalam = 0;
        for (let i = 0; i < jumlahBlok; i++) {
          if (jamMalam(sesi.mulai + i * detikBlok * 1000)) blokMalam++;
          else blokSiang++;
        }

        const hargaSiang = hargaBlok(tarifPerJam, menitBlok);
        const hargaMalam = hargaBlok(tarifMalamPerJam, menitBlok);
        const rincian = [];
        if (blokSiang) {
          const label = blokMalam ? "blok siang" : "blok";
          rincian.push(`${blokSiang} ${label} x ${formatRupiah(hargaSiang)}`);
        }
        if (blokMalam) {
          rincian.push(`${blokMalam} blok malam x ${formatRupiah(hargaMalam)}`);
        }

        return { biaya: blokSiang * hargaSiang + blokMalam * hargaMalam, rincian };
      },
      labelTarif(sesi, waktu) {
        const { tarifPerJam, tarifMalamPerJam } = sesi.tarif;
        return formatRupiah(jamMalam(waktu) ? tarifMalamPerJam : tarifPerJam) + "/jam";
      },
    },
    paket: {
      label: "Paket",
      // Harga paket tetap, berapa pun lama pemakaiannya. Tambah waktu menambah harganya.
      hitung(sesi) {
        const { nama, harga } = sesi.paket;
        const tambahan = sesi.tambahan || [];
        return {
          biaya: tambahan.reduce((jumlah, t) => jumlah + t.harga, harga),
          rincian: [
            `${nama} ${formatRupiah(harga)}`,
            ...tambahan.map((t) => `+ ${t.nama} ${formatRupiah(t.harga)}`),
          ],
        };
      },
      labelTarif(sesi) {
        return `${sesi.paket.nama} ${formatRupiah(sesi.paket.harga)}`;
      },
    },
  };

  function hitung(sesi, detik) {
    return JENIS_SESI[sesi.jenis].hitung(sesi, detik);
  }

  function labelTarif(sesi, waktu) {
    return JENIS_SESI[sesi.jenis].labelTarif(sesi, waktu);
  }

  // --- Aturan jam berlaku paket ---

  // "22:00" menjadi 1320, yaitu jumlah menit sejak tengah malam.
  function menitDariJam(teks) {
    const [jam, menit] = teks.split(":").map(Number);
    return jam * 60 + menit;
  }

  // Paket tanpa jam berlaku bisa dipilih kapan saja. Jam mulai yang lebih besar
  // dari jam selesai berarti rentangnya melewati tengah malam, seperti 22:00-05:00.
  function paketBerlaku(paket, waktu) {
    if (!paket.jamMulai || !paket.jamSelesai) return true;
    const t = new Date(waktu);
    const sekarang = t.getHours() * 60 + t.getMinutes();
    const mulai = menitDariJam(paket.jamMulai);
    const selesai = menitDariJam(paket.jamSelesai);
    if (mulai < selesai) return sekarang >= mulai && sekarang < selesai;
    return sekarang >= mulai || sekarang < selesai;
  }

  // Waktu paket habis: setelah durasinya lewat, atau saat jam berlakunya
  // berakhir kalau itu lebih dulu. Begadang yang dimulai 23:00 tetap habis 05:00.
  function batasAkhirPaket(paket, mulai) {
    const akhirDurasi = mulai + paket.durasiMenit * 60000;
    if (!paket.jamSelesai || paket.jamMulai === paket.jamSelesai) return akhirDurasi;

    const selesai = menitDariJam(paket.jamSelesai);
    const akhirJam = new Date(mulai);
    akhirJam.setHours(Math.floor(selesai / 60), selesai % 60, 0, 0);
    if (akhirJam.getTime() <= mulai) akhirJam.setDate(akhirJam.getDate() + 1);
    return Math.min(akhirDurasi, akhirJam.getTime());
  }

  // "22:00" dan "05:00" menjadi "22.00-05.00" untuk ditampilkan ke pelanggan.
  function labelJamBerlaku(paket) {
    return `${paket.jamMulai.replace(":", ".")}-${paket.jamSelesai.replace(":", ".")}`;
  }

  // 420 menit menjadi "7 jam", 90 menit menjadi "1 jam 30 menit".
  function formatDurasi(menit) {
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    if (!jam) return `${sisa} menit`;
    return sisa ? `${jam} jam ${sisa} menit` : `${jam} jam`;
  }

  // Dipakai untuk memeriksa pengaturan dan sesi yang dibaca dari penyimpanan.
  function biayaValid(biaya) {
    return (
      Boolean(biaya) &&
      Number.isInteger(biaya.tarifPerJam) &&
      biaya.tarifPerJam >= 0 &&
      Number.isInteger(biaya.tarifMalamPerJam) &&
      biaya.tarifMalamPerJam >= 0 &&
      Number.isInteger(biaya.menitBlok) &&
      biaya.menitBlok >= 1 &&
      biaya.menitBlok <= 60
    );
  }

  // Selisih dua waktu dalam detik utuh, supaya biaya selalu cocok dengan lama yang tampil.
  function hitungDetik(mulai, selesai) {
    return Math.max(0, Math.floor((selesai - mulai) / 1000));
  }

  function formatRupiah(angka) {
    return "Rp" + angka.toLocaleString("id-ID");
  }

  function duaDigit(angka) {
    return String(angka).padStart(2, "0");
  }

  // 3725 detik menjadi "01:02:05"
  function formatLama(detik) {
    const jam = Math.floor(detik / 3600);
    const menit = Math.floor((detik % 3600) / 60);
    return [jam, menit, detik % 60].map(duaDigit).join(":");
  }

  function formatJam(waktu) {
    const t = new Date(waktu);
    return [t.getHours(), t.getMinutes(), t.getSeconds()].map(duaDigit).join(":");
  }

  function formatTanggal(waktu) {
    return new Date(waktu).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Tanggal pendek untuk Log Pesan, misalnya "05/11"
  function formatTanggalPendek(waktu) {
    const t = new Date(waktu);
    return duaDigit(t.getDate()) + "/" + duaDigit(t.getMonth() + 1);
  }

  return {
    KALI_UJI,
    waktuSesi,
    setelJam,
    labelModeUji,
    JENIS_SESI,
    hargaBlok,
    hitung,
    labelTarif,
    paketBerlaku,
    batasAkhirPaket,
    labelJamBerlaku,
    formatDurasi,
    biayaValid,
    hitungDetik,
    formatRupiah,
    formatLama,
    formatJam,
    formatTanggal,
    formatTanggalPendek,
  };
})();
