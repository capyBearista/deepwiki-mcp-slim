// Keep DeepWiki's instructions while removing Devin-only guidance.
// The observed upstream response puts each Devin tool and its OAuth/org
// preface on a single line containing a devin_* reference.
const DEVIN_TOOL = /(?:^|[^\w])devin_(?:\*|[a-z0-9_]+)/i;

export function filterDevinInstructions(instructions) {
  if (!instructions) return undefined;
  const filtered = instructions
    .split(/\r?\n/)
    .filter((line) => !DEVIN_TOOL.test(line))
    .join("\n")
    .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n")
    .trim();
  return filtered || undefined;
}
