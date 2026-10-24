# Claude Code Skills Manager — install, enable and disable skills

Every Claude Code skill you have, in one table inside VS Code: how often each one is used, in how many projects, and what it costs in context. Turn skills on and off, remove the ones you never use, and install new ones from [skills.sh](https://skills.sh), a git URL or a folder. Kiro skills too.

```
$(book) 18 skills      ← in the status bar; click to open Claude Skills
```

## Installed skills

| | Skill | Source | Uses | Projects | Tokens/session | Always | Last used |
|---|---|---|---|---|---|---|---|
| ● | brainstorming | Personal | 42 | 3 | 1.2K | ~60 | yesterday |
| ● | code-review | Plugin · tools | 17 | 2 | 3.4K | ~120 | 3 days |
| ○ | pdf | Personal | 0 | – | – | ~125 | never |

- **Claude Code / Kiro** tabs, a text filter, and Enabled / Disabled / Unused for 30 days.
- Click a column to sort. Click a row for its description and path.
- **Always** is what a skill costs in *every* session (its name and description sit in the context), so unused skills with a high number are the first to turn off.
- **Disable / Enable** a skill or a plugin, **Remove** a personal skill, open its `SKILL.md` or folder. Skills synced from claude.ai are read-only.

## Install a skill

- **skills.sh**: the Hot, Trending (24h) and All time leaderboards as cards, or search as you type. Skills you already have are marked.
- **Git URL**: any repository with a `SKILL.md`.
- **Folder**: a skill on your disk.
- Pick **Claude Code** or **Kiro** as the target.

## Safe changes

Every change is planned first: a dialog shows exactly what will move, link or be removed, and nothing happens until you confirm. Afterwards **Undo** puts it back (removed skills go to a trash first).

## Local only

Everything is read from the skill folders and Claude Code's logs on the machine the workspace is on. The only network calls are to skills.sh and GitHub, and only when you open Install skill or install one. No account, no API key. Works in remote windows (SSH, WSL, Dev Containers, Codespaces), and in Cursor and Windsurf.

## Commands and settings

| Command | |
|---|---|
| Claude Skills: Open | The installed skills table |
| Claude Skills: Install Skill… | Straight to Install skill |
| Claude Skills: Refresh | Read the skills again |

| Setting | Default | |
|---|---|---|
| `claudeSkills.binaryPath` | empty | Path to `bum`; empty uses the one bundled with the extension, then `PATH` |

## Part of Bumeter

[Claude Code Usage](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter-claude-usage) (quota and context in the status bar) · [Bumeter for VS Code](https://marketplace.visualstudio.com/items?itemName=bumkom.bumeter) · [Desktop app](https://github.com/bumeter/bumeter) · [bum, the command line](https://github.com/bumeter/statusline) · [bumeter.cc](https://bumeter.cc)

Unofficial; not made by Anthropic.

## Develop

```
npm ci
npm test            # vitest: extension parts in Node, the page in jsdom
npm run build       # dist/extension.js + dist/webview.js
BUM_BINARY=/path/to/bum BUM_PLATFORM=linux-x64 npm run bundle-bum
npx vsce package --no-dependencies --target linux-x64
```

Release: bump `version` in `package.json` and `CHANGELOG.md`, tag `vX.Y.Z`; the workflow builds one `.vsix` per platform with `bum` (`BUM_VERSION`) and attaches them to a GitHub Release.

License: GPL-3.0-or-later.
