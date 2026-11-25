import { Bookmark, CheckCircle2, MessageCircle, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { InquiryReceipt, PromoInquiryFormData, SavedPromoItem } from '../types/umkm';
import {
  buildWhatsAppUrl,
  formatRupiah,
  generateInquiryCode,
  validatePromoInquiryForm,
} from '../utils/umkmLogic';
import { ProductImage } from './ProductImage';

interface SavedPromoDrawerProps {
  isOpen: boolean;
  items: SavedPromoItem[];
  onClose: () => void;
  onRemoveItem: (listingId: string, variantId: string) => void;
  onClearSaved: () => void;
}

export function SavedPromoDrawer({
  isOpen,
  items,
  onClose,
  onRemoveItem,
  onClearSaved,
}: SavedPromoDrawerProps) {
  const [form, setForm] = useState<PromoInquiryFormData>({
    requesterName: '',
    whatsapp: '',
    organizationOrAddress: '',
    inquiryPurpose: 'Kemitraan Reseller / Toko',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PromoInquiryFormData, string>>>({});
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInquirySubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validatePromoInquiryForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newReceipt: InquiryReceipt = {
      inquiryCode: generateInquiryCode(),
      createdAt: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      requesterName: form.requesterName.trim(),
      whatsapp: form.whatsapp.trim(),
      organizationOrAddress: form.organizationOrAddress.trim(),
      inquiryPurpose: form.inquiryPurpose,
      items: [...items],
    };

    setReceipt(newReceipt);
    setErrors({});
    onClearSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0F2744]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white h-full border-l border-[#E2E8F0] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-[#EA580C]" aria-hidden="true" />
            <h2
              id="saved-drawer-title"
              className="font-display text-lg font-bold text-[#0F2744]"
            >
              {receipt ? 'Permintaan Terkirim' : 'Daftar Minat UMKM'}
            </h2>
            {!receipt && (
              <span className="font-mono tabular-nums text-xs text-[#475569]">
                ({items.length} item)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar minat UMKM"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] text-[#475569] hover:text-[#0F2744] hover:bg-[#F8FAFC] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {receipt ? (
            <div data-testid="inquiry-receipt" className="space-y-5">
              <div className="p-4 bg-[#047857]/5 border border-[#047857]/30 rounded-xl flex items-start gap-3">
                <CheckCircle2
                  className="w-5 h-5 text-[#047857] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[#0F2744]">
                    Permintaan #{receipt.inquiryCode} Dicatat
                  </p>
                  <p className="text-xs text-[#475569] mt-1">
                    Tim ekosistem CISAGA HUB Kecamatan Cisaga akan menghubungkan Anda dengan
                    pelaku usaha terkait melalui WhatsApp.
                  </p>
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-[#475569]">Pemohon</span>
                  <span className="font-medium text-[#0F2744]">{receipt.requesterName}</span>
                </div>
                <div className="flex justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-[#475569]">WhatsApp</span>
                  <span className="font-mono tabular-nums text-[#0F2744]">
                    {receipt.whatsapp}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <span className="text-[#475569]">Keperluan</span>
                  <span className="font-medium text-[#0F2744]">{receipt.inquiryPurpose}</span>
                </div>

                <div className="pt-1 space-y-2">
                  <p className="text-xs font-semibold text-[#0F2744]">Produk &amp; UMKM Diminati</p>
                  {receipt.items.map((item) => (
                    <div
                      key={`${item.listingId}-${item.variantId}`}
                      className="flex justify-between gap-2 text-xs"
                    >
                      <span className="text-[#475569]">
                        {item.productName} — {item.businessName}
                      </span>
                      <span className="font-mono tabular-nums text-[#0F2744] shrink-0">
                        {formatRupiah(item.estimatedPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  onClose();
                }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors cursor-pointer"
              >
                Kembali ke Etalase
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <Bookmark className="w-10 h-10 text-[#475569]/40 mb-3" aria-hidden="true" />
              <p className="font-display text-lg font-bold text-[#0F2744] mb-1">
                Belum ada produk tersimpan
              </p>
              <p className="text-sm text-[#475569] max-w-[28ch] mb-5">
                Simpan produk atau UMKM dari etalase CISAGA HUB untuk menghubungi pemilik usaha
                atau mengajukan kerja sama.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg cursor-pointer"
              >
                Lihat Etalase
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="divide-y divide-[#E2E8F0] border-b border-[#E2E8F0]">
                {items.map((item) => (
                  <div
                    key={`${item.listingId}-${item.variantId}`}
                    className="py-4 flex gap-3.5"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F1F5F9] shrink-0">
                      <ProductImage
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#0F2744] leading-snug truncate">
                          {item.productName}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.listingId, item.variantId)}
                          aria-label={`Hapus ${item.productName} dari daftar`}
                          className="text-[#475569] hover:text-[#B91C1C] p-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-xs text-[#475569] mb-2">
                        {item.businessName} · {item.village}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-xs font-semibold text-[#0F2744]">
                          {formatRupiah(item.estimatedPrice)}
                        </span>
                        <a
                          href={buildWhatsAppUrl(
                            item.whatsapp,
                            `Halo ${item.businessName}, saya tertarik dengan produk "${item.productName}" dari etalase CISAGA HUB Cisaga.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Chat WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleInquirySubmit} noValidate className="pt-2 space-y-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F2744]">
                    Ajukan Kemitraan / Tanya Kolektif
                  </h3>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Kirim permintaan informasi produk ke tim koordinator CISAGA HUB.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="inquiry-name"
                    className="block text-xs font-medium text-[#0F2744] mb-1"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="inquiry-name"
                    type="text"
                    value={form.requesterName}
                    onChange={(e) => {
                      setForm({ ...form, requesterName: e.target.value });
                      if (errors.requesterName) setErrors({ ...errors, requesterName: undefined });
                    }}
                    placeholder="Nama Anda atau perwakilan instansi"
                    className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  />
                  {errors.requesterName && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.requesterName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="inquiry-wa"
                    className="block text-xs font-medium text-[#0F2744] mb-1"
                  >
                    Nomor WhatsApp
                  </label>
                  <input
                    id="inquiry-wa"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => {
                      setForm({ ...form, whatsapp: e.target.value });
                      if (errors.whatsapp) setErrors({ ...errors, whatsapp: undefined });
                    }}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 text-sm font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  />
                  {errors.whatsapp && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.whatsapp}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="inquiry-org"
                    className="block text-xs font-medium text-[#0F2744] mb-1"
                  >
                    Instansi / Toko / Domisili
                  </label>
                  <input
                    id="inquiry-org"
                    type="text"
                    value={form.organizationOrAddress}
                    onChange={(e) => {
                      setForm({ ...form, organizationOrAddress: e.target.value });
                      if (errors.organizationOrAddress) {
                        setErrors({ ...errors, organizationOrAddress: undefined });
                      }
                    }}
                    placeholder="Contoh: Toko Oleh-Oleh Ciamis / Umum"
                    className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  />
                  {errors.organizationOrAddress && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.organizationOrAddress}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="inquiry-purpose"
                    className="block text-xs font-medium text-[#0F2744] mb-1"
                  >
                    Tujuan Kontak
                  </label>
                  <select
                    id="inquiry-purpose"
                    value={form.inquiryPurpose}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        inquiryPurpose: e.target.value as PromoInquiryFormData['inquiryPurpose'],
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  >
                    <option value="Kemitraan Reseller / Toko">Kemitraan Reseller / Toko</option>
                    <option value="Pemesanan Kolektif / Oleh-Oleh">
                      Pemesanan Kolektif / Oleh-Oleh
                    </option>
                    <option value="Informasi Bazar & Pameran">Informasi Bazar &amp; Pameran</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors cursor-pointer"
                >
                  Kirim Permintaan Informasi
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
