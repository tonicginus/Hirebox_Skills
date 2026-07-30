---
name: hirebox-recruitment-headhunting-contract
description: "Create a Hirebox Thai-Chinese recruitment and headhunting service contract from the retained Word template. Use when the user requests a Hirebox recruitment or headhunting contract, selects this contract template, or invokes $hirebox-recruitment-headhunting-contract."
---

# Hirebox Recruitment and Headhunting Contract

Create a new document from this template. Keep the reference file unchanged.

## Workflow

1. Read `artifact-template.json` and resolve its paths relative to this skill directory.
2. Load [@documents](plugin://documents@openai-primary-runtime) and invoke its reference/template workflow with the retained file.
3. Treat the user's prompt and available sources as the content input. Do not invent facts merely to fill a template slot.
4. Clone or import the reference instead of replacing its visual system with generic defaults.
5. Render and verify the finished document, then return the final artifact.

## Fidelity

Preserve page setup, sections, styles, lists, tables, headers, footers, and recurring page elements.

User instructions control requested content and explicit deviations. The retained reference controls layout and formatting where the user has not requested a change.
