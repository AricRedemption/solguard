"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_BASE_URL_BY_PROTOCOL,
  DEFAULT_MODEL_BY_PROTOCOL,
  DEFAULT_SUPPLIER_BY_PROTOCOL,
  getSupplierPreset,
  getSupplierPresetsByProtocol,
  inferSupplierForConfig,
  SUPPLIER_PRESETS,
  type LLMSupplierType,
  type LLMProviderType,
} from "@/types/llm";
import { Settings, Eye, EyeOff, Loader2, Check, X } from "lucide-react";

const CUSTOM_MODEL_VALUE = "__custom__";

export function SettingsPanel() {
  const { settings, loading, updateLLMConfig, isConfigured } = useSettings();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [protocol, setProtocol] = useState<LLMProviderType>(
    settings?.llm.provider || "anthropic"
  );
  const [supplier, setSupplier] = useState<LLMSupplierType>(
    settings?.llm.supplier ||
      inferSupplierForConfig(
        settings?.llm.provider || "anthropic",
        settings?.llm.baseURL,
        settings?.llm.model
      )
  );
  const [apiKey, setApiKey] = useState(settings?.llm.apiKey || "");
  const [baseURL, setBaseURL] = useState(
    settings?.llm.baseURL || DEFAULT_BASE_URL_BY_PROTOCOL.anthropic
  );
  const [model, setModel] = useState(
    settings?.llm.model || DEFAULT_MODEL_BY_PROTOCOL.anthropic
  );
  const [customModel, setCustomModel] = useState(
    settings?.llm.model || DEFAULT_MODEL_BY_PROTOCOL.anthropic
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const protocolItems = [
    { value: "anthropic", label: "Anthropic" },
    { value: "openai", label: "OpenAI" },
  ] as const;
  const protocolLabels: Record<LLMProviderType, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
  };
  const supplierLabels = Object.fromEntries(
    SUPPLIER_PRESETS.map((item) => [item.id, item.label])
  ) as Record<LLMSupplierType, string>;
  const supplierDescriptions: Record<LLMSupplierType, string> = {
    "anthropic-direct": "Native Anthropic API",
    "openai-direct": "Official OpenAI API",
    "minimax-cn": "Anthropic-compatible via MiniMax (CN)",
    "minimax-global": "Anthropic-compatible via MiniMax (Global)",
    zai: "Anthropic-compatible via Z.AI",
    glm: "Anthropic-compatible via GLM coding",
    custom: "Custom baseURL and model ID",
  };

  const syncFromSettings = () => {
    if (!settings?.llm) return;
    const nextProtocol = settings.llm.provider || "anthropic";
    const nextSupplier =
      settings.llm.supplier ||
      inferSupplierForConfig(
        nextProtocol,
        settings.llm.baseURL,
        settings.llm.model
      );
    const supplierPreset = getSupplierPreset(nextSupplier);
    const nextModel =
      settings.llm.model || supplierPreset.getDefaultModel(nextProtocol);
    const nextBaseURL =
      settings.llm.baseURL ||
      supplierPreset.getBaseURL(nextProtocol) ||
      DEFAULT_BASE_URL_BY_PROTOCOL[nextProtocol];

    setProtocol(nextProtocol);
    setSupplier(nextSupplier);
    setApiKey(settings.llm.apiKey || "");
    setBaseURL(nextBaseURL);
    setModel(nextModel);
    setCustomModel(nextModel);
    setTestResult(null);
  };

  if (loading) {
    return (
      <button className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/60">
        Loading...
      </button>
    );
  }

  const supplierPreset = getSupplierPreset(supplier);
  const supplierOptions = getSupplierPresetsByProtocol(protocol);
  const modelOptions = supplierPreset.getModels(protocol);
  const modelItems = modelOptions.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const isPresetModel = modelOptions.some((item) => item.id === model);
  const modelSelectValue = isPresetModel ? model : CUSTOM_MODEL_VALUE;

  const handleProtocolChange = (nextProtocol: LLMProviderType) => {
    const currentSupplier = getSupplierPreset(supplier);
    const nextSupplier = currentSupplier.protocols.includes(nextProtocol)
      ? supplier
      : DEFAULT_SUPPLIER_BY_PROTOCOL[nextProtocol];
    const nextSupplierPreset = getSupplierPreset(nextSupplier);

    setProtocol(nextProtocol);
    setSupplier(nextSupplier);
    setTestResult(null);

    if (nextSupplier === "custom") {
      setBaseURL((current) => current || DEFAULT_BASE_URL_BY_PROTOCOL[nextProtocol]);
      setModel((current) => current || DEFAULT_MODEL_BY_PROTOCOL[nextProtocol]);
      setCustomModel((current) => current || DEFAULT_MODEL_BY_PROTOCOL[nextProtocol]);
      return;
    }

    setBaseURL(nextSupplierPreset.getBaseURL(nextProtocol));
    const nextModel = nextSupplierPreset.getDefaultModel(nextProtocol);
    setModel(nextModel);
    setCustomModel(nextModel);
  };

  const handleSupplierChange = (nextSupplier: LLMSupplierType) => {
    const nextSupplierPreset = getSupplierPreset(nextSupplier);
    const nextProtocol = nextSupplierPreset.protocols.includes(protocol)
      ? protocol
      : nextSupplierPreset.protocols[0];

    setProtocol(nextProtocol);
    setSupplier(nextSupplier);
    setTestResult(null);

    if (nextSupplier === "custom") {
      setBaseURL((current) => current || DEFAULT_BASE_URL_BY_PROTOCOL[nextProtocol]);
      setModel((current) => current || DEFAULT_MODEL_BY_PROTOCOL[nextProtocol]);
      setCustomModel((current) => current || DEFAULT_MODEL_BY_PROTOCOL[nextProtocol]);
      return;
    }

    setBaseURL(nextSupplierPreset.getBaseURL(nextProtocol));
    const nextModel = nextSupplierPreset.getDefaultModel(nextProtocol);
    setModel(nextModel);
    setCustomModel(nextModel);
  };

  const handleSave = () => {
    updateLLMConfig({
      provider: protocol,
      supplier,
      apiKey,
      baseURL,
      model,
    });
    setOpen(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/audit/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm: { provider: protocol, supplier, apiKey, baseURL, model },
        }),
      });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          syncFromSettings();
          setOpen(true);
        }}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          isConfigured
            ? "border border-solana-green/30 bg-solana-green/20 text-solana-green"
            : "border border-orange-500/30 bg-orange-500/20 text-orange-500"
        }`}
      >
        <Settings className="h-4 w-4" />
        {isConfigured ? t.dashboard.settings.configured : t.dashboard.settings.setupRequired}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{t.dashboard.settings.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">{t.dashboard.settings.protocol}</Label>
              <Select
                value={protocol}
                items={protocolItems}
                onValueChange={(value) => handleProtocolChange(value as LLMProviderType)}
              >
                <SelectTrigger className="!w-full border-dark-600 bg-dark-900">
                  <SelectValue>
                    {(value) => protocolLabels[(value as LLMProviderType) || "anthropic"]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-dark-600 bg-dark-800">
                  <SelectItem value="anthropic" className="text-slate-300">
                    Anthropic
                  </SelectItem>
                  <SelectItem value="openai" className="text-slate-300">
                    OpenAI
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t.dashboard.settings.supplier}</Label>
              <Select
                value={supplier}
                onValueChange={(value) => handleSupplierChange(value as LLMSupplierType)}
              >
                <SelectTrigger className="!w-full border-dark-600 bg-dark-900">
                  <SelectValue>
                    {(value) => supplierLabels[(value as LLMSupplierType) || "custom"]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-dark-600 bg-dark-800">
                  {supplierOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="text-slate-300">
                      <span className="flex flex-col">
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-500">
                          {supplierDescriptions[item.id]}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t.dashboard.settings.model}</Label>
              <Select
                value={modelSelectValue}
                items={modelItems}
                onValueChange={(value) => {
                  if (!value) return;
                  if (value === CUSTOM_MODEL_VALUE) {
                    setModel(customModel || model);
                    return;
                  }
                  setModel(value);
                  setCustomModel(value);
                }}
              >
                <SelectTrigger className="!w-full border-dark-600 bg-dark-900">
                  <SelectValue>
                    {(value) => {
                      if (value === CUSTOM_MODEL_VALUE) {
                        return t.dashboard.settings.customModel;
                      }
                      return (
                        modelOptions.find((item) => item.id === value)?.label ||
                        String(value || "")
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-dark-600 bg-dark-800">
                  {modelOptions.map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-slate-300"
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_MODEL_VALUE} className="text-slate-300">
                    {t.dashboard.settings.customModel}
                  </SelectItem>
                </SelectContent>
              </Select>

              {!isPresetModel && (
                <Input
                  value={customModel}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCustomModel(next);
                    setModel(next);
                  }}
                  placeholder={t.dashboard.settings.customModelPlaceholder}
                  className="border-dark-600 bg-dark-900"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t.dashboard.settings.apiKey}</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="border-dark-600 bg-dark-900 pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                {t.dashboard.settings.baseURL}{" "}
                <span className="text-slate-500">{t.dashboard.settings.baseURLOptional}</span>
              </Label>
              <Input
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder={getSupplierPreset(supplier).getBaseURL(protocol) || DEFAULT_BASE_URL_BY_PROTOCOL[protocol]}
                className="border-dark-600 bg-dark-900"
              />
              <p className="text-xs text-slate-500">{t.dashboard.settings.baseURLHint}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!apiKey || testing}
              className="w-full gap-2 border-dark-600"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.dashboard.settings.testing}
                </>
              ) : testResult === "success" ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">
                    {t.dashboard.settings.connectionSuccess}
                  </span>
                </>
              ) : testResult === "error" ? (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">
                    {t.dashboard.settings.connectionFailed}
                  </span>
                </>
              ) : (
                t.dashboard.settings.testConnection
              )}
            </Button>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-dark-600 bg-white/5 text-white/80 hover:bg-white/10"
            >
              {t.dashboard.settings.cancel}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-solana-purple hover:bg-solana-purple/80"
            >
              {t.dashboard.settings.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
