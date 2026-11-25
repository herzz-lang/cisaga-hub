import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { UmkmListing, VillageInfo } from '../types/umkm';
import {
  buildCisagaProfileSlides,
  getNextSlideIndex,
  type CisagaProfileSlide,
} from '../utils/cisagaProfileSlides';
import { ProductImage } from './ProductImage';

interface HeroSectionProps {
  totalPartnerCount: number;
  premiumCount: number;
  regulerCount: number;
  villages: VillageInfo[];
  listings: UmkmListing[];
  onExploreVillage: (villageName: string) => void;
  onExploreDirectory: () => void;
}

const AUTOPLAY_INTERVAL_MS = 5500;

export function HeroSection({
  totalPartnerCount,
  premiumCount,
  regulerCount,
  villages,
  listings,
  onExploreVillage,
  onExploreDirectory,
}: HeroSectionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const slides = useMemo(
    () => buildCisagaProfileSlides(villages, listings, totalPartnerCount),
    [villages, listings, totalPartnerCount]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPausedByHover, setIsPausedByHover] = useState(false);

  const safeIndex = activeIndex < slides.length ? activeIndex : 0;
  const activeSlide = slides[safeIndex];

  useEffect(() => {
    if (!isAutoPlaying || isPausedByHover || prefersReducedMotion || slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => getNextSlideIndex(prev, 'next', slides.length));
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, isPausedByHover, prefersReducedMotion, slides.length]);

  const handleStep = (direction: 'prev' | 'next') => {
    setActiveIndex((prev) => getNextSlideIndex(prev, direction, slides.length));
  };

  const handleSelectSlide = (index: number) => {
    setActiveIndex(index);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleStep('next');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleStep('prev');
    }
  };

  const handleExploreSlide = (slide: CisagaProfileSlide) => {
    if (slide.villageFilterTarget) {
      onExploreVillage(slide.villageFilterTarget);
    } else {
      onExploreDirectory();
    }
  };

  return (
    <section
      id="beranda"
      className="pt-8 pb-10 sm:pt-12 sm:pb-14 bg-white border-b border-[#E2E8F0]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-5 flex flex-col justify-center py-2">
            <p className="text-xs font-semibold tracking-wide text-[#C2410C] mb-3.5">
              CISAGA HUB · Digital UMKM Ecosystem Kecamatan Cisaga
            </p>
            <h1
              className="font-display font-bold text-[#0F2744] tracking-tight leading-[1.08] mb-4"
              style={{ fontSize: 'clamp(2.15rem, 3.6vw, 3.1rem)', textWrap: 'balance' }}
            >
              Connecting Local Business, Growing Together.
            </h1>
            <p className="text-base sm:text-[17px] leading-[1.65] text-[#475569] max-w-[50ch] mb-7">
              Setiap usaha memiliki potensi untuk berkembang.{' '}
              <strong className="font-semibold text-[#0F2744]">CISAGA HUB</strong> hadir sebagai
              jembatan digital yang menghubungkan potensi usaha lokal Kecamatan Cisaga dengan
              peluang pasar yang lebih luas.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href="#umkm-premium"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#EA580C]"
              >
                <span>Jelajahi UMKM Premium</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </a>
              <a
                href="#daftar-mitra"
                className="inline-flex items-center py-2 text-sm font-semibold text-[#0F2744] hover:text-[#EA580C] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                Daftarkan UMKM Free
              </a>
            </div>
          </div>

          {/* Right Interactive Regional Profile Slider */}
          <div className="lg:col-span-7 flex flex-col">
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="Slide Profil Wilayah Kecamatan Cisaga"
              data-testid="cisaga-profile-slider"
              onMouseEnter={() => setIsPausedByHover(true)}
              onMouseLeave={() => setIsPausedByHover(false)}
              onFocusCapture={() => setIsPausedByHover(true)}
              onBlurCapture={() => setIsPausedByHover(false)}
              className="flex flex-col h-full rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
            >
              {/* Slide Media & Measured Overlay */}
              <div className="relative min-h-[360px] sm:min-h-[380px] lg:flex-1 lg:min-h-[400px] bg-[#0F2744] overflow-hidden">
                <div key={activeSlide.id} className="absolute inset-0 cisaga-slide-enter">
                  <ProductImage
                    src={activeSlide.image}
                    alt={activeSlide.imageAlt}
                    fallbackTitle={activeSlide.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Top Subtle Scrim + Slide Index & Interactive Controls */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0B1E36]/75 via-[#0B1E36]/30 to-transparent"
                />

                <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5 sm:pt-4">
                  <div className="text-xs font-mono tabular-nums text-white/95 flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[#FDBA74]">
                      {activeSlide.indexLabel} / {String(slides.length).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true" className="text-white/50">
                      ·
                    </span>
                    <span className="truncate">{activeSlide.coordinatesLabel}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAutoPlaying((prev) => !prev)}
                      aria-label={isAutoPlaying ? 'Jeda putar otomatis slide' : 'Putar otomatis slide'}
                      aria-pressed={!isAutoPlaying}
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0B1E36]/75 hover:bg-[#0F2744] text-white border border-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {isAutoPlaying ? (
                        <Pause className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Play className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('prev')}
                      aria-label="Slide profil wilayah sebelumnya"
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0B1E36]/75 hover:bg-[#EA580C] text-white border border-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStep('next')}
                      aria-label="Slide profil wilayah berikutnya"
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0B1E36]/75 hover:bg-[#EA580C] text-white border border-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Bottom Measured Scrim + Regional Profile Copy */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-64 sm:h-72 bg-gradient-to-t from-[#0B1E36]/95 via-[#0B1E36]/80 to-transparent"
                />

                <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
                  <p className="text-xs font-semibold text-[#FDBA74] mb-1 truncate">
                    Profil Wilayah · {activeSlide.subtitle}
                  </p>
                  <h2
                    data-testid="active-slide-title"
                    className="font-display text-xl sm:text-2xl font-bold text-white leading-tight mb-1.5"
                  >
                    {activeSlide.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed line-clamp-2 max-w-[58ch] mb-3.5">
                    {activeSlide.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/15">
                    <p className="text-xs font-mono tabular-nums text-white/90">
                      <span className="font-semibold text-white">{activeSlide.umkmCount} UMKM</span>{' '}
                      <span aria-hidden="true" className="text-white/50 mx-1">
                        ·
                      </span>{' '}
                      <span>{activeSlide.featuredSector}</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => handleExploreSlide(activeSlide)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span>
                        {activeSlide.villageFilterTarget
                          ? `Lihat UMKM ${activeSlide.shortLabel}`
                          : 'Lihat Direktori Wilayah'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Regional Selector Strip */}
              <div
                role="tablist"
                aria-label="Pilih slide profil wilayah Kecamatan Cisaga"
                onKeyDown={handleTabKeyDown}
                className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-1.5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1"
              >
                {slides.map((slide, index) => {
                  const isActive = index === safeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Slide ${slide.indexLabel}: ${slide.title}`}
                      title={slide.title}
                      onClick={() => handleSelectSlide(index)}
                      className={`w-full px-2 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors duration-150 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] ${
                        isActive
                          ? 'bg-[#0F2744] text-white font-semibold'
                          : 'text-[#475569] hover:text-[#0F2744] hover:bg-white'
                      }`}
                    >
                      {slide.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Proof Strip */}
        <div className="mt-10 pt-7 border-t border-[#E2E8F0] grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F2744]">
              {totalPartnerCount}
            </p>
            <p className="text-sm text-[#475569] mt-1">Pelaku UMKM Terdata</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#EA580C]">
              {premiumCount} Premium
            </p>
            <p className="text-sm text-[#475569] mt-1">Promosi Posisi Teratas</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F2744]">
              {regulerCount} Reguler
            </p>
            <p className="text-sm text-[#475569] mt-1">Etalase Daftar Free</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0F2744]">
              {villages.length} Desa
            </p>
            <p className="text-sm text-[#475569] mt-1">Ekosistem Kec. Cisaga</p>
          </div>
        </div>
      </div>
    </section>
  );
}
