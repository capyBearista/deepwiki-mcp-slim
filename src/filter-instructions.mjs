// Retain DeepWiki guidance while omitting tools unavailable through its public MCP.
// The observed server instructions contain one line per tool, plus a Devin-only
// organization/OAuth preface mentioning devin_*.
const UNAVAILABLE_TOOL = /(?:^|[^\w])(?:devin_(?:\*|[a-z0-9_]+)|list_wiki_repos|generate_wiki)(?!\w)/i;

export function filterUnavailableToolInstructions(instructions) {
  if (!instructions) return undefined;
  const filtered = instructions
    .split(/\r?\n/)
    .filter((line) => !UNAVAILABLE_TOOL.test(line))
    .join("\n")
    .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n")
    .trim();
  return filtered || undefined;
}
