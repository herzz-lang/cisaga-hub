import { ArrowRight, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { UmkmListing, VillageInfo } from '../types/umkm';
import { buildWhatsAppUrl } from '../utils/umkmLogic';

interface VillageExplorerSectionProps {
  villages: VillageInfo[];
  listings: UmkmListing[];
  onFilterByVillage: (villageName: string) => void;
}

export function VillageExplorerSection({
  villages,
  listings,
  onFilterByVillage,
}: VillageExplorerSectionProps) {
  const [selectedVillageName, setSelectedVillageName] = useState<string>(villages[0].name);

  const activeVillage =
    villages.find((v) => v.name === selectedVillageName) ?? villages[0];

  const villageListings = listings.filter(
    (item) => item.village === activeVillage.name && item.status !== 'Nonaktif'
  );

  return (
    <section
      id="sebaran-desa"
      className="scroll-mt-16 py-14 sm:py-20 bg-white border-y border-[#E2E8F0]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold text-[#C2410C] mb-2">
            Direktori UMKM · {villages.length} Desa di Kecamatan Cisaga
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744] tracking-tight mb-3">
            Direktori Usaha Lokal Setiap Desa di Cisaga
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            Pilih salah satu dari {villages.length} desa di Kecamatan Cisaga untuk melihat potensi
            unggulan, daftar pelaku UMKM Reguler (Free) dan Premium yang terhubung di CISAGA HUB,
            serta kontak langsung pengelola usaha.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div
            role="tablist"
            aria-label="Daftar desa di Kecamatan Cisaga"
            className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {villages.map((village, idx) => {
              const isSelected = village.name === activeVillage.name;
              const listingCountInVillage = listings.filter(
                (item) => item.village === village.name && item.status !== 'Nonaktif'
              ).length;

              return (
                <button
                  key={village.name}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedVillageName(village.name)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                    idx === 0 ? 'sm:col-span-2' : ''
                  } ${
                    isSelected
                      ? 'bg-[#F8FAFC] border-[#0F2744]'
                      : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-0.5 min-w-0">
                      <span className="font-mono tabular-nums text-[#C2410C] font-semibold shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="truncate">{village.commodityFocus}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#0F2744] truncate">
                      {village.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums text-sm font-semibold text-[#0F2744]">
                      {Math.max(village.baseUmkmCount, listingCountInVillage)}
                    </span>
                    <p className="text-[11px] text-[#475569]">UMKM</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-6 lg:sticky lg:top-20 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                  <span>Kecamatan Cisaga, Kabupaten Ciamis</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeVillage.coordinatesLabel}</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#0F2744]">
                  {activeVillage.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onFilterByVillage(activeVillage.name)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#0B1E36] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Lihat Etalase {activeVillage.name}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm sm:text-base text-[#475569] leading-relaxed mb-6">
              {activeVillage.description}
            </p>

            <div>
              <h4 className="text-xs font-semibold text-[#0F2744] mb-3">
                UMKM Terdaftar di {activeVillage.name} ({villageListings.length})
              </h4>

              {villageListings.length === 0 ? (
                <p className="text-sm text-[#475569] py-4 border-t border-[#E2E8F0]">
                  Belum ada UMKM aktif atau terdaftar untuk desa ini.
                </p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                  {villageListings.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0F2744]">
                          {item.businessName}
                        </p>
                        <p className="text-xs text-[#475569]">
                          {item.ownerName} · {item.category} · {item.productName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 sm:text-right shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            item.tier === 'premium' ? 'text-[#C2410C]' : 'text-[#475569]'
                          }`}
                        >
                          {item.tier === 'premium' ? 'Premium' : 'Reguler (Free)'}
                        </span>
                        <span aria-hidden="true" className="text-[#CBD5E1]">
                          ·
                        </span>
                        <a
                          href={buildWhatsAppUrl(
                            item.whatsapp,
                            `Halo ${item.businessName}, saya menemukan usaha Anda di platform CISAGA HUB Kecamatan Cisaga.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#0F2744] hover:text-[#EA580C] hover:underline"
                        >
                          Hubungi WA
                        </a>
                        <span aria-hidden="true" className="text-[#CBD5E1]">
                          ·
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            item.status === 'Aktif' ? 'text-[#047857]' : 'text-[#C2410C]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
