import { Bookmark, Check, Crown, Eye, MessageCircle } from 'lucide-react';
import type { SavedPromoItem, UmkmListing } from '../types/umkm';
import {
  buildWhatsAppUrl,
  formatRupiah,
  getStartingPrice,
  isListingSaved,
} from '../utils/umkmLogic';
import { ProductImage } from './ProductImage';

interface PremiumTopSectionProps {
  premiumListings: UmkmListing[];
  savedItems: SavedPromoItem[];
  onSelectListing: (listing: UmkmListing) => void;
  onToggleSave: (listing: UmkmListing) => void;
}

export function PremiumTopSection({
  premiumListings,
  savedItems,
  onSelectListing,
  onToggleSave,
}: PremiumTopSectionProps) {
  return (
    <section
      id="umkm-premium"
      data-testid="premium-top-section"
      className="scroll-mt-16 py-12 sm:py-16 bg-[#F8FAFC] border-b border-[#E2E8F0]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C2410C] mb-2">
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Promosi UMKM · Mitra Premium Posisi Teratas</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight">
              UMKM Premium Pilihan CISAGA HUB
            </h2>
          </div>
          <p className="text-sm text-[#475569] tabular-nums">
            <span className="font-semibold text-[#0F2744]">{premiumListings.length}</span>{' '}
            usaha tampil di posisi teratas
          </p>
        </div>

        {premiumListings.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
            <p className="text-sm text-[#475569]">
              Belum ada UMKM berstatus Premium aktif saat ini. Admin dapat menambahkan atau
              menaikkan status usaha ke Premium melalui Panel Admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {premiumListings.map((listing) => {
              const startingPrice = getStartingPrice(listing);
              const saved = isListingSaved(savedItems, listing.id);
              const waUrl = buildWhatsAppUrl(
                listing.whatsapp,
                `Halo ${listing.businessName}, saya melihat promosi Premium "${listing.productName}" di bagian teratas CISAGA HUB Kecamatan Cisaga.`
              );

              return (
                <article
                  key={listing.id}
                  data-testid={`premium-card-${listing.id}`}
                  className="group bg-white border border-[#FDBA74] rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#EA580C]"
                >
                  <div className="aspect-[4/3] bg-[#F1F5F9] overflow-hidden border-b border-[#E2E8F0]">
                    <ProductImage
                      src={listing.image}
                      alt={listing.productName}
                      fallbackTitle={listing.productName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-2">
                      <span className="font-semibold text-[#C2410C]">Premium</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#0F2744]">{listing.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{listing.village}</span>
                    </div>

                    <h3 className="text-base font-semibold text-[#0F2744] leading-snug mb-1">
                      {listing.productName}
                    </h3>
                    <p className="text-xs font-medium text-[#475569] mb-3">
                      {listing.businessName} · {listing.ownerName}
                      {listing.variants.length > 1
                        ? ` · ${listing.variants.length} Menu/Layanan`
                        : ''}
                    </p>
                    <p className="text-sm text-[#475569] leading-relaxed mb-5 flex-1">
                      {listing.shortDescription}
                    </p>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-[#475569]">Kisaran mulai</p>
                        <p className="font-mono tabular-nums text-[15px] font-semibold text-[#0F2744]">
                          {formatRupiah(startingPrice)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectListing(listing)}
                          aria-label={`Lihat profil dan detail ${listing.productName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-[#0F2744] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Detail</span>
                        </button>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Hubungi WhatsApp ${listing.businessName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Chat WA</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => onToggleSave(listing)}
                          aria-pressed={saved}
                          aria-label={
                            saved
                              ? `Hapus ${listing.productName} dari daftar tersimpan`
                              : `Simpan ${listing.productName} ke daftar minat`
                          }
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                            saved
                              ? 'bg-[#0F2744]/10 text-[#0F2744] border-[#0F2744]/30'
                              : 'bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F2744]'
                          }`}
                        >
                          {saved ? (
                            <Check className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                          )}
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
