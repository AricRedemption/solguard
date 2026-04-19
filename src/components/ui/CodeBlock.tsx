import { cn } from "@/lib/cn";

interface CodeBlockProps {
  code: string;
  language: string;
  highlightLine?: number;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  highlightLine,
  className,
}: CodeBlockProps) {
  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-dark-600 bg-dark-900 p-4 font-mono text-xs leading-6",
        className
      )}
    >
      <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
        {language}
      </div>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-4 px-2",
            highlightLine === i + 1 &&
              "bg-critical/10 border-l-2 border-critical -mx-1 px-3"
          )}
        >
          <span className="w-6 shrink-0 text-right text-slate-600 select-none">
            {i + 1}
          </span>
          <span
            className={cn(
              highlightLine === i + 1 ? "text-critical" : "text-slate-300"
            )}
          >
            {line || " "}
          </span>
        </div>
      ))}
    </div>
  );
}
