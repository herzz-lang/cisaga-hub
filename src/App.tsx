import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AboutCisagaHubSection } from './components/AboutCisagaHubSection';
import { AdminLoginView } from './components/AdminLoginView';
import { AdminPanelView } from './components/AdminPanelView';
import { CatalogSection } from './components/CatalogSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar, type AppView } from './components/Navbar';
import { PartnerRegistrationSection } from './components/PartnerRegistrationSection';
import { PremiumTopSection } from './components/PremiumTopSection';
import { ProductModal } from './components/ProductModal';
import { SavedPromoDrawer } from './components/SavedPromoDrawer';
import { VillageExplorerSection } from './components/VillageExplorerSection';
import { CISAGA_VILLAGES, INITIAL_UMKM_LISTINGS } from './data/cisagaData';
import type {
  AdminUmkmFormData,
  ContactMessage,
  ContactMessageFormData,
  ContactMessageStatus,
  FreeRegistrationFormData,
  ProductCategory,
  SavedPromoItem,
  SortOption,
  UmkmListing,
  UmkmTier,
} from './types/umkm';
import {
  filterAndSortListings,
  getContactStatusLabel,
  getPremiumTopListings,
  isDeveloperAdminPath,
  isListingSaved,
  removeSavedPromoItem,
  saveListingToPromo,
  toggleQuickSaveListing,
} from './utils/umkmLogic';
import { prepareAdminImageDataUrl } from './utils/imageUploadClient';

const SAVED_STORAGE_KEY = 'hera_umkm_saved_v2';

type AdminAuthMode = 'loading' | 'setup' | 'login';

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const data = (await response.json()) as { error?: string };
      if (typeof data.error === 'string' && data.error.trim().length > 0) {
        return data.error;
      }
    } catch {
      // Fall through to status-based diagnostics
    }
  }
  if (response.status === 404 || response.status === 405) {
    return 'Layanan server belum merespons permintaan ini. Silakan muat ulang halaman atau publikasikan ulang aplikasi.';
  }
  if (response.status >= 500) {
    return `Server sedang mengalami gangguan sementara (kode ${response.status}). Silakan coba lagi sebentar lagi.`;
  }
  return fallback;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(() =>
    typeof window !== 'undefined' && isDeveloperAdminPath(window.location.pathname)
      ? 'admin'
      : 'public'
  );
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('Semua');
  const [tierFilter, setTierFilter] = useState<'all' | UmkmTier>('all');
  const [selectedVillage, setSelectedVillage] = useState<string>('Semua Desa');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const [selectedListing, setSelectedListing] = useState<UmkmListing | null>(null);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackHasSavedAction, setFeedbackHasSavedAction] = useState<boolean>(false);

  // Server-backed UMKM listings & admin inbox messages
  const [publicListings, setPublicListings] = useState<UmkmListing[]>(INITIAL_UMKM_LISTINGS);
  const [adminListings, setAdminListings] = useState<UmkmListing[]>([]);
  const [adminMessages, setAdminMessages] = useState<ContactMessage[]>([]);

  // Developer-only admin session state (held strictly in JS memory, never in storage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const adminTokenRef = useRef<string | null>(null);
  adminTokenRef.current = adminToken;
  const [expectedAdminUsername, setExpectedAdminUsername] = useState<string>('admin');
  const [authMode, setAuthMode] = useState<AdminAuthMode>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  const [savedItems, setSavedItems] = useState<SavedPromoItem[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as SavedPromoItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedItems]);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => {
      setFeedbackMessage(null);
      setFeedbackHasSavedAction(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const fetchPublicListings = useCallback(async () => {
    try {
      const res = await fetch('/api/listings');
      if (!res.ok) return;
      const data = (await res.json()) as { listings?: UmkmListing[] };
      if (Array.isArray(data.listings)) {
        setPublicListings(data.listings);
      }
    } catch {
      // Keep current listings state if offline
    }
  }, []);

  useEffect(() => {
    void fetchPublicListings();
  }, [fetchPublicListings]);

  const fetchAdminMessages = useCallback(async (token: string): Promise<void> => {
    try {
      const res = await fetch('/api/admin/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAdminToken(null);
        setAdminListings([]);
        setAdminMessages([]);
        setAuthMode('login');
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        contacts?: ContactMessage[];
        messages?: ContactMessage[];
      };
      const items = data.contacts ?? data.messages;
      if (Array.isArray(items)) {
        setAdminMessages(items);
      }
    } catch {
      // Keep current inbox state if offline or request interrupted
    }
  }, []);

  useEffect(() => {
    if (activeView !== 'admin' || !adminToken) return;
    const intervalId = window.setInterval(() => {
      void fetchAdminMessages(adminToken);
    }, 8000);
    return () => window.clearInterval(intervalId);
  }, [activeView, adminToken, fetchAdminMessages]);

  const fetchAdminListings = useCallback(async (token: string): Promise<boolean> => {
    const res = await fetch('/api/admin/listings', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      setAdminToken(null);
      setAdminListings([]);
      setAdminMessages([]);
      setAuthMode('login');
      setAuthError('Sesi admin developer berakhir. Silakan login kembali.');
      return false;
    }
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal memuat data admin UMKM.'));
    }
    const data = (await res.json()) as { listings?: UmkmListing[] };
    if (Array.isArray(data.listings)) {
      setAdminListings(data.listings);
    }
    return true;
  }, []);

  const refreshAuthStatus = useCallback(
    async (currentToken: string | null) => {
      setAuthMode('loading');
      try {
        const res = await fetch('/api/admin/auth/status', {
          headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined,
        });
        if (!res.ok) {
          setAuthMode('login');
          setAuthError(
            await readErrorMessage(res, 'Tidak dapat memeriksa status server autentikasi.')
          );
          return;
        }
        const contentType = res.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          setAuthMode('login');
          setAuthError(
            'Server backend tidak merespons format JSON. Pastikan aplikasi dijalankan dengan server Node aktif.'
          );
          return;
        }
        const data = (await res.json()) as {
          mode: 'setup' | 'login';
          username: string;
          authenticated: boolean;
        };
        setExpectedAdminUsername(data.username || 'admin');
        setAuthMode(data.mode);

        if (data.authenticated && currentToken) {
          const ok = await fetchAdminListings(currentToken);
          if (ok) {
            await fetchAdminMessages(currentToken);
          }
        } else {
          setAdminToken(null);
          setAdminListings([]);
          setAdminMessages([]);
        }
      } catch {
        setAuthMode('login');
        setAuthError('Tidak dapat terhubung ke server autentikasi.');
      }
    },
    [fetchAdminListings, fetchAdminMessages]
  );

  const premiumListings = useMemo(() => getPremiumTopListings(publicListings), [publicListings]);

  const regulerActiveCount = useMemo(
    () => publicListings.filter((item) => item.tier === 'reguler').length,
    [publicListings]
  );

  const filteredCatalogListings = useMemo(
    () =>
      filterAndSortListings(publicListings, {
        category: selectedCategory,
        tierFilter,
        village: selectedVillage,
        query: searchQuery,
        sortBy,
      }),
    [publicListings, selectedCategory, tierFilter, selectedVillage, searchQuery, sortBy]
  );

  const totalDisplayedUmkm = useMemo(() => {
    const baseSum = CISAGA_VILLAGES.reduce((sum, v) => sum + v.baseUmkmCount, 0);
    const addedCount = Math.max(0, publicListings.length - INITIAL_UMKM_LISTINGS.length);
    return baseSum + addedCount;
  }, [publicListings]);

  useEffect(() => {
    if (isDeveloperAdminPath(window.location.pathname)) {
      void refreshAuthStatus(adminTokenRef.current);
    }
    const handlePopState = () => {
      if (isDeveloperAdminPath(window.location.pathname)) {
        setFeedbackMessage(null);
        setAuthError(null);
        setActiveView('admin');
        void refreshAuthStatus(adminTokenRef.current);
      } else {
        setActiveView('public');
        void fetchPublicListings();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchPublicListings, refreshAuthStatus]);

  const handleNavigatePublic = (hash?: string) => {
    setFeedbackMessage(null);
    setActiveView('public');
    if (isDeveloperAdminPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
    void fetchPublicListings();
    if (hash) {
      window.requestAnimationFrame(() => {
        const targetId = hash.replace('#', '');
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  };

  const handleOpenAdmin = () => {
    setFeedbackMessage(null);
    setAuthError(null);
    setActiveView('admin');
    if (!isDeveloperAdminPath(window.location.pathname)) {
      window.history.pushState({}, '', '/admin');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void refreshAuthStatus(adminTokenRef.current);
  };

  const handleAdminSetupSubmit = async (
    username: string,
    password: string,
    confirmPassword: string
  ) => {
    setIsAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      if (!res.ok) {
        setAuthError(await readErrorMessage(res, 'Gagal mengaktifkan akun developer.'));
        await refreshAuthStatus(null);
        return;
      }
      const data = (await res.json()) as { token: string; username: string };
      setAdminToken(data.token);
      setExpectedAdminUsername(data.username);
      setAuthMode('login');
      await fetchAdminListings(data.token);
      await fetchAdminMessages(data.token);
      setFeedbackMessage('Sandi developer aktif. Selamat datang di Panel Admin.');
    } catch {
      setAuthError('Gagal menghubungi server autentikasi.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleAdminLoginSubmit = async (username: string, password: string) => {
    setIsAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setAuthError(await readErrorMessage(res, 'Username atau password admin tidak sesuai.'));
        return;
      }
      const data = (await res.json()) as { token: string; username: string };
      setAdminToken(data.token);
      setExpectedAdminUsername(data.username);
      await fetchAdminListings(data.token);
      await fetchAdminMessages(data.token);
      setFeedbackMessage('Login developer berhasil.');
    } catch {
      setAuthError('Gagal menghubungi server autentikasi.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    const currentToken = adminToken;
    setAdminToken(null);
    setAdminListings([]);
    setAdminMessages([]);
    setAuthError(null);
    setAuthMode('login');
    if (currentToken) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {
        // Token cleared from memory regardless
      }
    }
    setFeedbackMessage('Sesi admin developer telah diakhiri.');
  };

  const requireAdminFetch = async (url: string, init: RequestInit): Promise<Response> => {
    if (!adminToken) {
      setAuthMode('login');
      throw new Error('Silakan login sebagai admin developer terlebih dahulu.');
    }
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${adminToken}`,
      },
    });
    if (res.status === 401) {
      setAdminToken(null);
      setAdminListings([]);
      setAdminMessages([]);
      setAuthMode('login');
      setAuthError('Sesi admin developer berakhir. Silakan login kembali.');
      throw new Error('Sesi admin berakhir.');
    }
    return res;
  };

  const handleSaveFromModal = (listing: UmkmListing, variantId: string) => {
    const alreadySaved = isListingSaved(savedItems, listing.id, variantId);
    setSavedItems((prev) => saveListingToPromo(prev, listing, variantId));
    setFeedbackHasSavedAction(true);
    setFeedbackMessage(
      alreadySaved
        ? `${listing.productName} sudah ada di daftar minat.`
        : `${listing.productName} disimpan ke daftar minat.`
    );
  };

  const handleToggleQuickSave = (listing: UmkmListing) => {
    const wasSaved = isListingSaved(savedItems, listing.id);
    setSavedItems((prev) => toggleQuickSaveListing(prev, listing));
    setFeedbackHasSavedAction(true);
    setFeedbackMessage(
      wasSaved
        ? `${listing.productName} dihapus dari daftar minat.`
        : `${listing.productName} disimpan ke daftar minat.`
    );
  };

  const handleRemoveSavedItem = (listingId: string, variantId: string) => {
    setSavedItems((prev) => removeSavedPromoItem(prev, listingId, variantId));
  };

  const handleFilterByVillage = (villageName: string) => {
    setSelectedVillage(villageName);
    setSelectedCategory('Semua');
    setTierFilter('all');
    const catalogEl = document.getElementById('katalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetAllFilters = () => {
    setSelectedCategory('Semua');
    setTierFilter('all');
    setSelectedVillage('Semua Desa');
    setSearchQuery('');
    setSortBy('featured');
  };

  const handleRegisterFreeUmkm = async (
    data: FreeRegistrationFormData
  ): Promise<UmkmListing> => {
    const res = await fetch('/api/registrations/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal mengirim pendaftaran UMKM.'));
    }
    const body = (await res.json()) as { listing: UmkmListing };
    return body.listing;
  };

  const handleAdminCreate = async (data: AdminUmkmFormData) => {
    const res = await requireAdminFetch('/api/admin/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal menambahkan UMKM baru.'));
    }
    const body = (await res.json()) as { listing: UmkmListing };
    setAdminListings((prev) => [body.listing, ...prev]);
    await fetchPublicListings();
    setFeedbackMessage(
      `${body.listing.businessName} (${body.listing.tier === 'premium' ? 'Premium' : 'Reguler Free'}) berhasil ditambahkan.`
    );
  };

  const handleAdminUpdate = async (id: string, data: AdminUmkmFormData) => {
    const res = await requireAdminFetch(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal memperbarui data UMKM.'));
    }
    const body = (await res.json()) as { listing: UmkmListing };
    setAdminListings((prev) => prev.map((item) => (item.id === id ? body.listing : item)));
    await fetchPublicListings();
    setFeedbackMessage(`Data ${body.listing.businessName} berhasil diperbarui.`);
  };

  const handleAdminToggleTier = async (id: string) => {
    const res = await requireAdminFetch(
      `/api/admin/listings/${encodeURIComponent(id)}/tier`,
      { method: 'PATCH' }
    );
    if (!res.ok) {
      setFeedbackMessage(await readErrorMessage(res, 'Gagal mengubah paket promosi.'));
      return;
    }
    const body = (await res.json()) as { listing: UmkmListing };
    setAdminListings((prev) => prev.map((item) => (item.id === id ? body.listing : item)));
    await fetchPublicListings();
    const nextTierLabel =
      body.listing.tier === 'premium' ? 'Premium (Paling Atas)' : 'Reguler (Free)';
    setFeedbackMessage(`${body.listing.businessName} diubah ke paket ${nextTierLabel}.`);
  };

  const handleAdminCycleStatus = async (id: string) => {
    const res = await requireAdminFetch(
      `/api/admin/listings/${encodeURIComponent(id)}/status`,
      { method: 'PATCH' }
    );
    if (!res.ok) {
      setFeedbackMessage(await readErrorMessage(res, 'Gagal mengubah status publikasi.'));
      return;
    }
    const body = (await res.json()) as { listing: UmkmListing };
    setAdminListings((prev) => prev.map((item) => (item.id === id ? body.listing : item)));
    await fetchPublicListings();
    setFeedbackMessage(
      `Status ${body.listing.businessName} diubah menjadi ${body.listing.status}.`
    );
  };

  const handleAdminDelete = async (id: string) => {
    const target = adminListings.find((i) => i.id === id);
    const res = await requireAdminFetch(`/api/admin/listings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setFeedbackMessage(await readErrorMessage(res, 'Gagal menghapus UMKM.'));
      return;
    }
    setAdminListings((prev) => prev.filter((item) => item.id !== id));
    setSavedItems((prev) => prev.filter((item) => item.listingId !== id));
    await fetchPublicListings();
    if (target) {
      setFeedbackMessage(`${target.businessName} dihapus dari daftar UMKM.`);
    }
  };

  const handleAdminUploadImage = async (file: File): Promise<string> => {
    const dataUrl = await prepareAdminImageDataUrl(file);
    const res = await requireAdminFetch('/api/admin/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal mengunggah foto ke server.'));
    }
    const body = (await res.json()) as { url: string };
    return body.url;
  };

  const handleSubmitContactMessage = async (
    data: ContactMessageFormData
  ): Promise<ContactMessage> => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Gagal mengirim pesan ke admin.'));
    }
    const body = (await res.json()) as {
      contact?: ContactMessage;
      message?: ContactMessage;
    };
    const saved = body.contact ?? body.message;
    if (!saved) {
      throw new Error('Respons server tidak valid.');
    }
    setFeedbackHasSavedAction(false);
    setFeedbackMessage('Pesan berhasil dikirim ke Portal Admin.');
    return saved;
  };

  const handleUpdateMessageStatus = async (
    id: string,
    status: ContactMessageStatus
  ): Promise<void> => {
    const res = await requireAdminFetch(`/api/admin/contacts/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setFeedbackMessage(await readErrorMessage(res, 'Gagal memperbarui status pesan.'));
      return;
    }
    const body = (await res.json()) as {
      contact?: ContactMessage;
      message?: ContactMessage;
    };
    const updated = body.contact ?? body.message;
    if (!updated) return;
    setAdminMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setFeedbackMessage(
      `Status pesan dari ${updated.name} diubah menjadi ${getContactStatusLabel(status)}.`
    );
  };

  const handleDeleteMessage = async (id: string): Promise<void> => {
    const target = adminMessages.find((m) => m.id === id);
    const res = await requireAdminFetch(`/api/admin/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setFeedbackMessage(await readErrorMessage(res, 'Gagal menghapus pesan.'));
      return;
    }
    setAdminMessages((prev) => prev.filter((m) => m.id !== id));
    if (target) {
      setFeedbackMessage(`Pesan dari ${target.name} telah dihapus.`);
    }
  };

  const handleRefreshMessages = async (): Promise<void> => {
    if (!adminToken) return;
    await fetchAdminMessages(adminToken);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F2744]">
      <Navbar
        activeView={activeView}
        savedCount={savedItems.length}
        onNavigatePublic={handleNavigatePublic}
        onOpenAdmin={handleOpenAdmin}
        onOpenSaved={() => {
          setFeedbackMessage(null);
          setIsSavedDrawerOpen(true);
        }}
      />

      <main className="flex-1">
        {activeView === 'admin' ? (
          adminToken ? (
            <AdminPanelView
              adminUsername={expectedAdminUsername}
              listings={adminListings}
              messages={adminMessages}
              villages={CISAGA_VILLAGES}
              onCreateListing={handleAdminCreate}
              onUpdateListing={handleAdminUpdate}
              onUploadImage={handleAdminUploadImage}
              onToggleTier={handleAdminToggleTier}
              onCycleStatus={handleAdminCycleStatus}
              onDeleteListing={handleAdminDelete}
              onUpdateMessageStatus={handleUpdateMessageStatus}
              onDeleteMessage={handleDeleteMessage}
              onRefreshMessages={handleRefreshMessages}
              onLogout={handleAdminLogout}
            />
          ) : (
            <AdminLoginView
              authMode={authMode}
              expectedUsername={expectedAdminUsername}
              errorMessage={authError}
              isSubmitting={isAuthSubmitting}
              onSubmitSetup={handleAdminSetupSubmit}
              onSubmitLogin={handleAdminLoginSubmit}
              onBackToPublic={() => handleNavigatePublic('#beranda')}
            />
          )
        ) : (
          <>
            <HeroSection
              totalPartnerCount={totalDisplayedUmkm}
              premiumCount={premiumListings.length}
              regulerCount={regulerActiveCount}
              villages={CISAGA_VILLAGES}
              listings={publicListings}
              onExploreVillage={handleFilterByVillage}
              onExploreDirectory={() => handleNavigatePublic('#sebaran-desa')}
            />

            <PremiumTopSection
              premiumListings={premiumListings}
              savedItems={savedItems}
              onSelectListing={setSelectedListing}
              onToggleSave={handleToggleQuickSave}
            />

            <CatalogSection
              listings={filteredCatalogListings}
              totalActiveCount={publicListings.length}
              savedItems={savedItems}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              tierFilter={tierFilter}
              onSelectTierFilter={setTierFilter}
              selectedVillage={selectedVillage}
              onResetVillage={() => setSelectedVillage('Semua Desa')}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onResetAll={handleResetAllFilters}
              onSelectListing={setSelectedListing}
              onToggleSave={handleToggleQuickSave}
            />

            <VillageExplorerSection
              villages={CISAGA_VILLAGES}
              listings={publicListings}
              onFilterByVillage={handleFilterByVillage}
            />

            <AboutCisagaHubSection />

            <PartnerRegistrationSection
              villages={CISAGA_VILLAGES}
              onRegisterFreeUmkm={handleRegisterFreeUmkm}
              onOpenAdmin={handleOpenAdmin}
            />

            <ContactSection onSubmitContactMessage={handleSubmitContactMessage} />
          </>
        )}
      </main>

      <Footer onNavigatePublic={handleNavigatePublic} onOpenAdmin={handleOpenAdmin} />

      <ProductModal
        listing={selectedListing}
        savedItems={savedItems}
        onClose={() => setSelectedListing(null)}
        onSaveListing={handleSaveFromModal}
      />

      <SavedPromoDrawer
        isOpen={isSavedDrawerOpen}
        items={savedItems}
        onClose={() => setIsSavedDrawerOpen(false)}
        onRemoveItem={handleRemoveSavedItem}
        onClearSaved={() => setSavedItems([])}
      />

      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-md z-40 bg-[#0F2744] text-white text-sm px-4 py-3 rounded-lg shadow-lg border border-white/10 flex items-center justify-between gap-3"
        >
          <span>{feedbackMessage}</span>
          {activeView === 'public' && feedbackHasSavedAction && (
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage(null);
                setFeedbackHasSavedAction(false);
                setIsSavedDrawerOpen(true);
              }}
              className="text-xs font-semibold text-[#FDBA74] hover:underline whitespace-nowrap cursor-pointer"
            >
              Lihat Daftar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
