// pelanggan.js — layar pelanggan: layar kunci, login, jendela info, dan kotak pesan.
// Semua data berasal dari data.js, jadi layar ini otomatis tersambung dengan layar operator.

const Pelanggan = (function () {
  const ambil = (id) => document.getElementById(id);

  const desktop = ambil("desktop");
  const layarKunci = ambil("layar-kunci");
  const tulisanHabis = ambil("tulisan-habis");

  const panelKeterangan = ambil("panel-keterangan");
  const keteranganJudul = ambil("keterangan-judul");
  const keteranganIsi = ambil("keterangan-isi");
  const keteranganTotal = ambil("keterangan-total");

  const panelLogin = ambil("panel-login");
  const pilihPersonal = ambil("pilih-personal");
  const pilihPaket = ambil("pilih-paket");
  const formPersonal = ambil("form-personal");
  const formPaket = ambil("form-paket");
  const personalNama = ambil("personal-nama");
  const paketNama = ambil("paket-nama");
  const paketPassword = ambil("paket-password");
  const galatPaket = ambil("galat-paket");
  const daftarPaket = ambil("daftar-paket");

  const jendelaInfo = ambil("jendela-info");
  const barisSisa = ambil("baris-sisa");

  const kotakPesan = ambil("kotak-pesan");
  const tandaUji = ambil("tanda-uji");
  const petunjukBunyi = ambil("petunjuk-bunyi");
  const kotakWaktu = ambil("kotak-waktu");
  const tombolLayarPenuh = ambil("tombol-layar-penuh");

  const dialogAdmin = ambil("dialog-admin");
  const adminPassword = ambil("admin-password");
  const adminNomor = ambil("admin-nomor");
  const galatAdmin = ambil("galat-admin");

  const KUNCI_NOMOR_PC = "billingTukik.nomorPc.v1";

  let nomor = null;
  let layarTampil = null;
  let tandaDaftarPaket = null;
  let infoDiperkecil = false;

  function nomorValid(teks) {
    const angka = Number(teks);
    return teks && Number.isInteger(angka) && angka >= 1 && angka <= DataWarnet.JUMLAH_PC ? angka : null;
  }

  function bacaNomorTersimpan() {
    try {
      return nomorValid(localStorage.getItem(KUNCI_NOMOR_PC));
    } catch (galat) {
      // Penyimpanan diblokir: dianggap belum diatur.
      return null;
    }
  }

  // Nomor komputer ini diatur lewat menu admin. Alamat seperti pelanggan.html?pc=3 didahulukan
  // tanpa mengubah yang tersimpan, karena penyimpanan dipakai bersama semua jendela di Chrome
  // yang sama, sedangkan demo di satu komputer kadang butuh dua PC sekaligus.
  function bacaNomorPc() {
    return nomorValid(new URLSearchParams(location.search).get("pc")) ?? bacaNomorTersimpan();
  }

  // Layar mana yang tampil. Waktu habis paling diutamakan, lalu kunci dari operator.
  function tentukanLayar(pc) {
    if (pc.sesi && pc.sesi.habis) return "habis";
    if (DataWarnet.semuaTerkunci()) return "dikunci";
    const status = DataWarnet.statusPc(pc);
    if (status === "aktif") return "desktop";
    if (status === "bayar") return "bayar";
    return "login";
  }

  // --- Kotak pesan ---

  // Pesan ditampilkan satu per satu. Yang berikutnya muncul setelah OK ditekan.
  const antrean = [];
  let kotakAktif = null;
  let idPesanTerakhir = 0;

  function tampilkanKotakBerikut() {
    if (kotakAktif || !antrean.length) return;
    kotakAktif = antrean.shift();
    ambil("kotak-judul").textContent = kotakAktif.judul;
    ambil("kotak-isi").textContent = kotakAktif.isi;
    kotakPesan.classList.toggle("peringatan", Boolean(kotakAktif.peringatan));
    kotakPesan.showModal();
  }

  // Dipanggil setiap kali kotak tertutup, termasuk lewat tombol Esc.
  kotakPesan.addEventListener("close", () => {
    if (kotakAktif && kotakAktif.idPesan) DataWarnet.tandaiPesanDibaca(nomor, kotakAktif.idPesan);
    kotakAktif = null;
    tampilkanKotakBerikut();
  });

  function ambilPesanBaru() {
    let adaBaru = false;
    for (const pesan of DataWarnet.pesanBelumDibaca(nomor)) {
      if (pesan.id <= idPesanTerakhir) continue;
      idPesanTerakhir = pesan.id;
      adaBaru = true;
      antrean.push({ judul: pesan.judul || "Pesan dari Operator", isi: pesan.teks, idPesan: pesan.id });
    }
    // Beberapa pesan yang datang bersamaan cukup berbunyi satu kali.
    if (adaBaru) Bunyi.mainkan("pesan");
    tampilkanKotakBerikut();
  }

  function detikPeringatan() {
    return Pengaturan.ambil().peringatan.menit * 60;
  }

  // 300 detik menjadi "5 menit", 40 detik menjadi "40 detik".
  function teksSisa(detik) {
    return detik < 60 ? `${detik} detik` : `${Math.ceil(detik / 60)} menit`;
  }

  function periksaPeringatan(pc) {
    const sesi = pc.sesi;
    if (DataWarnet.statusPc(pc) !== "aktif" || sesi.jenis !== "paket" || sesi.diperingatkan) return;

    const sisa = DataWarnet.sisaDetik(sesi);
    if (sisa > detikPeringatan() || sisa === 0) return;

    DataWarnet.tandaiPeringatan(nomor);
    Bunyi.mainkan("peringatan");
    antrean.unshift({
      judul: "Peringatan Waktu",
      isi: `Sisa waktu paket Anda tinggal ${teksSisa(sisa)}.`,
      peringatan: true,
    });
    tampilkanKotakBerikut();
  }

  // Peringatan sudah tidak berguna kalau sesinya berakhir.
  function buangPeringatan() {
    for (let i = antrean.length - 1; i >= 0; i--) {
      if (antrean[i].peringatan) antrean.splice(i, 1);
    }
    if (kotakAktif && kotakAktif.peringatan) kotakPesan.close();
  }

  // --- Isi tampilan ---

  function isiJendelaInfo(pc) {
    const sesi = pc.sesi;
    const tagihan = DataWarnet.tagihan(sesi);
    ambil("info-judul").textContent = `PC ${nomor} - ${sesi.nama}`;
    ambil("info-mulai").textContent = Tarif.formatJam(sesi.mulai);
    ambil("info-lama").textContent = Tarif.formatLama(tagihan.detik);
    ambil("info-tarif").textContent = Tarif.labelTarif(sesi, Date.now());
    ambil("info-total").textContent = Tarif.formatRupiah(tagihan.total);
    // Jam tiga digit seperti billing warnet dulu, misalnya 000:03:40.
    kotakWaktu.textContent = Tarif.formatLama(tagihan.detik).padStart(9, "0");
    jendelaInfo.hidden = infoDiperkecil;
    kotakWaktu.hidden = !infoDiperkecil;

    const adaSisa = sesi.jenis === "paket";
    barisSisa.hidden = !adaSisa;
    if (adaSisa) {
      const sisa = DataWarnet.sisaDetik(sesi);
      ambil("info-sisa").textContent = Tarif.formatLama(sisa);
      jendelaInfo.classList.toggle("hampir-habis", sisa <= detikPeringatan());
    } else {
      jendelaInfo.classList.remove("hampir-habis");
    }
  }

  function isiKeterangan(layar, pc) {
    let judul = "PC Terkunci";
    let isi = "PC ini sedang dikunci operator. Silakan hubungi operator.";
    let total = "";

    if (layar === "habis" || layar === "bayar") {
      const tagihan = DataWarnet.tagihan(pc.sesi);
      judul = layar === "habis" ? "Waktu Habis" : "Sesi Selesai";
      isi = `Terima kasih, ${pc.sesi.nama}. Lama pemakaian ${Tarif.formatLama(tagihan.detik)}. Silakan bayar ke kasir.`;
      total = `Total ${Tarif.formatRupiah(tagihan.total)}`;
    }

    keteranganJudul.textContent = judul;
    keteranganIsi.textContent = isi;
    keteranganTotal.textContent = total;
  }

  // Daftar paket hanya digambar ulang kalau isinya berubah, supaya pilihan tidak hilang.
  function isiDaftarPaket() {
    const sekarang = Pengaturan.waktuCekPaket();
    const daftar = Pengaturan.ambil().paket.map((paket) => ({
      paket,
      berlaku: Tarif.paketBerlaku(paket, sekarang),
    }));

    const tanda = JSON.stringify(daftar);
    if (tanda === tandaDaftarPaket) return;
    tandaDaftarPaket = tanda;

    const terpilih = paketTerpilih();
    daftarPaket.replaceChildren(
      ...daftar.map(({ paket, berlaku }) => {
        const label = document.createElement("label");
        label.className = "pilihan-paket";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "paket";
        radio.value = paket.nama;
        radio.disabled = !berlaku;
        radio.checked = berlaku && paket.nama === terpilih;

        const nama = document.createElement("span");
        nama.className = "paket-judul";
        nama.textContent = paket.nama;

        const rincian = document.createElement("span");
        rincian.className = "paket-rincian";
        rincian.textContent = `${Tarif.formatDurasi(paket.durasiMenit)}, ${Tarif.formatRupiah(paket.harga)}`;

        label.append(radio, nama, rincian);

        if (paket.jamMulai && paket.jamSelesai) {
          const jam = document.createElement("span");
          jam.className = "paket-jam";
          jam.textContent = `Hanya pukul ${Tarif.labelJamBerlaku(paket)}`;
          label.append(jam);
        }
        return label;
      })
    );
  }

  function paketTerpilih() {
    const radio = daftarPaket.querySelector('input[name="paket"]:checked');
    return radio ? radio.value : null;
  }

  function isiTarifPersonal() {
    const { tarifPerJam, tarifMalamPerJam, menitBlok } = Pengaturan.ambil().biaya;
    const siang = Tarif.formatRupiah(tarifPerJam);
    const malam = Tarif.formatRupiah(tarifMalamPerJam);
    const tarif = tarifPerJam === tarifMalamPerJam ? `${siang}/jam` : `Siang ${siang}/jam, malam ${malam}/jam`;
    ambil("tarif-personal").textContent = `Bayar sesuai pemakaian: ${tarif}, dihitung per ${menitBlok} menit.`;
  }

  // --- Login ---

  function pilihJenisLogin(jenis) {
    const paket = jenis === "paket";
    pilihPersonal.setAttribute("aria-pressed", String(!paket));
    pilihPaket.setAttribute("aria-pressed", String(paket));
    formPersonal.hidden = paket;
    formPaket.hidden = !paket;
  }

  function kosongkanLogin() {
    formPersonal.reset();
    formPaket.reset();
    galatPaket.textContent = "";
    pilihJenisLogin("personal");
  }

  function kirimPersonal(e) {
    e.preventDefault();
    DataWarnet.segarkan();
    if (DataWarnet.semuaTerkunci()) {
      perbarui();
      return;
    }
    DataWarnet.mulaiSesi(nomor, personalNama.value.trim() || DataWarnet.NAMA_BAWAAN, "personal");
    perbarui();
  }

  function kirimPaket(e) {
    e.preventDefault();
    const namaPaket = paketTerpilih();
    if (!namaPaket) {
      galatPaket.textContent = "Pilih paket dulu.";
      return;
    }
    const nama = paketNama.value.trim() || DataWarnet.NAMA_BAWAAN;
    const galat = DataWarnet.mulaiPaket(nomor, nama, namaPaket, paketPassword.value.trim());
    if (galat) {
      galatPaket.textContent = galat;
      paketPassword.select();
      return;
    }
    perbarui();
  }

  // --- Menu admin ---

  function bukaMenuAdmin() {
    adminPassword.value = "";
    adminNomor.value = String(nomor ?? 1);
    galatAdmin.textContent = "";
    dialogAdmin.showModal();
    adminPassword.focus();
  }

  function kirimAdmin(e) {
    e.preventDefault();
    DataWarnet.segarkan();
    if (!Pengaturan.cekPassword(adminPassword.value)) {
      galatAdmin.textContent = "Password admin salah.";
      adminPassword.select();
      return;
    }
    try {
      localStorage.setItem(KUNCI_NOMOR_PC, adminNomor.value);
    } catch (galat) {
      galatAdmin.textContent = "Nomor PC gagal disimpan di Chrome ini.";
      return;
    }
    DataWarnet.catat(`Nomor PC layar pelanggan diatur menjadi PC ${adminNomor.value}`);
    // Dibuka ulang tanpa ?pc= supaya langsung memakai nomor yang baru disimpan.
    location.replace("pelanggan.html");
  }

  // --- Layar penuh ---

  // Mode kios dan F11 tidak bisa dikeluarkan lewat tombol ini, jadi tombolnya disembunyikan.
  function perbaruiTombolLayarPenuh() {
    const lewatTombol = Boolean(document.fullscreenElement);
    const sudahPenuh = innerWidth >= screen.width && innerHeight >= screen.height;
    tombolLayarPenuh.hidden = sudahPenuh && !lewatTombol;
    tombolLayarPenuh.textContent = lewatTombol ? "Keluar layar penuh" : "Layar penuh";
  }

  function aturLayarPenuh() {
    // Bisa ditolak Chrome, misalnya kalau kebijakan browser melarang. Layar tetap bisa dipakai.
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // --- Pembaruan ---

  function perbarui() {
    DataWarnet.segarkan();
    DataWarnet.periksaPaketHabis({ nomor });

    const pc = DataWarnet.ambilPc(nomor);
    const { nama: namaWarnet } = Pengaturan.ambil().warnet;
    const layar = tentukanLayar(pc);

    document.title = `PC ${nomor} - ${namaWarnet}`;
    ambil("nama-warnet").textContent = namaWarnet;

    // Pindah ke layar login selalu mulai dari formulir kosong.
    if (layar === "login" && layarTampil !== "login") kosongkanLogin();
    // Hanya saat waktunya benar-benar habis, bukan saat halaman di-refresh sesudahnya.
    if (layar === "habis" && layarTampil !== "habis" && layarTampil !== null) Bunyi.mainkan("habis");
    layarTampil = layar;

    const { modeUji } = Pengaturan.ambil();
    tandaUji.hidden = !modeUji.aktif;
    tandaUji.textContent = Tarif.labelModeUji(modeUji);
    petunjukBunyi.hidden = !Bunyi.perluKlik();

    const diDesktop = layar === "desktop";
    // Setiap sesi baru mulai dengan jendela info terbuka.
    if (!diDesktop) infoDiperkecil = false;
    // Menu admin hanya untuk layar kunci, jadi ikut tertutup kalau sesi dimulai dari operator.
    if (diDesktop && dialogAdmin.open) dialogAdmin.close();
    desktop.hidden = !diDesktop;
    layarKunci.hidden = diDesktop;
    tulisanHabis.hidden = layar !== "habis";
    panelLogin.hidden = layar !== "login";
    panelKeterangan.hidden = diDesktop || layar === "login";

    if (diDesktop) isiJendelaInfo(pc);
    else if (layar === "login") {
      isiDaftarPaket();
      isiTarifPersonal();
    } else isiKeterangan(layar, pc);

    if (DataWarnet.statusPc(pc) !== "aktif") buangPeringatan();
    periksaPeringatan(pc);
    ambilPesanBaru();
  }

  // --- Persiapan awal ---

  // Komputer yang belum punya nomor hanya menampilkan pesan dan tombol Admin.
  function tampilkanBelumDiatur() {
    const { nama } = Pengaturan.ambil().warnet;
    document.title = `PC belum diatur - ${nama}`;
    ambil("nama-warnet").textContent = nama;
    ambil("nomor-pc").hidden = true;
    keteranganJudul.textContent = "PC Belum Diatur";
    keteranganIsi.textContent = "Nomor PC ini belum diatur. Operator bisa mengaturnya lewat tombol Admin.";
    panelKeterangan.hidden = false;
  }

  function siapkanMenuAdmin() {
    for (let i = 1; i <= DataWarnet.JUMLAH_PC; i++) {
      adminNomor.add(new Option(`PC ${i}`, String(i)));
    }
    ambil("tombol-admin").addEventListener("click", bukaMenuAdmin);
    ambil("tombol-batal-admin").addEventListener("click", () => dialogAdmin.close());
    ambil("form-admin").addEventListener("submit", kirimAdmin);
  }

  function siapkanLayarPenuh() {
    tombolLayarPenuh.addEventListener("click", aturLayarPenuh);
    document.addEventListener("fullscreenchange", perbaruiTombolLayarPenuh);
    window.addEventListener("resize", perbaruiTombolLayarPenuh);
    perbaruiTombolLayarPenuh();
  }

  function mulai() {
    siapkanMenuAdmin();
    siapkanLayarPenuh();

    nomor = bacaNomorPc();
    if (nomor === null) {
      tampilkanBelumDiatur();
      return;
    }

    ambil("nomor-pc").textContent = `PC ${nomor}`;
    ambil("desktop-pc").textContent = `PC ${nomor}`;

    pilihPersonal.addEventListener("click", () => pilihJenisLogin("personal"));
    pilihPaket.addEventListener("click", () => pilihJenisLogin("paket"));
    formPersonal.addEventListener("submit", kirimPersonal);
    formPaket.addEventListener("submit", kirimPaket);
    ambil("tombol-stop").addEventListener("click", () => {
      DataWarnet.selesaiSesi(nomor);
      perbarui();
    });
    ambil("tombol-perkecil").addEventListener("click", () => {
      infoDiperkecil = true;
      perbarui();
    });
    kotakWaktu.addEventListener("click", () => {
      infoDiperkecil = false;
      perbarui();
    });

    Pengaturan.detak(perbarui);
    // Terpanggil seketika saat layar operator mengubah data.
    window.addEventListener("storage", perbarui);
  }

  return { mulai };
})();

Pelanggan.mulai();
