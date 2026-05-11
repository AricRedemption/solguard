import { fetchGitHubUrls, normalizeJinaContent, toJinaReaderUrl, toRawGitHubUrl } from "@/lib/github-fetcher";

const blobUrl =
  "https://github.com/solana-developers/anchor-web3js-nextjs/blob/main/program/programs/counter/src/lib.rs";

const nestedRefBlobUrl =
  "https://github.com/acme/repo/blob/release/2026-05/contracts/token/ERC20.sol?plain=1#L1";

const rawUrl =
  "https://raw.githubusercontent.com/solana-developers/anchor-web3js-nextjs/main/program/programs/counter/src/lib.rs";

const nestedRefRawUrl =
  "https://raw.githubusercontent.com/acme/repo/release/2026-05/contracts/token/ERC20.sol";

const rawUrlWithQueryAndHash = `${rawUrl}?plain=1#L1`;

const jinaBaseUrl = "https://r.jina.ai/";
const jinaRawUrl = `${jinaBaseUrl}${rawUrl}`;

if (toRawGitHubUrl(blobUrl) !== rawUrl) {
  throw new Error("Expected GitHub blob URLs to convert to raw.githubusercontent.com.");
}

if (toRawGitHubUrl(rawUrl) !== rawUrl) {
  throw new Error("Expected raw GitHub URLs to stay unchanged.");
}

if (toRawGitHubUrl(rawUrlWithQueryAndHash) !== rawUrl) {
  throw new Error("Expected raw GitHub URLs to drop query and hash fragments.");
}

if (toRawGitHubUrl(nestedRefBlobUrl) !== nestedRefRawUrl) {
  throw new Error("Expected blob URLs with nested refs to normalize correctly.");
}

if (toJinaReaderUrl(blobUrl, jinaBaseUrl) !== jinaRawUrl) {
  throw new Error("Expected GitHub blob URLs to be converted before Jina fetches.");
}

if (toJinaReaderUrl(rawUrl, jinaBaseUrl) !== jinaRawUrl) {
  throw new Error("Expected raw GitHub URLs to stay unchanged before Jina fetches.");
}

if (toJinaReaderUrl(rawUrlWithQueryAndHash, jinaBaseUrl) !== jinaRawUrl) {
  throw new Error("Expected raw GitHub URLs with fragments to normalize before Jina fetches.");
}

if (toJinaReaderUrl(nestedRefBlobUrl, jinaBaseUrl) !== `${jinaBaseUrl}${nestedRefRawUrl}`) {
  throw new Error("Expected Jina URLs to normalize complex blob refs before fetching.");
}

const jinaWrappedContent = `
Title:

URL Source: ${jinaRawUrl}

Markdown Content:
#![allow(unused)]
use anchor_lang::prelude::*;

#[program]
pub mod counter {
    pub fn increment(_ctx: Context<Increment>) -> Result<()> {
        Ok(())
    }
}
`.trim();

const normalizedJinaContent = normalizeJinaContent(jinaWrappedContent);
if (!normalizedJinaContent.startsWith("#![allow(unused)]")) {
  throw new Error("Expected Jina markdown wrappers to be removed from fetched source.");
}

if (!normalizedJinaContent.includes("pub fn increment")) {
  throw new Error("Expected normalized Jina content to preserve source code.");
}

const fencedContent = `
Title:

URL Source: ${jinaRawUrl}

Markdown Content:
\`\`\`rust
pub fn decrement(_ctx: Context<Decrement>) -> Result<()> {
    Ok(())
}
\`\`\`
`.trim();

const normalizedFencedContent = normalizeJinaContent(fencedContent);
if (!normalizedFencedContent.startsWith("pub fn decrement")) {
  throw new Error("Expected fenced Jina markdown to normalize to the code block contents.");
}

const originalFetch = globalThis.fetch;
const mockGitHubUrl = "https://github.com/acme/repo/blob/release/2026-05/contracts/token/ERC20.sol?plain=1#L1";

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const requestUrl = typeof input === "string" ? input : input.toString();
  if (!requestUrl.startsWith("https://r.jina.ai/https://raw.githubusercontent.com/acme/repo/release/2026-05/contracts/token/ERC20.sol")) {
    throw new Error(`Unexpected fetch URL: ${requestUrl}`);
  }

  return new Response(`Title:\n\nURL Source: ${requestUrl}\n\nMarkdown Content:\npub fn foo() {}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}) as typeof fetch;

try {
  const [file] = await fetchGitHubUrls([mockGitHubUrl], jinaBaseUrl);
  if (!file) {
    throw new Error("Expected fetchGitHubUrls to return a file for the mocked GitHub URL.");
  }

  if (file.name !== "contracts/token/ERC20.sol") {
    throw new Error(`Expected the GitHub path to exclude the ref segment, got ${file.name}.`);
  }

  if (file.language !== "solidity") {
    throw new Error(`Expected Solidity language detection, got ${file.language}.`);
  }

  if (!file.content.includes("pub fn foo")) {
    throw new Error("Expected normalized fetchGitHubUrls content to preserve the fetched source body.");
  }
} finally {
  globalThis.fetch = originalFetch;
}
