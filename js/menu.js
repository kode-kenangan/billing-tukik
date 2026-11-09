// menu.js — menu bar, toolbar, dan dialog kecil yang dibuka dari keduanya.
// Menu dan toolbar memakai daftar AKSI yang sama, lewat atribut data-aksi di HTML.

const Menu = (function () {
  const daftarMenu = [...document.querySelectorAll(".menu")];

  const jendela = document.getElementById("jendela");
  const layarKeluar = document.getElementById("layar-keluar");

  const dialogOperator = document.getElementById("dialog-operator");
  const inputOperator = document.getElementById("input-operator");
  const dialogPesan = document.getElementById("dialog-pesan");
  const inputPesan = document.getElementById("input-pesan");
  const judulPesan = document.getElementById("judul-pesan");
  const dialogLaporan = document.getElementById("dialog-laporan");
  const dialogTentang = document.getElementById("dialog-tentang");

  const dialogBuatPassword = document.getElementById("dialog-buat-password");
  const pilihPaketPassword = document.getElementById("pilih-paket-password");
  const inputPasswordPaket = document.getElementById("input-password-paket");
  const galatPasswordPaket = document.getElementById("galat-password-paket");

  // Tujuan dialog pesan: nomor PC, atau null untuk semua PC.
  let tujuanPesan = null;

  function bukaDialogPesan(tujuan) {
    tujuanPesan = tujuan;
    judulPesan.textContent = tujuan === null ? "Kirim Pesan ke Semua PC" : `Kirim Pesan ke PC ${tujuan}`;
    inputPesan.value = "";
    dialogPesan.showModal();
  }

  // Perintah yang sudah dikirim ke layar pelanggan juga tercatat di log.
  function catatPerintah(teks) {
    DataWarnet.catat(teks);
    Operator.pilihTab("log");
    Operator.perbarui();
  }

  const AKSI = {
    mulai: () => Operator.bukaDialogMulai(),
    selesai() {
      DataWarnet.selesaiSesi(Operator.nomorTerpilih());
      Operator.perbarui();
      Kasir.fokusUang();
    },
    "ganti-operator"() {
      inputOperator.value = DataWarnet.operator.nama;
      dialogOperator.showModal();
      inputOperator.select();
    },
    keluar() {
      DataWarnet.aturKeluar(true);
      terapkanKeluar();
    },
    setup: () => Setup.buka(),
    "kunci-semua"() {
      DataWarnet.aturKunciSemua(true);
      catatPerintah("Perintah: kunci semua PC");
    },
    "buka-semua"() {
      DataWarnet.aturKunciSemua(false);
      catatPerintah("Perintah: buka semua PC");
    },
    "pesan-semua": () => bukaDialogPesan(null),
    "pesan-pc": () => bukaDialogPesan(Operator.nomorTerpilih()),
    "tambah-waktu": () => Layanan.bukaTambahWaktu(),
    "pindah-pc": () => Layanan.bukaPindahPc(),
    kantin: () => Layanan.bukaKantin(),
    "buat-password"() {
      const daftarPaket = Pengaturan.ambil().paket;
      pilihPaketPassword.replaceChildren(
        ...daftarPaket.map((paket) => new Option(paket.nama, paket.nama))
      );
      inputPasswordPaket.value = DataWarnet.usulPassword();
      galatPasswordPaket.textContent = "";
      dialogBuatPassword.showModal();
      inputPasswordPaket.select();
    },
    laporan() {
      isiLaporan();
      dialogLaporan.showModal();
    },
    tentang: () => dialogTentang.showModal(),
  };

  // --- Buka tutup menu ---

  function judulMenu(menu) {
    return menu.querySelector(".menu-judul");
  }

  function isiMenu(menu) {
    return menu.querySelector(".menu-isi");
  }

  function menuTerbuka() {
    return daftarMenu.find((menu) => !isiMenu(menu).hidden);
  }

  function tutupMenu() {
    for (const menu of daftarMenu) {
      isiMenu(menu).hidden = true;
      judulMenu(menu).setAttribute("aria-expanded", "false");
    }
  }

  function bukaMenu(menu) {
    tutupMenu();
    isiMenu(menu).hidden = false;
    judulMenu(menu).setAttribute("aria-expanded", "true");
  }

  function geserMenu(menu, langkah) {
    const urutan = daftarMenu.indexOf(menu);
    const berikut = daftarMenu[(urutan + langkah + daftarMenu.length) % daftarMenu.length];
    bukaMenu(berikut);
    judulMenu(berikut).focus();
  }

  function geserItem(menu, langkah) {
    const item = [...isiMenu(menu).querySelectorAll("button")];
    const urutan = item.indexOf(document.activeElement);
    const awal = urutan === -1 && langkah < 0 ? 0 : urutan;
    item[(awal + langkah + item.length) % item.length].focus();
  }

  for (const menu of daftarMenu) {
    judulMenu(menu).addEventListener("click", () => {
      if (isiMenu(menu).hidden) bukaMenu(menu);
      else tutupMenu();
    });
    // Seperti aplikasi Windows: kalau satu menu terbuka, menu lain terbuka saat disentuh mouse.
    judulMenu(menu).addEventListener("mouseenter", () => {
      if (menuTerbuka() && menuTerbuka() !== menu) bukaMenu(menu);
    });
    menu.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") geserMenu(menu, -1);
      else if (e.key === "ArrowRight") geserMenu(menu, 1);
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (isiMenu(menu).hidden) bukaMenu(menu);
        geserItem(menu, e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Escape") {
        tutupMenu();
        judulMenu(menu).focus();
      } else return;
      e.preventDefault();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu")) tutupMenu();
  });

  document.querySelectorAll("[data-aksi]").forEach((tombol) => {
    tombol.addEventListener("click", () => {
      tutupMenu();
      AKSI[tombol.dataset.aksi]();
    });
  });

  // --- Keluar ---

  // Jendela utama dibuat tidak bisa diklik selama operator keluar.
  function terapkanKeluar() {
    const keluar = DataWarnet.operator.keluar;
    layarKeluar.hidden = !keluar;
    jendela.inert = keluar;
  }

  document.getElementById("tombol-masuk-lagi").addEventListener("click", () => {
    DataWarnet.aturKeluar(false);
    terapkanKeluar();
    Operator.perbarui();
  });

  // --- Dialog kecil ---

  function isiBarisLaporan(t) {
    const tr = document.createElement("tr");
    const kolom = [
      Tarif.formatJam(t.dibayar),
      "PC " + t.nomor,
      t.nama,
      Tarif.JENIS_SESI[t.jenis].label,
      Tarif.formatLama(t.detik),
      t.operator,
      Tarif.formatRupiah(t.total),
      t.uji ? "MODE UJI" : "",
    ];
    for (const isi of kolom) {
      const td = document.createElement("td");
      td.textContent = isi;
      tr.append(td);
    }
    if (t.uji) tr.className = "baris-uji";
    return tr;
  }

  function jumlahTotal(daftar) {
    return daftar.reduce((jumlah, t) => jumlah + t.total, 0);
  }

  // Transaksi mode uji tetap tampil di tabel, tetapi uangnya bukan uang sungguhan.
  function isiLaporan() {
    const daftar = DataWarnet.transaksiHariIni();
    const sungguhan = daftar.filter((t) => !t.uji);
    const uji = daftar.filter((t) => t.uji);

    document.getElementById("laporan-tanggal").textContent = Tarif.formatTanggal(Date.now());
    document.getElementById("laporan-sesi").textContent = String(sungguhan.length);
    document.getElementById("laporan-pendapatan").textContent = Tarif.formatRupiah(jumlahTotal(sungguhan));
    document.getElementById("laporan-kotak-uji").hidden = uji.length === 0;
    document.getElementById("laporan-uji").textContent = `${uji.length} sesi, ${Tarif.formatRupiah(jumlahTotal(uji))}`;
    document.getElementById("laporan-kosong").hidden = daftar.length > 0;
    document.getElementById("isi-laporan").replaceChildren(...daftar.map(isiBarisLaporan));
  }

  document.getElementById("form-operator").addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = inputOperator.value.trim();
    if (!nama) return;
    DataWarnet.gantiOperator(nama);
    dialogOperator.close();
    Operator.perbarui();
  });

  document.getElementById("form-pesan").addEventListener("submit", (e) => {
    e.preventDefault();
    const teks = inputPesan.value.trim();
    if (!teks) return;
    dialogPesan.close();
    DataWarnet.kirimPesan(teks, { untuk: tujuanPesan });
    catatPerintah(`Pesan ke ${tujuanPesan === null ? "semua PC" : "PC " + tujuanPesan}: ${teks}`);
  });

  document.getElementById("form-buat-password").addEventListener("submit", (e) => {
    e.preventDefault();
    const namaPaket = pilihPaketPassword.value;
    const password = inputPasswordPaket.value.trim();
    const galat = DataWarnet.buatPasswordPaket(namaPaket, password);
    if (galat) {
      galatPasswordPaket.textContent = galat;
      return;
    }
    dialogBuatPassword.close();
    // Log Pesan juga menjadi tempat operator melihat lagi password yang sudah dibuat.
    catatPerintah(`Password ${namaPaket} dibuat: ${password}`);
  });

  document.querySelectorAll("[data-tutup-dialog]").forEach((tombol) => {
    tombol.addEventListener("click", () => tombol.closest("dialog").close());
  });

  // --- Dipanggil setiap tampilan diperbarui ---

  // Aksi yang sama bisa muncul di menu dan toolbar, jadi semua tombolnya diatur sekaligus.
  function aturTombol(aksi, boleh) {
    document.querySelectorAll(`[data-aksi="${aksi}"]`).forEach((tombol) => {
      tombol.disabled = !boleh;
    });
  }

  function perbarui() {
    const nomor = Operator.nomorTerpilih();
    const pc = nomor ? DataWarnet.ambilPc(nomor) : null;
    const status = pc ? DataWarnet.statusPc(pc) : null;
    aturTombol("mulai", status === "mati");
    aturTombol("selesai", status === "aktif");
    aturTombol("pesan-pc", Boolean(pc));
    aturTombol("tambah-waktu", status === "aktif" && pc.sesi.jenis === "paket");
    aturTombol("pindah-pc", status === "aktif");
    aturTombol("kantin", status === "aktif" || status === "bayar");
  }

  return { perbarui, terapkanKeluar };
})();
