import { Compass, Layers, Store } from 'lucide-react';

export function AboutCisagaHubSection() {
  return (
    <section
      id="tentang"
      className="scroll-mt-16 py-14 sm:py-20 bg-white border-b border-[#E2E8F0]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start pb-12 border-b border-[#E2E8F0]">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wide text-[#EA580C] mb-2">
              Tentang CISAGA HUB · Digital UMKM Ecosystem
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight leading-snug mb-3">
              Connecting Local Business, Growing Together.
            </h2>
            <p className="text-xs font-medium text-[#475569]">
              Ekosistem Digital UMKM Kecamatan Cisaga, Kabupaten Ciamis, Jawa Barat.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <p className="text-base sm:text-lg font-medium text-[#0F2744] leading-relaxed">
              &ldquo;Setiap usaha memiliki potensi untuk berkembang. CISAGA HUB hadir sebagai
              jembatan digital yang menghubungkan potensi usaha lokal dengan peluang yang lebih
              luas.&rdquo;
            </p>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              CISAGA HUB dibangun sebagai pusat informasi, katalog terpadu, dan wadah promosi
              digital bagi para pelaku usaha mikro, kecil, dan menengah di Kecamatan Cisaga agar
              produk lokal lebih mudah ditemukan, dipercaya, dan terhubung langsung dengan
              masyarakat serta mitra usaha.
            </p>
          </div>
        </div>

        <div className="pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] inline-flex items-center justify-center text-[#0F2744]">
              <Store className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#0F2744]">
              01. Etalase &amp; Profil Terpusat
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Memperkenalkan profil usaha, varian produk unggulan, serta kontak WhatsApp pemilik
              UMKM dari seluruh desa di Kecamatan Cisaga dalam satu direktori rapi.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] inline-flex items-center justify-center text-[#EA580C]">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#0F2744]">
              02. Promosi Inklusif &amp; Terukur
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Membuka akses pendaftaran Reguler (Gratis) bagi setiap pelaku usaha sekaligus opsi
              sorotan Premium di posisi teratas untuk jangkauan promosi maksimal.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] inline-flex items-center justify-center text-[#0F2744]">
              <Compass className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#0F2744]">
              03. Jembatan Mitra &amp; Pasar Luas
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Memudahkan masyarakat, instansi, toko oleh-oleh, maupun calon reseller menjalin kerja
              sama kolektif dengan sentra produksi asli Cisaga.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
