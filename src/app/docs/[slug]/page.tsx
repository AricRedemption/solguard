import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const DOCS: Record<
  string,
  { title: string; titleZh: string; description: string; descriptionZh: string; fileName: string }
> = {
  "commercial-license.md": {
    title: "Commercial Licensing",
    titleZh: "商业授权",
    description: "How SolGuard commercial licensing works.",
    descriptionZh: "SolGuard 商业授权如何运作。",
    fileName: "commercial-license.md",
  },
  "commercial-license-template.md": {
    title: "Commercial License Agreement Template",
    titleZh: "商业授权协议模板",
    description: "Draft commercial agreement template for SolGuard.",
    descriptionZh: "SolGuard 商业协议草案模板。",
    fileName: "commercial-license-template.md",
  },
};

function resolveDoc(slug: string) {
  return DOCS[slug] ?? DOCS[`${slug}.md`] ?? DOCS[slug.replace(/\.md$/i, "")];
}

async function getLanguage(): Promise<"en" | "zh"> {
  const lang = (await cookies()).get("solguard-language")?.value;
  return lang === "zh" ? "zh" : "en";
}

function selectLocalizedMarkdown(markdown: string, language: "en" | "zh"): string {
  const sections = markdown.split(/\n---\n/);
  if (sections.length < 2) {
    return markdown;
  }

  return language === "zh" ? sections.slice(1).join("\n---\n") : sections[0];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = resolveDoc(slug);
  const language = await getLanguage();

  return {
    title: doc
      ? `${language === "zh" ? doc.titleZh : doc.title} | SolGuard`
      : "Docs | SolGuard",
    description: doc
      ? language === "zh"
        ? doc.descriptionZh
        : doc.description
      : undefined,
  };
}

async function loadDoc(slug: string): Promise<string> {
  const doc = resolveDoc(slug);

  if (!doc) {
    notFound();
  }

  const filePath = path.join(process.cwd(), "docs", doc.fileName);
  return readFile(filePath, "utf8");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]+)\)/g,
      '<a href="$2" class="text-solana-green underline decoration-white/20 underline-offset-4 hover:decoration-solana-green">$1</a>'
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let blockquote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p class="mb-5 leading-8 text-slate-300">${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    output.push(
      `<ul class="mb-6 ml-6 list-disc space-y-2 text-slate-300">${listItems.join("")}</ul>`
    );
    listItems = [];
  };

  const flushBlockquote = () => {
    if (blockquote.length === 0) return;
    output.push(
      `<blockquote class="mb-6 border-l-2 border-solana-purple/60 bg-white/5 px-5 py-4 text-slate-200">${blockquote
        .map((line) => `<p class="leading-7">${renderInline(line)}</p>`)
        .join("")}</blockquote>`
    );
    blockquote = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      flushList();
      flushBlockquote();
      output.push('<hr class="my-10 border-white/10" />');
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = trimmed.match(/^#{1,3}/)?.[0].length ?? 1;
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      const sizes = {
        1: "text-3xl md:text-4xl font-semibold text-white mt-12 mb-4",
        2: "text-2xl md:text-3xl font-semibold text-white mt-10 mb-4",
        3: "text-xl md:text-2xl font-semibold text-white mt-8 mb-3",
      } as const;
      output.push(`<h${level} class="${sizes[level as 1 | 2 | 3]}">${renderInline(text)}</h${level}>`);
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blockquote.push(trimmed.replace(/^>\s+/, ""));
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      flushParagraph();
      flushBlockquote();
      listItems.push(`<li>${renderInline(trimmed.replace(/^-\s+/, ""))}</li>`);
      continue;
    }

    flushList();
    flushBlockquote();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushBlockquote();

  return output.join("\n");
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const language = await getLanguage();
  const markdown = selectLocalizedMarkdown(await loadDoc(slug), language);
  const doc = resolveDoc(slug);
  const chrome =
    language === "zh"
      ? { section: "文档", back: "返回首页", title: doc.titleZh }
      : { section: "Docs", back: "Back to home", title: doc.title };

  return (
    <main className="min-h-screen bg-dark-900 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-solana-green/80">
              SolGuard {chrome.section}
            </p>
            <h1 className="text-3xl font-bold">{chrome.title}</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/5"
          >
            {chrome.back}
          </Link>
        </div>

        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24">
          <div
            className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-2xl shadow-black/20 backdrop-blur"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
          />
        </article>
      </div>
    </main>
  );
}
