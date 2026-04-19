import { cn } from "@/lib/cn";

interface ShieldLogoProps {
  className?: string;
}

export function ShieldLogo({ className }: ShieldLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
        fill="url(#shield-gradient)"
        opacity="0.2"
        stroke="url(#shield-gradient)"
        strokeWidth="1.5"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="url(#shield-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
