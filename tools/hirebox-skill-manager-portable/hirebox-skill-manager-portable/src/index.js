#!/usr/bin/env node

import {
  buildPortablePackage,
  buildSkillArchive,
  ensureWorkspace,
  getConfig,
  importAllSkillsFromPlatform,
  importSkillFromPlatform,
  initWorkspace,
  installSkill,
  listInstalledSkills,
  listRemoteSkills,
  publishPortablePackage,
  publishSkill,
  syncAllPlatforms,
  syncRepo,
} from "./lib.js";

function printHelp() {
  console.log(`
Hirebox Skill Manager

Usage:
  hirebox-skill init
  hirebox-skill repo sync
  hirebox-skill remote list
  hirebox-skill local list
  hirebox-skill install <skill-name> [platform]
  hirebox-skill publish <local-skill-path> [skill-name]
  hirebox-skill import <platform> <skill-name> [remote-name]
  hirebox-skill import-all <platform>
  hirebox-skill archive build <local-skill-path> [skill-name]
  hirebox-skill package self build
  hirebox-skill package self publish
  hirebox-skill sync [platform]
  hirebox-skill sync archive [platform]

Examples:
  node ./src/index.js init
  node ./src/index.js install seo-writer codex
  node ./src/index.js publish C:\\skills\\my-skill seo-writer
  node ./src/index.js import codex seo-writer
  node ./src/index.js import-all claude
  node ./src/index.js archive build C:\\skills\\my-skill
  node ./src/index.js package self build
  node ./src/index.js package self publish
  node ./src/index.js sync claude
`.trim());
}

async function main() {
  const args = process.argv.slice(2);
  const [command, subcommand, ...rest] = args;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await initWorkspace();
    return;
  }

  ensureWorkspace();
  const config = await getConfig();

  if (command === "repo" && subcommand === "sync") {
    await syncRepo(config);
    return;
  }

  if (command === "remote" && subcommand === "list") {
    const skills = await listRemoteSkills(config);
    if (!skills.length) {
      console.log("No remote skills found.");
      return;
    }

    for (const skill of skills) {
      const deps = (skill.dependencies || []).map((item) => item.name).join(", ") || "-";
      const archive = skill.archive?.path ? "zip" : "dir";
      console.log(`${skill.name}  ${skill.version || "0.0.0"}  ${skill.platforms?.join(", ") || "generic"}  deps:${deps}  src:${archive}`);
    }
    return;
  }

  if (command === "local" && subcommand === "list") {
    const skills = await listInstalledSkills(config);
    if (!skills.length) {
      console.log("No installed skills found in configured platforms.");
      return;
    }

    for (const skill of skills) {
      const deps = skill.dependencies.map((item) => item.name).join(", ") || "-";
      console.log(`${skill.platform}  ${skill.name}  ${skill.version}  deps:${deps}  ${skill.path}`);
    }
    return;
  }

  if (command === "install") {
    const [skillName, platform] = [subcommand, rest[0]];
    if (!skillName) {
      throw new Error("Missing skill name. Usage: install <skill-name> [platform]");
    }
    await installSkill(config, skillName, platform);
    return;
  }

  if (command === "publish") {
    const [localPath, skillName] = [subcommand, rest[0]];
    if (!localPath) {
      throw new Error("Missing local skill path. Usage: publish <local-skill-path> [skill-name]");
    }
    await publishSkill(config, localPath, skillName);
    return;
  }

  if (command === "import") {
    const [platformName, skillName, remoteName] = [subcommand, rest[0], rest[1]];
    if (!platformName || !skillName) {
      throw new Error("Missing arguments. Usage: import <platform> <skill-name> [remote-name]");
    }
    await importSkillFromPlatform(config, platformName, skillName, remoteName);
    return;
  }

  if (command === "import-all") {
    const platformName = subcommand;
    if (!platformName) {
      throw new Error("Missing platform. Usage: import-all <platform>");
    }
    await importAllSkillsFromPlatform(config, platformName);
    return;
  }

  if (command === "archive" && subcommand === "build") {
    const [localPath, skillName] = rest;
    if (!localPath) {
      throw new Error("Missing local skill path. Usage: archive build <local-skill-path> [skill-name]");
    }
    await buildSkillArchive(config, localPath, skillName);
    return;
  }

  if (command === "package" && subcommand === "self") {
    const action = rest[0];
    if (action === "build") {
      await buildPortablePackage(config);
      return;
    }
    if (action === "publish") {
      await publishPortablePackage(config);
      return;
    }
    throw new Error("Unknown package self action. Usage: package self <build|publish>");
  }

  if (command === "sync") {
    if (subcommand === "archive") {
      await syncAllPlatforms(config, rest[0], { archive: true });
      return;
    }
    const platform = subcommand;
    await syncAllPlatforms(config, platform);
    return;
  }

  printHelp();
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
