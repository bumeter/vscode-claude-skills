# Claude Code Skills Manager — install, enable and disable skills

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/bumkom.bumeter-claude-skills?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter-claude-skills)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/bumkom.bumeter-claude-skills)](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter-claude-skills)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

**Manage your Claude Code skills (Agent Skills, `SKILL.md`) inside VS Code.** See every skill you have as a card: how often it is used, in how many projects, and how many tokens it costs in every session. Turn skills on and off, remove the ones you never use, and **install new skills from [skills.sh](https://skills.sh)**, a git URL or a folder. Kiro skills too. Local only, no account.

![Claude Code skills as cards in VS Code: uses, projects, last used and always-on tokens, with enable, disable and remove](https://raw.githubusercontent.com/bumeter/vscode-claude-skills/main/media/screenshots/installed.png)

A **Skill Manager** button sits in the status bar; click it to open the tab.

![The Skill Manager button in the VS Code status bar, with its tooltip](https://raw.githubusercontent.com/bumeter/vscode-claude-skills/main/media/screenshots/status-bar.png)

## Installed skills

- **Claude Code / Kiro** tabs, a text filter, and Enabled / Disabled / Unused for 30 days.
- Sort by uses, name, always-on tokens or last used. Click a card (or Enter) for its full description, tokens per session and path; arrow keys move between cards.
- **Always-on** is what a skill costs in *every* session (its name and description sit in the context), so unused skills with a high number are the first to turn off.
- **Disable / Enable** a skill or a plugin, **Remove** a personal skill, open its `SKILL.md` or folder. Skills synced from claude.ai are read-only.

## Install a skill

![Install Claude Code skills from the skills.sh leaderboard: trending skills as cards with install counts](https://raw.githubusercontent.com/bumeter/vscode-claude-skills/main/media/screenshots/install.png)

- **skills.sh**: the Hot, Trending (24h) and All time leaderboards as cards, or search as you type. Skills you already have are marked.
- **Git URL**: any repository with a `SKILL.md`.
- **Folder**: a skill on your disk.
- Pick **Claude Code** or **Kiro** as the target.

Light, dark and high-contrast themes follow your editor.

![The installed skills in the VS Code light theme](https://raw.githubusercontent.com/bumeter/vscode-claude-skills/main/media/screenshots/installed-light.png)

## Safe changes

Every change is planned first: a dialog shows exactly what will move, link or be removed, and nothing happens until you confirm. Afterwards **Undo** puts it back (removed skills go to a trash first).

## Local only

Everything is read from the skill folders and Claude Code's logs on the machine the workspace is on. The only network calls are to skills.sh and the git host you install from, and only when you open Install skill or install one. No account, no API key. Works in remote windows (SSH, WSL, Dev Containers, Codespaces), and in Cursor and Windsurf.

## FAQ

**What is a Claude Code skill?** A folder with a `SKILL.md`: a name, a description and instructions Claude Code loads when a task needs them. Personal skills live in `~/.claude/skills`, plugins can bring more, and claude.ai can sync some.

**How do I install a Claude Code skill?** Click **+ Install skill**, find one on skills.sh (or paste a git URL, or pick a folder) and click **Install**. You see what will be copied before anything happens.

**How do I disable a skill without deleting it?** Click **Disable** on its card. It stops loading in new sessions and can be turned back on at any time; **Undo** is offered right after.

**Why do unused skills cost tokens?** The name and description of every enabled skill are in the context of every session, used or not. The card shows this as **Always-on**; turning off skills you never use gives that context back.

**Does it work with Kiro?** Yes: the Kiro tab lists `~/.kiro/skills`, and you can install into Kiro instead of Claude Code.

**Cursor, Windsurf, remote windows?** Yes: it runs where your workspace is (SSH, WSL, Dev Containers, Codespaces) and works in VS Code forks that install `.vsix` extensions.

## Commands and settings

| Command | |
|---|---|
| Skill Manager: Open | The installed skills |
| Skill Manager: Install Skill… | Straight to Install skill |
| Skill Manager: Refresh | Read the skills again |

| Setting | Default | |
|---|---|---|
| `claudeSkills.binaryPath` | empty | Path to `bum`; empty uses the one bundled with the extension, then `PATH` |

## Part of Bumeter

[Claude Code Usage](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter-claude-usage) (quota and context in the status bar) · [Bumeter for VS Code](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter) · [Desktop app](https://github.com/bumeter/bumeter) · [bum, the command line](https://github.com/bumeter/statusline) · [bumeter.cc](https://bumeter.cc)

Unofficial; not made by Anthropic. Claude is a trademark of Anthropic.

## Develop

```
npm ci
npm test            # vitest: extension parts in Node, the page in jsdom
npm run build       # dist/extension.js + dist/webview.js
BUM_BINARY=/path/to/bum BUM_PLATFORM=linux-x64 npm run bundle-bum
npx vsce package --no-dependencies --target linux-x64
```

Screenshots: `npm run build && CHROME=/path/to/chrome node scripts/screenshots.mjs` (demo data) writes `media/screenshots/`.

Release: bump `version` in `package.json` and `CHANGELOG.md`, tag `vX.Y.Z`; the workflow builds one `.vsix` per platform with `bum` (`BUM_VERSION`) and attaches them to a GitHub Release.

License: GPL-3.0-or-later.
