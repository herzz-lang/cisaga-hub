import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
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
import { auth, googleProvider } from './firebase';
import {
  createAdminListingInFirestore,
  createContactMessageInFirestore,
  createFreeRegistrationInFirestore,
  deleteContactInFirestore,
  deleteListingInFirestore,
  isAuthorizedAdminUser,
  seedInitialListingsIfEmpty,
  subscribeAllContactsAdmin,
  subscribeAllListingsAdmin,
  subscribePublicActiveListings,
  toggleListingStatusInFirestore,
  toggleListingTierInFirestore,
  updateAdminListingInFirestore,
  updateContactStatusInFirestore,
} from './services/firestoreService';
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
import { prepareFirestoreImageDataUrl } from './utils/imageUploadClient';
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

const SAVED_STORAGE_KEY = 'hera_umkm_saved_v2';

function formatFirebaseAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `Domain "${hostname}" belum terdaftar di Firebase Console -> Authentication -> Settings -> Authorized domains. Tambahkan domain ini agar login Google aktif.`;
    case 'auth/popup-blocked':
      return 'Popup login Google diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.';
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum proses selesai. Silakan coba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi ke server autentikasi terputus. Periksa jaringan internet Anda lalu coba lagi.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Gagal masuk ke Panel Admin. Silakan coba lagi.';
  }
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

  // Firestore-backed UMKM listings & admin inbox messages
  const [publicListings, setPublicListings] = useState<UmkmListing[]>(
    INITIAL_UMKM_LISTINGS.filter((item) => item.status === 'Aktif')
  );
  const [adminListings, setAdminListings] = useState<UmkmListing[]>([]);
  const [adminMessages, setAdminMessages] = useState<ContactMessage[]>([]);

  // Firebase Auth state for Admin Panel
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean>(false);
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

  // Public real-time Firestore subscription for active UMKM listings
  useEffect(() => {
    const unsubscribe = subscribePublicActiveListings((listings) => {
      setPublicListings(listings);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Auth listener - strictly allow only BOOTSTRAPPED_ADMIN_EMAIL
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setFirebaseUser(null);
        setIsAuthorizedAdmin(false);
        setAdminListings([]);
        setAdminMessages([]);
        setIsAuthReady(true);
        return;
      }

      setIsAuthReady(false);
      void isAuthorizedAdminUser(user).then(async (allowed) => {
        if (!allowed) {
          const deniedEmail = user.email ?? 'Akun ini';
          try {
            await signOut(auth);
          } catch {
            // Ignore sign-out errors during unauthorized cleanup
          }
          setFirebaseUser(null);
          setIsAuthorizedAdmin(false);
          setAdminListings([]);
          setAdminMessages([]);
          setAuthError(
            `Akses ditolak. Akun ${deniedEmail} tidak diizinkan. Sistem admin hanya dapat diakses oleh akun Google herzz@smkn2banjar-jabar.sch.id.`
          );
          setIsAuthReady(true);
          return;
        }

        setFirebaseUser(user);
        setIsAuthorizedAdmin(true);
        setAuthError(null);
        setIsAuthReady(true);
      });
    });
    return () => unsubscribe();
  }, []);

  // Admin-only real-time Firestore subscriptions (only active once authenticated & authorized)
  useEffect(() => {
    if (!isAuthReady || !isAuthorizedAdmin) return;

    void seedInitialListingsIfEmpty();
    const unsubscribeListings = subscribeAllListingsAdmin((listings) => {
      setAdminListings(listings);
    });
    const unsubscribeContacts = subscribeAllContactsAdmin((messages) => {
      setAdminMessages(messages);
    });

    return () => {
      unsubscribeListings();
      unsubscribeContacts();
    };
  }, [isAuthReady, isAuthorizedAdmin]);

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
    const handlePopState = () => {
      if (isDeveloperAdminPath(window.location.pathname)) {
        setFeedbackMessage(null);
        setAuthError(null);
        setActiveView('admin');
      } else {
        setActiveView('public');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigatePublic = (hash?: string) => {
    setFeedbackMessage(null);
    setActiveView('public');
    if (isDeveloperAdminPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
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
  };

  const handleGoogleSignIn = async () => {
    setIsAuthSubmitting(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const allowed = await isAuthorizedAdminUser(result.user);
      if (!allowed) {
        const deniedEmail = result.user.email ?? 'Akun ini';
        await signOut(auth);
        setIsAuthorizedAdmin(false);
        setFirebaseUser(null);
        setAuthError(
          `Akses ditolak. Akun ${deniedEmail} tidak diizinkan. Gunakan akun Google resmi herzz@smkn2banjar-jabar.sch.id.`
        );
      } else {
        setFeedbackMessage('Login admin berhasil.');
      }
    } catch (error) {
      setAuthError(formatFirebaseAuthError(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setIsAuthorizedAdmin(false);
      setAdminListings([]);
      setAdminMessages([]);
      setFeedbackMessage('Sesi admin telah diakhiri.');
    } catch {
      setFeedbackMessage('Gagal keluar dari sesi admin.');
    }
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
    return createFreeRegistrationInFirestore(data);
  };

  const handleAdminCreate = async (data: AdminUmkmFormData) => {
    const created = await createAdminListingInFirestore(data);
    setFeedbackMessage(
      `${created.businessName} (${created.tier === 'premium' ? 'Premium' : 'Reguler Free'}) berhasil ditambahkan.`
    );
  };

  const handleAdminUpdate = async (id: string, data: AdminUmkmFormData) => {
    const target = adminListings.find((item) => item.id === id);
    if (!target) {
      throw new Error('Data UMKM tidak ditemukan.');
    }
    await updateAdminListingInFirestore(target, data);
    setFeedbackMessage(`Data ${data.businessName} berhasil diperbarui.`);
  };

  const handleAdminToggleTier = async (id: string) => {
    const target = adminListings.find((item) => item.id === id);
    if (!target) return;
    const nextTier = await toggleListingTierInFirestore(target);
    const nextTierLabel = nextTier === 'premium' ? 'Premium (Paling Atas)' : 'Reguler (Free)';
    setFeedbackMessage(`${target.businessName} diubah ke paket ${nextTierLabel}.`);
  };

  const handleAdminCycleStatus = async (id: string) => {
    const target = adminListings.find((item) => item.id === id);
    if (!target) return;
    const nextStatus = await toggleListingStatusInFirestore(target);
    setFeedbackMessage(`Status ${target.businessName} diubah menjadi ${nextStatus}.`);
  };

  const handleAdminDelete = async (id: string) => {
    const target = adminListings.find((i) => i.id === id);
    await deleteListingInFirestore(id);
    setSavedItems((prev) => prev.filter((item) => item.listingId !== id));
    if (target) {
      setFeedbackMessage(`${target.businessName} dihapus dari daftar UMKM.`);
    }
  };

  const handleAdminUploadImage = async (file: File): Promise<string> => {
    return prepareFirestoreImageDataUrl(file);
  };

  const handleSubmitContactMessage = async (
    data: ContactMessageFormData
  ): Promise<ContactMessage> => {
    const saved = await createContactMessageInFirestore(data);
    setFeedbackHasSavedAction(false);
    setFeedbackMessage('Pesan berhasil dikirim ke Portal Admin.');
    return saved;
  };

  const handleUpdateMessageStatus = async (
    id: string,
    status: ContactMessageStatus
  ): Promise<void> => {
    const target = adminMessages.find((m) => m.id === id);
    await updateContactStatusInFirestore(id, status);
    if (target) {
      setFeedbackMessage(
        `Status pesan dari ${target.name} diubah menjadi ${getContactStatusLabel(status)}.`
      );
    }
  };

  const handleDeleteMessage = async (id: string): Promise<void> => {
    const target = adminMessages.find((m) => m.id === id);
    await deleteContactInFirestore(id);
    if (target) {
      setFeedbackMessage(`Pesan dari ${target.name} telah dihapus.`);
    }
  };

  const handleRefreshMessages = async (): Promise<void> => {
    setFeedbackMessage('Kotak masuk disinkronkan secara langsung dengan database.');
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
          isAuthReady && isAuthorizedAdmin ? (
            <AdminPanelView
              adminUsername={firebaseUser?.email || 'admin'}
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
              isLoading={!isAuthReady}
              signedInEmail={firebaseUser?.email ?? null}
              isUnauthorizedUser={Boolean(isAuthReady && firebaseUser && !isAuthorizedAdmin)}
              errorMessage={authError}
              isSubmitting={isAuthSubmitting}
              onGoogleSignIn={handleGoogleSignIn}
              onSignOut={handleAdminLogout}
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
