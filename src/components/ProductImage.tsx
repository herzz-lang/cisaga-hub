import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ProductImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="w-full h-full bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center text-[#475569]"
      >
        <Package className="w-8 h-8 mb-2 text-[#0F2744]" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-xs font-medium tracking-tight max-w-[180px]">
          {fallbackTitle ?? alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
