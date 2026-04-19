import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export function Input({ icon, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full rounded-lg border border-dark-600 bg-dark-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-solana-purple focus:outline-none focus:ring-1 focus:ring-solana-purple/50",
            icon && "pl-10",
            error && "border-critical focus:border-critical focus:ring-critical/50",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-critical">{error}</p>}
    </div>
  );
}
