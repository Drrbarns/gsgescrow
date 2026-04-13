import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = 36,
  showWordmark = false,
  className = '',
  wordmarkClassName = '',
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/images/brand-logo-gsg.png"
        alt="GSG logo"
        width={size}
        height={size}
        priority={priority}
        className="h-auto w-auto max-h-full object-contain"
      />
      {showWordmark && (
        <span className={`font-bold tracking-tight text-slate-900 ${wordmarkClassName}`}>
          Sell-Safe Buy-Safe
        </span>
      )}
    </span>
  );
}
