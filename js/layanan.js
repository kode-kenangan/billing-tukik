// layanan.js — dialog Tambah Waktu, Pindah PC, dan Kantin di layar operator.
// Ketiganya bekerja pada PC yang sedang dipilih di tabel.

const Layanan = (function () {
  const ambil = (id) => document.getElementById(id);

  let nomorDialog = null;

  // --- Tambah waktu ---

  const dialogTambah = ambil("dialog-tambah");
  const pilihPaketTambah = ambil("pilih-paket-tambah");
  const galatTambah = ambil("galat-tambah");

  function bukaTambahWaktu() {
    nomorDialog = Operator.nomorTerpilih();
    const acuan = Pengaturan.waktuCekPaket();
    pilihPaketTambah.replaceChildren(
      ...Pengaturan.ambil().paket.map((paket) => {
        const teks = `${paket.nama}: +${Tarif.formatDurasi(paket.durasiMenit)}, ${Tarif.formatRupiah(paket.harga)}`;
        const pilihan = new Option(teks, paket.nama);
        pilihan.disabled = !Tarif.paketBerlaku(paket, acuan);
        return pilihan;
      })
    );
    ambil("judul-tambah").textContent = `Tambah Waktu PC ${nomorDialog}`;
    galatTambah.textContent = "";
    perbarui();
    dialogTambah.showModal();
  }

  ambil("form-tambah").addEventListener("submit", (e) => {
    e.preventDefault();
    const galat = DataWarnet.tambahWaktu(nomorDialog, pilihPaketTambah.value);
    if (galat) {
      galatTambah.textContent = galat;
      return;
    }
    dialogTambah.close();
    Operator.perbarui();
  });

  // Sisa waktu di dialog ikut berjalan, supaya operator melihat kapan harus menolong.
  function perbarui() {
    if (nomorDialog === null) return;
    const pc = DataWarnet.ambilPc(nomorDialog);
    const adaPaket = pc.sesi && pc.sesi.jenis === "paket";
    ambil("sisa-tambah").textContent = adaPaket
      ? `Sisa waktu: ${Tarif.formatLama(DataWarnet.sisaDetik(pc.sesi))}`
      : "Sesi paket sudah berakhir.";
  }

  // --- Pindah PC ---

  const dialogPindah = ambil("dialog-pindah");
  const pilihPcPindah = ambil("pilih-pc-pindah");
  const galatPindah = ambil("galat-pindah");

  function bukaPindahPc() {
    nomorDialog = Operator.nomorTerpilih();
    const kosong = DataWarnet.daftarPc.filter((pc) => DataWarnet.statusPc(pc) === "mati");
    pilihPcPindah.replaceChildren(...kosong.map((pc) => new Option(`PC ${pc.nomor}`, String(pc.nomor))));
    ambil("judul-pindah").textContent = `Pindahkan Pelanggan dari PC ${nomorDialog}`;
    galatPindah.textContent = kosong.length ? "" : "Tidak ada PC yang kosong.";
    ambil("tombol-pindah").disabled = !kosong.length;
    dialogPindah.showModal();
  }

  ambil("form-pindah").addEventListener("submit", (e) => {
    e.preventDefault();
    const ke = Number(pilihPcPindah.value);
    const galat = DataWarnet.pindahPc(nomorDialog, ke);
    if (galat) {
      galatPindah.textContent = galat;
      return;
    }
    dialogPindah.close();
    // Pilihan di tabel mengikuti pelanggannya, supaya kasir tetap menampilkan tagihan yang sama.
    Operator.pilihPc(ke);
  });

  // --- Kantin ---

  const dialogKantin = ambil("dialog-kantin");
  const menuKantin = ambil("menu-kantin");
  const pesananKantin = ambil("pesanan-kantin");
  const galatKantin = ambil("galat-kantin");

  function bukaKantin() {
    nomorDialog = Operator.nomorTerpilih();
    ambil("judul-kantin").textContent = `Kantin PC ${nomorDialog}`;
    galatKantin.textContent = "";
    menuKantin.replaceChildren(
      ...Pengaturan.ambil().kantin.map((barang) => {
        const tombol = document.createElement("button");
        tombol.type = "button";
        tombol.textContent = `${barang.nama} ${Tarif.formatRupiah(barang.harga)}`;
        tombol.addEventListener("click", () => jalankanKantin(DataWarnet.tambahKantin(nomorDialog, barang.nama)));
        return tombol;
      })
    );
    isiPesanan();
    dialogKantin.showModal();
  }

  function jalankanKantin(galat) {
    galatKantin.textContent = galat || "";
    isiPesanan();
    Operator.perbarui();
  }

  function isiPesanan() {
    const pc = DataWarnet.ambilPc(nomorDialog);
    const daftar = (pc.sesi && pc.sesi.kantin) || [];
    ambil("kantin-kosong").hidden = daftar.length > 0;
    pesananKantin.replaceChildren(
      ...daftar.map((barang, urutan) => {
        const tr = document.createElement("tr");
        for (const isi of [barang.nama, `x${barang.jumlah}`, Tarif.formatRupiah(barang.harga * barang.jumlah)]) {
          const td = document.createElement("td");
          td.textContent = isi;
          tr.append(td);
        }
        const tombol = document.createElement("button");
        tombol.type = "button";
        tombol.textContent = "Batal 1";
        tombol.addEventListener("click", () => jalankanKantin(DataWarnet.batalKantin(nomorDialog, urutan)));
        const td = document.createElement("td");
        td.append(tombol);
        tr.append(td);
        return tr;
      })
    );
    const jumlah = daftar.reduce((total, b) => total + b.harga * b.jumlah, 0);
    ambil("kantin-jumlah").textContent = `Biaya Transaksi: ${Tarif.formatRupiah(jumlah)}`;
  }

  return { bukaTambahWaktu, bukaPindahPc, bukaKantin, perbarui };
})();
