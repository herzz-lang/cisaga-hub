import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigatePublic: (hash?: string) => void;
  onOpenAdmin: () => void;
}

export function Footer({ onNavigatePublic, onOpenAdmin }: FooterProps) {
  return (
    <footer id="kontak" className="bg-white border-t border-[#E2E8F0] py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#E2E8F0]">
          <div className="md:col-span-5">
            <div className="mb-3">
              <BrandLogo size="sm" />
            </div>
            <p className="text-xs font-semibold text-[#C2410C] mb-2">
              Digital UMKM Ecosystem · Connecting Local Business, Growing Together.
            </p>
            <p className="text-sm text-[#475569] leading-relaxed max-w-[44ch]">
              Wadah digital untuk memperkenalkan usaha, menampilkan produk, memperluas jangkauan
              pemasaran, dan menghubungkan pelaku UMKM Kecamatan Cisaga dengan masyarakat.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-[#0F2744] mb-3">Navigasi Ekosistem</p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li>
                <a
                  href="#tentang"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePublic('#tentang');
                  }}
                  className="hover:text-[#0F2744] transition-colors"
                >
                  Tentang CISAGA HUB
                </a>
              </li>
              <li>
                <a
                  href="#umkm-premium"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePublic('#umkm-premium');
                  }}
                  className="hover:text-[#0F2744] transition-colors"
                >
                  Promosi UMKM Premium
                </a>
              </li>
              <li>
                <a
                  href="#katalog"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePublic('#katalog');
                  }}
                  className="hover:text-[#0F2744] transition-colors"
                >
                  Katalog Produk
                </a>
              </li>
              <li>
                <a
                  href="#sebaran-desa"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePublic('#sebaran-desa');
                  }}
                  className="hover:text-[#0F2744] transition-colors"
                >
                  Direktori Desa
                </a>
              </li>
              <li>
                <a
                  href="#daftar-mitra"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePublic('#daftar-mitra');
                  }}
                  className="hover:text-[#0F2744] transition-colors"
                >
                  Daftarkan UMKM
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="hover:text-[#0F2744] transition-colors cursor-pointer"
                >
                  Panel Admin Developer
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold text-[#0F2744] mb-3">
              Kontak &amp; Informasi Sekretariat
            </p>
            <p className="text-sm text-[#475569] leading-relaxed">
              Jl. Raya Cisaga No. 48, Desa Cisaga, Kec. Cisaga, Kab. Ciamis, Jawa Barat 46386
            </p>
            <p className="text-sm text-[#475569] mt-2 font-mono tabular-nums">
              Senin – Sabtu · 08.00 – 16.30 WIB
            </p>
            <p className="text-sm text-[#0F2744] font-medium mt-2">
              Email: sekretariat@cisagahub.id
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#475569]">
          <p>© {new Date().getFullYear()} CISAGA HUB — Digital UMKM Ecosystem Kecamatan Cisaga.</p>
          <p>Connecting Local Business, Growing Together.</p>
        </div>
      </div>
    </footer>
  );
}
