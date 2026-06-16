# Hirebox_Skills

`Hirebox_Skills` 是海钡 Agent 定制 Skill 的 GitHub 同步仓库，用来在不同电脑、不同平台之间分发和安装技能。

当前仓库包含：

- `hirebox-skill-manager-portable.zip`: 海钡 Skill 管理工具便携安装包
- `hirebox-skill-manager-portable/`: 便携工具源码目录
- `skills/`: Skill 源码目录
- `packages/`: Skill 压缩包目录
- `tool.json`: 便携工具分发信息

## 使用前准备

目标电脑只需要安装：

- Node.js
- Git

Node.js 需要能在命令行中运行：

```powershell
node -v
```

## 下载工具

从本仓库下载：

```text
hirebox-skill-manager-portable.zip
```

解压后进入目录：

```text
hirebox-skill-manager-portable/
```

## 第一次使用

初始化本地配置和默认平台目录：

```powershell
.\初始化.cmd
```

也可以使用主命令：

```powershell
.\hirebox.cmd 初始化
```

默认平台目录：

- `Codex`: `%USERPROFILE%\.codex\skills`
- `Claude`: `%USERPROFILE%\.claude\skills`
- `Antigravity`: `%USERPROFILE%\.antigravity\skills`

如果你的平台安装目录不同，可以修改生成的配置文件：

```text
.hirebox-skill-manager/config.json
```

## 查看技能

查看 GitHub 仓库中的云端技能：

```powershell
.\查看云端技能.cmd
```

或：

```powershell
.\hirebox.cmd 查看云端技能
```

查看本地已经安装的技能：

```powershell
.\查看本地技能.cmd
```

或：

```powershell
.\hirebox.cmd 查看本地技能
```

## 安装技能

安装某个技能到所有已配置平台：

```powershell
.\hirebox.cmd 安装技能 example-skill
```

安装某个技能到指定平台：

```powershell
.\hirebox.cmd 安装技能 example-skill codex
```

安装时会自动解析并先安装 `skill.json` 中声明的依赖。

## 同步技能

同步仓库中的全部技能到所有平台：

```powershell
.\同步技能.cmd
```

或：

```powershell
.\hirebox.cmd 同步技能
```

同步到指定平台：

```powershell
.\hirebox.cmd 同步技能 claude
```

使用压缩包模式同步：

```powershell
.\hirebox.cmd 压缩包同步
```

或同步到指定平台：

```powershell
.\hirebox.cmd 压缩包同步 codex
```

## 发布本地技能

发布本地 Skill 到本仓库：

```powershell
.\hirebox.cmd 发布技能 C:\skills\example-skill
```

发布时指定云端技能名称：

```powershell
.\hirebox.cmd 发布技能 C:\skills\example-skill hirebox-example-skill
```

发布后会自动维护：

- `skills/<skill-name>/`
- `packages/<skill-name>/<skill-name>-<version>.zip`
- `skills-index.json`

## 从平台反向导入技能

从某个平台本地目录导入一个已安装技能：

```powershell
.\hirebox.cmd 导入技能 codex example-skill
```

导入时重命名：

```powershell
.\hirebox.cmd 导入技能 codex example-skill hirebox-example-skill
```

批量导入某个平台下的全部技能：

```powershell
.\hirebox.cmd 批量导入 claude
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

如果你修改了管理工具本身，可以重新生成便携安装包：

```powershell
.\hirebox.cmd 生成安装包
```

发布新的便携安装包到本仓库根目录：

```powershell
.\hirebox.cmd 发布安装包
```

发布后会更新：

- `hirebox-skill-manager-portable/`
- `hirebox-skill-manager-portable.zip`
- `tool.json`

## 常见问题

如果提示找不到 `node`，请先安装 Node.js，并确认已经加入系统 `PATH`。

如果发布或导入时 GitHub 拒绝推送，请确认本机 Git 凭据有本仓库写入权限。

如果 GitHub 拒绝暴露邮箱，可以使用 GitHub noreply 邮箱作为提交邮箱。
