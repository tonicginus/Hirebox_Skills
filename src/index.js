#!/usr/bin/env node

import {
  buildPortablePackage,
  getConfig,
  initWorkspace,
  installReleasedSkill,
  listReleasedSkills,
  syncAllPlatformSkills,
  syncCodexSkills,
  syncSkills,
  validateHireboxLibrary
} from "./lib.js";

function printHelp() {
  console.log(`
Hirebox Skill Manager

Terminal commands:
  init
  validate-library
  list-skills [platform]
  install-skill <skill-id> <codex|claude-code|gemini>
  sync-codex-skills
  sync-all-platform-skills
  sync-skills
  build-portable-package

Conversation intent mapping:
  \"Codex skills sync\"       -> sync-codex-skills
  \"All-platform skills sync\" -> sync-all-platform-skills
  \"Skills sync\"             -> sync-skills
`.trim());
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await initWorkspace();
    return;
  }

  const config = await getConfig();

  if (command === "validate-library") {
    const result = await validateHireboxLibrary(config);
    console.log(`Validated ${result.skillCount} canonical Codex source skills.`);
    return;
  }

  if (command === "list-skills") {
    const skills = await listReleasedSkills(config, args[0]);
    if (!skills.length) {
      console.log("No released Hirebox skills found.");
      return;
    }
    for (const skill of skills) {
      const variants = Object.keys(skill.platformPackages || {}).join(", ") || "codex";
      console.log(`${skill.name}  ${skill.sourceSkillVersion || skill.version}  ${variants}`);
    }
    return;
  }

  if (command === "install-skill") {
    const [skillId, platform] = args;
    if (!skillId || !platform) {
      throw new Error("Usage: install-skill <skill-id> <codex|claude-code|gemini>");
    }
    await installReleasedSkill(config, skillId, platform);
    return;
  }

  if (command === "sync-codex-skills") {
    await syncCodexSkills(config);
    return;
  }

  if (command === "sync-all-platform-skills") {
    await syncAllPlatformSkills(config);
    return;
  }

  if (command === "sync-skills") {
    await syncSkills(config);
    return;
  }

  if (command === "build-portable-package") {
    await buildPortablePackage(config);
    return;
  }

  throw new Error(`Unknown command: ${command}. Run with --help to see available commands.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
