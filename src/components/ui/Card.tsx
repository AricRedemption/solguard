import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}

export function Card({ children, glow = false, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dark-600/50 bg-dark-700/50 p-6 backdrop-blur-sm transition-all duration-300",
        glow && "hover:border-solana-purple/30 hover:shadow-lg hover:shadow-solana-purple/10 hover:scale-[1.02]",
        className
      )}
    >
      {children}
    </div>
  );
}
