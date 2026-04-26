"use client";

import { AuditSessionProvider } from "@/components/dashboard/AuditSessionProvider";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuditSessionProvider>{children}</AuditSessionProvider>
    </I18nProvider>
  );
}
