// setup.js — dialog password admin dan dialog Konfigurasi.

const Setup = (function () {
  const dialogPassword = document.getElementById("dialog-password");
  const formPassword = document.getElementById("form-password");
  const inputPassword = document.getElementById("input-password");
  const galatPassword = document.getElementById("galat-password");

  const dialogKonfigurasi = document.getElementById("dialog-konfigurasi");
  const formKonfigurasi = document.getElementById("form-konfigurasi");
  const galatKonfigurasi = document.getElementById("galat-konfigurasi");
  const isiPaket = document.getElementById("isi-paket");
  const isiKantin = document.getElementById("isi-kantin");
  const tabKonfigurasi = buatTab(document.getElementById("tab-konfigurasi"));

  const nilai = {
    nama: document.getElementById("cfg-nama"),
    alamat: document.getElementById("cfg-alamat"),
    tarif: document.getElementById("cfg-tarif"),
    blok: document.getElementById("cfg-blok"),
    malam: document.getElementById("cfg-malam"),
    password: document.getElementById("cfg-password"),
    ulang: document.getElementById("cfg-ulang"),
    peringatan: document.getElementById("cfg-peringatan"),
    bunyi: document.getElementById("cfg-bunyi"),
    uji: document.getElementById("cfg-uji"),
    jamUji: document.getElementById("cfg-jam-uji"),
    kertas: document.getElementById("cfg-kertas"),
    cetakOtomatis: document.getElementById("cfg-cetak-otomatis"),
  };

  // --- Password admin ---

  function buka() {
    inputPassword.value = "";
    galatPassword.textContent = "";
    dialogPassword.showModal();
    inputPassword.focus();
  }

  function kirimPassword(e) {
    e.preventDefault();
    if (!Pengaturan.cekPassword(inputPassword.value)) {
      galatPassword.textContent = "Password salah.";
      inputPassword.select();
      return;
    }
    dialogPassword.close();
    bukaKonfigurasi();
  }

  // --- Isi dialog Konfigurasi ---

  function buatInput(tipe, label, nilaiAwal, kelas) {
    const input = document.createElement("input");
    input.type = tipe;
    input.value = nilaiAwal;
    input.className = kelas;
    input.setAttribute("aria-label", label);
    if (tipe === "number") input.min = "0";
    const td = document.createElement("td");
    td.append(input);
    return td;
  }

  function selHapus(tr) {
    const tombolHapus = document.createElement("button");
    tombolHapus.type = "button";
    tombolHapus.textContent = "Hapus";
    tombolHapus.addEventListener("click", () => tr.remove());
    const td = document.createElement("td");
    td.append(tombolHapus);
    return td;
  }

  function tambahBarisPaket(paket) {
    const tr = document.createElement("tr");
    tr.append(
      buatInput("text", "Nama paket", paket.nama, "paket-nama"),
      buatInput("number", "Durasi dalam menit", paket.durasiMenit, "paket-durasi"),
      buatInput("number", "Harga", paket.harga, "paket-harga"),
      buatInput("text", "Berlaku dari jam", paket.jamMulai, "paket-mulai"),
      buatInput("text", "Berlaku sampai jam", paket.jamSelesai, "paket-selesai"),
      selHapus(tr)
    );
    tr.querySelector(".paket-mulai").placeholder = "22:00";
    tr.querySelector(".paket-selesai").placeholder = "05:00";

    isiPaket.append(tr);
  }

  function tambahBarisKantin(barang) {
    const tr = document.createElement("tr");
    tr.append(
      buatInput("text", "Nama barang", barang.nama, "kantin-nama"),
      buatInput("number", "Harga barang", barang.harga, "kantin-harga"),
      selHapus(tr)
    );
    isiKantin.append(tr);
  }

  function bukaKonfigurasi() {
    const p = Pengaturan.ambil();
    nilai.nama.value = p.warnet.nama;
    nilai.alamat.value = p.warnet.alamat;
    nilai.tarif.value = p.biaya.tarifPerJam;
    nilai.blok.value = p.biaya.menitBlok;
    nilai.malam.value = p.biaya.tarifMalamPerJam;
    nilai.password.value = "";
    nilai.ulang.value = "";
    galatKonfigurasi.textContent = "";

    isiPaket.replaceChildren();
    p.paket.forEach(tambahBarisPaket);

    isiKantin.replaceChildren();
    p.kantin.forEach(tambahBarisKantin);

    nilai.peringatan.value = p.peringatan.menit;
    nilai.bunyi.checked = p.bunyi.aktif;
    nilai.uji.checked = p.modeUji.aktif;
    nilai.jamUji.value = p.modeUji.jamUji;
    nilai.kertas.value = p.struk.kertas;
    nilai.cetakOtomatis.checked = p.struk.cetakOtomatis;

    tabKonfigurasi.pilih("umum");
    dialogKonfigurasi.showModal();
  }

  // Mengembalikan bilangan bulat dari isian, atau null kalau tidak sah.
  function bacaAngka(input, terkecil) {
    const angka = Number(input.value);
    return input.value !== "" && Number.isInteger(angka) && angka >= terkecil ? angka : null;
  }

  // Jam dibaca dalam format 24 jam: "22:00" atau "22.00" menjadi "22:00".
  // Kosong tetap kosong, dan isian yang salah menghasilkan null.
  function bacaJam(input) {
    const teks = input.value.trim();
    if (!teks) return "";
    const cocok = teks.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
    return cocok ? cocok[1].padStart(2, "0") + ":" + cocok[2] : null;
  }

  function galat(tab, teks) {
    tabKonfigurasi.pilih(tab);
    galatKonfigurasi.textContent = teks;
    return null;
  }

  function bacaPaket() {
    const hasil = [];
    for (const tr of isiPaket.children) {
      const urutan = hasil.length + 1;
      const paket = {
        nama: tr.querySelector(".paket-nama").value.trim(),
        durasiMenit: bacaAngka(tr.querySelector(".paket-durasi"), 1),
        harga: bacaAngka(tr.querySelector(".paket-harga"), 0),
        jamMulai: bacaJam(tr.querySelector(".paket-mulai")),
        jamSelesai: bacaJam(tr.querySelector(".paket-selesai")),
      };
      if (!paket.nama) return galat("paket", `Paket baris ${urutan}: nama belum diisi.`);
      if (paket.durasiMenit === null) return galat("paket", `${paket.nama}: durasi minimal 1 menit.`);
      if (paket.harga === null) return galat("paket", `${paket.nama}: harga harus angka.`);
      if (paket.jamMulai === null || paket.jamSelesai === null) {
        return galat("paket", `${paket.nama}: tulis jam seperti 22:00.`);
      }
      if (Boolean(paket.jamMulai) !== Boolean(paket.jamSelesai)) {
        return galat("paket", `${paket.nama}: jam berlaku harus diisi dua-duanya atau kosong.`);
      }
      hasil.push(paket);
    }
    return hasil;
  }

  function bacaKantin() {
    const hasil = [];
    for (const tr of isiKantin.children) {
      const nama = tr.querySelector(".kantin-nama").value.trim();
      const harga = bacaAngka(tr.querySelector(".kantin-harga"), 0);
      if (!nama) return galat("kantin", `Barang baris ${hasil.length + 1}: nama belum diisi.`);
      if (harga === null) return galat("kantin", `${nama}: harga harus angka.`);
      // Pesanan mencari barang lewat namanya, jadi nama tidak boleh kembar.
      if (hasil.some((b) => b.nama === nama)) return galat("kantin", `${nama}: nama barang kembar.`);
      hasil.push({ nama, harga });
    }
    return hasil;
  }

  // Membaca semua tab. Kalau ada yang salah, tab itu dibuka dan hasilnya null.
  function bacaFormulir() {
    const nama = nilai.nama.value.trim();
    if (!nama) return galat("umum", "Nama warnet belum diisi.");

    const tarifPerJam = bacaAngka(nilai.tarif, 0);
    if (tarifPerJam === null) return galat("biaya", "Tarif per jam harus angka.");
    const menitBlok = bacaAngka(nilai.blok, 1);
    if (menitBlok === null || menitBlok > 60) return galat("biaya", "Ukuran blok harus 1 sampai 60 menit.");
    const tarifMalamPerJam = bacaAngka(nilai.malam, 0);
    if (tarifMalamPerJam === null) return galat("biaya", "Tarif malam harus angka.");

    const paket = bacaPaket();
    if (paket === null) return null;

    const kantin = bacaKantin();
    if (kantin === null) return null;

    const menit = bacaAngka(nilai.peringatan, 1);
    if (menit === null) return galat("waktu", "Peringatan minimal 1 menit.");
    const jamUji = bacaJam(nilai.jamUji);
    if (jamUji === null) return galat("waktu", "Tulis jam uji seperti 22:30.");

    if (nilai.password.value !== nilai.ulang.value) {
      return galat("keamanan", "Password baru dan ulangannya tidak sama.");
    }

    return {
      warnet: { nama, alamat: nilai.alamat.value.trim() },
      biaya: { tarifPerJam, menitBlok, tarifMalamPerJam },
      paket,
      keamanan: {
        passwordAdmin: nilai.password.value || Pengaturan.ambil().keamanan.passwordAdmin,
      },
      kantin,
      peringatan: { menit },
      bunyi: { aktif: nilai.bunyi.checked },
      modeUji: { aktif: nilai.uji.checked, jamUji },
      struk: { kertas: nilai.kertas.value, cetakOtomatis: nilai.cetakOtomatis.checked },
    };
  }

  function kirimKonfigurasi(e) {
    e.preventDefault();
    const baru = bacaFormulir();
    if (!baru) return;
    const ujiLama = Pengaturan.ambil().modeUji.aktif;
    Pengaturan.ganti(baru);
    DataWarnet.catat("Konfigurasi diubah");
    if (baru.modeUji.aktif !== ujiLama) DataWarnet.aturModeUji(baru.modeUji.aktif);
    dialogKonfigurasi.close();
    Operator.perbarui();
  }

  formPassword.addEventListener("submit", kirimPassword);
  formKonfigurasi.addEventListener("submit", kirimKonfigurasi);
  document.getElementById("tombol-batal-password").addEventListener("click", () => dialogPassword.close());
  document.getElementById("tombol-batal-konfigurasi").addEventListener("click", () => dialogKonfigurasi.close());
  document.getElementById("tombol-tambah-paket").addEventListener("click", () => {
    tambahBarisPaket({ nama: "", durasiMenit: 60, harga: 0, jamMulai: "", jamSelesai: "" });
  });
  document.getElementById("tombol-tambah-barang").addEventListener("click", () => {
    tambahBarisKantin({ nama: "", harga: 0 });
  });

  return { buka };
})();
