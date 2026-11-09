// operator.js — tabel, tab, dan baris status di layar operator.
// File ini dimuat terakhir, karena bagian akhirnya menyalakan seluruh aplikasi.

const Operator = (function () {
  const isiTabel = document.getElementById("isi-tabel");
  const isiClient = document.getElementById("isi-client");
  const clientKosong = document.getElementById("client-kosong");
  const isiLog = document.getElementById("isi-log");
  const logKosong = document.getElementById("log-kosong");

  const pitaNama = document.getElementById("pita-nama");
  const pitaAlamat = document.getElementById("pita-alamat");
  const pitaTarif = document.getElementById("pita-tarif");
  const infoOperator = document.getElementById("info-operator");
  const infoWaktu = document.getElementById("info-waktu");
  const infoAktif = document.getElementById("info-aktif");

  const dialogMulai = document.getElementById("dialog-mulai");
  const judulMulai = document.getElementById("judul-mulai");
  const inputNama = document.getElementById("input-nama");
  const pilihJenisMulai = document.getElementById("pilih-jenis-mulai");
  const galatMulai = document.getElementById("galat-mulai");
  const tandaUji = document.getElementById("tanda-uji");
  const petunjukBunyi = document.getElementById("petunjuk-bunyi");

  const tabUtama = buatTab(document.getElementById("tab-utama"));

  const LABEL_STATUS = { mati: "MATI", aktif: "AKTIF", bayar: "BAYAR" };

  // Layar pelanggan diberi kesempatan mengakhiri paketnya sendiri selama waktu ini.
  const TENGGANG_PAKET_HABIS = 2000;

  let nomorTerpilih = null;
  let revisiLogTampil = -1;

  // Keadaan terakhir tiap PC yang dikenal jendela ini, untuk mengenali kapan bunyi perlu keluar.
  const keadaanBunyi = new Map();

  // Baris tabel dibuat sekali saja lalu isinya diperbarui, supaya klik
  // operator tidak hilang saat tabel berdetak setiap detik.
  const barisUmum = new Map();
  const barisClient = new Map();

  function buatBaris(tbody, pc, daftarKolom) {
    const tr = document.createElement("tr");
    tr.tabIndex = 0;
    tr.setAttribute("aria-selected", "false");

    const sel = {};
    for (const kolom of daftarKolom) {
      sel[kolom] = document.createElement("td");
      sel[kolom].className = "kolom-" + kolom;
      tr.append(sel[kolom]);
    }
    sel.nomor.textContent = "PC " + pc.nomor;

    tr.addEventListener("click", () => pilihPc(pc.nomor));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pilihPc(pc.nomor);
      }
    });

    tbody.append(tr);
    return { tr, sel };
  }

  function pilihPc(nomor) {
    if (nomor !== nomorTerpilih) Kasir.bersihkanGalat();
    nomorTerpilih = nomor;
    perbarui();
  }

  function perbaruiBarisUmum(pc) {
    const { tr, sel } = barisUmum.get(pc.nomor);
    const status = DataWarnet.statusPc(pc);

    tr.className = status;
    tr.setAttribute("aria-selected", String(pc.nomor === nomorTerpilih));
    sel.status.textContent = LABEL_STATUS[status];

    if (pc.sesi) {
      const tagihan = DataWarnet.tagihan(pc.sesi);
      sel.nama.textContent = pc.sesi.nama;
      sel.mulai.textContent = Tarif.formatJam(pc.sesi.mulai);
      sel.lama.textContent = Tarif.formatLama(tagihan.detik);
      sel.biaya.textContent = Tarif.formatRupiah(tagihan.total);
    } else {
      sel.nama.textContent = "-";
      sel.mulai.textContent = "--:--:--";
      sel.lama.textContent = Tarif.formatLama(0);
      sel.biaya.textContent = Tarif.formatRupiah(0);
    }
  }

  // Tab Client Aktif hanya menampilkan PC yang sesinya masih berjalan.
  function perbaruiBarisClient(pc) {
    const { tr, sel } = barisClient.get(pc.nomor);
    const aktif = DataWarnet.statusPc(pc) === "aktif";

    tr.hidden = !aktif;
    tr.setAttribute("aria-selected", String(pc.nomor === nomorTerpilih));
    if (!aktif) return;

    const tagihan = DataWarnet.tagihan(pc.sesi);
    sel.nama.textContent = pc.sesi.nama;
    sel.jenis.textContent = Tarif.JENIS_SESI[pc.sesi.jenis].label;
    sel.tarif.textContent = Tarif.labelTarif(pc.sesi, Date.now());
    sel.mulai.textContent = Tarif.formatJam(pc.sesi.mulai);
    sel.lama.textContent = Tarif.formatLama(tagihan.detik);
    sel.biaya.textContent = Tarif.formatRupiah(tagihan.total);
  }

  // Log hanya digambar ulang kalau ada kejadian baru. Yang terbaru tampil paling atas.
  function perbaruiLog() {
    if (DataWarnet.revisiLog() === revisiLogTampil) return;
    revisiLogTampil = DataWarnet.revisiLog();

    logKosong.hidden = DataWarnet.log.length > 0;
    isiLog.replaceChildren(
      ...DataWarnet.log
        .slice()
        .reverse()
        .map((baris) => {
          const tr = document.createElement("tr");
          const kolom = [
            `${Tarif.formatTanggalPendek(baris.waktu)} ${Tarif.formatJam(baris.waktu)}`,
            baris.operator,
            baris.teks,
          ];
          for (const isi of kolom) {
            const td = document.createElement("td");
            td.textContent = isi;
            tr.append(td);
          }
          return tr;
        })
    );
  }

  function perbaruiPita() {
    const { warnet, biaya } = Pengaturan.ambil();
    pitaNama.textContent = warnet.nama;
    pitaAlamat.textContent = warnet.alamat;
    pitaTarif.textContent =
      `Siang ${Tarif.formatRupiah(biaya.tarifPerJam)}/jam, ` +
      `malam ${Tarif.formatRupiah(biaya.tarifMalamPerJam)}/jam, ` +
      `per ${biaya.menitBlok} menit`;
  }

  // Berbunyi saat sebuah PC baru saja berpindah dari berjalan ke menunggu bayar. Yang dilihat
  // perubahannya, bukan siapa pelakunya, karena layar pelanggan sering mengakhiri sesi lebih
  // dulu. Pemeriksaan pertama hanya mencatat, supaya refresh tidak membunyikan sesi lama.
  function periksaBunyi() {
    const bunyiBaru = new Set();
    for (const pc of DataWarnet.daftarPc) {
      let keadaan = "lain";
      if (DataWarnet.statusPc(pc) === "bayar") keadaan = pc.sesi.habis ? "operatorHabis" : "operatorBayar";

      const lama = keadaanBunyi.get(pc.nomor);
      keadaanBunyi.set(pc.nomor, keadaan);
      if (lama === "lain" && keadaan !== "lain") bunyiBaru.add(keadaan);
    }
    // Beberapa PC yang berakhir bersamaan cukup berbunyi satu kali.
    for (const jenis of bunyiBaru) Bunyi.mainkan(jenis);
  }

  function perbarui() {
    // Ambil perubahan dari layar pelanggan dulu, lalu gambar tabelnya.
    DataWarnet.segarkan();
    DataWarnet.periksaPaketHabis({ tenggangMs: TENGGANG_PAKET_HABIS });
    periksaBunyi();
    petunjukBunyi.hidden = !Bunyi.perluKlik();

    DataWarnet.daftarPc.forEach(perbaruiBarisUmum);
    DataWarnet.daftarPc.forEach(perbaruiBarisClient);
    clientKosong.hidden = DataWarnet.jumlahAktif() > 0;
    perbaruiLog();
    perbaruiPita();
    Kasir.perbarui();
    Menu.perbarui();
    Layanan.perbarui();

    const { modeUji } = Pengaturan.ambil();
    tandaUji.hidden = !modeUji.aktif;
    tandaUji.textContent = Tarif.labelModeUji(modeUji);

    const sekarang = Date.now();
    infoOperator.textContent = `Operator: ${DataWarnet.operator.nama}`;
    infoWaktu.textContent = `${Tarif.formatTanggal(sekarang)}, ${Tarif.formatJam(sekarang)}`;
    const keteranganKunci = DataWarnet.semuaTerkunci() ? " (semua dikunci)" : "";
    infoAktif.textContent = `PC aktif: ${DataWarnet.jumlahAktif()} dari ${DataWarnet.JUMLAH_PC}${keteranganKunci}`;
  }

  // --- Mulai sesi ---

  function bukaDialogMulai() {
    judulMulai.textContent = `Mulai sesi di PC ${nomorTerpilih}`;
    inputNama.value = "";
    galatMulai.textContent = "";

    // Nilai kosong berarti Personal. Paket di luar jam berlakunya tampil tetapi tidak bisa dipilih.
    const acuan = Pengaturan.waktuCekPaket();
    pilihJenisMulai.replaceChildren(
      new Option("Personal (bayar sesuai pemakaian)", ""),
      ...Pengaturan.ambil().paket.map((paket) => {
        const berlaku = Tarif.paketBerlaku(paket, acuan);
        const keterangan = berlaku
          ? `${Tarif.formatDurasi(paket.durasiMenit)}, ${Tarif.formatRupiah(paket.harga)}`
          : `hanya pukul ${Tarif.labelJamBerlaku(paket)}`;
        const pilihan = new Option(`${paket.nama} (${keterangan})`, paket.nama);
        pilihan.disabled = !berlaku;
        return pilihan;
      })
    );

    dialogMulai.showModal();
    inputNama.focus();
  }

  function kirimFormMulai(e) {
    e.preventDefault();
    const nama = inputNama.value.trim() || DataWarnet.NAMA_BAWAAN;
    const namaPaket = pilihJenisMulai.value;
    if (namaPaket) {
      const galat = DataWarnet.mulaiPaketOperator(nomorTerpilih, nama, namaPaket);
      if (galat) {
        galatMulai.textContent = galat;
        return;
      }
    } else {
      DataWarnet.mulaiSesi(nomorTerpilih, nama, "personal");
    }
    dialogMulai.close();
    perbarui();
  }

  // --- Persiapan awal ---

  function mulai() {
    const kolomClient = ["nomor", "nama", "jenis", "tarif", "mulai", "lama", "biaya"];
    for (const pc of DataWarnet.daftarPc) {
      barisUmum.set(pc.nomor, buatBaris(isiTabel, pc, ["nomor", "nama", "status", "mulai", "lama", "biaya"]));
      barisClient.set(pc.nomor, buatBaris(isiClient, pc, kolomClient));
    }

    document.getElementById("form-mulai").addEventListener("submit", kirimFormMulai);
    document.getElementById("tombol-batal").addEventListener("click", () => dialogMulai.close());

    Pengaturan.detak(perbarui);
    Menu.terapkanKeluar();
    Kasir.bukaStrukTertunda();
    // Terpanggil seketika saat layar pelanggan mengubah data.
    window.addEventListener("storage", perbarui);
  }

  return {
    nomorTerpilih: () => nomorTerpilih,
    pilihPc,
    pilihTab: (nama) => tabUtama.pilih(nama),
    perbarui,
    bukaDialogMulai,
    mulai,
  };
})();

Operator.mulai();
