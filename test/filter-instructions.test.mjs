import test from "node:test";
import assert from "node:assert/strict";
import { filterDevinInstructions } from "../src/filter-instructions.mjs";

test("preserves DeepWiki guidance while removing Devin-only instructions", () => {
  const upstream = [
    "DeepWiki MCP provides AI-powered documentation for GitHub repositories.",
    "",
    "With a user OAuth token, all devin_* tools act in one organization: send X-Org-Id to switch.",
    "",
    "Available tools:",
    "- read_wiki_structure: Get documentation topics for a repository",
    "- read_wiki_contents: View documentation about a repository",
    "- ask_wiki_question: Ask questions about a repository",
    "- list_wiki_repos: Private mode only",
    "- devin_automation_manage: Manage Devin automations",
    "- devin_session_create: Create a Devin session",
    "- devin_find_setting: Find settings pages",
  ].join("\n");
  assert.equal(filterDevinInstructions(upstream), [
    "DeepWiki MCP provides AI-powered documentation for GitHub repositories.",
    "",
    "Available tools:",
    "- read_wiki_structure: Get documentation topics for a repository",
    "- read_wiki_contents: View documentation about a repository",
    "- ask_wiki_question: Ask questions about a repository",
    "- list_wiki_repos: Private mode only",
  ].join("\n"));
});

test("keeps unrelated instructions, handles CRLF and absent text", () => {
  const normal = "Use read_wiki_contents before ask_wiki_question.";
  assert.equal(filterDevinInstructions(normal), normal);
  assert.equal(filterDevinInstructions("Intro\r\n- devin_session_interact: Manage\r\n- read_wiki_structure: List"), "Intro\n- read_wiki_structure: List");
  assert.equal(filterDevinInstructions(undefined), undefined);
  assert.equal(filterDevinInstructions("  devin_session_create: do not use  "), undefined);
});
