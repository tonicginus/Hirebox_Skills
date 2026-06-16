# Hirebox_Skills

`Hirebox_Skills` 是海钡 Agent 定制 Skill 的 GitHub 同步仓库，用来在 Windows、macOS、Linux 的不同电脑和不同 Agent 平台之间分发、安装和同步技能。

当前仓库包含：

- `hirebox-skill-manager-portable.zip`: 海钡 Skill 管理工具便携安装包
- `hirebox-skill-manager-portable/`: 便携工具源码目录
- `skills/`: Skill 源码目录
- `packages/`: Skill 压缩包目录
- `tool.json`: 便携工具分发信息

## 使用前准备

所有系统都需要：

- Node.js
- Git

检查 Node.js：

```bash
node -v
```

在 Linux 使用压缩包同步时，建议安装 `unzip` 或 `bsdtar`。macOS 通常自带 `ditto`，Windows 会使用 PowerShell 自带的压缩/解压能力。

## 下载工具

从本仓库下载并解压：

```text
hirebox-skill-manager-portable.zip
```

进入解压后的目录：

```text
hirebox-skill-manager-portable/
```

## 第一次使用

Windows：

```powershell
.\初始化.cmd
```

macOS / Linux：

```bash
sh ./init.sh
```

默认平台目录：

- `Codex`: `~/.codex/skills`
- `Claude`: `~/.claude/skills`
- `Antigravity`: `~/.antigravity/skills`

如果你的平台安装目录不同，可以修改生成的配置文件：

```text
.hirebox-skill-manager/config.json
```

## 查看技能

Windows：

```powershell
.\查看云端技能.cmd
.\查看本地技能.cmd
```

macOS / Linux：

```bash
sh ./list-remote-skills.sh
sh ./list-local-skills.sh
```

## 搜索指定平台技能

搜索结果会把 Hirebox 管理或安装的技能排在最前面，其后显示平台原生技能或手动放入的技能。

Windows：

```powershell
.\查看Codex技能.cmd
.\查看Claude技能.cmd
.\查看Antigravity技能.cmd
```

macOS / Linux：

```bash
sh ./list-codex-skills.sh
sh ./list-claude-skills.sh
sh ./list-antigravity-skills.sh
```

主命令写法：

```bash
sh ./hirebox.sh 搜索技能 Codex
sh ./hirebox.sh 查看平台技能 Claude
```

Windows 主命令写法：

```powershell
.\hirebox.cmd 搜索技能 Codex
.\hirebox.cmd 查看平台技能 Claude
```

## 安装技能

安装某个技能到所有已配置平台：

```bash
sh ./hirebox.sh 安装技能 example-skill
```

安装某个技能到指定平台：

```bash
sh ./hirebox.sh 安装技能 example-skill codex
```

Windows 对应写法：

```powershell
.\hirebox.cmd 安装技能 example-skill codex
```

安装时会自动解析并先安装 `skill.json` 中声明的依赖。

## 同步技能

Windows：

```powershell
.\同步技能.cmd
.\hirebox.cmd 同步技能 claude
.\hirebox.cmd 压缩包同步 codex
```

macOS / Linux：

```bash
sh ./sync-skills.sh
sh ./hirebox.sh 同步技能 claude
sh ./hirebox.sh 压缩包同步 codex
```

## 发布本地技能

Windows：

```powershell
.\hirebox.cmd 发布技能 C:\skills\example-skill
.\hirebox.cmd 发布技能 C:\skills\example-skill hirebox-example-skill
```

macOS / Linux：

```bash
sh ./hirebox.sh 发布技能 ~/skills/example-skill
sh ./hirebox.sh 发布技能 ~/skills/example-skill hirebox-example-skill
```

发布后会自动维护：

- `skills/<skill-name>/`
- `packages/<skill-name>/<skill-name>-<version>.zip`
- `skills-index.json`

## 从平台反向导入技能

Windows：

```powershell
.\hirebox.cmd 导入技能 codex example-skill
.\hirebox.cmd 批量导入 claude
```

macOS / Linux：

```bash
sh ./hirebox.sh 导入技能 codex example-skill
sh ./hirebox.sh 批量导入 claude
```

## Skill 结构

一个标准 Skill 建议包含：

```text
example-skill/
  skill.json
  SKILL.md
```

`skill.json` 示例：

```json
{
  "name": "example-skill",
  "version": "0.1.0",
  "description": "Hirebox custom skill",
  "platforms": ["codex", "claude", "antigravity"],
  "dependencies": [
    { "name": "shared-prompts", "version": "*" }
  ]
}
```

## 维护安装包

Windows：

```powershell
.\hirebox.cmd 生成安装包
.\hirebox.cmd 发布安装包
```

macOS / Linux：

```bash
sh ./hirebox.sh 生成安装包
sh ./hirebox.sh 发布安装包
```

发布后会更新：

- `hirebox-skill-manager-portable/`
- `hirebox-skill-manager-portable.zip`
- `tool.json`

## 常见问题

如果提示找不到 `node`，请先安装 Node.js，并确认已经加入系统 `PATH`。

如果提示找不到 `git`，请先安装 Git，并确认已经加入系统 `PATH`。

如果 Linux 压缩包同步失败，请安装 `unzip` 或 `bsdtar` 后重试。

如果发布或导入时 GitHub 拒绝推送，请确认本机 Git 凭据有本仓库写入权限。

如果 GitHub 拒绝暴露邮箱，可以使用 GitHub noreply 邮箱作为提交邮箱。
