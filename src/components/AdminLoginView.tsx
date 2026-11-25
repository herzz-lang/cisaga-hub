import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

interface AdminLoginViewProps {
  authMode: 'loading' | 'setup' | 'login';
  expectedUsername: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onSubmitSetup: (username: string, password: string, confirmPassword: string) => Promise<void>;
  onSubmitLogin: (username: string, password: string) => Promise<void>;
  onBackToPublic: () => void;
}

export function AdminLoginView({
  authMode,
  expectedUsername,
  errorMessage,
  isSubmitting,
  onSubmitSetup,
  onSubmitLogin,
  onBackToPublic,
}: AdminLoginViewProps) {
  const [username, setUsername] = useState(expectedUsername || 'admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(expectedUsername || 'admin');
  }, [expectedUsername]);

  const displayedError = localError || errorMessage;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setLocalError('Masukkan username admin.');
      return;
    }
    if (!password) {
      setLocalError('Masukkan password admin.');
      return;
    }

    if (authMode === 'setup') {
      if (password.length < 8) {
        setLocalError('Password developer minimal 8 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Konfirmasi password tidak cocok.');
        return;
      }
      await onSubmitSetup(trimmedUser, password, confirmPassword);
    } else {
      await onSubmitLogin(trimmedUser, password);
    }
  };

  return (
    <section
      data-testid="admin-login-view"
      className="py-12 sm:py-16 max-w-[1200px] mx-auto px-4 sm:px-6"
    >
      <div className="max-w-[460px] mx-auto bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C] mb-2">
          {authMode === 'setup' ? (
            <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>CISAGA HUB · Akses Khusus Developer</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#0F2744] tracking-tight mb-2">
          {authMode === 'setup'
            ? 'Aktivasi Sandi Developer Admin'
            : 'Masuk Panel Admin Developer'}
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-6">
          {authMode === 'loading'
            ? 'Memeriksa status keamanan panel admin...'
            : authMode === 'setup'
              ? `Buat password developer pertama kali untuk akun "${expectedUsername}" sebelum mengelola ekosistem UMKM Reguler (Free) dan Premium.`
              : 'Panel Admin CISAGA HUB hanya dapat diakses oleh developer menggunakan username admin dan password yang terverifikasi.'}
        </p>

        {displayedError && (
          <div
            role="alert"
            data-testid="admin-auth-error"
            className="mb-5 p-3.5 rounded-lg bg-[#B91C1C]/5 border border-[#B91C1C]/30 text-xs font-medium text-[#B91C1C]"
          >
            {displayedError}
          </div>
        )}

        {authMode !== 'loading' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="developer-username"
                className="block text-xs font-semibold text-[#0F2744] mb-1.5"
              >
                Username Admin
              </label>
              <input
                id="developer-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
              />
            </div>

            <div>
              <label
                htmlFor="developer-password"
                className="block text-xs font-semibold text-[#0F2744] mb-1.5"
              >
                {authMode === 'setup' ? 'Password Developer Baru' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="developer-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={authMode === 'setup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder={authMode === 'setup' ? 'Minimal 8 karakter' : 'Masukkan password'}
                  className="w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-[#475569] hover:text-[#0F2744] rounded cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {authMode === 'setup' && (
              <div>
                <label
                  htmlFor="developer-confirm-password"
                  className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                >
                  Konfirmasi Password
                </label>
                <input
                  id="developer-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Ulangi password developer"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                />
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? 'Memverifikasi...'
                  : authMode === 'setup'
                    ? 'Simpan Password & Masuk Admin'
                    : 'Masuk Panel Admin'}
              </button>

              <button
                type="button"
                onClick={onBackToPublic}
                className="w-full py-2.5 px-4 text-sm font-medium text-[#475569] hover:text-[#0F2744] border border-[#E2E8F0] rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Kembali ke Etalase Publik</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
