# Hirebox Skill Manager

## 环境要求

- 电脑已安装 Node.js
- 需要发布或同步 GitHub 仓库时，电脑已安装 Git

## Windows 常用命令

```powershell
.\初始化.cmd
.\查看云端技能.cmd
.\查看Codex技能.cmd
.\同步技能.cmd
```

## macOS / Linux 常用命令

```bash
sh ./init.sh
sh ./list-remote-skills.sh
sh ./list-codex-skills.sh
sh ./sync-skills.sh
```

需要指定技能名称或平台时，使用主命令：

```powershell
.\hirebox.cmd 搜索技能 Codex
.\hirebox.cmd 安装技能 seo-writer codex
.\hirebox.cmd 发布技能 C:\skills\seo-writer
```

```bash
sh ./hirebox.sh 搜索技能 Codex
sh ./hirebox.sh 安装技能 seo-writer codex
sh ./hirebox.sh 发布技能 ~/skills/seo-writer
```

## 安装包维护

```powershell
.\hirebox.cmd 生成安装包
.\hirebox.cmd 发布安装包
```

```bash
sh ./hirebox.sh 生成安装包
sh ./hirebox.sh 发布安装包
```