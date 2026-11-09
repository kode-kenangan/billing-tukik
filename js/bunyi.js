// bunyi.js — bunyi peringatan, waktu habis, pesan masuk, dan bunyi untuk operator.
// Semua bunyi dibuat sendiri dengan Web Audio, tanpa file suara.
//
// Chrome hanya mengizinkan bunyi setelah halaman pernah diklik atau diketik. Sebelum itu
// bunyi dilewati, bukan ditunda, supaya tidak meledak bersamaan saat klik pertama.

const Bunyi = (function () {
  // Setiap nada: frekuensi (Hz), mulai (detik), lama (detik).
  const NADA = {
    // Tiga bip tinggi, gaya alarm komputer lama.
    peringatan: {
      gelombang: "square",
      kuat: 0.12,
      nada: [[880, 0, 0.14], [880, 0.22, 0.14], [880, 0.44, 0.14]],
    },
    // Tiga nada turun yang makin panjang.
    habis: {
      gelombang: "sawtooth",
      kuat: 0.14,
      nada: [[523, 0, 0.25], [392, 0.28, 0.25], [262, 0.56, 0.7]],
    },
    // Dua nada naik yang lembut.
    pesan: {
      gelombang: "sine",
      kuat: 0.25,
      nada: [[784, 0, 0.14], [1047, 0.14, 0.26]],
    },
    // Khusus layar operator. Dibuat beda dari bunyi pelanggan, karena saat demo di satu
    // komputer keduanya terdengar bersamaan.
    // Waktu paket sebuah PC habis: dua nada bergantian seperti sirene kecil.
    operatorHabis: {
      gelombang: "square",
      kuat: 0.12,
      nada: [[660, 0, 0.18], [880, 0.2, 0.18], [660, 0.4, 0.18], [880, 0.6, 0.3]],
    },
    // Sesi selesai dan menunggu dibayar: tiga denting naik seperti mesin kasir.
    operatorBayar: {
      gelombang: "triangle",
      kuat: 0.25,
      nada: [[1319, 0, 0.12], [1568, 0.12, 0.12], [2093, 0.24, 0.35]],
    },
  };

  let konteks = null;

  function ambilKonteks() {
    if (!konteks) konteks = new AudioContext();
    return konteks;
  }

  // Dipanggil saat klik atau ketikan pertama, satu-satunya saat Chrome mengizinkan bunyi menyala.
  function nyalakan() {
    try {
      ambilKonteks().resume();
    } catch (galat) {
      // Web Audio tidak tersedia: aplikasi tetap jalan tanpa bunyi.
    }
  }
  window.addEventListener("pointerdown", nyalakan);
  window.addEventListener("keydown", nyalakan);

  function hidup() {
    return Pengaturan.ambil().bunyi.aktif;
  }

  // Benar kalau bunyi dihidupkan di Setup tetapi halaman ini belum pernah diklik.
  function perluKlik() {
    return hidup() && !(konteks && konteks.state === "running");
  }

  function mainkanNada(ctx, resep, [frekuensi, mulai, lama]) {
    const awal = ctx.currentTime + mulai;
    const osilator = ctx.createOscillator();
    const volume = ctx.createGain();
    osilator.type = resep.gelombang;
    osilator.frequency.value = frekuensi;
    // Volume naik dan turun sedikit supaya tidak ada bunyi "klik" di ujung nada.
    volume.gain.setValueAtTime(0, awal);
    volume.gain.linearRampToValueAtTime(resep.kuat, awal + 0.01);
    volume.gain.setValueAtTime(resep.kuat, awal + lama - 0.03);
    volume.gain.linearRampToValueAtTime(0, awal + lama);
    osilator.connect(volume).connect(ctx.destination);
    osilator.start(awal);
    osilator.stop(awal + lama);
  }

  // Mengembalikan true kalau bunyinya benar-benar dimainkan.
  function mainkan(jenis) {
    if (!hidup() || !konteks || konteks.state !== "running") return false;
    const resep = NADA[jenis];
    for (const nada of resep.nada) mainkanNada(konteks, resep, nada);
    return true;
  }

  return { mainkan, perluKlik };
})();
