import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  BusinessCategory,
  FreeRegistrationFormData,
  UmkmListing,
  VillageInfo,
} from '../types/umkm';
import { validateFreeRegistrationForm } from '../utils/umkmLogic';

interface PartnerRegistrationSectionProps {
  villages: VillageInfo[];
  onRegisterFreeUmkm: (data: FreeRegistrationFormData) => Promise<UmkmListing>;
  onOpenAdmin: () => void;
}

const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Kuliner',
  'Kerajinan',
  'Agribisnis',
  'Busana',
];

export function PartnerRegistrationSection({
  villages,
  onRegisterFreeUmkm,
  onOpenAdmin,
}: PartnerRegistrationSectionProps) {
  const [form, setForm] = useState<FreeRegistrationFormData>({
    businessName: '',
    ownerName: '',
    village: '',
    category: 'Kuliner',
    whatsapp: '',
    signatureProduct: '',
    estimatedPrice: '20000',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FreeRegistrationFormData, string>>>(
    {}
  );
  const [submittedListing, setSubmittedListing] = useState<UmkmListing | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validateFreeRegistrationForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onRegisterFreeUmkm(form);
      setSubmittedListing(created);
      setErrors({});
      setForm({
        businessName: '',
        ownerName: '',
        village: '',
        category: 'Kuliner',
        whatsapp: '',
        signatureProduct: '',
        estimatedPrice: '20000',
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal mengirim pendaftaran. Coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="daftar-mitra" className="scroll-mt-16 py-14 sm:py-20 bg-[#F8FAFC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Paket Promosi Comparison */}
          <div id="cerita-cisaga" className="scroll-mt-20 lg:col-span-5">
            <p className="text-xs font-semibold text-[#C2410C] mb-2">
              Daftarkan UMKM · Ekosistem CISAGA HUB
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight mb-4">
              Daftar Gratis atau Tampil Paling Atas di Paket Premium
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed mb-6">
              Setiap pelaku UMKM di Kecamatan Cisaga dapat bergabung tanpa biaya (Reguler). Untuk
              promosi maksimal di halaman utama, usaha terkurasi dapat mengaktifkan status
              Premium.
            </p>

            <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
              <div className="py-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-[#0F2744]">
                    01. Paket Reguler (Daftar Free)
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#047857]">Gratis</span>
                </div>
                <p className="text-sm text-[#475569]">
                  Tampil di katalog utama seluruh UMKM, direktori desa asal, serta tautan kontak
                  WhatsApp langsung ke pemilik usaha.
                </p>
              </div>
              <div className="py-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-[#0F2744]">
                    02. Paket Premium (Promosi Teratas)
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#C2410C]">Posisi Atas</span>
                </div>
                <p className="text-sm text-[#475569]">
                  Ditampilkan di bagian paling atas halaman (Sorotan Promosi UMKM), urutan teratas
                  katalog, dan tombol Chat WA cepat di kartu utama.
                </p>
              </div>
              <div className="py-4 flex items-center justify-between gap-4">
                <p className="text-xs text-[#475569]">
                  Developer pengelola CISAGA HUB? Kelola status dan data UMKM di Panel Admin.
                </p>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="text-xs font-semibold text-[#0F2744] hover:text-[#EA580C] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Buka Panel Admin
                </button>
              </div>
            </div>
          </div>

          {/* Free Registration Form */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-[#0F2744] mb-1.5">
              Formulir Daftarkan UMKM Reguler (Free)
            </h3>
            <p className="text-sm text-[#475569] mb-6">
              Daftarkan usaha Anda tanpa biaya. Data akan masuk ke antrean verifikasi Admin
              CISAGA HUB Kecamatan Cisaga.
            </p>

            {submittedListing && (
              <div
                role="status"
                data-testid="partner-success-banner"
                className="mb-6 p-4 bg-[#047857]/5 border border-[#047857]/30 rounded-lg flex items-start gap-3"
              >
                <CheckCircle2
                  className="w-5 h-5 text-[#047857] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-semibold text-[#0F2744]">
                    Pendaftaran Free {submittedListing.businessName} berhasil dikirim
                  </p>
                  <p className="text-[#475569] mt-0.5">
                    Paket: <span className="font-medium text-[#0F2744]">Reguler (Free)</span> ·
                    Status:{' '}
                    <span className="font-medium text-[#C2410C]">{submittedListing.status}</span> ·
                    Admin dapat mengaktifkan atau menaikkan ke Premium lewat Panel Admin.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="mb-6 p-4 bg-[#B91C1C]/5 border border-[#B91C1C]/30 rounded-lg text-sm text-[#B91C1C]"
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="partner-business-name"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Nama Usaha / Brand
                  </label>
                  <input
                    id="partner-business-name"
                    type="text"
                    value={form.businessName}
                    onChange={(e) => {
                      setForm({ ...form, businessName: e.target.value });
                      if (errors.businessName) setErrors({ ...errors, businessName: undefined });
                    }}
                    placeholder="Contoh: Keripik Tempe Mekar"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.businessName && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="partner-owner-name"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Nama Pemilik
                  </label>
                  <input
                    id="partner-owner-name"
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => {
                      setForm({ ...form, ownerName: e.target.value });
                      if (errors.ownerName) setErrors({ ...errors, ownerName: undefined });
                    }}
                    placeholder="Nama lengkap penanggung jawab"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.ownerName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="partner-village"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Desa Asal (Kec. Cisaga)
                  </label>
                  <select
                    id="partner-village"
                    value={form.village}
                    onChange={(e) => {
                      setForm({ ...form, village: e.target.value });
                      if (errors.village) setErrors({ ...errors, village: undefined });
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  >
                    <option value="">Pilih Desa...</option>
                    {villages.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  {errors.village && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.village}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="partner-category"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Kategori Usaha
                  </label>
                  <select
                    id="partner-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as BusinessCategory,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  >
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="partner-whatsapp"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Nomor WhatsApp Aktif
                  </label>
                  <input
                    id="partner-whatsapp"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => {
                      setForm({ ...form, whatsapp: e.target.value });
                      if (errors.whatsapp) setErrors({ ...errors, whatsapp: undefined });
                    }}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.whatsapp && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.whatsapp}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="partner-signature"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Produk Unggulan
                  </label>
                  <input
                    id="partner-signature"
                    type="text"
                    value={form.signatureProduct}
                    onChange={(e) => {
                      setForm({ ...form, signatureProduct: e.target.value });
                      if (errors.signatureProduct) {
                        setErrors({ ...errors, signatureProduct: undefined });
                      }
                    }}
                    placeholder="Ranginang Ketan"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.signatureProduct && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.signatureProduct}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="partner-price"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Kisaran Harga (Rp)
                  </label>
                  <input
                    id="partner-price"
                    type="number"
                    min={1000}
                    step={500}
                    value={form.estimatedPrice}
                    onChange={(e) => {
                      setForm({ ...form, estimatedPrice: e.target.value });
                      if (errors.estimatedPrice) {
                        setErrors({ ...errors, estimatedPrice: undefined });
                      }
                    }}
                    placeholder="20000"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.estimatedPrice && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.estimatedPrice}</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? 'Mengirim...' : 'Daftar UMKM Free'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
