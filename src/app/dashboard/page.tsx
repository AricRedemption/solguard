"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Clock, Gauge, RotateCcw, Shield, Zap } from "lucide-react";
import { useAuditSession } from "@/components/dashboard/AuditSessionProvider";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { FileUploadZone } from "@/components/dashboard/FileUploadZone";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ShieldLogo } from "@/components/icons/ShieldLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { extractGithubUrls } from "@/lib/github-urls";
import { usePersistentInputMode } from "@/hooks/usePersistentInputMode";
import { useSettings } from "@/hooks/useSettings";
import type { SourceFile } from "@/types/audit";

function RunLaunchCard({
  stage,
  progress,
  onCancel,
  cancelLabel,
}: {
  stage: string;
  progress: number;
  onCancel: () => void;
  cancelLabel: string;
}) {
  return (
    <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">{stage || "Starting audit..."}</p>
            <p className="mt-1 text-xs text-slate-400">
              The dedicated run page will open once the first run snapshot arrives.
            </p>
          </div>
          <Badge variant="outline" className="border-dark-500 text-slate-200">
            {progress}%
          </Badge>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-solana-purple via-solana-blue to-solana-green transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Button variant="outline" className="w-full" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { state, latestRunSnapshot, startAudit, cancelAudit, resetAudit } = useAuditSession();
  const { settings, isConfigured } = useSettings();
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [githubDraft, setGithubDraft] = useState("");
  const [sourceMode, setSourceMode] = usePersistentInputMode();
  const { t } = useTranslation();

  const activeGithubUrls = sourceMode === "github" ? extractGithubUrls(githubDraft) : [];
  const canStart =
    Boolean(settings?.llm) &&
    isConfigured &&
    ((sourceMode === "files" && files.length > 0) ||
      (sourceMode === "github" && activeGithubUrls.length > 0));

  useEffect(() => {
    if (state.status !== "loading" || !latestRunSnapshot?.id) {
      return;
    }

    router.replace(`/dashboard/runs/${latestRunSnapshot.id}`);
  }, [latestRunSnapshot?.id, router, state.status]);

  const handleStartAudit = useCallback(() => {
    if (!settings?.llm) return;

    const activeFiles = sourceMode === "files" ? files : [];
    const urls = sourceMode === "github" ? extractGithubUrls(githubDraft) : [];

    if (!activeFiles.length && !urls.length) {
      return;
    }

    startAudit(activeFiles, settings.llm, urls);
  }, [files, githubDraft, settings, sourceMode, startAudit]);

  const handleNewAudit = useCallback(() => {
    setFiles([]);
    setGithubDraft("");
    if (state.status === "loading") {
      cancelAudit();
      return;
    }

    resetAudit();
  }, [cancelAudit, resetAudit, state.status]);

  const dashboardFeatures = [
    {
      icon: Shield,
      title: t.dashboard.features.vulnerabilityDetection,
      desc: t.dashboard.features.vulnerabilityDetectionDesc,
    },
    {
      icon: Zap,
      title: t.dashboard.features.multiAgentAI,
      desc: t.dashboard.features.multiAgentAIDesc,
    },
    {
      icon: Gauge,
      title: t.dashboard.features.securityScoring,
      desc: t.dashboard.features.securityScoringDesc,
    },
    {
      icon: Clock,
      title: t.dashboard.features.lightningFast,
      desc: t.dashboard.features.lightningFastDesc,
    },
  ];

  const isActiveRun = state.status === "loading";
  const isRedirecting = state.status === "loading" && Boolean(latestRunSnapshot?.id);
  const showNewAudit = Boolean(latestRunSnapshot?.id || state.status === "loading" || state.status === "results");

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="sticky top-0 z-50 border-b border-dark-600/50 bg-dark-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ShieldLogo className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-solana-purple to-solana-blue bg-clip-text text-transparent">
              SolGuard
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-dark-600/50 bg-dark-800/50 p-1">
            <Link
              href="/dashboard/evolution"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-dark-700/70 hover:text-white"
            >
              <Clock className="h-4 w-4" />
              {t.dashboard.evolutionPage.title}
            </Link>
            <LanguageSwitcher className="hidden sm:flex" />
            <SettingsPanel />
            {showNewAudit ? (
              <Button variant="ghost" size="sm" onClick={handleNewAudit}>
                <RotateCcw className="h-4 w-4" />
                {t.dashboard.newAudit}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl"
        >
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
              {t.dashboard.title.split(" ").map((part, index) =>
                index === 1 ? (
                  <span
                    key={`${part}-${index}`}
                    className="bg-gradient-to-r from-solana-purple to-solana-blue bg-clip-text text-transparent"
                  >
                    {part}{" "}
                  </span>
                ) : (
                  <span key={`${part}-${index}`}>{part} </span>
                )
              )}
            </h1>
            <p className="text-slate-400">{t.dashboard.subtitle}</p>
          </div>

          <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
            <CardContent className="space-y-5 pt-6">
              {isActiveRun ? (
                <>
                  <RunLaunchCard
                    stage={state.stage}
                    progress={state.progress}
                    onCancel={cancelAudit}
                    cancelLabel={t.dashboard.cancel}
                  />

                  {isRedirecting ? (
                    <div className="rounded-lg border border-dark-600/60 bg-dark-900/40 p-4 text-sm text-slate-300">
                      Opening the dedicated run page...
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <FileUploadZone
                    activeMode={sourceMode}
                    onModeChange={setSourceMode}
                    onAppendFiles={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
                    onRemoveFile={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    files={files}
                    githubDraft={githubDraft}
                    onGithubDraftChange={setGithubDraft}
                  />

                  {!isConfigured ? (
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-orange-400">
                            {t.dashboard.llmNotConfigured}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {t.dashboard.llmNotConfiguredDesc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {state.status === "error" ? (
                    <div className="rounded-lg border border-critical/30 bg-critical/10 p-4">
                      <p className="text-sm text-critical">{state.message}</p>
                    </div>
                  ) : null}

                  <Button
                    className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white hover:shadow-lg hover:shadow-solana-purple/25"
                    onClick={handleStartAudit}
                    disabled={!canStart}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {t.dashboard.startAudit}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {!isActiveRun ? (
            <div className="mt-12 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {dashboardFeatures.map((feature) => (
                  <Card
                    key={feature.title}
                    className="border-dark-600/50 bg-dark-700/30 transition-all hover:border-solana-purple/30"
                  >
                    <CardContent className="pt-4">
                      <feature.icon className="mb-2 h-5 w-5 text-solana-purple" />
                      <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                      <p className="text-xs text-slate-500">{feature.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-rose-900/30 bg-gradient-to-r from-rose-950/30 via-dark-700/40 to-amber-950/20">
                <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">
                      Regression Archive
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Failure-first lessons</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Open the archive to see which failed candidates were rolled back, which stayed unproven, and
                      what the system learned from those failures.
                    </p>
                  </div>

                  <Link
                    href="/dashboard/evolution/regressions"
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition-colors hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
                  >
                    Open archive
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
