import { Bookmark, Check, Eye, Search, X } from 'lucide-react';
import type {
  ProductCategory,
  SavedPromoItem,
  SortOption,
  UmkmListing,
  UmkmTier,
} from '../types/umkm';
import { formatRupiah, getStartingPrice, isListingSaved } from '../utils/umkmLogic';
import { ProductImage } from './ProductImage';

interface CatalogSectionProps {
  listings: UmkmListing[];
  totalActiveCount: number;
  savedItems: SavedPromoItem[];
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  tierFilter: 'all' | UmkmTier;
  onSelectTierFilter: (tier: 'all' | UmkmTier) => void;
  selectedVillage: string;
  onResetVillage: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onResetAll: () => void;
  onSelectListing: (listing: UmkmListing) => void;
  onToggleSave: (listing: UmkmListing) => void;
}

const CATEGORIES: ProductCategory[] = ['Semua', 'Kuliner', 'Kerajinan', 'Agribisnis', 'Busana'];

export function CatalogSection({
  listings,
  totalActiveCount,
  savedItems,
  selectedCategory,
  onSelectCategory,
  tierFilter,
  onSelectTierFilter,
  selectedVillage,
  onResetVillage,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onResetAll,
  onSelectListing,
  onToggleSave,
}: CatalogSectionProps) {
  return (
    <section id="katalog" className="scroll-mt-16 py-14 sm:py-20 bg-[#F8FAFC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C2410C] mb-2">
              Katalog Produk &amp; Kategori UMKM · CISAGA HUB
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight">
              Semua UMKM &amp; Produk Unggulan Cisaga
            </h2>
          </div>
          <p className="text-sm text-[#475569] tabular-nums">
            Menampilkan <span className="font-semibold text-[#0F2744]">{listings.length}</span> dari{' '}
            {totalActiveCount} etalase aktif
          </p>
        </div>

        {/* Interactive Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="Filter kategori produk"
              className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-lg w-fit border border-[#E2E8F0]"
            >
              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectCategory(category)}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2744] ${
                      isActive
                        ? 'bg-[#0F2744] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#0F2744]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="catalog-tier-filter" className="sr-only">
                Filter paket promosi
              </label>
              <select
                id="catalog-tier-filter"
                value={tierFilter}
                onChange={(e) => onSelectTierFilter(e.target.value as 'all' | UmkmTier)}
                className="pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744] cursor-pointer"
              >
                <option value="all">Paket: Semua</option>
                <option value="premium">Paket: Premium</option>
                <option value="reguler">Paket: Reguler (Free)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {selectedVillage !== 'Semua Desa' && (
              <button
                type="button"
                onClick={onResetVillage}
                aria-label={`Hapus filter desa ${selectedVillage}`}
                className="inline-flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium bg-[#0F2744]/10 text-[#0F2744] hover:bg-[#0F2744]/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Filter: {selectedVillage}</span>
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}

            <div className="relative flex-1 sm:w-60">
              <label htmlFor="catalog-search" className="sr-only">
                Cari produk, nama usaha, atau desa
              </label>
              <Search
                className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari produk, usaha, desa..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F2744] placeholder:text-[#475569]/70 focus:outline-none focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
              />
            </div>

            <div>
              <label htmlFor="catalog-sort" className="sr-only">
                Urutkan etalase
              </label>
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="w-full sm:w-auto pl-3 pr-8 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744] cursor-pointer"
              >
                <option value="featured">Urutan: Premium Teratas</option>
                <option value="price-asc">Kisaran: Terendah</option>
                <option value="price-desc">Kisaran: Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Showcase Grid or Empty State */}
        {listings.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center max-w-lg mx-auto">
            <h3 className="font-display text-lg font-semibold text-[#0F2744] mb-2">
              Etalase tidak ditemukan
            </h3>
            <p className="text-sm text-[#475569] mb-6">
              Tidak ada UMKM atau produk Cisaga yang cocok dengan kata kunci atau filter yang
              sedang aktif.
            </p>
            <button
              type="button"
              onClick={onResetAll}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div
            data-testid="product-grid"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5"
          >
            {listings.map((listing) => {
              const startingPrice = getStartingPrice(listing);
              const saved = isListingSaved(savedItems, listing.id);
              const isPremium = listing.tier === 'premium';

              return (
                <article
                  key={listing.id}
                  data-testid={`product-card-${listing.id}`}
                  className="group bg-white border border-[#E2E8F0] rounded-lg overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#CBD5E1]"
                >
                  <div className="aspect-[4/3] bg-[#F1F5F9] overflow-hidden border-b border-[#E2E8F0]">
                    <ProductImage
                      src={listing.image}
                      alt={listing.productName}
                      fallbackTitle={listing.productName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="p-3 sm:p-3.5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1 text-[11px] leading-tight text-[#475569] mb-1.5 min-w-0">
                      <span
                        className={`shrink-0 ${
                          isPremium
                            ? 'font-semibold text-[#C2410C]'
                            : 'font-medium text-[#475569]'
                        }`}
                      >
                        {isPremium ? 'Premium' : 'Reguler'}
                      </span>
                      <span aria-hidden="true" className="shrink-0">
                        ·
                      </span>
                      <span className="font-semibold text-[#0F2744] shrink-0">
                        {listing.category}
                      </span>
                      <span aria-hidden="true" className="shrink-0">
                        ·
                      </span>
                      <span className="truncate">{listing.village}</span>
                    </div>

                    <h3 className="text-[13px] sm:text-sm font-semibold text-[#0F2744] leading-snug line-clamp-2 mb-1">
                      {listing.productName}
                    </h3>
                    <p className="text-[11px] text-[#475569] truncate mb-2">
                      {listing.businessName}
                      {listing.variants.length > 1
                        ? ` · ${listing.variants.length} Menu`
                        : ''}
                    </p>
                    <p className="text-xs text-[#475569] leading-relaxed line-clamp-2 mb-3 flex-1">
                      {listing.shortDescription}
                    </p>

                    <div className="pt-2.5 border-t border-[#E2E8F0] space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-[#475569]">Mulai</span>
                        <span className="font-mono tabular-nums text-sm font-semibold text-[#0F2744]">
                          {formatRupiah(startingPrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectListing(listing)}
                          aria-label={`Lihat profil dan detail ${listing.productName}`}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium text-[#0F2744] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md transition-colors whitespace-nowrap cursor-pointer min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSave(listing)}
                          aria-pressed={saved}
                          aria-label={
                            saved
                              ? `Hapus ${listing.productName} dari daftar tersimpan`
                              : `Simpan ${listing.productName} ke daftar minat`
                          }
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
                            saved
                              ? 'bg-[#0F2744]/10 text-[#0F2744] border border-[#0F2744]/30 hover:bg-[#0F2744]/15'
                              : 'text-white bg-[#0F2744] hover:bg-[#0B1E36]'
                          }`}
                        >
                          {saved ? (
                            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          )}
                          <span className="hidden xl:inline">
                            {saved ? 'Disimpan' : 'Simpan'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
