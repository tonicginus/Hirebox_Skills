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
  hirebox 初始化
  hirebox 查看云端技能
  hirebox 查看本地技能
  hirebox 安装技能 <skill-name> [platform]
  hirebox 发布技能 <local-skill-path> [skill-name]
  hirebox 导入技能 <platform> <skill-name> [remote-name]
  hirebox 批量导入 <platform>
  hirebox 打包技能 <local-skill-path> [skill-name]
  hirebox 生成安装包
  hirebox 发布安装包
  hirebox 同步技能 [platform]
  hirebox 压缩包同步 [platform]

Examples:
  hirebox 初始化
  hirebox 安装技能 seo-writer codex
  hirebox 发布技能 C:\\skills\\my-skill seo-writer
  hirebox 导入技能 codex seo-writer
  hirebox 生成安装包
  hirebox 发布安装包
  hirebox 同步技能 claude
`.trim());
}

function normalizeArgs(args) {
  const [command, subcommand, ...rest] = args;
  const phrase = [command, subcommand].filter(Boolean).join(" ");

  const aliases = new Map([
    ["初始化", ["init"]],
    ["同步仓库", ["repo", "sync"]],
    ["查看云端技能", ["remote", "list"]],
    ["查看远程技能", ["remote", "list"]],
    ["查看本地技能", ["local", "list"]],
    ["安装技能", ["install", subcommand, ...rest]],
    ["发布技能", ["publish", subcommand, ...rest]],
    ["导入技能", ["import", subcommand, ...rest]],
    ["批量导入", ["import-all", subcommand, ...rest]],
    ["打包技能", ["archive", "build", subcommand, ...rest]],
    ["生成安装包", ["package", "self", "build"]],
    ["发布安装包", ["package", "self", "publish"]],
    ["同步技能", ["sync", subcommand, ...rest].filter(Boolean)],
    ["压缩包同步", ["sync", "archive", subcommand, ...rest].filter(Boolean)]
  ]);

  if (aliases.has(phrase)) {
    return aliases.get(phrase);
  }

  if (aliases.has(command)) {
    return aliases.get(command);
  }

  return args;
}

async function main() {
  const args = normalizeArgs(process.argv.slice(2));
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
