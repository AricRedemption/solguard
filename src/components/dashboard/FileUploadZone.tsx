"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "@/lib/i18n/context";
import type { SourceFile } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Link2 } from "lucide-react";
import { extractGithubUrls } from "@/lib/github-urls";

export type InputMode = "files" | "github";

interface FileUploadZoneProps {
  onAppendFiles: (newFiles: SourceFile[]) => void;
  onRemoveFile: (index: number) => void;
  files: SourceFile[];
  githubDraft: string;
  onGithubDraftChange: (draft: string) => void;
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

function getLanguageFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    rs: "rust",
    toml: "toml",
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    sol: "solidity",
    py: "python",
  };
  return map[ext] || "text";
}

export function FileUploadZone({
  onAppendFiles,
  onRemoveFile,
  files,
  githubDraft,
  onGithubDraftChange,
  activeMode,
  onModeChange,
}: FileUploadZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsedGithubUrls = useMemo(() => extractGithubUrls(githubDraft), [githubDraft]);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: SourceFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const content = await file.text();
        newFiles.push({
          name: file.name,
          content,
          language: getLanguageFromName(file.name),
          size: file.size,
        });
      }
      onAppendFiles(newFiles);
    },
    [onAppendFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      onRemoveFile(index);
    },
    [onRemoveFile]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onModeChange("files")}
          className={cn(
            "min-h-[104px] w-full flex-col items-start justify-start rounded-2xl px-5 py-4 text-left",
            activeMode === "files"
              ? "border border-solana-purple/40 bg-solana-purple/10 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.12)]"
              : "border border-dark-600/60 bg-dark-800/40 text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4.5 w-4.5" />
            {t.dashboard.sourceTab}
          </span>
          <span className="mt-2 text-sm font-normal leading-relaxed text-slate-400">
            {t.dashboard.sourceTabDesc}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onModeChange("github")}
          className={cn(
            "min-h-[104px] w-full flex-col items-start justify-start rounded-2xl px-5 py-4 text-left",
            activeMode === "github"
              ? "border border-solana-purple/40 bg-solana-purple/10 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.12)]"
              : "border border-dark-600/60 bg-dark-800/40 text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-4.5 w-4.5" />
            {t.dashboard.githubTab}
          </span>
          <span className="mt-2 text-sm font-normal leading-relaxed text-slate-400">
            {t.dashboard.githubTabDesc}
          </span>
        </Button>
      </div>

      <div className="min-h-[232px] rounded-2xl border border-dark-600/60 bg-dark-800/35 p-4 sm:p-5">
        {activeMode === "files" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "relative flex h-[208px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
              isDragging
                ? "border-solana-purple bg-solana-purple/10"
                : "border-white/20 hover:border-white/30"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".rs,.toml,.ts,.tsx,.js,.jsx,.sol,.py"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />

            <div className="flex flex-col items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
                  isDragging ? "bg-solana-purple/20" : "bg-white/5"
                }`}
              >
                <svg
                  className={`h-8 w-8 transition-colors ${isDragging ? "text-solana-purple" : "text-white/40"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">
                  {isDragging
                    ? t.dashboard.fileUpload.dropFilesHere
                    : t.dashboard.fileUpload.dragAndDrop}
                </p>
                <p className="text-sm text-white/50">
                  {t.dashboard.fileUpload.browseFiles} (.rs, .toml, .ts, .js, .sol, .py)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[208px] flex-col gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">
                {t.dashboard.githubUrls}
              </label>
              <p className="text-xs text-white/35">
                {t.dashboard.githubUrlHelper}
              </p>
            </div>

            <div className="flex flex-1 min-h-0">
              <textarea
                value={githubDraft}
                onChange={(e) => onGithubDraftChange(e.target.value)}
                placeholder={t.dashboard.githubUrlPlaceholder}
                className="h-full w-full resize-none rounded-2xl border border-white/15 bg-dark-900 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-solana-purple/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{parsedGithubUrls.length > 0 ? `${parsedGithubUrls.length} ${t.dashboard.githubUrlList}` : t.dashboard.githubUrlHelper}</span>
            </div>
          </div>
        )}
      </div>

      {activeMode === "files" && files.length > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>{files.length} {t.dashboard.fileUpload.fileSelected}</span>
          </div>
          <div className="space-y-1">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
              >
                <span className="truncate text-sm text-white/80">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="rounded p-1 text-white/40 opacity-0 transition-colors hover:bg-white/10 hover:text-critical group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
}
