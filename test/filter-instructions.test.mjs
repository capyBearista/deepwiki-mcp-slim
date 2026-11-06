import test from "node:test";
import assert from "node:assert/strict";
import { filterUnavailableToolInstructions } from "../src/filter-instructions.mjs";

test("keeps public wiki guidance and removes private/Devin-only instructions", () => {
  const upstream = [
    "DeepWiki MCP provides AI-powered documentation for GitHub repositories.",
    "",
    "With a user OAuth token, all devin_* tools act in one organization: send X-Org-Id to switch.",
    "",
    "Available tools:",
    "- read_wiki_structure: Get documentation topics for a repository",
    "- read_wiki_contents: View repository documentation",
    "- ask_wiki_question: Ask questions about a repository",
    "- list_wiki_repos: List indexed repositories (private mode only)",
    "- generate_wiki: Generate a codebase wiki (private mode only)",
    "- devin_automation_manage: Manage Devin automations",
    "- devin_session_create: Create a Devin session",
  ].join("\n");
  assert.equal(filterUnavailableToolInstructions(upstream), [
    "DeepWiki MCP provides AI-powered documentation for GitHub repositories.",
    "",
    "Available tools:",
    "- read_wiki_structure: Get documentation topics for a repository",
    "- read_wiki_contents: View repository documentation",
    "- ask_wiki_question: Ask questions about a repository",
  ].join("\n"));
});

test("preserves unrelated text, handles CRLF and absent instructions", () => {
  const normal = "Use read_wiki_contents before ask_wiki_question.";
  assert.equal(filterUnavailableToolInstructions(normal), normal);
  assert.equal(filterUnavailableToolInstructions("Intro\r\n- generate_wiki: Private\r\n- list_wiki_repos: Private\r\n- devin_session_interact: Manage\r\n- read_wiki_structure: List"), "Intro\n- read_wiki_structure: List");
  assert.equal(filterUnavailableToolInstructions(undefined), undefined);
  assert.equal(filterUnavailableToolInstructions("  devin_session_create: do not use  "), undefined);
});

test("does not filter unrelated names containing excluded substrings", () => {
  const text = "- regenerate_wiki: An unrelated tool\n- my_list_wiki_repos: An unrelated tool";
  assert.equal(filterUnavailableToolInstructions(text), text);
});
