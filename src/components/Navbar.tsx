import { ArrowLeft, Bookmark, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { BrandLogo } from './BrandLogo';

export type AppView = 'public' | 'admin';

interface NavbarProps {
  activeView: AppView;
  savedCount: number;
  onNavigatePublic: (hash?: string) => void;
  onOpenSaved: () => void;
}

export function Navbar({
  activeView,
  savedCount,
  onNavigatePublic,
  onOpenSaved,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-element brand wordmark & logo */}
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            onNavigatePublic('#beranda');
          }}
          aria-label="CISAGA HUB Beranda"
          className="whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
        >
          <BrandLogo size="sm" />
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#475569]"
        >
          <a
            href="#tentang"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#tentang');
            }}
            className="hover:text-[#0F2744] hover:underline underline-offset-4 decoration-[#EA580C] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
          >
            Tentang
          </a>
          <a
            href="#katalog"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#katalog');
            }}
            className="hover:text-[#0F2744] hover:underline underline-offset-4 decoration-[#EA580C] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
          >
            Katalog
          </a>
          <a
            href="#sebaran-desa"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#sebaran-desa');
            }}
            className="hover:text-[#0F2744] hover:underline underline-offset-4 decoration-[#EA580C] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
          >
            Direktori
          </a>
          <a
            href="#daftar-mitra"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#daftar-mitra');
            }}
            className="hover:text-[#0F2744] hover:underline underline-offset-4 decoration-[#EA580C] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
          >
            Daftarkan UMKM
          </a>
          <a
            href="#hubungi-kami"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#hubungi-kami');
            }}
            className="hover:text-[#0F2744] hover:underline underline-offset-4 decoration-[#EA580C] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] rounded"
          >
            Hubungi Saya
          </a>
        </nav>

        {/* Zone 3: 1 primary action button (+ mobile menu button) */}
        <div className="flex items-center gap-2 shrink-0">
          {activeView === 'admin' ? (
            <button
              type="button"
              onClick={() => onNavigatePublic('#beranda')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F2744]"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Lihat Etalase</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSaved}
              aria-label={`Buka daftar UMKM tersimpan, ${savedCount} item`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F2744]"
            >
              <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Tersimpan</span>
              <span
                data-testid="saved-badge-count"
                className="font-mono tabular-nums text-xs bg-[#EA580C] text-white px-1.5 py-0.5 rounded"
              >
                {savedCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E8F0] text-[#0F2744] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & tablet navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Navigasi seluler"
          className="lg:hidden border-t border-[#E2E8F0] bg-white px-4 py-3 flex flex-col gap-1"
        >
          <a
            href="#tentang"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#tentang');
            }}
            className="px-3 py-2.5 text-sm font-medium text-[#0F2744] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
          >
            Tentang CISAGA HUB
          </a>
          <a
            href="#katalog"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#katalog');
            }}
            className="px-3 py-2.5 text-sm font-medium text-[#0F2744] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
          >
            Katalog Produk
          </a>
          <a
            href="#sebaran-desa"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#sebaran-desa');
            }}
            className="px-3 py-2.5 text-sm font-medium text-[#0F2744] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
          >
            Direktori Desa
          </a>
          <a
            href="#daftar-mitra"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#daftar-mitra');
            }}
            className="px-3 py-2.5 text-sm font-medium text-[#0F2744] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
          >
            Daftarkan UMKM
          </a>
          <a
            href="#hubungi-kami"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigatePublic('#hubungi-kami');
            }}
            className="px-3 py-2.5 text-sm font-medium text-[#0F2744] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
          >
            Hubungi Saya
          </a>
        </nav>
      )}
    </header>
  );
}
