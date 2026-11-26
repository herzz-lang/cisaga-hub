import { ArrowLeft, LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface AdminLoginViewProps {
  isLoading: boolean;
  signedInEmail: string | null;
  isUnauthorizedUser: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onBackToPublic: () => void;
}

export function AdminLoginView({
  isLoading,
  signedInEmail,
  isUnauthorizedUser,
  errorMessage,
  isSubmitting,
  onGoogleSignIn,
  onSignOut,
  onBackToPublic,
}: AdminLoginViewProps) {
  return (
    <section
      data-testid="admin-login-view"
      className="py-12 sm:py-16 max-w-[1200px] mx-auto px-4 sm:px-6"
    >
      <div className="max-w-[460px] mx-auto bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C] mb-2">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>CISAGA HUB · Akses Khusus Admin</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#0F2744] tracking-tight mb-2">
          Masuk Panel Admin CISAGA HUB
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-4">
          {isLoading
            ? 'Memeriksa sesi autentikasi Panel Admin...'
            : isUnauthorizedUser && signedInEmail
              ? `Akun ${signedInEmail} tidak memiliki izin akses. Panel ini terkunci hanya untuk akun Google pemilik.`
              : 'Sistem pengelolaan CISAGA HUB dikunci secara eksklusif untuk satu akun Google terverifikasi.'}
        </p>

        <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
          Akun diizinkan:{' '}
          <span
            data-testid="admin-allowed-email"
            className="font-mono font-semibold text-[#0F2744]"
          >
            herzz@smkn2banjar-jabar.sch.id
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            data-testid="admin-auth-error"
            className="mb-5 p-3.5 rounded-lg bg-[#B91C1C]/5 border border-[#B91C1C]/30 text-xs font-medium text-[#B91C1C] leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {isUnauthorizedUser && signedInEmail ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void onSignOut()}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Keluar & Ganti Akun Google</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void onGoogleSignIn()}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] disabled:opacity-60 rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Masuk dengan Google'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToPublic}
              className="w-full py-2.5 px-4 text-sm font-medium text-[#475569] hover:text-[#0F2744] border border-[#E2E8F0] rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Kembali ke Etalase Publik</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
