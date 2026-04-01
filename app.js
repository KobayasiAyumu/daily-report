const LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#FA7343',
    Kotlin: '#A97BFF',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Dart: '#00B4AB',
    Vue: '#41b883',
    default: '#8b949e',
};

const THEME_KEY = 'daily-report-theme';
let cachedData = null;
let activeTag = null;
let qiitaItems = [];

function getLangColor(lang) {
    return LANG_COLORS[lang] || LANG_COLORS.default;
}

function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('btn-theme');
    if (btn) {
        btn.innerHTML = theme === 'dark'
            ? '<i class="fa-solid fa-moon"></i>'
            : '<i class="fa-solid fa-sun"></i>';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconName = type === 'success' ? 'check' : 'circle-info';
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid fa-${iconName}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function formatRelativeTime(input) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '日時不明';

    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60 * 60 * 1000) return '1時間以内';

    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 24) return `${hours}時間前`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日前`;

    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function renderLastUpdated(isoString) {
    const el = document.getElementById('last-updated');
    if (!el || !isoString) return;

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        el.innerHTML = '<i class="fa-regular fa-clock"></i><span>更新日時不明</span>';
        return;
    }

    const absolute = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);

    el.innerHTML = `
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span title="${escapeHtml(absolute)}">更新: ${escapeHtml(formatRelativeTime(isoString))}</span>
    `;
}

function renderSummary(data) {
    const container = document.getElementById('summary-stats');
    if (!container) return;

    const zennCount = data.trends.zenn?.length ?? 0;
    const qiitaCount = data.trends.qiita?.length ?? 0;
    const githubCount = data.trends.github?.length ?? 0;
    const totalLikes = (data.trends.qiita ?? []).reduce((sum, item) => sum + (item.likes ?? 0), 0);
    const averageLikes = qiitaCount ? Math.round(totalLikes / qiitaCount) : 0;
    const topStars = Math.max(...(data.trends.github ?? []).map((repo) => repo.stars ?? 0), 0);

    container.innerHTML = `
        <div class="stat-chip"><i class="fa-solid fa-newspaper"></i> Zenn <strong>${zennCount}</strong>件</div>
        <div class="stat-chip"><i class="fa-solid fa-fire"></i> Qiita <strong>${qiitaCount}</strong>件</div>
        <div class="stat-chip"><i class="fa-brands fa-github"></i> GitHub <strong>${githubCount}</strong>件</div>
        <div class="stat-chip"><i class="fa-solid fa-thumbs-up" style="color:var(--qiita-color)"></i> Qiita 平均 <strong>${averageLikes}</strong> likes</div>
        <div class="stat-chip"><i class="fa-regular fa-star" style="color:var(--accent-color)"></i> 最大 Stars <strong>${new Intl.NumberFormat('ja-JP').format(topStars)}</strong></div>
    `;
}

function exportJSON() {
    if (!cachedData) return;

    const blob = new Blob([JSON.stringify(cachedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trends-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('JSON をエクスポートしました');
}

function renderZenn(items = []) {
    const list = document.getElementById('zenn-list');
    if (!list) return;
    list.innerHTML = '';

    if (!items.length) {
        list.innerHTML = '<div class="loading-state">表示できる記事がありません</div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('a');
        card.className = 'trend-card trend-card--image';
        card.href = item.url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${index * 60}ms`);

        const dateStr = item.date ? formatRelativeTime(item.date) : '';
        const thumb = item.image_url
            ? `<img class="card-thumb" src="${escapeHtml(item.image_url)}" alt="" loading="lazy" onerror="this.remove()">`
            : '';

        card.innerHTML = `
            ${thumb}
            <div class="card-body">
                <div class="card-title">${escapeHtml(item.title || 'タイトル未設定')}</div>
                <div class="card-meta">
                    <span class="meta-item meta-author"><i class="fa-regular fa-user"></i> ${escapeHtml(item.author || 'Unknown')}</span>
                    ${dateStr ? `<span class="meta-item"><i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}</span>` : ''}
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}

function renderQiita(items = []) {
    qiitaItems = items;
    activeTag = null;
    renderQiitaCards();
}

function renderQiitaCards() {
    const list = document.getElementById('qiita-list');
    if (!list) return;
    list.innerHTML = '';

    const filtered = activeTag
        ? qiitaItems.filter((item) => item.tags?.includes(activeTag))
        : qiitaItems;

    if (activeTag) {
        const badge = document.createElement('div');
        badge.className = 'filter-badge';
        badge.innerHTML = `
            <i class="fa-solid fa-tag"></i> ${escapeHtml(activeTag)}
            <button class="filter-clear" type="button" aria-label="フィルターを解除">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        badge.querySelector('.filter-clear').addEventListener('click', () => {
            activeTag = null;
            renderQiitaCards();
        });
        list.appendChild(badge);
    }

    if (!filtered.length) {
        list.insertAdjacentHTML('beforeend', '<div class="loading-state">該当する記事がありません</div>');
        return;
    }

    filtered.forEach((item, index) => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${index * 60}ms`);

        const tags = (item.tags ?? []).filter(Boolean).slice(0, 4);
        const avatar = item.avatar_url
            ? `<img src="${escapeHtml(item.avatar_url)}" width="16" height="16" class="meta-avatar" alt="">`
            : '<i class="fa-regular fa-user"></i>';

        card.innerHTML = `
            <div class="card-title">${escapeHtml(item.title || 'タイトル未設定')}</div>
            <div class="card-meta">
                <span class="meta-item meta-author">${avatar}${escapeHtml(item.author || 'Unknown')}</span>
                <span class="meta-item" style="color:var(--qiita-color)">
                    <i class="fa-solid fa-thumbs-up"></i> ${new Intl.NumberFormat('ja-JP').format(item.likes ?? 0)}
                </span>
            </div>
            ${tags.length ? `
                <div class="card-tags">
                    ${tags.map((tag) => `<span class="tag-chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        `;

        card.querySelectorAll('.tag-chip').forEach((chip) => {
            chip.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                activeTag = chip.dataset.tag;
                renderQiitaCards();
            });
        });

        list.appendChild(card);
    });
}

function renderGitHub(items = []) {
    const list = document.getElementById('github-list');
    if (!list) return;
    list.innerHTML = '';

    if (!items.length) {
        list.innerHTML = '<div class="loading-state">表示できるリポジトリがありません</div>';
        return;
    }

    const formatter = new Intl.NumberFormat('ja-JP');

    items.forEach((item, index) => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url || '#';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${index * 60}ms`);

        const owner = (item.name || '').split('/')[0];
        const langColor = item.language ? getLangColor(item.language) : LANG_COLORS.default;

        card.innerHTML = `
            <div class="repo-header">
                ${item.owner_avatar ? `<img src="${escapeHtml(item.owner_avatar)}" class="repo-avatar" alt="${escapeHtml(owner)}" loading="lazy">` : ''}
                <div class="card-title repo-name">
                    <i class="fa-solid fa-book-bookmark"></i> ${escapeHtml(item.name || 'unknown/repo')}
                </div>
            </div>
            <div class="card-desc">${escapeHtml(item.description || '説明はありません')}</div>
            <div class="card-meta">
                ${item.language ? `
                    <span class="meta-item">
                        <span class="lang-dot" style="background:${langColor}"></span>
                        ${escapeHtml(item.language)}
                    </span>
                ` : ''}
                <span class="meta-item">
                    <i class="fa-regular fa-star" style="color:#e3b341"></i> ${formatter.format(item.stars ?? 0)}
                </span>
            </div>
        `;

        list.appendChild(card);
    });
}

function showErrorState(message) {
    ['zenn-list', 'qiita-list', 'github-list'].forEach((id) => {
        const target = document.getElementById(id);
        if (target) {
            target.innerHTML = `
                <div class="loading-state error-state">
                    <i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}
                </div>
            `;
        }
    });
}

async function fetchDashboardData() {
    try {
        const response = await fetch(`data/trends.json?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        cachedData = data;

        renderLastUpdated(data.metadata?.last_updated);
        renderSummary(data);
        renderZenn(data.trends?.zenn ?? []);
        renderQiita(data.trends?.qiita ?? []);
        renderGitHub(data.trends?.github ?? []);
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        showErrorState('データの読み込みに失敗しました。JSON 生成や配置を確認してください。');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());

    applyTheme(loadTheme());

    document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-export')?.addEventListener('click', exportJSON);

    fetchDashboardData();
});
