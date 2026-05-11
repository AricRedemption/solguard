import { cn } from "@/lib/utils";

interface ShieldLogoProps {
  className?: string;
}

export function ShieldLogo({ className }: ShieldLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shield-gradient" x1="88" y1="64" x2="424" y2="448" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6D28D9" />
          <stop offset="48%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <filter id="shadow" x="0" y="0" width="512" height="512" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#020617" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path
          d="M256 56L404 128V256C404 354 343 429 256 456C169 429 108 354 108 256V128L256 56Z"
          fill="url(#shield-gradient)"
          fillOpacity="0.16"
          stroke="url(#shield-gradient)"
          strokeWidth="18"
          strokeLinejoin="round"
        />
        <path
          d="M256 128L341 169V256C341 314 305 364 256 389C207 364 171 314 171 256V169L256 128Z"
          fill="#0F172A"
          stroke="#1E293B"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M210 262L239 291L306 224"
          stroke="#F8FAFC"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
