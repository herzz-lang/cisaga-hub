import { CheckCircle2, Clock, Loader2, Mail, MapPin, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ContactMessage, ContactMessageFormData } from '../types/umkm';
import {
  CONTACT_TOPICS,
  formatContactDate,
  getContactStatusLabel,
  validateContactMessageForm,
} from '../utils/umkmLogic';

interface ContactSectionProps {
  onSubmitContactMessage: (data: ContactMessageFormData) => Promise<ContactMessage>;
}

const createInitialForm = (): ContactMessageFormData => ({
  name: '',
  email: '',
  whatsapp: '',
  subject: '',
  message: '',
  website: '',
});

export function ContactSection({ onSubmitContactMessage }: ContactSectionProps) {
  const [form, setForm] = useState<ContactMessageFormData>(() => createInitialForm());
  const [errors, setErrors] = useState<Partial<Record<keyof ContactMessageFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sentMessage, setSentMessage] = useState<ContactMessage | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const normalizedForm: ContactMessageFormData = {
      ...form,
      subject: form.subject.trim() === '' ? CONTACT_TOPICS[0] : form.subject,
    };
    const validationErrors = validateContactMessageForm(normalizedForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors).find(Boolean);
      if (firstError) {
        setSubmitError(firstError);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onSubmitContactMessage(normalizedForm);
      setSentMessage(created);
      setForm(createInitialForm());
      setErrors({});
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal mengirim pesan. Silakan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="hubungi-kami"
      data-testid="contact-section"
      className="scroll-mt-16 py-14 sm:py-20 bg-[#F8FAFC] border-t border-[#E2E8F0]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold text-[#C2410C] mb-2">
            Hubungi Saya · Langsung ke Web Portal Admin
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight text-balance mb-3">
            Kirim Pesan Langsung ke Portal Admin
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed mb-6">
            Punya pertanyaan seputar promosi UMKM Premium, kerja sama reseller, pendampingan
            pendaftaran, atau masukan platform? Pesan Anda masuk langsung ke kotak masuk Panel Admin
            CISAGA HUB untuk ditindaklanjuti.
          </p>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-[#0F2744]">Sekretariat CISAGA HUB</p>
                <p className="text-xs text-[#475569] leading-relaxed mt-0.5">
                  Jl. Raya Cisaga No. 48, Desa Cisaga, Kec. Cisaga, Kab. Ciamis, Jawa Barat 46386
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-[#E2E8F0]">
              <Clock className="w-4 h-4 text-[#0F2744] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-[#0F2744]">Jam Layanan Pengelola</p>
                <p className="text-xs text-[#475569] font-mono tabular-nums mt-0.5">
                  Senin – Sabtu · 08.00 – 16.30 WIB
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-[#E2E8F0]">
              <Mail className="w-4 h-4 text-[#0F2744] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-[#0F2744]">Email Sekretariat</p>
                <p className="text-xs text-[#475569] mt-0.5">sekretariat@cisagahub.id</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
          {sentMessage ? (
            <div data-testid="contact-success-card" className="space-y-4">
              <div className="flex items-center gap-2.5 text-[#047857]">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <h3 className="font-display text-xl font-bold text-[#0F2744]">
                  Pesan Terkirim ke Portal Admin
                </h3>
              </div>

              <p className="text-sm text-[#475569] leading-relaxed">
                Terima kasih, <strong className="text-[#0F2744]">{sentMessage.name}</strong>. Pesan
                Anda sudah tersimpan secara permanen di database dan tampil di kotak masuk admin
                CISAGA HUB untuk segera ditanggapi melalui email
                {sentMessage.whatsapp ? ' atau WhatsApp' : ''}.
              </p>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs text-[#475569]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Kode Pesan:{' '}
                    <span className="font-mono tabular-nums font-semibold text-[#0F2744]">
                      {sentMessage.id}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatContactDate(sentMessage.created_at)}
                  </span>
                </div>
                <p>
                  Subjek:{' '}
                  <span className="font-semibold text-[#0F2744]">{sentMessage.subject}</span> ·
                  Status:{' '}
                  <span className="font-semibold text-[#C2410C]">
                    {getContactStatusLabel(sentMessage.status)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSentMessage(null)}
                className="px-4 py-2 text-sm font-semibold text-[#0F2744] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors cursor-pointer"
              >
                Kirim Pesan Lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="mb-2">
                <h3 className="font-display text-xl font-bold text-[#0F2744]">
                  Formulir Hubungi Saya
                </h3>
                <p className="text-xs text-[#475569] mt-1">
                  Isi formulir berikut agar pesan Anda langsung tersimpan dan diteruskan ke Panel
                  Admin.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#B91C1C]/5 border border-[#B91C1C]/30 text-xs font-medium text-[#B91C1C]"
                >
                  {submitError}
                </div>
              )}

              {/* Honeypot anti-spam trap */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website ?? ''}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Nama Lengkap <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Nama lengkap Anda"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.name && <p className="text-xs text-[#B91C1C] mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Email <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: undefined });
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="nama@contoh.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  {errors.email && <p className="text-xs text-[#B91C1C] mt-1">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-whatsapp"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Nomor WhatsApp (Opsional)
                  </label>
                  <input
                    id="contact-whatsapp"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => {
                      setForm({ ...form, whatsapp: e.target.value });
                      if (errors.whatsapp) setErrors({ ...errors, whatsapp: undefined });
                      if (submitError) setSubmitError(null);
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
                    htmlFor="contact-subject"
                    className="block text-xs font-semibold text-[#0F2744] mb-1.5"
                  >
                    Subjek Pesan <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    list="contact-subject-suggestions"
                    maxLength={120}
                    value={form.subject}
                    onChange={(e) => {
                      setForm({ ...form, subject: e.target.value });
                      if (errors.subject) setErrors({ ...errors, subject: undefined });
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Contoh: Pertanyaan Umum / Promosi UMKM"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                  />
                  <datalist id="contact-subject-suggestions">
                    {CONTACT_TOPICS.map((topic) => (
                      <option key={topic} value={topic} />
                    ))}
                  </datalist>
                  {errors.subject && (
                    <p className="text-xs text-[#B91C1C] mt-1">{errors.subject}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-[#0F2744]"
                  >
                    Isi Pesan <span className="text-[#C2410C]">*</span>
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-[#475569]">
                    {form.message.length}/1500
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  maxLength={1500}
                  value={form.message}
                  onChange={(e) => {
                    setForm({ ...form, message: e.target.value });
                    if (errors.message) setErrors({ ...errors, message: undefined });
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="Tuliskan pertanyaan, kebutuhan kemitraan, atau pesan Anda untuk admin CISAGA HUB..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F2744] focus:outline-none focus:bg-white focus:border-[#0F2744] focus:ring-1 focus:ring-[#0F2744]"
                />
                {errors.message && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{isSubmitting ? 'Mengirim Pesan...' : 'Kirim Pesan'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
