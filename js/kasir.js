// kasir.js — panel kasir di bawah tabel dan struk setelah dibayar.

const Kasir = (function () {
  const judul = document.getElementById("kasir-judul");
  const form = document.getElementById("form-kasir");
  const biayaInternet = document.getElementById("kasir-internet");
  const biayaTransaksi = document.getElementById("kasir-transaksi");
  const total = document.getElementById("kasir-total");
  const inputUang = document.getElementById("kasir-uang");
  const kembalian = document.getElementById("kasir-kembalian");
  const tombolBayar = document.getElementById("tombol-bayar");
  const pesan = document.getElementById("kasir-pesan");

  const dialogStruk = document.getElementById("dialog-struk");
  const strukWarnet = document.getElementById("struk-warnet");
  const strukAlamat = document.getElementById("struk-alamat");
  const isiStruk = document.getElementById("isi-struk");
  const tombolTutupStruk = document.getElementById("tombol-tutup-struk");
  const tombolCetakStruk = document.getElementById("tombol-cetak-struk");
  const strukUji = document.getElementById("struk-uji");
  const kertasStruk = document.getElementById("kertas-struk");
  const gayaHalaman = document.head.appendChild(document.createElement("style"));

  let nomorTampil = null;
  let transaksiStruk = null;

  function pcTerpilih() {
    const nomor = Operator.nomorTerpilih();
    return nomor ? DataWarnet.ambilPc(nomor) : null;
  }

  // Mengembalikan angka uang, atau null kalau isiannya kosong atau bukan bilangan bulat.
  function bacaUang() {
    const uang = Number(inputUang.value);
    return inputUang.value !== "" && Number.isInteger(uang) && uang >= 0 ? uang : null;
  }

  function perbaruiKembalian(tagihanTotal) {
    const uang = bacaUang();
    kembalian.value = uang !== null && uang >= tagihanTotal ? Tarif.formatRupiah(uang - tagihanTotal) : "-";
  }

  function tampilkanAngka(tagihan) {
    biayaInternet.value = Tarif.formatRupiah(tagihan ? tagihan.biayaInternet : 0);
    biayaTransaksi.value = Tarif.formatRupiah(tagihan ? tagihan.biayaTransaksi : 0);
    total.value = Tarif.formatRupiah(tagihan ? tagihan.total : 0);
  }

  // Dipanggil setiap detik, jadi isian uang hanya dikosongkan saat PC terpilih berganti.
  function perbarui() {
    const pc = pcTerpilih();
    const nomor = pc ? pc.nomor : null;
    if (nomor !== nomorTampil) {
      nomorTampil = nomor;
      inputUang.value = "";
      pesan.textContent = "";
    }

    const status = pc ? DataWarnet.statusPc(pc) : "mati";
    const tagihan = pc && pc.sesi ? DataWarnet.tagihan(pc.sesi) : null;

    judul.textContent = pc ? `Kasir - PC ${pc.nomor}` : "Kasir";
    tampilkanAngka(tagihan);
    perbaruiKembalian(tagihan ? tagihan.total : 0);

    const bisaBayar = status === "bayar";
    inputUang.disabled = !bisaBayar;
    tombolBayar.disabled = !bisaBayar;

    if (!bisaBayar && !pesan.classList.contains("galat")) {
      if (!pc) pesan.textContent = "Pilih PC di tabel.";
      else if (status === "aktif") pesan.textContent = "Sesi masih berjalan. Klik Selesai dulu.";
      else pesan.textContent = "PC ini tidak punya tagihan.";
    } else if (bisaBayar && !pesan.classList.contains("galat")) {
      pesan.textContent = "Isi uang dibayar, lalu klik Bayar.";
    }
  }

  function tampilkanGalat(teks) {
    pesan.textContent = teks;
    pesan.classList.add("galat");
  }

  function bersihkanGalat() {
    pesan.classList.remove("galat");
  }

  function fokusUang() {
    inputUang.focus();
  }

  function kirimBayar(e) {
    e.preventDefault();
    const pc = pcTerpilih();
    if (!pc || DataWarnet.statusPc(pc) !== "bayar") return;

    const uang = bacaUang();
    if (uang === null) {
      tampilkanGalat("Isi uang dibayar dengan angka.");
      return;
    }

    const kurang = DataWarnet.tagihan(pc.sesi).total - uang;
    if (kurang > 0) {
      tampilkanGalat(`Uang kurang ${Tarif.formatRupiah(kurang)}.`);
      return;
    }

    bersihkanGalat();
    inputUang.value = "";
    bukaStruk(DataWarnet.bayar(pc.nomor, uang));
    Operator.perbarui();
    // Jendela Print menghentikan halaman, jadi dibuka setelah struknya sempat tampil.
    if (Pengaturan.ambil().struk.cetakOtomatis) setTimeout(cetakStruk);
  }

  // --- Struk ---

  function tambahBarisStruk(label, nilai, kelas) {
    const div = document.createElement("div");
    div.className = "baris-struk " + (kelas || "");
    const kiri = document.createElement("span");
    const kanan = document.createElement("span");
    kiri.textContent = label;
    kanan.textContent = nilai;
    div.append(kiri, kanan);
    isiStruk.append(div);
  }

  function bukaStruk(t) {
    transaksiStruk = t;
    strukWarnet.textContent = t.warnet.nama;
    strukAlamat.textContent = t.warnet.alamat;
    strukUji.hidden = !t.uji;

    isiStruk.replaceChildren();
    tambahBarisStruk("Tanggal", Tarif.formatTanggal(t.selesai));
    tambahBarisStruk("Operator", t.operator);
    tambahBarisStruk("PC", String(t.nomor));
    tambahBarisStruk("Pengguna", t.nama);
    tambahBarisStruk("Jenis", Tarif.JENIS_SESI[t.jenis].label);
    tambahBarisStruk("Jam mulai", Tarif.formatJam(t.mulai));
    tambahBarisStruk("Jam selesai", Tarif.formatJam(t.selesai));
    tambahBarisStruk("Lama", Tarif.formatLama(t.detik));
    t.rincian.forEach((baris, i) => tambahBarisStruk(i === 0 ? "Rincian" : "", baris));
    tambahBarisStruk("Biaya Internet", Tarif.formatRupiah(t.biayaInternet));
    for (const barang of t.kantin || []) {
      tambahBarisStruk(`${barang.nama} x${barang.jumlah}`, Tarif.formatRupiah(barang.harga * barang.jumlah));
    }
    tambahBarisStruk("Biaya Transaksi", Tarif.formatRupiah(t.biayaTransaksi));
    tambahBarisStruk("TOTAL",Tarif.formatRupiah(t.total), "total");
    tambahBarisStruk("Dibayar", Tarif.formatRupiah(t.uang));
    tambahBarisStruk("Kembalian", Tarif.formatRupiah(t.kembalian));

    dialogStruk.showModal();
  }

  // Kalau halaman di-refresh saat struk terbuka, struknya dimunculkan lagi.
  function bukaStrukTertunda() {
    const t = DataWarnet.strukTertunda();
    if (t) bukaStruk(t);
  }

  // --- Cetak struk ---

  function cetakStruk() {
    if (dialogStruk.open) window.print();
  }

  // Ukuran halaman ditulis saat akan mencetak. Kertas gulung tingginya mengikuti panjang struk,
  // karena CSS tidak punya ukuran kertas dengan tinggi otomatis.
  function siapkanCetak() {
    if (!dialogStruk.open) return;
    const { kertas } = Pengaturan.ambil().struk;
    document.body.dataset.kertas = kertas;
    if (kertas === "A4") {
      gayaHalaman.textContent = "@page { size: A4; margin: 15mm; }";
      return;
    }
    const tinggiMm = Math.ceil((kertasStruk.offsetHeight * 25.4) / 96) + 6;
    gayaHalaman.textContent = `@page { size: ${kertas}mm ${tinggiMm}mm; margin: 2mm; }`;
  }

  function selesaiCetak() {
    delete document.body.dataset.kertas;
    gayaHalaman.textContent = "";
  }

  // Lewat kejadian browser, supaya Ctrl+P saat struk terbuka juga hanya mencetak struknya.
  window.addEventListener("beforeprint", siapkanCetak);
  window.addEventListener("afterprint", selesaiCetak);
  tombolCetakStruk.addEventListener("click", cetakStruk);

  form.addEventListener("submit", kirimBayar);
  inputUang.addEventListener("input", () => {
    bersihkanGalat();
    perbarui();
  });
  tombolTutupStruk.addEventListener("click", () => dialogStruk.close());
  // Dipanggil setiap kali struk tertutup, termasuk lewat tombol Esc.
  dialogStruk.addEventListener("close", () => {
    DataWarnet.tutupStruk(transaksiStruk);
    transaksiStruk = null;
    bukaStrukTertunda();
  });

  return { perbarui, fokusUang, bersihkanGalat, bukaStrukTertunda };
})();
