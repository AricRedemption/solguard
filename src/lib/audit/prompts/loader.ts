import { readFile } from "fs/promises";
import { join } from "path";

const SKILLS_DIR = join(process.cwd(), "public", "skills", "audit");

export async function loadSkillPrompt(skillName: string): Promise<string> {
  const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
  return readFile(skillPath, "utf-8");
}

export async function loadSkillReference(
  skillName: string,
  referencePath: string
): Promise<string> {
  const refPath = join(SKILLS_DIR, skillName, referencePath);
  return readFile(refPath, "utf-8");
}

export async function loadSkillWithReferences(
  skillName: string,
  referenceFiles: string[]
): Promise<{ skillPrompt: string; references: Record<string, string> }> {
  const [skillPrompt, ...refContents] = await Promise.all([
    loadSkillPrompt(skillName),
    ...referenceFiles.map((ref) =>
      loadSkillReference(skillName, ref).catch(() => `/* Reference not found: ${ref} */`)
    ),
  ]);

  const references: Record<string, string> = {};
  referenceFiles.forEach((ref, i) => {
    references[ref] = refContents[i];
  });

  return { skillPrompt, references };
}

export function prependPromptSystem<T extends { system: string }>(
  prompt: T,
  preamble?: string
): T {
  if (!preamble?.trim()) {
    return prompt;
  }

  return {
    ...prompt,
    system: `${preamble.trim()}\n\n${prompt.system}`,
  };
}
