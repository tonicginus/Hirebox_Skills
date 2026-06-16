# Hirebox Skill Manager

`Hirebox Skill Manager` 是海钡 Agent 体系的 Skill 管理工具。它用 GitHub 仓库 `Hirebox_Skills` 做同步中转，把 Claude、Codex、Antigravity 等平台制作的技能统一发布、下载、安装和同步。

## 核心能力

- GitHub 中转同步 Skill
- 本地 Skill 发布到 `Hirebox_Skills`
- 按技能名称下载安装到本地平台
- 支持 `Codex`、`Claude`、`Antigravity`
- 支持技能依赖关系
- 支持从本地平台目录反向导入 Skill
- 支持 Skill 压缩包分发
- 支持工具自身的便携安装包分发

## 初始化

```powershell
hirebox 初始化
```

默认平台目录：

- `Codex`: `%USERPROFILE%\.codex\skills`
- `Claude`: `%USERPROFILE%\.claude\skills`
- `Antigravity`: `%USERPROFILE%\.antigravity\skills`

## Skill 规范

每个 Skill 建议至少包含：

```text
my-skill/
  skill.json
  SKILL.md
```

示例 `skill.json`：

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

## 常用命令

```powershell
hirebox 初始化
hirebox 查看云端技能
hirebox 查看本地技能
hirebox 安装技能 example-skill codex
hirebox 发布技能 C:\skills\example-skill
hirebox 导入技能 codex example-skill
hirebox 批量导入 claude
hirebox 打包技能 C:\skills\example-skill
hirebox 同步技能
hirebox 压缩包同步 claude
```

## 便携安装包

生成工具自身的便携安装包：

```powershell
hirebox 生成安装包
```

发布便携安装包到 `Hirebox_Skills` 仓库根目录：

```powershell
hirebox 发布安装包
```

发布后的仓库根目录结构：

```text
Hirebox_Skills/
  hirebox-skill-manager-portable/
    hirebox.cmd
    hirebox.ps1
    src/
    QUICKSTART.md
  hirebox-skill-manager-portable.zip
  tool.json
  skills/
  packages/
  skills-index.json
```

下载 `hirebox-skill-manager-portable.zip` 后，只要目标电脑已安装 Node.js，解压后运行：

```powershell
.\初始化.cmd
.\查看云端技能.cmd
.\同步技能.cmd
```

需要指定技能名称或平台时，使用主命令：

```powershell
.\hirebox.cmd 安装技能 example-skill codex
.\hirebox.cmd 发布技能 C:\skills\example-skill
```

## GitHub 鉴权

发布、导入、推送前，请确保本机已经具备仓库推送权限，例如 SSH key、HTTPS token，或已登录的 Git 凭据。
