interface BrandLogoProps {
  size?: 'sm' | 'md';
}

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const iconDimensions = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : 'text-[19px]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`${iconDimensions} shrink-0`}
      >
        <rect width="64" height="64" rx="14" fill="#0F2744" />
        <path
          d="M20 22L32 16L44 22V42L32 48L20 42V22Z"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M20 22L32 30L44 22" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
        <path d="M32 30V48" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="30" r="5" fill="#EA580C" />
      </svg>
      <span className={`font-display font-bold tracking-tight text-[#0F2744] ${textSize}`}>
        CISAGA <span className="text-[#EA580C]">HUB</span>
      </span>
    </span>
  );
}
