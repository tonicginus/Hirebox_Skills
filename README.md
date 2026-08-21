# Hirebox Skills

This repository distributes Hirebox custom skills for Codex, Claude Code, and Gemini CLI. Node.js and Git are required.

## Install

Clone this repository, then run the launcher for your operating system.

```powershell
.\init.cmd
.\list-skills.cmd
node .\src\index.js install-skill hirebox-invoice-template gemini
.\sync-all-platform-skills.cmd
```

```sh
./init.sh
./list-skills.sh
node ./src/index.js install-skill hirebox-invoice-template gemini
./sync-all-platform-skills.sh
```

## Synchronization

This clone is a distribution client: `sync-all-platform-skills` pulls the current release and installs Codex, Claude Code, and Gemini packages.

`sync-codex-skills` and `sync-skills` are development-workspace commands. Run them only from the Codex_Sync copy of the Hirebox Skill Manager.

## Released Skills

| Skill | Source version | Platforms |
| --- | --- | --- |
| hirebox-candidate-report | 0.1.2 | Codex, Claude Code, Gemini |
| hirebox-candidate-resume | 0.1.2 | Codex, Claude Code, Gemini |
| hirebox-eor-employment-management-contract | 0.2.2 | Codex, Claude Code, Gemini |
| hirebox-eor-quotation | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-exclusive-recruitment-contract | 0.1.1 | Codex, Claude Code, Gemini |
| hirebox-general-contract-template | 1.0.1 | Codex, Claude Code, Gemini |
| hirebox-headhunting-quotation | 0.1.1 | Codex, Claude Code, Gemini |
| hirebox-invoice-template | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-multilingual-contract-template | 0.3.0 | Codex, Claude Code, Gemini |
| hirebox-project-quotation | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-recruitment-headhunting-contract | 0.2.5 | Codex, Claude Code, Gemini |

Every released package retains the Codex source version, content hash, and source commit in `skills-index.json`.
