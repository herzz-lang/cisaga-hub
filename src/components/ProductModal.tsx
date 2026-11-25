import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, MessageCircle, X } from 'lucide-react';
import type { SavedPromoItem, UmkmListing } from '../types/umkm';
import {
  buildWhatsAppUrl,
  formatRupiah,
  getListingAllImages,
  isListingSaved,
} from '../utils/umkmLogic';
import { ProductImage } from './ProductImage';

interface ProductModalProps {
  listing: UmkmListing | null;
  savedItems: SavedPromoItem[];
  onClose: () => void;
  onSaveListing: (listing: UmkmListing, variantId: string) => void;
}

export function ProductModal({
  listing,
  savedItems,
  onClose,
  onSaveListing,
}: ProductModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImageUrl, setActiveImageUrl] = useState<string>('');

  const allImages = useMemo(() => (listing ? getListingAllImages(listing) : []), [listing]);

  useEffect(() => {
    if (listing) {
      setSelectedVariantId(listing.variants[0]?.id ?? '');
      setActiveImageUrl(listing.image);
    }
  }, [listing]);

  useEffect(() => {
    if (!listing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listing, onClose]);

  if (!listing) return null;

  const activeVariant =
    listing.variants.find((v) => v.id === selectedVariantId) ?? listing.variants[0];
  const activePrice = activeVariant?.price ?? listing.price;
  const activeLabel = activeVariant?.label ?? listing.unitLabel;
  const activeVariantId = activeVariant?.id ?? `${listing.id}-default`;
  const isSaved = isListingSaved(savedItems, listing.id, activeVariantId);
  const displayedImage = activeImageUrl || listing.image;

  const whatsappMessage = `Halo ${listing.businessName}, saya melihat profil dan menu/layanan "${activeLabel}" (${listing.productName}) di platform CISAGA HUB Kecamatan Cisaga. Boleh info ketersediaan dan pemesanannya?`;
  const whatsappUrl = buildWhatsAppUrl(listing.whatsapp, whatsappMessage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2744]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-3xl w-full overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
        <div className="md:col-span-6 bg-[#F8FAFC] flex flex-col border-b md:border-b-0 md:border-r border-[#E2E8F0]">
          <div className="aspect-[4/3] md:flex-1 bg-[#F1F5F9] overflow-hidden">
            <ProductImage
              src={displayedImage}
              alt={listing.productName}
              fallbackTitle={listing.productName}
              className="w-full h-full object-cover"
            />
          </div>

          {allImages.length > 1 && (
            <div
              data-testid="modal-gallery-strip"
              className="p-3 bg-white border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto"
            >
              {allImages.map((imgUrl, idx) => {
                const isSelected = imgUrl === displayedImage;
                return (
                  <button
                    key={imgUrl}
                    type="button"
                    onClick={() => setActiveImageUrl(imgUrl)}
                    aria-label={`Lihat foto ${idx + 1} dari ${listing.businessName}`}
                    aria-pressed={isSelected}
                    className={`w-14 h-12 rounded-md overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#EA580C]'
                        : 'border-[#E2E8F0] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <ProductImage
                      src={imgUrl}
                      alt={`${listing.productName} foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="text-xs text-[#475569] flex flex-wrap items-center gap-1.5">
                <span
                  className={
                    listing.tier === 'premium'
                      ? 'font-semibold text-[#C2410C]'
                      : 'font-medium text-[#475569]'
                  }
                >
                  {listing.tier === 'premium' ? 'Mitra Premium' : 'Reguler (Daftar Free)'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#0F2744]">{listing.category}</span>
                <span aria-hidden="true">·</span>
                <span>{listing.village}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup detail profil UMKM"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] text-[#475569] hover:text-[#0F2744] hover:bg-[#F8FAFC] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <h2
              id="modal-product-title"
              className="font-display text-2xl font-bold text-[#0F2744] leading-snug mb-1.5"
            >
              {listing.productName}
            </h2>
            <p className="text-xs font-medium text-[#475569] mb-4">
              {listing.businessName} ({listing.ownerName}) · WA{' '}
              <span className="font-mono tabular-nums">{listing.whatsapp}</span>
            </p>

            <div className="flex items-baseline justify-between gap-3 mb-4">
              <p className="font-mono tabular-nums text-xl font-semibold text-[#0F2744]">
                {formatRupiah(activePrice)}
              </p>
              <p className="text-xs font-semibold text-[#047857]">
                {activeVariant?.availabilityNote ?? 'Siap Dipromosikan'}
              </p>
            </div>

            <p className="text-sm text-[#475569] leading-relaxed mb-5">
              {listing.fullDescription}
            </p>

            {listing.variants.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#0F2744] mb-2">
                  Daftar Menu, Produk &amp; Layanan ({listing.variants.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {listing.variants.map((variant) => {
                    const isSelected = variant.id === activeVariantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          if (variant.image) setActiveImageUrl(variant.image);
                        }}
                        aria-pressed={isSelected}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-[#0F2744] bg-[#0F2744]/5 text-[#0F2744]'
                            : 'border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F2744]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {variant.image && (
                            <div className="w-9 h-9 rounded overflow-hidden border border-[#E2E8F0] shrink-0">
                              <ProductImage
                                src={variant.image}
                                alt={variant.label}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0F2744] truncate">
                              {variant.label}
                            </p>
                            <p className="text-[11px] text-[#475569] truncate">
                              {variant.availabilityNote}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-[#0F2744] shrink-0">
                          {formatRupiah(variant.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>Hubungi UMKM via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                onSaveListing(listing, activeVariantId);
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#0F2744] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors cursor-pointer"
            >
              {isSaved ? (
                <Check className="w-4 h-4 text-[#0F2744]" aria-hidden="true" />
              ) : (
                <Bookmark className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isSaved ? 'Sudah Tersimpan di Daftar' : 'Simpan ke Daftar Minat'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
