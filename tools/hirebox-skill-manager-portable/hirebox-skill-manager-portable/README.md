# Hirebox Skill Manager

`Hirebox Skill Manager` 是一个面向海钡 Agent 体系的 Skill 技能管理工具，用于把本地制作的技能统一发布到 GitHub 仓库，再同步安装到不同电脑中的不同智能体平台。

当前支持的核心能力：

- 用 GitHub `Hirebox_Skills` 仓库作为 Skill 同步中转站
- 本地 Skill 打包并上传到仓库
- 从其他电脑按技能名称下载并安装到本地平台目录
- 同步到 `Codex`、`Claude`、`Antigravity` 等不同平台
- 技能依赖关系管理
- 从各平台本地目录反向导入 Skill
- 技能压缩包分发与安装
- 独立便携安装包分发

## 目录结构

```text
.hirebox-skill-manager/
  config.json
  Hirebox_Skills/
  tmp/
src/
  index.js
  lib.js
example-skill/
  skill.json
  SKILL.md
```

## 初始化

```powershell
node .\src\index.js init
```

默认平台目录：

- `Codex`: `%USERPROFILE%\.codex\skills`
- `Claude`: `%USERPROFILE%\.claude\skills`
- `Antigravity`: `%USERPROFILE%\.antigravity\skills`

初始化后可在 [config.json](C:/Users/Tonic/Documents/Codex/海钡人力定制技能管理/.hirebox-skill-manager/config.json) 中改成实际安装路径和 GitHub 仓库地址。

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

`dependencies` 支持两种格式：

- `"shared-prompts"`
- `{ "name": "shared-prompts", "version": "*" }`

## 常用命令

同步远程仓库：

```powershell
node .\src\index.js repo sync
```

查看 GitHub 中可用技能：

```powershell
node .\src\index.js remote list
```

查看本地已安装技能：

```powershell
node .\src\index.js local list
```

按技能名安装到全部平台，会自动先安装依赖：

```powershell
node .\src\index.js install example-skill
```

按技能名安装到指定平台：

```powershell
node .\src\index.js install example-skill codex
```

发布本地技能到 `Hirebox_Skills`，会同时把目录版和 zip 包一起写入仓库：

```powershell
node .\src\index.js publish C:\skills\example-skill
```

单独构建本地压缩包：

```powershell
node .\src\index.js archive build C:\skills\example-skill
```

构建海钡技能管理工具自身的便携安装包：

```powershell
node .\src\index.js package self build
```

把便携安装包归档并发布到 `Hirebox_Skills` 仓库：

```powershell
node .\src\index.js package self publish
```

按压缩包模式同步安装远程技能：

```powershell
node .\src\index.js sync archive
node .\src\index.js sync archive claude
```

## 反向导入

把某个平台本地已安装 Skill 反向导入到 GitHub 仓库：

```powershell
node .\src\index.js import codex example-skill
```

导入时重命名远程 Skill：

```powershell
node .\src\index.js import codex example-skill hirebox-example-skill
```

批量导入某个平台全部本地 Skill：

```powershell
node .\src\index.js import-all claude
```

## GitHub 仓库布局

工具会自动维护下面这套结构：

```text
Hirebox_Skills/
  skills/
    example-skill/
      skill.json
      SKILL.md
  packages/
    example-skill/
      example-skill-0.1.0.zip
  tools/
    hirebox-skill-manager-portable/
      hirebox-skill-manager-portable.zip
      tool.json
      hirebox-skill-manager-portable/
        start.cmd
        start.ps1
        src/
  skills-index.json
```

其中：

- `skills/` 保存源码目录版
- `packages/` 保存 zip 压缩包版
- `tools/` 保存独立工具安装包
- `skills-index.json` 保存技能索引、平台、依赖和压缩包路径

## 即下载即用模式

便携安装包构建完成后，会在本地生成：

- [dist/hirebox-skill-manager-portable](C:/Users/Tonic/Documents/Codex/海钡人力定制技能管理/dist/hirebox-skill-manager-portable)
- [dist/hirebox-skill-manager-portable.zip](C:/Users/Tonic/Documents/Codex/海钡人力定制技能管理/dist/hirebox-skill-manager-portable.zip)

下载到其他电脑后，只要该电脑已安装 Node.js，即可直接解压并运行：

```powershell
.\start.cmd init
.\start.cmd remote list
.\start.cmd sync
```

也可以直接运行：

```powershell
node .\src\index.js --help
```

## GitHub 鉴权

发布、导入、推送前，请确保本机已具备仓库推送权限，例如：

- 已通过 `git` 配置 SSH key
- 或已配置 HTTPS token 凭据

## 后续可扩展方向

- 增加图形化界面
- 增加技能版本锁定与升级策略
- 增加依赖版本约束校验
- 增加远程 release 分发
