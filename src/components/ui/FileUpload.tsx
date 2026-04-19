"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileCode } from "lucide-react";
import { cn } from "@/lib/cn";

interface FileUploadProps {
  className?: string;
}

export function FileUpload({ className }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const valid = Array.from(fileList).filter((f) =>
      /\.(rs|ts|js|sol|py)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          dragging
            ? "border-solana-purple bg-solana-purple/10"
            : "border-dark-600 bg-dark-800/50 hover:border-solana-purple/50"
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-300">
          Drag & drop files or <span className="text-solana-purple">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          .rs, .ts, .js, .sol files supported
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".rs,.ts,.js,.sol,.py"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg bg-dark-800 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-solana-purple" />
                <span className="text-xs text-slate-300">{file.name}</span>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="text-slate-500 hover:text-critical"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
