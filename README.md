# Hirebox Skills

This repository distributes Hirebox custom skills for Codex, Claude Code, and Gemini CLI. Node.js and Git are required.

## Install

Clone this repository, then run the launcher for your operating system.

```powershell
.\init.cmd
.\list-skills.cmd
node .\src\index.js install-skill hirebox-invoice-template gemini
```

```sh
./init.sh
./list-skills.sh
node ./src/index.js install-skill hirebox-invoice-template gemini
```

## Synchronization

- `sync-codex-skills`: synchronizes only the Codex_Sync development source.
- `sync-all-platform-skills`: publishes and installs only Hirebox_Skills platform packages.
- `sync-skills`: runs the Codex source sync followed by the all-platform release sync.

## Released Skills

| Skill | Source version | Platforms |
| --- | --- | --- |
| hirebox-candidate-report | 0.1.2 | Codex, Claude Code, Gemini |
| hirebox-candidate-resume | 0.1.2 | Codex, Claude Code, Gemini |
| hirebox-eor-employment-management-contract | 0.2.0 | Codex, Claude Code, Gemini |
| hirebox-eor-quotation | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-general-contract-template | 1.0.1 | Codex, Claude Code, Gemini |
| hirebox-headhunting-quotation | 0.1.1 | Codex, Claude Code, Gemini |
| hirebox-invoice-template | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-multilingual-contract-template | 0.3.0 | Codex, Claude Code, Gemini |
| hirebox-project-quotation | 0.1.0 | Codex, Claude Code, Gemini |
| hirebox-recruitment-headhunting-contract | 0.2.0 | Codex, Claude Code, Gemini |

Every released package retains the Codex source version, content hash, and source commit in `skills-index.json`.
