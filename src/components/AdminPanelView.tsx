import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  ImagePlus,
  LogOut,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { UMKM_IMAGE_PRESETS } from '../data/cisagaData';
import type {
  AdminUmkmFormData,
  AdminVariantFormItem,
  BusinessCategory,
  UmkmListing,
  UmkmStatus,
  UmkmTier,
  VillageInfo,
} from '../types/umkm';
import { formatRupiah, getListingAllImages, validateAdminUmkmForm } from '../utils/umkmLogic';
import { ProductImage } from './ProductImage';

interface AdminPanelViewProps {
  adminUsername: string;
  listings: UmkmListing[];
  villages: VillageInfo[];
  onCreateListing: (data: AdminUmkmFormData) => Promise<void>;
  onUpdateListing: (id: string, data: AdminUmkmFormData) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  onToggleTier: (id: string) => Promise<void>;
  onCycleStatus: (id: string) => Promise<void>;
  onDeleteListing: (id: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

type AdminFilterTab = 'all' | 'premium' | 'reguler' | 'pending';

const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Kuliner',
  'Kerajinan',
  'Agribisnis',
  'Busana',
];

const createEmptyForm = (): AdminUmkmFormData => ({
  businessName: '',
  ownerName: '',
  productName: '',
  category: 'Kuliner',
  village: '',
  whatsapp: '',
  tier: 'reguler',
  status: 'Aktif',
  price: '25000',
  unitLabel: 'Kemasan 250g',
  shortDescription: '',
  image: UMKM_IMAGE_PRESETS[1].url,
  galleryImages: [],
  variants: [
    {
      label: 'Paket / Menu Utama',
      price: '25000',
      availabilityNote: 'Tersedia Harian',
    },
  ],
});

export function AdminPanelView({
  adminUsername,
  listings,
  villages,
  onCreateListing,
  onUpdateListing,
  onUploadImage,
  onToggleTier,
  onCycleStatus,
  onDeleteListing,
  onLogout,
}: AdminPanelViewProps) {
  const [filterTab, setFilterTab] = useState<AdminFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUmkmFormData>(() => createEmptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof AdminUmkmFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const metrics = useMemo(() => {
    const total = listings.length;
    const premiumActive = listings.filter(
      (i) => i.tier === 'premium' && i.status === 'Aktif'
    ).length;
    const regulerCount = listings.filter((i) => i.tier === 'reguler').length;
    const pendingCount = listings.filter((i) => i.status === 'Menunggu Verifikasi').length;
    return { total, premiumActive, regulerCount, pendingCount };
  }, [listings]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((item) => {
      if (filterTab === 'premium' && item.tier !== 'premium') return false;
      if (filterTab === 'reguler' && item.tier !== 'reguler') return false;
      if (filterTab === 'pending' && item.status !== 'Menunggu Verifikasi') return false;
      if (q === '') return true;
      return (
        item.businessName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.village.toLowerCase().includes(q)
      );
    });
  }, [listings, filterTab, searchQuery]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setErrors({});
    setSubmitError(null);
    setUploadError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: UmkmListing) => {
    setEditingId(item.id);
    setForm({
      businessName: item.businessName,
      ownerName: item.ownerName,
      productName: item.productName,
      category: item.category,
      village: item.village,
      whatsapp: item.whatsapp,
      tier: item.tier,
      status: item.status,
      price: String(item.price),
      unitLabel: item.unitLabel,
      shortDescription: item.shortDescription,
      image: item.image,
      galleryImages: item.galleryImages ?? [],
      variants:
        item.variants.length > 0
          ? item.variants.map((v) => ({
              id: v.id,
              label: v.label,
              price: String(v.price),
              availabilityNote: v.availabilityNote,
              image: v.image,
            }))
          : [
              {
                label: item.unitLabel || 'Kemasan Standar',
                price: String(item.price),
                availabilityNote: 'Tersedia',
              },
            ],
    });
    setErrors({});
    setSubmitError(null);
    setUploadError(null);
    setIsFormOpen(true);
  };

  const handlePrimaryPhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingTarget('primary');
    try {
      const url = await onUploadImage(file);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah foto utama.');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const existingGallery = form.galleryImages ?? [];
    const remainingSlots = Math.max(0, 6 - existingGallery.length);
    if (remainingSlots === 0) {
      setUploadError('Maksimal 6 foto galeri tambahan per UMKM.');
      return;
    }

    setUploadError(null);
    setUploadingTarget('gallery');
    try {
      const uploadedUrls: string[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        const url = await onUploadImage(file);
        uploadedUrls.push(url);
      }
      setForm((prev) => ({
        ...prev,
        galleryImages: [...(prev.galleryImages ?? []), ...uploadedUrls].slice(0, 6),
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah foto galeri.');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      galleryImages: (prev.galleryImages ?? []).filter((url) => url !== urlToRemove),
    }));
  };

  const handleMakeGalleryPrimary = (urlToPromote: string) => {
    setForm((prev) => {
      const nextGallery = (prev.galleryImages ?? []).filter((url) => url !== urlToPromote);
      if (prev.image && prev.image !== urlToPromote && nextGallery.length < 6) {
        nextGallery.unshift(prev.image);
      }
      return {
        ...prev,
        image: urlToPromote,
        galleryImages: nextGallery,
      };
    });
  };

  const handleAddVariantRow = () => {
    setForm((prev) => {
      const currentVariants = prev.variants ?? [];
      if (currentVariants.length >= 25) return prev;
      return {
        ...prev,
        variants: [
          ...currentVariants,
          {
            label: '',
            price: prev.price || '20000',
            availabilityNote: 'Tersedia',
          },
        ],
      };
    });
    if (errors.variants) setErrors((prev) => ({ ...prev, variants: undefined }));
  };

  const handleUpdateVariantField = (
    index: number,
    field: keyof AdminVariantFormItem,
    value: string
  ) => {
    setForm((prev) => {
      const currentVariants = [...(prev.variants ?? [])];
      if (!currentVariants[index]) return prev;
      currentVariants[index] = { ...currentVariants[index], [field]: value };
      return { ...prev, variants: currentVariants };
    });
    if (errors.variants) setErrors((prev) => ({ ...prev, variants: undefined }));
  };

  const handleRemoveVariantRow = (index: number) => {
    setForm((prev) => {
      const currentVariants = prev.variants ?? [];
      if (currentVariants.length <= 1) return prev;
      return {
        ...prev,
        variants: currentVariants.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleVariantPhotoUpload = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingTarget(`variant-${index}`);
    try {
      const url = await onUploadImage(file);
      setForm((prev) => {
        const currentVariants = [...(prev.variants ?? [])];
        if (!currentVariants[index]) return prev;
        currentVariants[index] = { ...currentVariants[index], image: url };
        return { ...prev, variants: currentVariants };
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah foto menu/layanan.');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validateAdminUmkmForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await onUpdateListing(editingId, form);
      } else {
        await onCreateListing(form);
      }
      setIsFormOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());
      setErrors({});
      setUploadError(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan data UMKM.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      data-testid="admin-panel-view"
      className="py-8 sm:py-12 max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8"
    >
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <p className="text-xs font-semibold text-[#C2410C] mb-1.5">
            CISAGA HUB / Panel Admin Developer ({adminUsername})
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight">
            Kelola UMKM Reguler (Free) &amp; Premium
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah UMKM Baru</span>
          </button>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-[#475569] hover:text-[#B91C1C] bg-white border border-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>

      {/* 4 Tabular KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs text-[#475569] mb-1">Total Data UMKM</p>
          <p
            data-testid="admin-metric-total"
            className="font-mono tabular-nums text-2xl font-semibold text-[#0F2744]"
          >
            {metrics.total}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs text-[#475569] mb-1">Premium (Tampil Teratas)</p>
          <p
            data-testid="admin-metric-premium"
            className="font-mono tabular-nums text-2xl font-semibold text-[#EA580C]"
          >
            {metrics.premiumActive}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs text-[#475569] mb-1">Reguler (Daftar Free)</p>
          <p
            data-testid="admin-metric-reguler"
            className="font-mono tabular-nums text-2xl font-semibold text-[#0F2744]"
          >
            {metrics.regulerCount}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs text-[#475569] mb-1">Menunggu Verifikasi</p>
          <p
            data-testid="admin-metric-pending"
            className="font-mono tabular-nums text-2xl font-semibold text-[#047857]"
          >
            {metrics.pendingCount}
          </p>
        </div>
      </div>

      {/* Add / Edit UMKM Form Panel */}
      {isFormOpen && (
        <div
          data-testid="admin-umkm-form-panel"
          className="bg-white border border-[#0F2744] rounded-xl p-6 sm:p-7"
        >
          <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E2E8F0]">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F2744]">
                {editingId ? 'Edit Data UMKM' : 'Tambah UMKM Baru'}
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Pilih paket Premium agar usaha langsung tampil di bagian paling atas halaman utama
                CISAGA HUB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Tutup formulir admin"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] hover:text-[#0F2744] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#B91C1C]/5 border border-[#B91C1C]/30 text-xs font-medium text-[#B91C1C]"
              >
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="admin-business-name"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Nama Usaha / Brand
                </label>
                <input
                  id="admin-business-name"
                  type="text"
                  value={form.businessName}
                  onChange={(e) => {
                    setForm({ ...form, businessName: e.target.value });
                    if (errors.businessName) setErrors({ ...errors, businessName: undefined });
                  }}
                  placeholder="Contoh: Opak Ketan Cisaga"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                />
                {errors.businessName && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.businessName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-owner-name"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Nama Pemilik
                </label>
                <input
                  id="admin-owner-name"
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => {
                    setForm({ ...form, ownerName: e.target.value });
                    if (errors.ownerName) setErrors({ ...errors, ownerName: undefined });
                  }}
                  placeholder="Nama lengkap pemilik"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                />
                {errors.ownerName && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.ownerName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-product-name"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Nama Produk Unggulan
                </label>
                <input
                  id="admin-product-name"
                  type="text"
                  value={form.productName}
                  onChange={(e) => {
                    setForm({ ...form, productName: e.target.value });
                    if (errors.productName) setErrors({ ...errors, productName: undefined });
                  }}
                  placeholder="Contoh: Opak Bakar Arang Kelapa"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                />
                {errors.productName && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.productName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-village"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Desa Asal (Kec. Cisaga)
                </label>
                <select
                  id="admin-village"
                  value={form.village}
                  onChange={(e) => {
                    setForm({ ...form, village: e.target.value });
                    if (errors.village) setErrors({ ...errors, village: undefined });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                >
                  <option value="">Pilih Desa...</option>
                  {villages.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {errors.village && <p className="text-xs text-[#B91C1C] mt-1">{errors.village}</p>}
              </div>

              <div>
                <label
                  htmlFor="admin-category"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Kategori
                </label>
                <select
                  id="admin-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as BusinessCategory })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="admin-whatsapp"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Nomor WhatsApp
                </label>
                <input
                  id="admin-whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => {
                    setForm({ ...form, whatsapp: e.target.value });
                    if (errors.whatsapp) setErrors({ ...errors, whatsapp: undefined });
                  }}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                />
                {errors.whatsapp && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.whatsapp}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-tier"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Paket Promosi
                </label>
                <select
                  id="admin-tier"
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value as UmkmTier })}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                >
                  <option value="reguler">Reguler (Daftar Free)</option>
                  <option value="premium">Premium (Tampil Paling Atas)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="admin-status"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Status Publikasi
                </label>
                <select
                  id="admin-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as UmkmStatus })}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                >
                  <option value="Aktif">Aktif (Tayang di Publik)</option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="admin-price"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Harga Kisaran (Rp)
                  </label>
                  <input
                    id="admin-price"
                    type="number"
                    min={1000}
                    step={500}
                    value={form.price}
                    onChange={(e) => {
                      setForm({ ...form, price: e.target.value });
                      if (errors.price) setErrors({ ...errors, price: undefined });
                    }}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  />
                  {errors.price && <p className="text-xs text-[#B91C1C] mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label
                    htmlFor="admin-unit-label"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Satuan / Kemasan
                  </label>
                  <input
                    id="admin-unit-label"
                    type="text"
                    value={form.unitLabel}
                    onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
                    placeholder="Kemasan 250g"
                    className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-short-desc"
                className="block text-xs font-semibold text-[#0F2744] mb-1.5"
              >
                Deskripsi Singkat Promosi
              </label>
              <textarea
                id="admin-short-desc"
                rows={3}
                value={form.shortDescription}
                onChange={(e) => {
                  setForm({ ...form, shortDescription: e.target.value });
                  if (errors.shortDescription) {
                    setErrors({ ...errors, shortDescription: undefined });
                  }
                }}
                placeholder="Jelaskan keunggulan produk, layanan, dan keunikan usaha Anda..."
                className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F2744]"
              />
              {errors.shortDescription && (
                <p className="text-xs text-[#B91C1C] mt-1">{errors.shortDescription}</p>
              )}
            </div>

            {/* Foto Utama & Galeri Foto Produk / Usaha */}
            <div className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F2744]">
                    Foto Etalase &amp; Galeri Produk / Layanan
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Unggah foto langsung dari perangkat (JPG, PNG, WebP · maks 2 MB) atau pilih
                    foto bawaan.
                  </p>
                </div>
                {uploadingTarget && (
                  <span className="text-xs font-medium text-[#EA580C]">Mengunggah foto...</span>
                )}
              </div>

              {uploadError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-[#B91C1C]/5 border border-[#B91C1C]/30 text-xs font-medium text-[#B91C1C]"
                >
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-3 flex items-center gap-3">
                  <div className="w-24 h-20 rounded-lg overflow-hidden border border-[#E2E8F0] bg-white shrink-0">
                    <ProductImage
                      src={form.image}
                      alt="Pratinjau foto utama UMKM"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-[#475569]">
                    <p className="font-semibold text-[#0F2744]">Foto Utama</p>
                    <p>Tampil di kartu katalog</p>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <label
                    htmlFor="admin-primary-photo-upload"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Upload Foto Utama</span>
                  </label>
                  <input
                    id="admin-primary-photo-upload"
                    data-testid="admin-primary-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void handlePrimaryPhotoUpload(e)}
                    disabled={uploadingTarget !== null}
                    className="sr-only"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label
                    htmlFor="admin-image-preset"
                    className="block text-[11px] font-semibold text-[#475569] mb-1"
                  >
                    Atau pilih foto bawaan
                  </label>
                  <select
                    id="admin-image-preset"
                    value={
                      UMKM_IMAGE_PRESETS.some((p) => p.url === form.image) ? form.image : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) setForm({ ...form, image: e.target.value });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F2744]"
                  >
                    {!UMKM_IMAGE_PRESETS.some((p) => p.url === form.image) && (
                      <option value="">Foto Upload Kustom Aktif</option>
                    )}
                    {UMKM_IMAGE_PRESETS.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extra Gallery Photos */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-semibold text-[#0F2744]">
                    Galeri Foto Tambahan ({(form.galleryImages ?? []).length}/6)
                  </p>
                  <label
                    htmlFor="admin-gallery-photo-upload"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      (form.galleryImages ?? []).length >= 6
                        ? 'border-[#E2E8F0] text-[#475569]/60 bg-white cursor-not-allowed'
                        : 'border-[#0F2744] text-[#0F2744] bg-white hover:bg-[#0F2744]/5 cursor-pointer'
                    }`}
                  >
                    <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tambah Foto Galeri</span>
                  </label>
                  <input
                    id="admin-gallery-photo-upload"
                    data-testid="admin-gallery-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => void handleGalleryUpload(e)}
                    disabled={
                      uploadingTarget !== null || (form.galleryImages ?? []).length >= 6
                    }
                    className="sr-only"
                  />
                </div>

                {(form.galleryImages ?? []).length === 0 ? (
                  <p className="text-xs text-[#475569]">
                    Belum ada foto galeri tambahan. Tambahkan foto menu, produk lain, atau suasana
                    tempat usaha agar lebih menarik.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    {(form.galleryImages ?? []).map((url, idx) => (
                      <div
                        key={url}
                        className="group relative rounded-lg border border-[#E2E8F0] bg-white overflow-hidden"
                      >
                        <div className="aspect-[4/3] bg-[#F1F5F9]">
                          <ProductImage
                            src={url}
                            alt={`Foto galeri tambahan ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-1.5 flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleMakeGalleryPrimary(url)}
                            className="text-[#0F2744] hover:text-[#EA580C] font-medium truncate cursor-pointer"
                          >
                            Jadikan Utama
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(url)}
                            aria-label={`Hapus foto galeri ${idx + 1}`}
                            className="text-[#475569] hover:text-[#B91C1C] shrink-0 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daftar Produk / Menu / Layanan yang Dijual */}
            <div
              data-testid="admin-menu-editor"
              className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F2744]">
                    Daftar Menu / Produk / Layanan yang Dijual ({(form.variants ?? []).length})
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Tambahkan seluruh daftar menu makanan, varian produk, atau layanan jasa beserta
                    harga dan fotonya masing-masing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariantRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah Menu / Layanan</span>
                </button>
              </div>

              {errors.variants && (
                <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                  {errors.variants}
                </p>
              )}

              <div className="space-y-2.5">
                {(form.variants ?? []).map((item, idx) => (
                  <div
                    key={item.id ?? `variant-row-${idx}`}
                    data-testid={`admin-menu-row-${idx}`}
                    className="bg-white border border-[#E2E8F0] rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                  >
                    <div className="md:col-span-4">
                      <label
                        htmlFor={`admin-variant-label-${idx}`}
                        className="block text-[11px] font-semibold text-[#0F2744] mb-1"
                      >
                        Nama Menu / Produk / Layanan #{idx + 1}
                      </label>
                      <input
                        id={`admin-variant-label-${idx}`}
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateVariantField(idx, 'label', e.target.value)}
                        placeholder="Contoh: Paket Nasi Liwet / Jahit Kebaya"
                        className="w-full px-3 py-1.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-none focus:bg-white focus:border-[#0F2744]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor={`admin-variant-price-${idx}`}
                        className="block text-[11px] font-semibold text-[#0F2744] mb-1"
                      >
                        Harga (Rp)
                      </label>
                      <input
                        id={`admin-variant-price-${idx}`}
                        type="number"
                        min={1000}
                        step={500}
                        value={item.price}
                        onChange={(e) => handleUpdateVariantField(idx, 'price', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-none focus:bg-white focus:border-[#0F2744]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label
                        htmlFor={`admin-variant-note-${idx}`}
                        className="block text-[11px] font-semibold text-[#0F2744] mb-1"
                      >
                        Keterangan / Stok
                      </label>
                      <input
                        id={`admin-variant-note-${idx}`}
                        type="text"
                        value={item.availabilityNote}
                        onChange={(e) =>
                          handleUpdateVariantField(idx, 'availabilityNote', e.target.value)
                        }
                        placeholder="Tersedia / Pre-order"
                        className="w-full px-3 py-1.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-md focus:outline-none focus:bg-white focus:border-[#0F2744]"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.image ? (
                          <div className="relative w-10 h-10 rounded border border-[#E2E8F0] overflow-hidden shrink-0">
                            <ProductImage
                              src={item.image}
                              alt={`Foto ${item.label || `menu ${idx + 1}`}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateVariantField(idx, 'image', '')}
                              aria-label={`Hapus foto menu ${idx + 1}`}
                              className="absolute top-0 right-0 bg-[#0F2744]/85 text-white p-0.5 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}

                        <label
                          htmlFor={`admin-variant-photo-${idx}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F2744] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md cursor-pointer whitespace-nowrap"
                        >
                          <Upload className="w-3 h-3" aria-hidden="true" />
                          <span>{item.image ? 'Ganti Foto' : 'Foto Item'}</span>
                        </label>
                        <input
                          id={`admin-variant-photo-${idx}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => void handleVariantPhotoUpload(idx, e)}
                          disabled={uploadingTarget !== null}
                          className="sr-only"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(idx)}
                        disabled={(form.variants ?? []).length <= 1}
                        aria-label={`Hapus baris menu atau layanan ${idx + 1}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#E2E8F0] text-[#475569] hover:text-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#475569] hover:text-[#0F2744] border border-[#E2E8F0] rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : editingId
                    ? 'Simpan Perubahan'
                    : 'Simpan UMKM'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter daftar admin UMKM"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg w-fit"
        >
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'premium', label: 'Premium' },
              { id: 'reguler', label: 'Reguler (Free)' },
              { id: 'pending', label: 'Menunggu Verifikasi' },
            ] as const
          ).map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'bg-[#0F2744] text-white shadow-xs' : 'text-[#475569] hover:text-[#0F2744]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <label htmlFor="admin-search" className="sr-only">
            Cari data UMKM di panel admin
          </label>
          <Search
            className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="admin-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari usaha, produk, atau desa..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:border-[#0F2744]"
          />
        </div>
      </div>

      {/* High-Density Management Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-lg font-bold text-[#0F2744] mb-1">
              Tidak ada data UMKM pada filter ini
            </p>
            <p className="text-sm text-[#475569] mb-5">
              Tambahkan UMKM baru atau ubah filter pencarian untuk melihat seluruh daftar.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
            >
              Tambah UMKM Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569]">
                  <th className="py-3 px-4">Usaha &amp; Produk</th>
                  <th className="py-3 px-4">Desa &amp; Kategori</th>
                  <th className="py-3 px-4 text-right">Kisaran</th>
                  <th className="py-3 px-4">Paket Promosi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {filteredRows.map((item) => {
                  const isPremium = item.tier === 'premium';
                  const isPending = item.status === 'Menunggu Verifikasi';
                  const isActive = item.status === 'Aktif';

                  return (
                    <tr
                      key={item.id}
                      data-testid={`admin-row-${item.id}`}
                      className="hover:bg-[#F8FAFC]/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F1F5F9] shrink-0">
                            <ProductImage
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0F2744] truncate max-w-[230px]">
                              {item.businessName}
                            </p>
                            <p className="text-xs text-[#475569] truncate max-w-[230px]">
                              {item.productName} · {item.ownerName}
                            </p>
                            <p className="text-[11px] text-[#C2410C] font-medium mt-0.5">
                              {item.variants.length} menu/layanan · {getListingAllImages(item).length}{' '}
                              foto
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-[#0F2744] font-medium">{item.village}</p>
                        <p className="text-xs text-[#475569]">{item.category}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#0F2744] whitespace-nowrap">
                        {formatRupiah(item.price)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isPremium ? 'text-[#C2410C]' : 'text-[#475569]'
                            }`}
                          >
                            {isPremium ? 'Premium (Atas)' : 'Reguler (Free)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => void onToggleTier(item.id)}
                            aria-label={
                              isPremium
                                ? `Turunkan ${item.businessName} ke Reguler Free`
                                : `Jadikan ${item.businessName} sebagai Premium`
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F2744] rounded cursor-pointer"
                          >
                            {isPremium ? (
                              <>
                                <ArrowDown className="w-3 h-3 text-[#475569]" aria-hidden="true" />
                                <span>Ke Reguler</span>
                              </>
                            ) : (
                              <>
                                <ArrowUp className="w-3 h-3 text-[#EA580C]" aria-hidden="true" />
                                <span>Ke Premium</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void onCycleStatus(item.id)}
                          aria-label={`Ubah status publikasi ${item.businessName}, saat ini ${item.status}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${
                            isActive
                              ? 'border-[#047857]/30 bg-[#047857]/10 text-[#047857]'
                              : isPending
                                ? 'border-[#EA580C]/30 bg-[#EA580C]/10 text-[#C2410C]'
                                : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3" aria-hidden="true" />}
                          <span>{item.status}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {confirmDeleteId === item.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteListing(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded cursor-pointer"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs font-medium text-[#475569] border border-[#E2E8F0] rounded cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label={`Edit ${item.businessName}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F2744] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] rounded-md cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Hapus ${item.businessName}`}
                              className="inline-flex items-center justify-center w-8 h-8 text-[#475569] hover:text-[#B91C1C] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
