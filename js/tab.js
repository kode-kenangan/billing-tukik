// tab.js — perilaku tab, dipakai di layar utama dan dialog Konfigurasi.

function buatTab(wadah) {
  const daftarTab = [...wadah.querySelectorAll('[role="tab"]')];

  function pilih(nama) {
    for (const tab of daftarTab) {
      const terpilih = tab.dataset.tab === nama;
      tab.setAttribute("aria-selected", String(terpilih));
      tab.tabIndex = terpilih ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !terpilih;
    }
  }

  daftarTab.forEach((tab, urutan) => {
    tab.addEventListener("click", () => pilih(tab.dataset.tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const geser = e.key === "ArrowRight" ? 1 : -1;
      const berikut = daftarTab[(urutan + geser + daftarTab.length) % daftarTab.length];
      pilih(berikut.dataset.tab);
      berikut.focus();
    });
  });

  pilih(daftarTab[0].dataset.tab);
  return { pilih };
}
