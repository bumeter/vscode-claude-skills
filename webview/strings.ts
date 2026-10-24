// The page's wording, vi/en. `{name}` is replaced by params.name.
const STRINGS = {
  vi: {
    filter: 'Lọc…', all: 'Tất cả', enabled: 'Đang bật', disabled: 'Đang tắt', unused: 'Chưa dùng 30 ngày', install: 'Cài skill',
    sortUses: 'Sắp: Lần dùng', sortName: 'Sắp: Tên', sortAlways: 'Sắp: Luôn tốn', sortLast: 'Sắp: Dùng cuối', sortBy: 'Sắp xếp',
    usesLine: '{uses} lần · {projects} d.án · {last}', alwaysLine: 'Luôn tốn {n} token', alwaysTip: 'Token tốn ở mọi phiên (tên + mô tả)',
    avgLine: 'Trung bình {n} token mỗi phiên có dùng skill này', keysInstalled: '← → ↑ ↓ chọn · Enter mở · / lọc',
    personal: 'Cá nhân', plugin: 'Plugin', synced: 'claude.ai', command: 'Lệnh',
    footer: '{n} skill · {off} đang tắt · {unused} chưa dùng 30 ngày', noUsage: 'Chưa có số liệu sử dụng: Bumeter chưa đọc log của bạn.',
    turnOff: 'Tắt', turnOn: 'Bật', remove: 'Gỡ', openFile: 'Mở SKILL.md', openFolder: 'Hiện trong thư mục', copyPath: 'Copy đường dẫn', more: 'Thêm',
    readOnly: 'Chỉ đọc', loading: 'Đang đọc skill…', loadingPlugins: 'Đang đọc plugin…', retry: 'Thử lại', empty: 'Chưa có skill nào.', noMatch: 'Không có skill khớp.',
    never: 'chưa', today: 'hôm nay', yesterday: 'hôm qua', daysAgo: '{n} ngày', path: 'Đường dẫn',
    back: 'Skill đã cài', installFor: 'Cài cho', market: 'skills.sh', git: 'Git URL', folder: 'Thư mục', search: 'Tìm trên skills.sh…',
    hot: 'Hot', trending: 'Trending 24h', allTime: 'All time', installs: '{n} lượt cài', installBtn: 'Cài', installed: 'Đã cài', github: 'GitHub',
    loadMore: 'Tải thêm', gitHint: 'URL git của một repo có SKILL.md, ví dụ https://github.com/owner/repo', folderHint: 'Thư mục chứa SKILL.md',
    choose: 'Chọn…', noHits: 'Không tìm thấy skill nào.', marketError: 'Không tải được skills.sh: {err}', keys: '← → ↑ ↓ chọn · Enter cài · / tìm',
  },
  en: {
    filter: 'Filter…', all: 'All', enabled: 'Enabled', disabled: 'Disabled', unused: 'Unused for 30 days', install: 'Install skill',
    sortUses: 'Sort: uses', sortName: 'Sort: name', sortAlways: 'Sort: always-on', sortLast: 'Sort: last used', sortBy: 'Sort by',
    usesLine: '{uses} uses · {projects} projects · {last}', alwaysLine: 'Always-on {n} tokens', alwaysTip: 'Tokens spent in every session (name + description)',
    avgLine: 'On average {n} tokens per session that used this skill', keysInstalled: '← → ↑ ↓ select · Enter open · / filter',
    personal: 'Personal', plugin: 'Plugin', synced: 'claude.ai', command: 'Command',
    footer: '{n} skills · {off} disabled · {unused} unused for 30 days', noUsage: 'No usage numbers yet: Bumeter has not read your logs.',
    turnOff: 'Disable', turnOn: 'Enable', remove: 'Remove', openFile: 'Open SKILL.md', openFolder: 'Reveal in folder', copyPath: 'Copy path', more: 'More',
    readOnly: 'Read-only', loading: 'Reading skills…', loadingPlugins: 'Reading plugins…', retry: 'Retry', empty: 'No skills yet.', noMatch: 'No skill matches.',
    never: 'never', today: 'today', yesterday: 'yesterday', daysAgo: '{n} days', path: 'Path',
    back: 'Installed skills', installFor: 'Install for', market: 'skills.sh', git: 'Git URL', folder: 'Folder', search: 'Search skills.sh…',
    hot: 'Hot', trending: 'Trending 24h', allTime: 'All time', installs: '{n} installs', installBtn: 'Install', installed: 'Installed', github: 'GitHub',
    loadMore: 'Load more', gitHint: 'Git URL of a repository with a SKILL.md, e.g. https://github.com/owner/repo', folderHint: 'A folder with a SKILL.md',
    choose: 'Choose…', noHits: 'No skill found.', marketError: 'Could not load skills.sh: {err}', keys: '← → ↑ ↓ select · Enter install · / search',
  },
};

export type Lang = keyof typeof STRINGS;
export type Key = keyof typeof STRINGS.en;
let lang: Lang = 'en';

export function setLang(l: string): void {
  lang = l === 'vi' ? 'vi' : 'en';
}

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return STRINGS[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
