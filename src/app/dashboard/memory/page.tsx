"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { getAwarenessEntries, getAwarenessEntryRationale } from "@/lib/audit/awareness-store";
import type { AuditMemoryEntry } from "@/types/audit";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "border-solana-green/20 bg-solana-green/10 text-solana-green"
      : tone === "warn"
        ? "border-high/20 bg-high/10 text-high"
        : tone === "bad"
          ? "border-critical/20 bg-critical/10 text-critical"
          : "border-dark-600/60 bg-dark-800/50 text-slate-200";

  return (
    <div className={cn("rounded-xl border px-3 py-2", toneClass)}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-current">{value}</p>
    </div>
  );
}

function MemoryCard({ entry, t }: { entry: AuditMemoryEntry; t: ReturnType<typeof useTranslation>["t"] }) {
  const rationale = getAwarenessEntryRationale(entry);
  const utility = Math.round(entry.utility * 100);
  const recency = Math.round(entry.recency * 100);
  const risk = Math.round(entry.risk * 100);

  return (
    <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white">{entry.title}</CardTitle>
            <CardDescription className="mt-1 text-slate-400">
              {entry.summary}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-dark-500 text-slate-200">
              {entry.sourceType === "feedback" ? t.dashboard.memoryPage.feedbackSource : t.dashboard.memoryPage.reportSource}
            </Badge>
            <Badge variant="outline" className="border-dark-500 text-slate-200">
              {Math.round(entry.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t.dashboard.memoryPage.utility} value={`${utility}%`} tone="good" />
          <Metric label={t.dashboard.memoryPage.recency} value={`${recency}%`} tone="good" />
          <Metric label={t.dashboard.memoryPage.risk} value={`${risk}%`} tone={risk >= 60 ? "bad" : risk >= 30 ? "warn" : "neutral"} />
          <Metric
            label={t.dashboard.memoryPage.recallCount}
            value={entry.recallCount}
            tone={entry.recallCount > 0 ? "good" : "neutral"}
          />
        </div>

        <div className="rounded-xl border border-dark-600/60 bg-dark-900/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            {t.dashboard.memoryPage.whySurfaced}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {rationale.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="border-dark-600/60 bg-dark-800/60 text-slate-300"
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span className="uppercase tracking-wide text-slate-500">{t.dashboard.memoryPage.sourceReport}: </span>
            <Link
              href={`/dashboard/reports/${entry.reportId}`}
              className="text-slate-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-white"
            >
              {entry.reportId}
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            <span>{t.dashboard.reportPage.savedAt}: {formatDate(entry.createdAt)}</span>
            {entry.lastRecalledAt ? (
              <span>{t.dashboard.memoryPage.lastRecalled}: {formatDate(entry.lastRecalledAt)}</span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [memories, setMemories] = useState<AuditMemoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      setMemories(getAwarenessEntries(12));
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "solguard-audit-awareness:index") {
        refresh();
      }
    };

    refresh();
    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const topMemory = memories[0];

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4 text-solana-purple" />
              {t.dashboard.memoryPage.title}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {t.dashboard.memoryPage.summaryTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-400">{t.dashboard.memoryPage.subtitle}</p>
          </div>
          <Button
            variant="outline"
            className="border-dark-600/50 bg-dark-800/50 text-slate-200"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t.dashboard.memoryPage.backToDashboard}
          </Button>
        </div>

        {memories.length === 0 ? (
          <Card className="mx-auto max-w-2xl border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">{t.dashboard.memoryPage.noMemories}</CardTitle>
              <CardDescription className="text-slate-400">{t.dashboard.memoryPage.summarySubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white" onClick={() => router.push("/dashboard")}>
                {t.dashboard.memoryPage.backToDashboard}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="space-y-6">
              <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <ShieldCheck className="h-4 w-4 text-solana-green" />
                    {t.dashboard.memoryPage.summaryTitle}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {memories.length} {t.dashboard.memoryPage.memoryCount}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {t.dashboard.memoryPage.summarySubtitle}
                  </p>

                  <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {t.dashboard.memoryPage.whySurfaced}
                    </p>
                    {topMemory ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-white">{topMemory.title}</p>
                        <p className="text-sm leading-relaxed text-slate-400">{topMemory.summary}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Metric
                      label={t.dashboard.memoryPage.utility}
                      value={topMemory ? `${Math.round(topMemory.utility * 100)}%` : "0%"}
                      tone="good"
                    />
                    <Metric
                      label={t.dashboard.memoryPage.recency}
                      value={topMemory ? `${Math.round(topMemory.recency * 100)}%` : "0%"}
                      tone="good"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Clock3 className="h-4 w-4 text-solana-blue" />
                    {t.dashboard.memoryPage.rankingLogicTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {t.dashboard.memoryPage.rankingLogicDesc}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {memories.map((entry) => (
                <MemoryCard key={entry.id} entry={entry} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
