import { existsSync } from "node:fs";
import {
  cp,
  chmod,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = ".hirebox-skill-manager";
const CONFIG_FILE = "config.json";
const INDEX_FILE = "skills-index.json";
const CHANGELOG_FILE = "SKILL_CHANGELOG.md";
const SKILLS_DIRNAME = "skills";
const PACKAGES_DIRNAME = "packages";
const PORTABLE_PACKAGE_NAME = "hirebox-skill-manager-portable";
const DISTRIBUTION_MARKER_FILE = "hirebox-distribution.json";
const HIREBOX_MARKER_FILE = ".hirebox-skill.json";
const IS_DISTRIBUTION_ROOT = existsSync(path.join(PROJECT_ROOT, DISTRIBUTION_MARKER_FILE));
const HIREBOX_KEYWORDS = ["hirebox", "海钡", "海钡人力"];
const HIREBOX_SKILL_NAME_PATTERN = /^hirebox-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const HIREBOX_INVOCATION_PATTERN = /\$([a-z0-9]+(?:-[a-z0-9]+)*)/gu;
const LEGACY_HIREBOX_SKILL_RENAMES = new Map([
  ["artifact-template-hirebox-eor", "hirebox-eor-employment-management-contract"],
  ["artifact-template-hirebox-recruitment", "hirebox-recruitment-headhunting-contract"]
]);

const defaultConfig = {
  skillRepositoryDir: PROJECT_ROOT,
  releaseRepositoryDir: IS_DISTRIBUTION_ROOT ? PROJECT_ROOT : path.join(PROJECT_ROOT, APP_DIR, "Hirebox_Skills"),
  github: {
    repository: "https://github.com/tonicginus/Hirebox_Skills.git",
    branch: "main"
  },
  tempDir: path.join(PROJECT_ROOT, APP_DIR, "tmp"),
  platforms: {
    codex: {
      installDir: path.join(os.homedir(), ".codex", "skills"),
      scanDirs: []
    },
    "claude-code": {
      installDir: path.join(os.homedir(), ".claude", "skills"),
      scanDirs: []
    },
    gemini: {
      installDir: path.join(os.homedir(), ".gemini", "skills"),
      scanDirs: []
    }
  }
};

export function ensureWorkspace() {
  if (!pathExistsSync(getConfigPath())) {
    throw new Error("Workspace not initialized. Run `node ./src/index.js init` first.");
  }
}

export async function initWorkspace() {
  await mkdir(path.join(PROJECT_ROOT, APP_DIR), { recursive: true });
  await ensureRepoLayout(PROJECT_ROOT);

  if (!pathExistsSync(getConfigPath())) {
    await writeJson(getConfigPath(), defaultConfig);
  } else {
    const existing = await readJson(getConfigPath());
    if (existing.localRepoDir && !existing.releaseRepositoryDir) {
      const { localRepoDir, ...withoutLegacyField } = existing;
      await writeJson(getConfigPath(), {
        ...withoutLegacyField,
        releaseRepositoryDir: localRepoDir
      });
      console.log("Migrated localRepoDir to releaseRepositoryDir.");
    }
  }

  const config = await getConfig();
  await mkdir(config.tempDir, { recursive: true });
  console.log(`Initialized Hirebox Skill Manager in ${path.join(PROJECT_ROOT, APP_DIR)}`);
  console.log(`Codex source directory: ${path.join(PROJECT_ROOT, SKILLS_DIRNAME)}`);
  console.log(`Release repository directory: ${config.releaseRepositoryDir}`);
}

export async function getConfig() {
  const config = await readJson(getConfigPath());
  const platforms = mergePlatforms(defaultConfig.platforms, config.platforms || {});
  const legacyReleaseRepositoryDir = config.localRepoDir || null;

  return {
    ...defaultConfig,
    ...config,
    skillRepositoryDir: config.skillRepositoryDir || defaultConfig.skillRepositoryDir,
    releaseRepositoryDir: config.releaseRepositoryDir || legacyReleaseRepositoryDir || defaultConfig.releaseRepositoryDir,
    platforms: normalizePlatformPaths(platforms)
  };
}

export async function syncRepo(config) {
  const repoDir = getSkillRepositoryDir(config);
  if (!await isInsideGitWorkTree(repoDir)) {
    throw new Error(`Skill repository is not a Git checkout: ${repoDir}`);
  }

  await runGit(["-C", repoDir, "pull", "--ff-only"], PROJECT_ROOT);
  await ensureRepoLayout(repoDir);
  console.log(`Updated shared skill repository: ${repoDir}`);
}

export function validateHireboxSkillName(name) {
  if (typeof name !== "string" || !HIREBOX_SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid Hirebox skill ID "${name || ""}". Use lowercase hirebox-* IDs, for example hirebox-eor-quotation.`
    );
  }
  return name;
}

export function validateHireboxDisplayName(displayName) {
  if (typeof displayName !== "string" || !displayName.startsWith("Hirebox ")) {
    throw new Error(
      `Invalid Hirebox display name "${displayName || ""}". It must start with the exact English brand spelling "Hirebox ".`
    );
  }
  if (/[^\x20-\x7e]/u.test(displayName)) {
    throw new Error(`Invalid Hirebox display name "${displayName}". Use English ASCII text only.`);
  }
  return displayName;
}

export async function validateHireboxSkillDirectory(skillDir, expectedName = null) {
  const resolvedDir = path.resolve(skillDir);
  const skillMdPath = path.join(resolvedDir, "SKILL.md");
  const manifestPath = path.join(resolvedDir, "skill.json");
  const openaiYamlPath = path.join(resolvedDir, "agents", "openai.yaml");
  const errors = [];
  let validatedDisplayName = "";

  if (!pathExistsSync(skillMdPath)) {
    errors.push("missing SKILL.md");
  }
  if (!pathExistsSync(openaiYamlPath)) {
    errors.push("missing agents/openai.yaml");
  }

  const skillText = pathExistsSync(skillMdPath) ? await readFile(skillMdPath, "utf8") : "";
  const frontmatter = parseFrontmatter(skillText);
  const manifest = pathExistsSync(manifestPath) ? await readJson(manifestPath) : null;
  const name = expectedName || manifest?.name || frontmatter.name || path.basename(resolvedDir);

  try {
    validateHireboxSkillName(name);
  } catch (error) {
    errors.push(error.message);
  }

  if (path.basename(resolvedDir) !== name) {
    errors.push(`directory name "${path.basename(resolvedDir)}" does not match skill ID "${name}"`);
  }
  if (frontmatter.name !== name) {
    errors.push(`SKILL.md name "${frontmatter.name || ""}" does not match skill ID "${name}"`);
  }
  if (manifest?.name && manifest.name !== name) {
    errors.push(`skill.json name "${manifest.name}" does not match skill ID "${name}"`);
  }

  if (pathExistsSync(openaiYamlPath)) {
    const openaiYaml = await readFile(openaiYamlPath, "utf8");
    const displayName = readYamlScalar(openaiYaml, "display_name");
    const defaultPrompt = readYamlScalar(openaiYaml, "default_prompt");
    validatedDisplayName = displayName;
    try {
      validateHireboxDisplayName(displayName);
    } catch (error) {
      errors.push(error.message);
    }

    const invocationTokens = [...defaultPrompt.matchAll(HIREBOX_INVOCATION_PATTERN)].map((match) => match[1]);
    const mismatchedTokens = invocationTokens.filter((token) => token !== name);
    if (mismatchedTokens.length) {
      errors.push(`default_prompt uses mismatched invocation token(s): ${mismatchedTokens.map((token) => `$${token}`).join(", ")}`);
    }
  }

  if (errors.length) {
    throw new Error(`Hirebox skill identity validation failed for ${resolvedDir}:\n- ${errors.join("\n- ")}`);
  }

  return { name, displayName: validatedDisplayName };
}

export async function validateHireboxLibrary(config, options = {}) {
  const repoDir = getSkillRepositoryDir(config);
  if (pathExistsSync(path.join(repoDir, DISTRIBUTION_MARKER_FILE))) {
    return validateReleaseLibrary(repoDir);
  }
  const index = await readRemoteIndex(config);
  const errors = [];
  const names = new Set();

  for (const skill of index) {
    try {
      validateHireboxSkillName(skill.name);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    if (names.has(skill.name)) {
      errors.push(`duplicate index entry: ${skill.name}`);
      continue;
    }
    names.add(skill.name);

    const sourceDir = path.join(repoDir, SKILLS_DIRNAME, skill.name);
    if (!pathExistsSync(sourceDir)) {
      errors.push(`missing source directory: ${path.relative(repoDir, sourceDir)}`);
    } else {
      try {
        await validateHireboxSkillDirectory(sourceDir, skill.name);
      } catch (error) {
        errors.push(error.message);
      }
    }

    const expectedArchivePath = path.posix.join(
      PACKAGES_DIRNAME,
      skill.name,
      `${skill.name}-${skill.version}.zip`
    );
    if (skill.archive?.path !== expectedArchivePath) {
      errors.push(`archive path for ${skill.name} must be ${expectedArchivePath}`);
    } else if (!pathExistsSync(path.join(repoDir, ...expectedArchivePath.split("/")))) {
      errors.push(`missing archive: ${expectedArchivePath}`);
    }
  }

  const skillsDir = path.join(repoDir, SKILLS_DIRNAME);
  if (pathExistsSync(skillsDir)) {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !names.has(entry.name) && !options.allowUnindexedSources) {
        errors.push(`source directory is not indexed: ${path.posix.join(SKILLS_DIRNAME, entry.name)}`);
      }
    }
  }

  for (const [legacyName, replacementName] of LEGACY_HIREBOX_SKILL_RENAMES) {
    if (!names.has(replacementName)) {
      errors.push(`legacy replacement target is not indexed: ${replacementName}`);
    }
    if (pathExistsSync(path.join(repoDir, SKILLS_DIRNAME, legacyName))) {
      errors.push(`legacy source directory is still active: ${path.posix.join(SKILLS_DIRNAME, legacyName)}`);
    }
    if (pathExistsSync(path.join(repoDir, PACKAGES_DIRNAME, legacyName))) {
      errors.push(`legacy package directory is still active: ${path.posix.join(PACKAGES_DIRNAME, legacyName)}`);
    }
  }

  if (errors.length) {
    throw new Error(`Hirebox library validation failed:\n- ${errors.join("\n- ")}`);
  }

  return { skillCount: index.length };
}

export async function removeLegacyHireboxSkillInstalls(config, requestedPlatformName = null) {
  const index = await readRemoteIndex(config);
  const activeNames = new Set(index.map((skill) => skill.name));
  const platforms = requestedPlatformName
    ? [resolvePlatform(config, requestedPlatformName)]
    : Object.entries(config.platforms);
  const removed = [];

  for (const [legacyName, replacementName] of LEGACY_HIREBOX_SKILL_RENAMES) {
    if (!activeNames.has(replacementName)) {
      continue;
    }

    for (const [platformName, platform] of platforms) {
      const legacyDir = path.join(platform.installDir, legacyName);
      if (!pathExistsSync(legacyDir)) {
        continue;
      }
      await rm(legacyDir, { recursive: true, force: true });
      removed.push({ platform: platformName, legacyName, replacementName, path: legacyDir });
      console.log(`Removed legacy ${legacyName}; replacement is ${replacementName} (${platformName}: ${legacyDir})`);
    }
  }

  return removed;
}

export async function hireboxSkillsSyncForPlatform(config, requestedPlatformName) {
  const [platformName] = resolvePlatform(config, normalizePlatformAlias(requestedPlatformName));
  const repoDir = getSkillRepositoryDir(config);
  const gitRoot = await getGitRoot(repoDir);
  const branch = await getCurrentBranch(gitRoot);
  const beforeStatus = await getGitStatus(gitRoot, repoDir);

  if (beforeStatus.trim()) {
    throw new Error([
      "Repository has uncommitted changes before sync.",
      "Commit, stash, or discard them before running the one-key sync so unrelated work is not published.",
      beforeStatus.trim()
    ].join("\n"));
  }

  console.log(`Starting Hirebox Skills Sync for ${platformName}.`);
  await runGit(["-C", gitRoot, "fetch", "origin", "--prune"], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "pull", "--ff-only"], PROJECT_ROOT);
  await validateHireboxLibrary(config);

  await collectHireboxSkills(config, platformName);
  await cleanupOldSkillArchives(config);
  await syncAllPlatforms(config, platformName);
  await buildPortablePackage(config);

  const afterStatus = await getGitStatus(gitRoot, repoDir);
  if (!afterStatus.trim()) {
    console.log("No shared skill changes to publish.");
    return;
  }

  await runGit(["-C", gitRoot, "add", "--", path.join(repoDir, SKILLS_DIRNAME)], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "add", "--", path.join(repoDir, PACKAGES_DIRNAME)], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "add", "--", path.join(repoDir, INDEX_FILE)], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "add", "--", path.join(repoDir, CHANGELOG_FILE)], PROJECT_ROOT);

  const stagedStatus = await runGit(
    ["-C", gitRoot, "diff", "--cached", "--name-only", "--", repoDir],
    PROJECT_ROOT,
    true
  );
  if (!stagedStatus.stdout.trim()) {
    console.log("No managed shared skill changes to publish.");
    return;
  }

  await runGit(["-C", gitRoot, "commit", "-m", `chore: sync Hirebox skills for ${platformName}`], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "push", "origin", branch], PROJECT_ROOT);
  console.log(`Published Hirebox skill updates to origin/${branch}.`);
}

export async function syncCodexSkills(config) {
  if (IS_DISTRIBUTION_ROOT) {
    throw new Error("Codex source synchronization must run from the Codex_Sync development workspace, not from a Hirebox_Skills clone.");
  }
  const sourceConfig = { ...config, skillRepositoryDir: PROJECT_ROOT };
  const gitRoot = await getGitRoot(PROJECT_ROOT);
  const branch = await getCurrentBranch(gitRoot);
  const scopedStatus = await getGitStatus(gitRoot, PROJECT_ROOT);

  if (scopedStatus.trim()) {
    throw new Error("Codex source project has uncommitted changes. Commit or resolve this project before syncing Codex skills.");
  }

  await runGit(["-C", gitRoot, "fetch", "origin", "--prune"], PROJECT_ROOT);
  await runGit(["-C", gitRoot, "pull", "--ff-only"], PROJECT_ROOT);
  await validateHireboxLibrary(sourceConfig);
  await collectHireboxSkills(sourceConfig, "codex");
  await validateHireboxLibrary(sourceConfig);
  await syncAllPlatforms(sourceConfig, "codex");

  const managedPaths = [
    path.join(PROJECT_ROOT, SKILLS_DIRNAME),
    path.join(PROJECT_ROOT, PACKAGES_DIRNAME),
    path.join(PROJECT_ROOT, INDEX_FILE),
    path.join(PROJECT_ROOT, CHANGELOG_FILE),
    path.join(PROJECT_ROOT, "README.md"),
    path.join(PROJECT_ROOT, "src")
  ];
  await runGit(["-C", gitRoot, "add", "--", ...managedPaths], PROJECT_ROOT);
  const staged = await runGit(["-C", gitRoot, "diff", "--cached", "--name-only", "--", PROJECT_ROOT], PROJECT_ROOT, true);
  if (staged.stdout.trim()) {
    await runGit(["-C", gitRoot, "commit", "-m", "chore: sync Codex Hirebox skills"], PROJECT_ROOT);
    await runGit(["-C", gitRoot, "push", "origin", branch], PROJECT_ROOT);
  }

  const sourceCommit = (await runGit(["-C", gitRoot, "rev-parse", "HEAD"], PROJECT_ROOT, true)).stdout.trim();
  console.log(`Codex skills are synchronized at ${sourceCommit}.`);
  return { sourceCommit };
}

export async function syncAllPlatformSkills(config) {
  if (IS_DISTRIBUTION_ROOT) {
    const releaseDir = await ensureReleaseRepository(config);
    await runGit(["-C", releaseDir, "pull", "--ff-only"], PROJECT_ROOT);
    const releaseConfig = { ...config, skillRepositoryDir: releaseDir };
    await validateHireboxLibrary(releaseConfig);
    for (const platformName of ["codex", "claude-code", "gemini"]) {
      await installAllReleasedSkills(releaseConfig, platformName);
    }
    console.log("Installed the current Hirebox_Skills release for all platforms.");
    return;
  }
  const sourceConfig = { ...config, skillRepositoryDir: PROJECT_ROOT };
  const sourceGitRoot = await getGitRoot(PROJECT_ROOT);
  const sourceStatus = await getGitStatus(sourceGitRoot, PROJECT_ROOT);
  if (sourceStatus.trim()) {
    throw new Error("Codex source project is not committed. Run sync-codex-skills before publishing all-platform packages.");
  }

  await validateHireboxLibrary(sourceConfig);
  const sourceCommit = (await runGit(["-C", sourceGitRoot, "rev-parse", "HEAD"], PROJECT_ROOT, true)).stdout.trim();
  const releaseDir = await ensureReleaseRepository(config);
  await runGit(["-C", releaseDir, "fetch", "origin", "--prune"], PROJECT_ROOT);
  await runGit(["-C", releaseDir, "pull", "--ff-only"], PROJECT_ROOT);
  await buildReleaseRepository(sourceConfig, releaseDir, sourceCommit);

  const releaseBranch = await getCurrentBranch(releaseDir);
  await runGit(["-C", releaseDir, "add", "-A"], PROJECT_ROOT);
  const staged = await runGit(["-C", releaseDir, "diff", "--cached", "--name-only"], PROJECT_ROOT, true);
  if (staged.stdout.trim()) {
    await runGit(["-C", releaseDir, "commit", "-m", "chore: publish Hirebox multi-platform skills"], PROJECT_ROOT);
    await runGit(["-C", releaseDir, "push", "origin", releaseBranch], PROJECT_ROOT);
  }

  const releaseConfig = { ...config, skillRepositoryDir: releaseDir };
  for (const platformName of ["codex", "claude-code", "gemini"]) {
    await installAllReleasedSkills(releaseConfig, platformName);
  }
  const releaseCommit = (await runGit(["-C", releaseDir, "rev-parse", "HEAD"], PROJECT_ROOT, true)).stdout.trim();
  console.log(`All-platform skills are synchronized at ${releaseCommit}.`);
  return { sourceCommit, releaseCommit };
}

export async function syncSkills(config) {
  if (IS_DISTRIBUTION_ROOT) {
    return syncAllPlatformSkills(config);
  }
  await syncCodexSkills(config);
  return syncAllPlatformSkills(config);
}

export async function listReleasedSkills(config, platformName = null) {
  const releaseDir = await ensureReleaseRepository(config);
  const index = await readReleaseIndex(releaseDir);
  const normalizedPlatform = platformName ? normalizePlatformAlias(platformName) : null;
  return normalizedPlatform
    ? index.filter((skill) => skill.platformPackages?.[normalizedPlatform])
    : index;
}

export async function installReleasedSkill(config, skillName, requestedPlatformName) {
  const releaseDir = await ensureReleaseRepository(config);
  const platformName = normalizePlatformAlias(requestedPlatformName);
  const releaseConfig = { ...config, skillRepositoryDir: releaseDir };
  const index = await readReleaseIndex(releaseDir);
  const skill = findSkillByName(index, skillName);
  if (!skill) {
    throw new Error(`Released Hirebox skill not found: ${skillName}`);
  }
  await installReleasedSkillWithDependencies(releaseConfig, skill, platformName, index, new Set());
}

export async function listRemoteSkills(config) {
  await validateHireboxLibrary(config);
  return readRemoteIndex(config);
}

export async function listInstalledSkills(config) {
  const results = [];

  for (const [platformName, platform] of Object.entries(config.platforms)) {
    for (const scanDir of await getPlatformScanDirs(platform)) {
      if (!pathExistsSync(scanDir)) {
        continue;
      }

      const entries = await readdir(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) {
          continue;
        }

        const skillDir = path.join(scanDir, entry.name);
        const manifest = await readManifestIfExists(skillDir);
        const marker = await readHireboxMarkerIfExists(skillDir);
        results.push({
          platform: platformName,
          name: manifest?.name || marker?.name || entry.name,
          version: manifest?.version || marker?.version || "unknown",
          path: skillDir,
          dependencies: normalizeDependencies(manifest?.dependencies || []),
          source: marker?.source === "hirebox" ? "Hirebox" : "Platform"
        });
      }
    }
  }

  return results;
}

export async function listPlatformSkills(config, requestedPlatformName) {
  const [platformName, platform] = resolvePlatform(config, requestedPlatformName);
  const scanDirs = await getPlatformScanDirs(platform);
  if (!scanDirs.some((scanDir) => pathExistsSync(scanDir))) {
    return {
      platform: platformName,
      installDir: platform.installDir,
      scanDirs,
      skills: []
    };
  }

  const remoteSkillNames = new Set((await readRemoteIndex(config)).map((skill) => skill.name));
  const skills = [];

  for (const scanDir of scanDirs) {
    if (!pathExistsSync(scanDir)) {
      continue;
    }

    const entries = await readdir(scanDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const skillDir = path.join(scanDir, entry.name);
      const manifest = await readManifestIfExists(skillDir);
      const marker = await readHireboxMarkerIfExists(skillDir);
      const name = manifest?.name || marker?.name || entry.name;
      const isHirebox = isHireboxSkill({ name, manifest, marker, remoteSkillNames });

      skills.push({
        platform: platformName,
        name,
        version: manifest?.version || marker?.version || "unknown",
        source: isHirebox ? "Hirebox" : "Platform",
        isHirebox,
        path: skillDir,
        dependencies: normalizeDependencies(manifest?.dependencies || [])
      });
    }
  }

  skills.sort((a, b) => {
    if (a.isHirebox !== b.isHirebox) {
      return a.isHirebox ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "en");
  });

  return {
    platform: platformName,
    installDir: platform.installDir,
    scanDirs,
    skills
  };
}

export async function installSkill(config, skillName, targetPlatform, options = {}) {
  await validateHireboxLibrary(config);
  await removeLegacyHireboxSkillInstalls(config, targetPlatform || null);
  const remoteIndex = await readRemoteIndex(config);
  const skill = findSkillByName(remoteIndex, skillName);
  if (!skill) {
    throw new Error(`Skill not found in shared repository: ${skillName}`);
  }

  const installed = new Set();
  await installSkillWithDependencies(config, skill, targetPlatform, options, remoteIndex, installed);
}

export async function publishSkill(config, localSkillPath, requestedName) {
  await validateHireboxLibrary(config, { allowUnindexedSources: true });
  const source = path.resolve(localSkillPath);
  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Local skill path does not exist or is not a directory: ${source}`);
  }

  const { record, previous, changed } = await stageSkillIntoRepo(config, source, requestedName, null);
  if (changed) {
    await appendChangelog(
      config,
      record,
      previous,
      "publish",
      `Published from ${await formatPortableSourcePath(config, source)}`
    );
    console.log(`Published ${record.name} ${record.version} into shared repository.`);
  } else {
    console.log(`No changes detected for ${record.name} ${record.version}.`);
  }
}

export async function retireSkill(config, skillName) {
  if (!skillName || path.basename(skillName) !== skillName || !skillName.toLowerCase().includes("hirebox")) {
    throw new Error("Refusing to retire a non-Hirebox or invalid skill name.");
  }

  const repoDir = getSkillRepositoryDir(config);
  const index = await readRemoteIndex(config);
  const previous = findSkillByName(index, skillName);
  const sourceDir = path.join(repoDir, SKILLS_DIRNAME, skillName);
  const packageDir = path.join(repoDir, PACKAGES_DIRNAME, skillName);

  if (!previous && !pathExistsSync(sourceDir) && !pathExistsSync(packageDir)) {
    throw new Error(`Hirebox skill not found for retirement: ${skillName}`);
  }

  await writeJson(path.join(repoDir, INDEX_FILE), index.filter((skill) => skill.name !== skillName));
  await rm(sourceDir, { recursive: true, force: true });
  await rm(packageDir, { recursive: true, force: true });

  for (const platform of Object.values(config.platforms)) {
    await rm(path.join(platform.installDir, skillName), { recursive: true, force: true });
  }

  console.log(`Retired ${skillName} from the shared library and configured platforms.`);
}

export async function cleanupOldSkillArchives(config, retentionDays = 30) {
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
    throw new Error("Archive retention days must be a positive integer.");
  }

  const repoDir = getSkillRepositoryDir(config);
  const packagesDir = path.join(repoDir, PACKAGES_DIRNAME);
  if (!pathExistsSync(packagesDir)) {
    console.log("No skill archives found to clean up.");
    return { removed: [], retained: [] };
  }

  const currentArchives = new Set(
    (await readRemoteIndex(config))
      .map((skill) => getArchiveAbsolutePath(config, skill.archive?.path, skill.name, skill.version))
      .filter(Boolean)
      .map((archivePath) => path.resolve(archivePath))
  );
  const changelogDates = await readChangelogDates(repoDir);
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const removed = [];
  const retained = [];
  const skillDirectories = await readdir(packagesDir, { withFileTypes: true });

  for (const skillDirectory of skillDirectories) {
    if (!skillDirectory.isDirectory()) {
      continue;
    }

    const skillName = skillDirectory.name;
    const skillPackageDir = path.join(packagesDir, skillName);
    const entries = await readdir(skillPackageDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".zip")) {
        continue;
      }

      const archivePath = path.join(skillPackageDir, entry.name);
      if (currentArchives.has(path.resolve(archivePath))) {
        retained.push(archivePath);
        continue;
      }

      const version = getArchiveVersion(skillName, entry.name);
      const recordedDate = version ? changelogDates.get(`${skillName}@${version}`) : null;
      const archiveDateMs = recordedDate?.getTime() ?? (await stat(archivePath)).mtimeMs;
      if (archiveDateMs < cutoffMs) {
        await rm(archivePath, { force: true });
        removed.push(archivePath);
      } else {
        retained.push(archivePath);
      }
    }

    const remainingEntries = await readdir(skillPackageDir);
    if (!remainingEntries.length) {
      await rm(skillPackageDir, { recursive: true, force: true });
    }
  }

  console.log(`Archive cleanup kept ${retained.length} archive(s) and removed ${removed.length} expired archive(s) older than ${retentionDays} day(s).`);
  return { removed, retained };
}

export async function collectHireboxSkills(config, platformName) {
  await validateHireboxLibrary(config);
  await removeLegacyHireboxSkillInstalls(config, platformName || null);
  const platforms = platformName ? [resolvePlatform(config, platformName)] : Object.entries(config.platforms);
  const remoteSkillNames = new Set((await readRemoteIndex(config)).map((skill) => skill.name));
  const imported = [];
  const skipped = [];

  for (const [resolvedName, platform] of platforms) {
    for (const scanDir of await getPlatformScanDirs(platform)) {
      if (!pathExistsSync(scanDir)) {
        skipped.push(`${resolvedName}: missing directory ${scanDir}`);
        continue;
      }

      const entries = await readdir(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) {
          continue;
        }

        const sourceDir = path.join(scanDir, entry.name);
        const manifest = await readManifestIfExists(sourceDir);
        const marker = await readHireboxMarkerIfExists(sourceDir);
        const name = manifest?.name || marker?.name || entry.name;
        if (!isHireboxSkill({ name, manifest, marker, remoteSkillNames })) {
          if (isPrivateArtifactTemplate(sourceDir)) {
            skipped.push(`${resolvedName}: ${entry.name} (unregistered private artifact template)`);
            continue;
          }
          skipped.push(`${resolvedName}: ${entry.name}`);
          continue;
        }

        await validateHireboxSkillDirectory(sourceDir, name);
        const { record, previous, changed, skippedReason } = await stageSkillIntoRepo(config, sourceDir, null, resolvedName, marker);
        if (changed) {
          await appendChangelog(
            config,
            record,
            previous,
            "collect",
            `Collected from ${resolvedName}:${await formatPortableSourcePath(config, sourceDir)}`
          );
          imported.push(`${record.name}@${record.version}`);
        } else if (skippedReason) {
          skipped.push(`${resolvedName}: ${entry.name} (${skippedReason})`);
        }
      }
    }
  }

  if (!imported.length) {
    console.log("No Hirebox skill changes were collected.");
  } else {
    console.log(`Collected Hirebox skills: ${imported.join(", ")}`);
  }

  if (skipped.length) {
    console.log(`Skipped non-Hirebox, unchanged, or unavailable entries: ${skipped.length}`);
  }
}

export async function syncAllPlatforms(config, targetPlatform, options = {}) {
  await validateHireboxLibrary(config);
  await removeLegacyHireboxSkillInstalls(config, targetPlatform || null);
  const remoteSkills = await readRemoteIndex(config);
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
  const [, platform] = resolvePlatform(config, platformName);
  const sourceDir = path.join(platform.installDir, skillName);
  if (!pathExistsSync(sourceDir)) {
    throw new Error(`Skill not found in ${platformName}: ${sourceDir}`);
  }

  const manifest = await readManifestIfExists(sourceDir);
  const marker = await readHireboxMarkerIfExists(sourceDir);
  const resolvedName = manifest?.name || marker?.name || skillName;
  if (!isHireboxSkill({ name: resolvedName, manifest, marker, remoteSkillNames: new Set() })) {
    throw new Error(`Refusing to import non-Hirebox skill: ${resolvedName}`);
  }

  const { record, previous, changed } = await stageSkillIntoRepo(config, sourceDir, requestedName, platformName, marker);
  if (changed) {
    await appendChangelog(
      config,
      record,
      previous,
      "import",
      `Imported from ${platformName}:${await formatPortableSourcePath(config, sourceDir)}`
    );
    console.log(`Imported ${record.name} ${record.version} from ${platformName}.`);
  } else {
    console.log(`No changes detected for ${record.name} ${record.version}.`);
  }
}

export async function importAllSkillsFromPlatform(config, platformName) {
  await collectHireboxSkills(config, platformName);
}

export async function buildSkillArchive(config, localSkillPath, requestedName) {
  ensureWorkspace();
  const source = path.resolve(localSkillPath);
  const sourceStat = await stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Local skill path does not exist or is not a directory: ${source}`);
  }

  const manifest = await loadLocalManifest(source, requestedName);
  await validateHireboxSkillDirectory(source, manifest.name);
  const archivePath = path.join(config.tempDir, `${manifest.name}-${manifest.version}.zip`);
  await rm(archivePath, { force: true });
  await zipDirectory(source, archivePath);
  console.log(`Built archive: ${archivePath}`);
}

export async function buildPortablePackage(config) {
  await validateHireboxLibrary(config);
  const distRoot = path.join(PROJECT_ROOT, "dist");
  const portableDir = path.join(distRoot, PORTABLE_PACKAGE_NAME);
  const archivePath = path.join(distRoot, `${PORTABLE_PACKAGE_NAME}.zip`);

  await rm(portableDir, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(portableDir, { recursive: true });

  const filesToCopy = ["package.json", "README.md", "skills-index.json", "SKILL_CHANGELOG.md", ".gitignore"];

  for (const file of filesToCopy) {
    const sourcePath = path.join(PROJECT_ROOT, file);
    if (pathExistsSync(sourcePath)) {
      await cp(sourcePath, path.join(portableDir, file), { recursive: true });
    }
  }

  const directoriesToCopy = ["src", "skills", "packages", "example-skill"];
  for (const dir of directoriesToCopy) {
    const sourcePath = path.join(PROJECT_ROOT, dir);
    if (pathExistsSync(sourcePath)) {
      await cp(sourcePath, path.join(portableDir, dir), { recursive: true });
    }
  }

  await writeReleaseLaunchers(portableDir);
  await writeFile(path.join(portableDir, "QUICKSTART.md"), [
    "# Hirebox Skill Manager",
    "",
    "Run English terminal commands only.",
    "",
    "```powershell",
    ".\\init.cmd",
    ".\\sync-skills.cmd",
    "```",
    "",
    "```sh",
    "./init.sh",
    "./sync-skills.sh",
    "```"
  ].join("\n"), "utf8");

  await zipDirectory(portableDir, archivePath);
  console.log(`Built portable package folder: ${portableDir}`);
  console.log(`Built portable package archive: ${archivePath}`);
}

export async function publishPortablePackage(config) {
  await buildPortablePackage(config);
  console.log("Portable package is ready in dist/. Commit and push this repository to publish it to team members.");
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
    const [, platform] = resolvePlatform(config, platformName);
    if (!skillSupportsPlatform(skill, platformName)) {
      continue;
    }

    const targetDir = path.join(platform.installDir, skill.name);
    await mkdir(platform.installDir, { recursive: true });
    await rm(targetDir, { recursive: true, force: true });
    await installSkillPayload(config, skill, targetDir, sourceMode);
    await writeInstallMarker(config, targetDir, skill, platformName);
    console.log(`Installed ${skill.name} ${skill.version || "unknown"} -> ${platformName} (${targetDir})`);
  }

  installed.add(skill.name);
}

async function installSkillPayload(config, skill, targetDir, sourceMode) {
  const repoDir = getSkillRepositoryDir(config);
  const skillDir = path.join(repoDir, SKILLS_DIRNAME, skill.name);
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

async function stageSkillIntoRepo(config, sourceDir, requestedName, sourcePlatform, marker = null) {
  const repoDir = getSkillRepositoryDir(config);
  await ensureRepoLayout(repoDir);

  const manifest = await loadLocalManifest(sourceDir, requestedName, sourcePlatform);
  if (!isHireboxSkill({ name: manifest.name, manifest, marker: null, remoteSkillNames: new Set() })) {
    throw new Error(`Refusing to publish non-Hirebox skill: ${manifest.name}`);
  }
  await validateHireboxSkillDirectory(sourceDir, manifest.name);

  const index = await readRemoteIndex(config);
  const previous = index.find((item) => item.name === manifest.name) || null;
  const localContentHash = await buildSkillContentHash(sourceDir, manifest);

  if (previous?.version === manifest.version && previous?.contentHash === localContentHash) {
    return { manifest, record: previous, previous, changed: false, skippedReason: "same version and content hash" };
  }

  if (previous?.contentHash === localContentHash && compareVersions(manifest.version, previous.version) <= 0) {
    return { manifest, record: previous, previous, changed: false, skippedReason: "same content hash with older or equal local version" };
  }

  if (isUnchangedInstalledSkill(marker, manifest, localContentHash)) {
    return { manifest, record: previous || buildSkillRecord(manifest, sourcePlatform), previous, changed: false, skippedReason: "local skill matches previous install marker" };
  }

  const mergedVersion = resolveMergedVersion(previous, manifest, localContentHash);
  const mergedManifest = {
    ...manifest,
    version: mergedVersion
  };
  const skillRecord = buildSkillRecord(mergedManifest, sourcePlatform);

  const targetDir = path.join(repoDir, SKILLS_DIRNAME, skillRecord.name);
  const archiveRelativePath = path.posix.join(
    PACKAGES_DIRNAME,
    skillRecord.name,
    `${skillRecord.name}-${skillRecord.version}.zip`
  );
  const archiveAbsolutePath = path.join(repoDir, ...archiveRelativePath.split("/"));

  const sourceIsTarget = await pathsReferToSameLocation(sourceDir, targetDir);
  if (!sourceIsTarget) {
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(path.dirname(targetDir), { recursive: true });
    const previousSkillDir = previous ? path.join(repoDir, SKILLS_DIRNAME, previous.name) : null;
    if (previousSkillDir && pathExistsSync(previousSkillDir)) {
      await cp(previousSkillDir, targetDir, { recursive: true, filter: shouldCopySkillFile });
    }
    await cp(sourceDir, targetDir, { recursive: true, filter: shouldCopySkillFile });
  }
  await writeJson(path.join(targetDir, "skill.json"), mergedManifest);
  skillRecord.contentHash = await buildSkillContentHash(targetDir, mergedManifest);

  await mkdir(path.dirname(archiveAbsolutePath), { recursive: true });
  await rm(archiveAbsolutePath, { force: true });
  await zipDirectory(targetDir, archiveAbsolutePath);

  skillRecord.archive = {
    path: archiveRelativePath,
    format: "zip"
  };

  const filtered = index.filter((item) => item.name !== skillRecord.name);
  filtered.push(skillRecord);
  filtered.sort((a, b) => a.name.localeCompare(b.name, "en"));
  await writeJson(path.join(repoDir, INDEX_FILE), filtered);

  return { manifest: mergedManifest, record: skillRecord, previous, changed: true };
}

async function readRemoteIndex(config) {
  const repoDir = getSkillRepositoryDir(config);
  const indexPath = path.join(repoDir, INDEX_FILE);
  if (pathExistsSync(indexPath)) {
    return await readJson(indexPath);
  }

  const skillsDir = path.join(repoDir, SKILLS_DIRNAME);
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

  results.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return results;
}

async function readChangelogDates(repoDir) {
  const changelogPath = path.join(repoDir, CHANGELOG_FILE);
  if (!pathExistsSync(changelogPath)) {
    return new Map();
  }

  const dates = new Map();
  const changelog = await readFile(changelogPath, "utf8");
  const entryPattern = /^## (\S+) - (\S+) (\d+\.\d+\.\d+)$/gmu;
  for (const match of changelog.matchAll(entryPattern)) {
    const date = new Date(match[1]);
    if (!Number.isNaN(date.getTime())) {
      dates.set(`${match[2]}@${match[3]}`, date);
    }
  }

  return dates;
}

function getArchiveVersion(skillName, archiveFileName) {
  const prefix = `${skillName}-`;
  const suffix = ".zip";
  if (!archiveFileName.startsWith(prefix) || !archiveFileName.endsWith(suffix)) {
    return null;
  }

  const version = archiveFileName.slice(prefix.length, -suffix.length);
  return /^\d+\.\d+\.\d+$/.test(version) ? version : null;
}

async function readManifestIfExists(skillDir) {
  const manifestPath = path.join(skillDir, "skill.json");
  if (pathExistsSync(manifestPath)) {
    return readJson(manifestPath);
  }

  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!pathExistsSync(skillMdPath)) {
    return null;
  }

  const text = await readFile(skillMdPath, "utf8");
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter.name && !frontmatter.description) {
    return null;
  }

  return {
    name: frontmatter.name || path.basename(skillDir),
    version: frontmatter.version || "0.1.0",
    description: frontmatter.description || "",
    platforms: frontmatter.platforms || ["codex"],
    dependencies: frontmatter.dependencies || []
  };
}

async function readHireboxMarkerIfExists(skillDir) {
  const markerPath = path.join(skillDir, HIREBOX_MARKER_FILE);
  if (!pathExistsSync(markerPath)) {
    return null;
  }
  return readJson(markerPath);
}

async function loadLocalManifest(sourceDir, requestedName, sourcePlatform) {
  const existing = await readManifestIfExists(sourceDir);
  const name = requestedName || existing?.name || path.basename(sourceDir);

  return {
    ...(existing || {}),
    name,
    version: existing?.version || "0.1.0",
    description: existing?.description || "",
    platforms: Array.isArray(existing?.platforms) && existing.platforms.length
      ? normalizePlatforms(existing.platforms)
      : [sourcePlatform || "codex"],
    dependencies: normalizeDependencies(existing?.dependencies || []),
    hirebox: true
  };
}

function buildSkillRecord(manifest, sourcePlatform) {
  return {
    name: manifest.name,
    version: manifest.version || "0.1.0",
    description: manifest.description || "",
    platforms: normalizePlatforms(manifest.platforms || ["codex"]),
    dependencies: normalizeDependencies(manifest.dependencies || []),
    sourcePlatform: sourcePlatform || manifest.sourcePlatform || null,
    archive: manifest.archive || null,
    updatedAt: new Date().toISOString()
  };
}

function isUnchangedInstalledSkill(marker, manifest, contentHash) {
  if (marker?.source !== "hirebox") {
    return false;
  }

  return marker.version === manifest.version && marker.contentHash === contentHash;
}

function resolveMergedVersion(previous, localManifest, localContentHash) {
  if (!previous) {
    return localManifest.version || "0.1.0";
  }

  if (compareVersions(localManifest.version, previous.version) > 0) {
    return localManifest.version;
  }

  if (previous.version === localManifest.version && previous.contentHash === localContentHash) {
    return localManifest.version;
  }

  return bumpPatchVersion(maxVersion(previous.version, localManifest.version));
}

function maxVersion(a, b) {
  return compareVersions(a, b) >= 0 ? a : b;
}

function compareVersions(a = "0.0.0", b = "0.0.0") {
  const left = parseVersion(a);
  const right = parseVersion(b);

  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1;
    }
  }

  return 0;
}

function parseVersion(version) {
  const match = `${version || "0.0.0"}`.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return [0, 0, 0];
  }

  return match.slice(1).map((item) => Number.parseInt(item, 10));
}

function bumpPatchVersion(version = "0.0.0") {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

async function buildSkillContentHash(sourceDir, manifest) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(normalizeManifestForContentHash(manifest)));
  const files = await listSkillFiles(sourceDir);

  for (const filePath of files) {
    const relativePath = path.relative(sourceDir, filePath).split(path.sep).join("/");
    hash.update(relativePath);
    if (relativePath === "skill.json") {
      const fileManifest = JSON.parse(await readFile(filePath, "utf8"));
      hash.update(JSON.stringify(normalizeManifestForContentHash(fileManifest)));
    } else {
      hash.update(await readFile(filePath));
    }
  }

  return hash.digest("hex");
}

function normalizeManifestForContentHash(manifest) {
  const {
    archive,
    contentHash,
    updatedAt,
    version,
    ...stableManifest
  } = manifest || {};

  return sortObject(stableManifest);
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(value[key]);
      return result;
    }, {});
}

async function listSkillFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (!shouldHashSkillFile(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await listSkillFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "en"));
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

function normalizePlatforms(platforms) {
  if (!Array.isArray(platforms)) {
    return [];
  }

  return platforms.map((platform) => `${platform}`.toLowerCase());
}

function skillSupportsPlatform(skill, platformName) {
  const normalized = platformName.toLowerCase();
  return !Array.isArray(skill.platforms) || !skill.platforms.length || skill.platforms.includes(normalized);
}

function findSkillByName(index, skillName) {
  return index.find((skill) => skill.name === skillName);
}

function isHireboxSkill({ name, manifest, marker, remoteSkillNames }) {
  if (marker?.source === "hirebox") {
    return true;
  }

  if (manifest?.hirebox === true) {
    return true;
  }

  const haystack = [
    name,
    manifest?.name,
    manifest?.description,
    manifest?.source,
    manifest?.publisher,
    manifest?.vendor,
    marker?.name
  ].filter(Boolean).join(" ").toLowerCase();

  if (HIREBOX_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return true;
  }

  return remoteSkillNames.has(name);
}

function isPrivateArtifactTemplate(skillDir) {
  return pathExistsSync(path.join(skillDir, "artifact-template.json"));
}

async function ensureReleaseRepository(config) {
  const releaseDir = path.resolve(config.releaseRepositoryDir);
  if (!pathExistsSync(path.join(releaseDir, ".git"))) {
    await mkdir(path.dirname(releaseDir), { recursive: true });
    await runGit(["clone", config.github.repository, releaseDir], PROJECT_ROOT);
  }

  const remote = (await runGit(["-C", releaseDir, "remote", "get-url", "origin"], PROJECT_ROOT, true)).stdout.trim();
  if (normalizeRepositoryUrl(remote) !== normalizeRepositoryUrl(config.github.repository)) {
    throw new Error(`Release repository remote must be ${config.github.repository}, received ${remote || "none"}.`);
  }
  return releaseDir;
}

async function buildReleaseRepository(sourceConfig, releaseDir, sourceCommit) {
  const sourceIndex = await readRemoteIndex(sourceConfig);
  await rm(path.join(releaseDir, SKILLS_DIRNAME), { recursive: true, force: true });
  await rm(path.join(releaseDir, PACKAGES_DIRNAME), { recursive: true, force: true });
  await rm(path.join(releaseDir, PORTABLE_PACKAGE_NAME), { recursive: true, force: true });
  await rm(path.join(releaseDir, `${PORTABLE_PACKAGE_NAME}.zip`), { force: true });
  await rm(path.join(releaseDir, "tool.json"), { force: true });
  await mkdir(path.join(releaseDir, SKILLS_DIRNAME), { recursive: true });
  await mkdir(path.join(releaseDir, PACKAGES_DIRNAME), { recursive: true });

  const releaseIndex = [];
  for (const sourceSkill of sourceIndex) {
    const sourceDir = path.join(getSkillRepositoryDir(sourceConfig), SKILLS_DIRNAME, sourceSkill.name);
    const platformPackages = {};
    for (const platformName of ["codex", "claude-code", "gemini"]) {
      const variantDir = path.join(releaseDir, SKILLS_DIRNAME, sourceSkill.name, platformName);
      await cp(sourceDir, variantDir, { recursive: true, filter: shouldCopySkillFile });
      if (platformName !== "codex") {
        await rm(path.join(variantDir, "agents"), { recursive: true, force: true });
      }

      const manifestPath = path.join(variantDir, "skill.json");
      const manifest = await readJson(manifestPath);
      await writeJson(manifestPath, {
        ...manifest,
        version: sourceSkill.version,
        platforms: [platformName],
        sourceSkillVersion: sourceSkill.version,
        sourcePlatform: "codex"
      });

      const archiveRelativePath = path.posix.join(
        PACKAGES_DIRNAME,
        sourceSkill.name,
        `${sourceSkill.name}-${sourceSkill.version}-${platformName}.zip`
      );
      const archiveAbsolutePath = path.join(releaseDir, ...archiveRelativePath.split("/"));
      await zipDirectory(variantDir, archiveAbsolutePath);
      platformPackages[platformName] = {
        version: sourceSkill.version,
        path: archiveRelativePath,
        format: "zip",
        contentHash: await buildSkillContentHash(variantDir, await readJson(manifestPath))
      };
    }

    releaseIndex.push({
      ...sourceSkill,
      version: sourceSkill.version,
      sourceSkillVersion: sourceSkill.version,
      source: {
        repository: "Codex_Sync",
        commit: sourceCommit,
        contentHash: sourceSkill.contentHash || null
      },
      platforms: ["codex", "claude-code", "gemini"],
      platformPackages,
      archive: platformPackages.codex
    });
  }

  await writeJson(path.join(releaseDir, INDEX_FILE), releaseIndex);
  await writeJson(path.join(releaseDir, DISTRIBUTION_MARKER_FILE), {
    formatVersion: 1,
    sourceRepository: "Codex_Sync",
    sourceCommit,
    generatedAt: new Date().toISOString(),
    platforms: ["codex", "claude-code", "gemini"]
  });
  await cp(path.join(PROJECT_ROOT, "src"), path.join(releaseDir, "src"), { recursive: true });
  await cp(path.join(PROJECT_ROOT, "package.json"), path.join(releaseDir, "package.json"));
  await writeFile(path.join(releaseDir, ".gitignore"), `${APP_DIR}/\n`, "utf8");
  await writeReleaseLaunchers(releaseDir);
  await writeFile(path.join(releaseDir, "README.md"), buildReleaseReadme(releaseIndex), "utf8");
  await buildReleasePortableArchive(releaseDir);
}

async function readReleaseIndex(releaseDir) {
  const indexPath = path.join(releaseDir, INDEX_FILE);
  if (!pathExistsSync(indexPath)) {
    return [];
  }
  const index = await readJson(indexPath);
  for (const skill of index) {
    validateHireboxSkillName(skill.name);
    if (!skill.sourceSkillVersion || skill.sourceSkillVersion !== skill.version) {
      throw new Error(`Released version tracking mismatch for ${skill.name}. Run sync-codex-skills before publishing.`);
    }
  }
  return index;
}

async function validateReleaseLibrary(releaseDir) {
  const index = await readReleaseIndex(releaseDir);
  const errors = [];
  for (const skill of index) {
    for (const platformName of ["codex", "claude-code", "gemini"]) {
      const packageInfo = skill.platformPackages?.[platformName];
      const variantDir = path.join(releaseDir, SKILLS_DIRNAME, skill.name, platformName);
      if (!packageInfo?.path || packageInfo.version !== skill.sourceSkillVersion) {
        errors.push(`invalid ${platformName} package metadata for ${skill.name}`);
        continue;
      }
      if (!pathExistsSync(path.join(releaseDir, ...packageInfo.path.split("/")))) {
        errors.push(`missing ${platformName} package for ${skill.name}`);
      }
      if (!pathExistsSync(path.join(variantDir, "SKILL.md"))) {
        errors.push(`missing ${platformName} skill directory for ${skill.name}`);
      }
    }
  }
  if (errors.length) {
    throw new Error(`Hirebox distribution validation failed:\n- ${errors.join("\n- ")}`);
  }
  return { skillCount: index.length };
}

async function installAllReleasedSkills(config, platformName) {
  const index = await readReleaseIndex(getSkillRepositoryDir(config));
  for (const skill of index) {
    await installReleasedSkillWithDependencies(config, skill, platformName, index, new Set());
  }
}

async function installReleasedSkillWithDependencies(config, skill, platformName, index, installed) {
  if (installed.has(skill.name)) {
    return;
  }
  for (const dependency of normalizeDependencies(skill.dependencies || [])) {
    const dependencySkill = findSkillByName(index, dependency.name);
    if (!dependencySkill) {
      throw new Error(`Dependency not found: ${dependency.name} required by ${skill.name}`);
    }
    await installReleasedSkillWithDependencies(config, dependencySkill, platformName, index, installed);
  }

  const packageInfo = skill.platformPackages?.[platformName];
  if (!packageInfo?.path) {
    throw new Error(`No ${platformName} package is released for ${skill.name}.`);
  }
  const [, platform] = resolvePlatform(config, platformName);
  const archivePath = path.join(getSkillRepositoryDir(config), ...packageInfo.path.split("/"));
  if (!pathExistsSync(archivePath)) {
    throw new Error(`Released package is missing: ${packageInfo.path}`);
  }
  const targetDir = path.join(platform.installDir, skill.name);
  await rm(targetDir, { recursive: true, force: true });
  await unzipArchive(archivePath, targetDir);
  await writeInstallMarker(config, targetDir, {
    ...skill,
    version: skill.sourceSkillVersion,
    contentHash: packageInfo.contentHash
  }, platformName);
  installed.add(skill.name);
  console.log(`Installed ${skill.name} ${skill.sourceSkillVersion} -> ${platformName}.`);
}

async function writeReleaseLaunchers(releaseDir) {
  const commands = [
    ["init", "init"],
    ["list-skills", "list-skills"],
    ["validate-library", "validate-library"],
    ["sync-codex-skills", "sync-codex-skills"],
    ["sync-all-platform-skills", "sync-all-platform-skills"],
    ["sync-skills", "sync-skills"]
  ];
  for (const [name, command] of commands) {
    await writeFile(path.join(releaseDir, `${name}.cmd`), `@echo off\r\nnode "%~dp0src\\index.js" ${command} %*\r\n`, "utf8");
    await writeFile(path.join(releaseDir, `${name}.ps1`), `node "$PSScriptRoot/src/index.js" ${command} @args\n`, "utf8");
    await writeExecutable(path.join(releaseDir, `${name}.sh`), `#!/usr/bin/env sh\nnode "$(dirname "$0")/src/index.js" ${command} "$@"\n`);
  }
}

async function buildReleasePortableArchive(releaseDir) {
  const stagingDir = path.join(path.dirname(releaseDir), `${PORTABLE_PACKAGE_NAME}-staging`);
  const archivePath = path.join(releaseDir, `${PORTABLE_PACKAGE_NAME}.zip`);
  await rm(stagingDir, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(stagingDir, { recursive: true });
  for (const entry of ["src", SKILLS_DIRNAME, PACKAGES_DIRNAME, INDEX_FILE, DISTRIBUTION_MARKER_FILE, "README.md", "package.json"]) {
    const source = path.join(releaseDir, entry);
    if (pathExistsSync(source)) {
      await cp(source, path.join(stagingDir, entry), { recursive: true });
    }
  }
  for (const entry of await readdir(releaseDir)) {
    if (/^(init|list-skills|validate-library|sync-codex-skills|sync-all-platform-skills|sync-skills)\.(cmd|ps1|sh)$/u.test(entry)) {
      await cp(path.join(releaseDir, entry), path.join(stagingDir, entry));
    }
  }
  await zipDirectory(stagingDir, archivePath);
  await rm(stagingDir, { recursive: true, force: true });
}

function buildReleaseReadme(index) {
  const skillRows = index.map((skill) => `| ${skill.name} | ${skill.sourceSkillVersion} | Codex, Claude Code, Gemini |`).join("\n");
  return `# Hirebox Skills\n\nThis repository distributes Hirebox custom skills for Codex, Claude Code, and Gemini CLI. Node.js and Git are required.\n\n## Install\n\nClone this repository, then run the launcher for your operating system.\n\n\`\`\`powershell\n.\\init.cmd\n.\\list-skills.cmd\nnode .\\src\\index.js install-skill hirebox-invoice-template gemini\n.\\sync-all-platform-skills.cmd\n\`\`\`\n\n\`\`\`sh\n./init.sh\n./list-skills.sh\nnode ./src/index.js install-skill hirebox-invoice-template gemini\n./sync-all-platform-skills.sh\n\`\`\`\n\n## Synchronization\n\nThis clone is a distribution client: \`sync-all-platform-skills\` pulls the current release and installs Codex, Claude Code, and Gemini packages.\n\n\`sync-codex-skills\` and \`sync-skills\` are development-workspace commands. Run them only from the Codex_Sync copy of the Hirebox Skill Manager.\n\n## Released Skills\n\n| Skill | Source version | Platforms |\n| --- | --- | --- |\n${skillRows}\n\nEvery released package retains the Codex source version, content hash, and source commit in \`skills-index.json\`.\n`;
}

function normalizeRepositoryUrl(value) {
  return `${value || ""}`.trim().replace(/\.git$/u, "").replace(/\/$/u, "").toLowerCase();
}

async function writeInstallMarker(config, targetDir, skill, platformName) {
  await writeJson(path.join(targetDir, HIREBOX_MARKER_FILE), {
    source: "hirebox",
    repository: getSkillRepositoryDir(config),
    platform: platformName,
    name: skill.name,
    version: skill.version || "unknown",
    contentHash: skill.contentHash || null,
    installedAt: new Date().toISOString()
  });
}

function getArchiveAbsolutePath(config, archiveRelativePath, skillName, version) {
  const repoDir = getSkillRepositoryDir(config);
  if (archiveRelativePath) {
    return path.join(repoDir, ...archiveRelativePath.split("/"));
  }

  if (skillName && version) {
    return path.join(repoDir, PACKAGES_DIRNAME, skillName, `${skillName}-${version}.zip`);
  }

  return null;
}

async function ensureRepoLayout(repoDir) {
  await mkdir(path.join(repoDir, SKILLS_DIRNAME), { recursive: true });
  await mkdir(path.join(repoDir, PACKAGES_DIRNAME), { recursive: true });
}

async function appendChangelog(config, record, previous, action, detail) {
  const repoDir = getSkillRepositoryDir(config);
  const changelogPath = path.join(repoDir, CHANGELOG_FILE);
  const previousVersion = previous?.version || "none";
  const header = "# Hirebox Skill Changelog";
  const line = [
    `## ${new Date().toISOString()} - ${record.name} ${record.version}`,
    "",
    `- Action: ${action}`,
    `- Previous version: ${previousVersion}`,
    `- Current version: ${record.version}`,
    `- Content hash: ${record.contentHash || "unknown"}`,
    `- Source: ${detail}`,
    ""
  ].join("\n");

  const existing = pathExistsSync(changelogPath) ? await readFile(changelogPath, "utf8") : "";
  const body = existing.replace(/^# Hirebox Skill Changelog\s*/u, "").trim();
  await writeFile(changelogPath, `${header}\n\n${line}${body ? `\n${body}\n` : ""}`, "utf8");
}

function shouldCopySkillFile(source) {
  const basename = path.basename(source);
  if (basename === "__pycache__" || basename === ".DS_Store" || basename === HIREBOX_MARKER_FILE) {
    return false;
  }

  if (basename.endsWith(".pyc") || basename.endsWith(".pyo")) {
    return false;
  }

  return true;
}

function shouldHashSkillFile(source) {
  return shouldCopySkillFile(source) && path.basename(source) !== "skill.json";
}

async function zipDirectory(sourceDir, archivePath) {
  const parentDir = path.dirname(sourceDir);
  const folderName = path.basename(sourceDir);
  await mkdir(path.dirname(archivePath), { recursive: true });

  if (process.platform !== "win32") {
    await zipDirectoryOnUnix(parentDir, folderName, archivePath);
    return;
  }

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

  if (process.platform === "win32") {
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
  } else {
    await unzipArchiveOnUnix(archivePath, stagingRoot);
  }

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

async function isInsideGitWorkTree(repoDir) {
  try {
    const result = await execFileAsync("git", ["-C", repoDir, "rev-parse", "--is-inside-work-tree"], {
      cwd: PROJECT_ROOT,
      windowsHide: true
    });
    return result.stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function getGitRoot(repoDir) {
  const result = await runGit(["-C", repoDir, "rev-parse", "--show-toplevel"], PROJECT_ROOT, true);
  return result.stdout.trim();
}

async function getCurrentBranch(gitRoot) {
  const result = await runGit(["-C", gitRoot, "branch", "--show-current"], PROJECT_ROOT, true);
  const branch = result.stdout.trim();
  if (!branch) {
    throw new Error("Cannot publish from a detached HEAD checkout.");
  }
  return branch;
}

async function getGitStatus(gitRoot, repoDir) {
  const result = await runGit(["-C", gitRoot, "status", "--short", "--", repoDir], PROJECT_ROOT, true);
  return result.stdout;
}

async function unzipArchiveOnUnix(archivePath, destinationDir) {
  const attempts = [
    ["unzip", ["-q", archivePath, "-d", destinationDir]],
    ["bsdtar", ["-xf", archivePath, "-C", destinationDir]],
    ["ditto", ["-x", "-k", archivePath, destinationDir]]
  ];

  for (const [command, args] of attempts) {
    try {
      await execFileAsync(command, args, { windowsHide: true });
      return;
    } catch {
      // Try the next common archive tool available on Unix-like systems.
    }
  }

  throw new Error("Unable to extract zip archive. Please install unzip, bsdtar, or ditto.");
}

async function zipDirectoryOnUnix(parentDir, folderName, archivePath) {
  const attempts = [
    ["zip", ["-qr", archivePath, folderName]],
    ["ditto", ["-c", "-k", "--keepParent", folderName, archivePath]],
    ["bsdtar", ["-a", "-cf", archivePath, folderName]]
  ];

  for (const [command, args] of attempts) {
    try {
      await execFileAsync(command, args, {
        cwd: parentDir,
        windowsHide: true
      });
      return;
    } catch {
      // Try the next common archive tool available on Unix-like systems.
    }
  }

  throw new Error("Unable to create zip archive. Please install zip, ditto, or bsdtar.");
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return {};
  }

  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return {};
  }

  const frontmatter = text.slice(3, end).trim().split(/\r?\n/);
  const result = {};

  for (const line of frontmatter) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    result[key] = stripYamlString(rawValue);
  }

  return result;
}

function stripYamlString(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readYamlScalar(text, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = text.match(new RegExp(`^\\s*${escapedKey}:\\s*(.*)$`, "mu"));
  return match ? stripYamlString(match[1]) : "";
}

async function pathsReferToSameLocation(firstPath, secondPath) {
  if (!pathExistsSync(firstPath) || !pathExistsSync(secondPath)) {
    return false;
  }

  const [firstRealPath, secondRealPath] = await Promise.all([
    realpath(firstPath),
    realpath(secondPath)
  ]);
  return process.platform === "win32"
    ? firstRealPath.toLowerCase() === secondRealPath.toLowerCase()
    : firstRealPath === secondRealPath;
}

async function formatPortableSourcePath(config, sourcePath) {
  const sourceRealPath = pathExistsSync(sourcePath) ? await realpath(sourcePath) : path.resolve(sourcePath);
  const repoDir = getSkillRepositoryDir(config);
  const repoRealPath = pathExistsSync(repoDir) ? await realpath(repoDir) : path.resolve(repoDir);
  const repoRelativePath = path.relative(repoRealPath, sourceRealPath);

  if (isPathInside(repoRelativePath)) {
    return repoRelativePath.split(path.sep).join("/");
  }

  const homeRelativePath = path.relative(os.homedir(), sourceRealPath);
  if (isPathInside(homeRelativePath)) {
    return `~/${homeRelativePath.split(path.sep).join("/")}`;
  }

  return `<external-source>/${path.basename(sourceRealPath)}`;
}

function isPathInside(relativePath) {
  return relativePath !== ""
    ? !relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath)
    : true;
}

async function getPlatformScanDirs(platform) {
  const candidates = [
    platform.installDir,
    ...(Array.isArray(platform.scanDirs) ? platform.scanDirs : [])
  ].filter(Boolean);
  const unique = new Map();

  for (const candidate of candidates) {
    const resolved = resolveConfiguredDirectory(candidate);
    const comparisonPath = pathExistsSync(resolved) ? await realpath(resolved) : resolved;
    const key = process.platform === "win32" ? comparisonPath.toLowerCase() : comparisonPath;
    if (!unique.has(key)) {
      unique.set(key, resolved);
    }
  }

  return [...unique.values()];
}

function resolveConfiguredDirectory(configuredPath) {
  if (configuredPath === "~") {
    return os.homedir();
  }
  if (configuredPath.startsWith(`~${path.sep}`) || configuredPath.startsWith("~/")) {
    return path.join(os.homedir(), configuredPath.slice(2));
  }
  return path.resolve(configuredPath);
}

function normalizePlatformPaths(platforms) {
  return Object.fromEntries(Object.entries(platforms).map(([name, platform]) => [
    name,
    {
      ...platform,
      installDir: resolveConfiguredDirectory(platform.installDir),
      scanDirs: Array.isArray(platform.scanDirs)
        ? platform.scanDirs.map((scanDir) => resolveConfiguredDirectory(scanDir))
        : []
    }
  ]));
}

function getConfigPath() {
  return path.join(PROJECT_ROOT, APP_DIR, CONFIG_FILE);
}

function getSkillRepositoryDir(config) {
  return path.resolve(config.skillRepositoryDir || PROJECT_ROOT);
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

function resolvePlatform(config, requestedPlatformName) {
  if (!requestedPlatformName) {
    throw new Error("Missing platform. Usage: search <platform>");
  }

  const normalized = normalizePlatformAlias(requestedPlatformName);
  const entry = Object.entries(config.platforms).find(([name]) => name.toLowerCase() === normalized);
  if (!entry) {
    throw new Error(`Unknown platform: ${requestedPlatformName}`);
  }

  return entry;
}

function normalizePlatformAlias(platformName) {
  const normalized = `${platformName}`.toLowerCase();
  if (normalized === "claude") {
    return "claude-code";
  }
  if (normalized === "gemini-cli") {
    return "gemini";
  }
  if (normalized === "anti-gravity") {
    return "antigravity";
  }
  return normalized;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeExecutable(filePath, content) {
  await writeFile(filePath, content, {
    encoding: "utf8",
    mode: 0o755
  });
  if (process.platform !== "win32") {
    await chmod(filePath, 0o755);
  }
}
