export const PHASE_NAMES = [
  "Entry Point Discovery",
  "Context Building",
  "Security Audit",
  "Variant Analysis",
  "Report Generation",
] as const;

export const PHASE_DESCRIPTIONS = [
  "Discovering entry points and classifying access levels",
  "Building deep architectural context and trust boundaries",
  "Analyzing for vulnerabilities using Solana-specific taxonomy",
  "Searching for vulnerability variants and confirming findings",
  "Generating structured audit report with scores and recommendations",
] as const;

export const PHASE_PROGRESS_MAP: Record<number, number> = {
  1: 10,
  2: 30,
  3: 55,
  4: 78,
  5: 93,
};