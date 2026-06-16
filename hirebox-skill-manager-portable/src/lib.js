import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rmdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const APP_DIR = ".hirebox-skill-manager";
const CONFIG_FILE = "config.json";
const REPO_DIR = "Hirebox_Skills";
const INDEX_FILE = "skills-index.json";
const SKILLS_DIRNAME = "skills";
const PACKAGES_DIRNAME = "packages";
const PORTABLE_PACKAGE_NAME = "hirebox-skill-manager-portable";

const defaultConfig = {
  github: {
    repository: "https://github.com/tonicginus/Hirebox_Skills.git",
    branch: "main"
  },
  localRepoDir: path.resolve(process.cwd(), APP_DIR, REPO_DIR),
  tempDir: path.resolve(process.cwd(), APP_DIR, "tmp"),
  platforms: {
    codex: {
      installDir: path.join(os.homedir(), ".codex", "skills")
    },
    claude: {
      installDir: path.join(os.homedir(), ".claude", "skills")
    },
    antigravity: {
      installDir: path.join(os.homedir(), ".antigravity", "skills")
    }
  }
};

export function ensureWorkspace() {
  if (!pathExistsSync(getConfigPath())) {
    throw new Error("Workspace not initialized. Run `node ./src/index.js init` first.");
  }
}

export async function initWorkspace() {
  await mkdir(path.resolve(process.cwd(), APP_DIR), { recursive: true });
  const configPath = getConfigPath();

  if (!pathExistsSync(configPath)) {
    await writeJson(configPath, defaultConfig);
  }

  await mkdir(defaultConfig.localRepoDir, { recursive: true });
  await mkdir(defaultConfig.tempDir, { recursive: true });

  for (const platform of Object.values(defaultConfig.platforms)) {
    await mkdir(platform.installDir, { recursive: true });
  }

  console.log(`Initialized Hirebox Skill Manager in ${path.resolve(process.cwd(), APP_DIR)}`);
  console.log(`Config: ${configPath}`);
}

export async function getConfig() {
  const config = await readJson(getConfigPath());

  return {
    ...defaultConfig,
    ...config,
    github: {
      ...defaultConfig.github,
      ...(config.github || {})
    },
    platforms: mergePlatforms(defaultConfig.platforms, config.platforms || {})
  };
}

export async function syncRepo(config) {
  await mkdir(path.dirname(config.localRepoDir), { recursive: true });

  if (!pathExistsSync(path.join(config.localRepoDir, ".git"))) {
    await runGit(["clone", "-b", config.github.branch, config.github.repository, config.localRepoDir], process.cwd());
    console.log(`Cloned ${config.github.repository}`);
    await ensureRepoLayout(config.localRepoDir);
    return;
  }

  await runGit(["-C", config.localRepoDir, "pull", "origin", config.github.branch], process.cwd());
  await ensureRepoLayout(config.localRepoDir);
  console.log(`Updated local repository: ${config.localRepoDir}`);
}

export async function listRemoteSkills(config) {
  await syncRepo(config);
  return readRemoteIndex(config);
}

export async function listInstalledSkills(config) {
  const results = [];

  for (const [platformName, platform] of Object.entries(config.platforms)) {
    if (!pathExistsSync(platform.installDir)) {
      continue;
    }

    const entries = await readdir(platform.installDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const skillDir = path.join(platform.installDir, entry.name);
      const manifest = await readManifestIfExists(skillDir);
      results.push({
        platform: platformName,
        name: manifest?.name || entry.name,
        version: manifest?.version || "unknown",
        path: skillDir,
        dependencies: normalizeDependencies(manifest?.dependencies || [])
      });
    }
  }

  return results;
}

export async function installSkill(config, skillName, targetPlatform, options = {}) {
  await syncRepo(config);
  const remoteIndex = await readRemoteIndex(config);
  const skill = findSkillByName(remoteIndex, skillName);
  if (!skill) {
    throw new Error(`Skill not found in repository: ${skillName}`);
  }

  const installed = new Set();
  await installSkillWithDependencies(config, skill, targetPlatform, options, remoteIndex, installed);
}

export async function publishSkill(config, localSkillPath, requestedName) {
  await syncRepo(config);
  const source = path.resolve(localSkillPath);
  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Local skill path does not exist or is not a directory: ${source}`);
  }

  const { record } = await stageSkillIntoRepo(config, source, requestedName, null);
  await commitAndPushRepo(config, `Publish skill: ${record.name}`);
  console.log(`Published ${record.name} to ${config.github.repository}`);
}

export async function syncAllPlatforms(config, targetPlatform, options = {}) {
  const remoteSkills = await listRemoteSkills(config);
  const filtered = targetPlatform
    ? remoteSkills.filter((skill) => skillSupportsPlatform(skill, targetPlatform))
    : remoteSkills;

  const installed = new Set();
  for (const skill of filtered) {
    await installSkillWithDependencies(config, skill, targetPlatform, options, remoteSkills, installed);
  }

  console.log(`Synchronized ${filtered.length} skills${targetPlatform ? ` for ${targetPlatform}` : ""}.`);
}

export async function importSkillFromPlatform(config, platformName, skillName, requestedName) {
  const platform = config.platforms[platformName];
  if (!platform) {
    throw new Error(`Unknown platform: ${platformName}`);
  }

  const sourceDir = path.join(platform.installDir, skillName);
  if (!pathExistsSync(sourceDir)) {
    throw new Error(`Skill not found in ${platformName}: ${sourceDir}`);
  }

  await syncRepo(config);
  const { record } = await stageSkillIntoRepo(config, sourceDir, requestedName, platformName);
  await commitAndPushRepo(config, `Import skill from ${platformName}: ${record.name}`);
  console.log(`Imported ${record.name} from ${platformName} and published to ${config.github.repository}`);
}

export async function importAllSkillsFromPlatform(config, platformName) {
  const platform = config.platforms[platformName];
  if (!platform) {
    throw new Error(`Unknown platform: ${platformName}`);
  }

  if (!pathExistsSync(platform.installDir)) {
    throw new Error(`Platform install directory does not exist: ${platform.installDir}`);
  }

  await syncRepo(config);
  const entries = await readdir(platform.installDir, { withFileTypes: true });
  const imported = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    const sourceDir = path.join(platform.installDir, entry.name);
    const { record } = await stageSkillIntoRepo(config, sourceDir, null, platformName);
    imported.push(record.name);
  }

  if (!imported.length) {
    console.log(`No importable skills found in ${platformName}.`);
    return;
  }

  await commitAndPushRepo(config, `Import ${imported.length} skills from ${platformName}`);
  console.log(`Imported ${imported.length} skills from ${platformName}: ${imported.join(", ")}`);
}

export async function buildSkillArchive(config, localSkillPath, requestedName) {
  ensureWorkspace();
  const source = path.resolve(localSkillPath);
  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Local skill path does not exist or is not a directory: ${source}`);
  }

  const manifest = await loadLocalManifest(source, requestedName);
  const archivePath = path.join(config.tempDir, `${manifest.name}-${manifest.version}.zip`);
  await rm(archivePath, { force: true });
  await zipDirectory(source, archivePath);
  console.log(`Built archive: ${archivePath}`);
}

export async function buildPortablePackage(config) {
  const distRoot = path.resolve(process.cwd(), "dist");
  const portableDir = path.join(distRoot, PORTABLE_PACKAGE_NAME);
  const archivePath = path.join(distRoot, `${PORTABLE_PACKAGE_NAME}.zip`);

  await rm(portableDir, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(portableDir, { recursive: true });

  const filesToCopy = [
    "package.json",
    "README.md",
    ".gitignore"
  ];

  for (const file of filesToCopy) {
    const sourcePath = path.resolve(process.cwd(), file);
    if (pathExistsSync(sourcePath)) {
      await cp(sourcePath, path.join(portableDir, file), { recursive: true });
    }
  }

  const directoriesToCopy = ["src", "example-skill"];
  for (const dir of directoriesToCopy) {
    const sourcePath = path.resolve(process.cwd(), dir);
    if (pathExistsSync(sourcePath)) {
      await cp(sourcePath, path.join(portableDir, dir), { recursive: true });
    }
  }

  await writeFile(path.join(portableDir, "hirebox.cmd"), "@echo off\r\nnode \"%~dp0src\\index.js\" %*\r\n", "utf8");
  await writeFile(path.join(portableDir, "hirebox.ps1"), "node \"$PSScriptRoot\\src\\index.js\" $args\n", "utf8");
  await writeFile(path.join(portableDir, "初始化.cmd"), "@echo off\r\nnode \"%~dp0src\\index.js\" 初始化\r\n", "utf8");
  await writeFile(path.join(portableDir, "查看云端技能.cmd"), "@echo off\r\nnode \"%~dp0src\\index.js\" 查看云端技能\r\n", "utf8");
  await writeFile(path.join(portableDir, "查看本地技能.cmd"), "@echo off\r\nnode \"%~dp0src\\index.js\" 查看本地技能\r\n", "utf8");
  await writeFile(path.join(portableDir, "同步技能.cmd"), "@echo off\r\nnode \"%~dp0src\\index.js\" 同步技能\r\n", "utf8");
  await writeFile(
    path.join(portableDir, "QUICKSTART.md"),
    [
      "# Hirebox Skill Manager",
      "",
      "## 环境要求",
      "",
      "- 电脑已安装 Node.js",
      "",
      "## 常用命令",
      "",
      "```powershell",
      ".\\初始化.cmd",
      ".\\查看云端技能.cmd",
      ".\\同步技能.cmd",
      "```",
      "",
      "需要指定技能名称或平台时，使用主命令：",
      "",
      "```powershell",
      ".\\hirebox.cmd 安装技能 seo-writer codex",
      ".\\hirebox.cmd 发布技能 C:\\skills\\seo-writer",
      "```",
      "",
      "## 安装包维护",
      "",
      "```powershell",
      ".\\hirebox.cmd 生成安装包",
      ".\\hirebox.cmd 发布安装包",
      "```"
    ].join("\n"),
    "utf8"
  );

  await zipDirectory(portableDir, archivePath);
  console.log(`Built portable package folder: ${portableDir}`);
  console.log(`Built portable package archive: ${archivePath}`);
}

export async function publishPortablePackage(config) {
  await buildPortablePackage(config);
  await syncRepo(config);

  const distRoot = path.resolve(process.cwd(), "dist");
  const portableDir = path.join(distRoot, PORTABLE_PACKAGE_NAME);
  const archivePath = path.join(distRoot, `${PORTABLE_PACKAGE_NAME}.zip`);
  const repoPackageDir = path.join(config.localRepoDir, PORTABLE_PACKAGE_NAME);
  const legacyToolDir = path.join(config.localRepoDir, "tools", PORTABLE_PACKAGE_NAME);

  await rm(legacyToolDir, { recursive: true, force: true });
  await removeDirectoryIfEmpty(path.dirname(legacyToolDir));
  await rm(repoPackageDir, { recursive: true, force: true });
  await rm(path.join(config.localRepoDir, `${PORTABLE_PACKAGE_NAME}.zip`), { force: true });
  await rm(path.join(config.localRepoDir, "tool.json"), { force: true });

  await cp(portableDir, repoPackageDir, { recursive: true });
  await cp(archivePath, path.join(config.localRepoDir, `${PORTABLE_PACKAGE_NAME}.zip`));

  await writeJson(path.join(config.localRepoDir, "tool.json"), {
    name: PORTABLE_PACKAGE_NAME,
    version: await readProjectVersion(),
    description: "Portable Hirebox Skill Manager package. Download and run with Node.js installed.",
    entrypoints: {
      windowsCmd: `${PORTABLE_PACKAGE_NAME}\\hirebox.cmd`,
      powershell: `${PORTABLE_PACKAGE_NAME}\\hirebox.ps1`,
      node: `${PORTABLE_PACKAGE_NAME}\\src\\index.js`
    },
    requirements: ["Node.js"],
    distribution: {
      mode: "portable",
      archive: `${PORTABLE_PACKAGE_NAME}.zip`
    }
  });

  await commitAndPushRepo(config, "Publish portable Hirebox Skill Manager package");
  console.log(`Published portable package to ${repoPackageDir}`);
}

async function installSkillWithDependencies(config, skill, targetPlatform, options, remoteIndex, installed) {
  if (installed.has(skill.name)) {
    return;
  }

  const dependencies = normalizeDependencies(skill.dependencies || []);
  for (const dependency of dependencies) {
    const dependencySkill = findSkillByName(remoteIndex, dependency.name);
    if (!dependencySkill) {
      throw new Error(`Dependency not found: ${dependency.name} required by ${skill.name}`);
    }
    await installSkillWithDependencies(config, dependencySkill, targetPlatform, options, remoteIndex, installed);
  }

  const sourceMode = options.archive ? "archive" : "auto";
  const platforms = targetPlatform ? [targetPlatform] : Object.keys(config.platforms);

  for (const platformName of platforms) {
    const platform = config.platforms[platformName];
    if (!platform) {
      throw new Error(`Unknown platform: ${platformName}`);
    }
    if (!skillSupportsPlatform(skill, platformName)) {
      continue;
    }

    const targetDir = path.join(platform.installDir, skill.name);
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(platform.installDir, { recursive: true });
    await installSkillPayload(config, skill, targetDir, sourceMode);
    console.log(`Installed ${skill.name} -> ${platformName} (${targetDir})`);
  }

  installed.add(skill.name);
}

async function installSkillPayload(config, skill, targetDir, sourceMode) {
  const skillDir = path.join(config.localRepoDir, SKILLS_DIRNAME, skill.name);
  const archivePath = getArchiveAbsolutePath(config, skill.archive?.path, skill.name, skill.version);

  if ((sourceMode === "archive" || sourceMode === "auto") && archivePath && pathExistsSync(archivePath)) {
    await unzipArchive(archivePath, targetDir);
    return;
  }

  if (pathExistsSync(skillDir)) {
    await cp(skillDir, targetDir, { recursive: true });
    return;
  }

  throw new Error(`No installable payload found for ${skill.name}`);
}

async function stageSkillIntoRepo(config, sourceDir, requestedName, sourcePlatform) {
  const manifest = await loadLocalManifest(sourceDir, requestedName);
  const skillRecord = buildSkillRecord(manifest, sourcePlatform);

  const targetDir = path.join(config.localRepoDir, SKILLS_DIRNAME, skillRecord.name);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
  await writeJson(path.join(targetDir, "skill.json"), manifest);

  const archiveRelativePath = path.posix.join(
    PACKAGES_DIRNAME,
    skillRecord.name,
    `${skillRecord.name}-${skillRecord.version}.zip`
  );
  const archiveAbsolutePath = path.join(config.localRepoDir, ...archiveRelativePath.split("/"));
  await mkdir(path.dirname(archiveAbsolutePath), { recursive: true });
  await rm(archiveAbsolutePath, { force: true });
  await zipDirectory(sourceDir, archiveAbsolutePath);

  skillRecord.archive = {
    path: archiveRelativePath,
    format: "zip"
  };

  const index = await readRemoteIndex(config);
  const filtered = index.filter((item) => item.name !== skillRecord.name);
  filtered.push(skillRecord);
  filtered.sort((a, b) => a.name.localeCompare(b.name, "en"));
  await writeJson(path.join(config.localRepoDir, INDEX_FILE), filtered);

  return { manifest, record: skillRecord };
}

async function commitAndPushRepo(config, message) {
  await runGit(["-C", config.localRepoDir, "add", "."], process.cwd());
  const status = await runGit(["-C", config.localRepoDir, "status", "--short"], process.cwd(), true);
  if (!status.stdout.trim()) {
    console.log("No changes to publish.");
    return;
  }

  await runGit(["-C", config.localRepoDir, "commit", "-m", message], process.cwd());
  await runGit(["-C", config.localRepoDir, "push", "origin", config.github.branch], process.cwd());
}

async function readRemoteIndex(config) {
  const indexPath = path.join(config.localRepoDir, INDEX_FILE);
  if (pathExistsSync(indexPath)) {
    return await readJson(indexPath);
  }

  const skillsDir = path.join(config.localRepoDir, SKILLS_DIRNAME);
  if (!pathExistsSync(skillsDir)) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const manifest = await readManifestIfExists(path.join(skillsDir, entry.name));
    if (!manifest) {
      continue;
    }

    results.push(buildSkillRecord(manifest, null));
  }

  return results;
}

async function readManifestIfExists(skillDir) {
  const manifestPath = path.join(skillDir, "skill.json");
  if (!pathExistsSync(manifestPath)) {
    return null;
  }

  return readJson(manifestPath);
}

async function loadLocalManifest(sourceDir, requestedName) {
  const manifestPath = path.join(sourceDir, "skill.json");
  const existing = pathExistsSync(manifestPath) ? await readJson(manifestPath) : {};
  const name = requestedName || existing.name || path.basename(sourceDir);

  return {
    ...existing,
    name,
    version: existing.version || "0.1.0",
    description: existing.description || "",
    platforms: Array.isArray(existing.platforms) && existing.platforms.length
      ? existing.platforms
      : ["codex", "claude", "antigravity"],
    dependencies: normalizeDependencies(existing.dependencies || [])
  };
}

function buildSkillRecord(manifest, sourcePlatform) {
  return {
    name: manifest.name,
    version: manifest.version || "0.1.0",
    description: manifest.description || "",
    platforms: manifest.platforms || ["codex", "claude", "antigravity"],
    dependencies: normalizeDependencies(manifest.dependencies || []),
    sourcePlatform: sourcePlatform || manifest.sourcePlatform || null,
    archive: manifest.archive || null
  };
}

function normalizeDependencies(dependencies) {
  if (!Array.isArray(dependencies)) {
    return [];
  }

  return dependencies
    .map((dependency) => {
      if (typeof dependency === "string") {
        return { name: dependency, version: "*" };
      }

      if (dependency && typeof dependency === "object" && dependency.name) {
        return {
          name: dependency.name,
          version: dependency.version || "*"
        };
      }

      return null;
    })
    .filter(Boolean);
}

function skillSupportsPlatform(skill, platformName) {
  return !Array.isArray(skill.platforms) || !skill.platforms.length || skill.platforms.includes(platformName);
}

function findSkillByName(index, skillName) {
  return index.find((skill) => skill.name === skillName);
}

function getArchiveAbsolutePath(config, archiveRelativePath, skillName, version) {
  if (archiveRelativePath) {
    return path.join(config.localRepoDir, ...archiveRelativePath.split("/"));
  }

  if (skillName && version) {
    return path.join(config.localRepoDir, PACKAGES_DIRNAME, skillName, `${skillName}-${version}.zip`);
  }

  return null;
}

async function ensureRepoLayout(repoDir) {
  await mkdir(path.join(repoDir, SKILLS_DIRNAME), { recursive: true });
  await mkdir(path.join(repoDir, PACKAGES_DIRNAME), { recursive: true });
}

async function zipDirectory(sourceDir, archivePath) {
  const parentDir = path.dirname(sourceDir);
  const folderName = path.basename(sourceDir);
  await mkdir(path.dirname(archivePath), { recursive: true });
  await execFileAsync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Compress-Archive",
      "-Path",
      folderName,
      "-DestinationPath",
      archivePath,
      "-Force"
    ],
    {
      cwd: parentDir,
      windowsHide: true
    }
  );
}

async function unzipArchive(archivePath, targetDir) {
  await mkdir(path.dirname(targetDir), { recursive: true });
  const stagingRoot = path.join(path.dirname(targetDir), `.tmp-${path.basename(targetDir)}-${Date.now()}`);
  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(stagingRoot, { recursive: true });

  await execFileAsync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Expand-Archive",
      "-LiteralPath",
      archivePath,
      "-DestinationPath",
      stagingRoot,
      "-Force"
    ],
    {
      windowsHide: true
    }
  );

  const entries = await readdir(stagingRoot, { withFileTypes: true });
  const innerDir = entries.length === 1 && entries[0].isDirectory()
    ? path.join(stagingRoot, entries[0].name)
    : stagingRoot;

  await cp(innerDir, targetDir, { recursive: true });
  await rm(stagingRoot, { recursive: true, force: true });
}

async function runGit(args, cwd, quiet = false) {
  try {
    const result = await execFileAsync("git", args, { cwd, windowsHide: true });
    if (!quiet && result.stdout?.trim()) {
      console.log(result.stdout.trim());
    }
    if (!quiet && result.stderr?.trim()) {
      console.log(result.stderr.trim());
    }
    return result;
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    const message = stderr || error.message;
    throw new Error(`Git command failed: git ${args.join(" ")}${message ? `\n${message}` : ""}`);
  }
}

function getConfigPath() {
  return path.resolve(process.cwd(), APP_DIR, CONFIG_FILE);
}

function pathExistsSync(targetPath) {
  return existsSync(targetPath);
}

function mergePlatforms(defaultPlatforms, customPlatforms) {
  const merged = { ...defaultPlatforms };
  for (const [name, value] of Object.entries(customPlatforms)) {
    merged[name] = {
      ...(defaultPlatforms[name] || {}),
      ...(value || {})
    };
  }
  return merged;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readProjectVersion() {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  if (!pathExistsSync(packageJsonPath)) {
    return "0.1.0";
  }

  const pkg = await readJson(packageJsonPath);
  return pkg.version || "0.1.0";
}

async function removeDirectoryIfEmpty(targetDir) {
  try {
    await rmdir(targetDir);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") {
      throw error;
    }
  }
}
