// The extension's own wording (the webview has its own in webview/strings.ts).
import { localize } from '@bumeter/vscode-kit/format';

export const t = localize({
  vi: {
    skills: '{n} skill', skillsOne: '{n} skill', open: 'Mở', refresh: 'Làm mới',
    tooltipTitle: 'Skill Manager', counts: 'Claude Code {cc} · Kiro {kiro}', countsNote: 'Chưa tính skill của plugin.',
    error: 'Không đọc được skill', noBum: 'Skill Manager: không tìm thấy lệnh `bum`', panelTitle: 'Skill Manager',
    undo: 'Hoàn tác', undone: 'Đã hoàn tác.', confirmDisable: 'Tắt', confirmEnable: 'Bật', confirmUninstall: 'Gỡ', confirmInstall: 'Cài',
    done: 'Xong: {what}', openSettings: 'Mở cài đặt', pickFolder: 'Chọn thư mục skill',
  },
  en: {
    skills: '{n} skills', skillsOne: '{n} skill', open: 'Open', refresh: 'Refresh',
    tooltipTitle: 'Skill Manager', counts: 'Claude Code {cc} · Kiro {kiro}', countsNote: 'Plugin skills are not counted.',
    error: 'Could not read the skills', noBum: 'Skill Manager: `bum` command not found', panelTitle: 'Skill Manager',
    undo: 'Undo', undone: 'Undone.', confirmDisable: 'Disable', confirmEnable: 'Enable', confirmUninstall: 'Remove', confirmInstall: 'Install',
    done: 'Done: {what}', openSettings: 'Open Settings', pickFolder: 'Choose a skill folder',
  },
});
