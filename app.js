/**
 * Tech Trend Dashboard
 * - data/trends.json を読み込み、UIを描画する
 */

// ============================================================
// 言語カラーマップ（GitHub公式に準拠）
// ============================================================
const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', Ruby: '#701516', Go: '#00ADD8', Rust: '#dea584',
    PHP: '#4F5D95', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
    Swift: '#FA7343', Kotlin: '#A97BFF', Shell: '#89e051',
    HTML: '#e34c26', CSS: '#563d7c', Dart: '#00B4AB', Vue: '#41b883',
    default: '#8b949e',
};

function getLangColor(lang) {
    return LANG_COLORS[lang] || LANG_COLORS.default;
}

// ============================================================
// テーマ管理
// ============================================================
const THEME_KEY = 'daily-report-theme';

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

// ============================================================
// トースト通知
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check' : 'info'}"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// 相対時間フォーマット
// ============================================================
function formatRelativeTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '1時間以内';
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日前`;
    const d = new Date(isoString);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

// ============================================================
// サマリー統計
// ============================================================
function renderSummary(data) {
    const container = document.getElementById('summary-stats');
    if (!container) return;

    const qiitaCount = data.trends.qiita?.length ?? 0;
    const zennCount  = data.trends.zenn?.length  ?? 0;
    const ghCount    = data.trends.github?.length ?? 0;
    const totalLikes = (data.trends.qiita ?? []).reduce((s, i) => s + (i.likes ?? 0), 0);
    const avgLikes   = qiitaCount > 0 ? Math.round(totalLikes / qiitaCount) : 0;
    const topStars   = Math.max(...(data.trends.github ?? []).map(r => r.stars ?? 0), 0);

    container.innerHTML = `
        <div class="stat-chip"><i class="fa-solid fa-newspaper"></i> Zenn <strong>${zennCount}</strong> 件</div>
        <div class="stat-chip"><i class="fa-solid fa-fire"></i> Qiita <strong>${qiitaCount}</strong> 件</div>
        <div class="stat-chip"><i class="fa-brands fa-github"></i> GitHub <strong>${ghCount}</strong> 件</div>
        <div class="stat-chip"><i class="fa-solid fa-thumbs-up" style="color:var(--qiita-color)"></i> Qiita 平均 <strong>${avgLikes}</strong> likes</div>
        <div class="stat-chip"><i class="fa-regular fa-star" style="color:var(--accent-color)"></i> 最高スター <strong>${new Intl.NumberFormat().format(topStars)}</strong></div>
    `;
}

// ============================================================
// エクスポート
// ============================================================
let _cachedData = null;

function exportJSON() {
    if (!_cachedData) return;
    const blob = new Blob([JSON.stringify(_cachedData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `trends-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSONエクスポート完了');
}

// ============================================================
// データフェッチ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    // テーマ初期化
    applyTheme(loadTheme());
    document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-export')?.addEventListener('click', exportJSON);

    fetchDashboardData();
});

async function fetchDashboardData() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`data/trends.json?t=${timestamp}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        _cachedData = data;

        renderLastUpdated(data.metadata.last_updated);
        renderSummary(data);
        renderZenn(data.trends.zenn);
        renderQiita(data.trends.qiita);
        renderGitHub(data.trends.github);
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        showErrorState('データの読み込みに失敗しました。後でもう一度お試しください。');
    }
}

// ============================================================
// 最終更新日時
// ============================================================
function renderLastUpdated(isoString) {
    if (!isoString) return;
    const el = document.getElementById('last-updated');
    const relative = formatRelativeTime(isoString);
    const d = new Date(isoString);
    const absolute = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> <span title="${absolute}">更新: ${relative}</span>`;
}

// ============================================================
// Zenn描画（サムネイル付き）
// ============================================================
function renderZenn(items) {
    const list = document.getElementById('zenn-list');
    list.innerHTML = '';

    if (!items || items.length === 0) {
        list.innerHTML = '<div class="loading-state">データがありません</div>';
        return;
    }

    items.forEach((item, i) => {
        const card = document.createElement('a');
        card.className = 'trend-card trend-card--image';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${i * 60}ms`);

        const dateStr = item.date ? formatRelativeTime(item.date) : '';

        card.innerHTML = `
            ${item.image_url ? `<img class="card-thumb" src="${escapeHtml(item.image_url)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div class="card-body">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-meta">
                    <span class="meta-item meta-author"><i class="fa-regular fa-user"></i> ${escapeHtml(item.author)}</span>
                    ${dateStr ? `<span class="meta-item"><i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}</span>` : ''}
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}

// ============================================================
// Qiita描画（タグフィルタリング付き）
// ============================================================
let _activeTag = null;
let _qiitaItems = [];

function renderQiita(items) {
    _qiitaItems = items || [];
    _activeTag = null;
    renderQiitaCards();
}

function renderQiitaCards() {
    const list = document.getElementById('qiita-list');
    list.innerHTML = '';

    const filtered = _activeTag
        ? _qiitaItems.filter(i => i.tags?.includes(_activeTag))
        : _qiitaItems;

    if (_activeTag) {
        const badge = document.createElement('div');
        badge.className = 'filter-badge';
        badge.innerHTML = `
            <i class="fa-solid fa-tag"></i> ${escapeHtml(_activeTag)}
            <button class="filter-clear" aria-label="フィルター解除">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        badge.querySelector('.filter-clear').addEventListener('click', () => {
            _activeTag = null;
            renderQiitaCards();
        });
        list.appendChild(badge);
    }

    if (filtered.length === 0) {
        list.innerHTML += '<div class="loading-state">該当する記事がありません</div>';
        return;
    }

    filtered.forEach((item, i) => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${i * 60}ms`);

        card.innerHTML = `
            <div class="card-title">${escapeHtml(item.title)}</div>
            <div class="card-meta">
                <span class="meta-item meta-author">
                    ${item.avatar_url
                        ? `<img src="${item.avatar_url}" width="16" height="16" class="meta-avatar" alt="">`
                        : '<i class="fa-regular fa-user"></i>'}
                    ${escapeHtml(item.author)}
                </span>
                <span class="meta-item" style="color:var(--qiita-color)">
                    <i class="fa-solid fa-thumbs-up"></i> ${item.likes}
                </span>
            </div>
            ${item.tags && item.tags.length > 0 ? `
            <div class="card-tags">
                ${item.tags.map(tag => `<span class="tag-chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`).join('')}
            </div>` : ''}
        `;

        // タグクリック
        card.querySelectorAll('.tag-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                _activeTag = chip.dataset.tag;
                renderQiitaCards();
            });
        });

        list.appendChild(card);
    });
}

// ============================================================
// GitHub描画（アバター・言語色付き）
// ============================================================
function renderGitHub(items) {
    const list = document.getElementById('github-list');
    list.innerHTML = '';

    if (!items || items.length === 0) {
        list.innerHTML = '<div class="loading-state">データがありません</div>';
        return;
    }

    const formatNum = (n) => new Intl.NumberFormat().format(n);

    items.forEach((item, i) => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.setProperty('--delay', `${i * 60}ms`);

        const langColor = item.language ? getLangColor(item.language) : null;
        const [owner] = (item.name || '').split('/');

        card.innerHTML = `
            <div class="repo-header">
                ${item.owner_avatar
                    ? `<img src="${escapeHtml(item.owner_avatar)}" class="repo-avatar" alt="${escapeHtml(owner)}" loading="lazy">`
                    : ''}
                <div class="card-title repo-name">
                    <i class="fa-solid fa-book-bookmark"></i> ${escapeHtml(item.name)}
                </div>
            </div>
            <div class="card-desc">${escapeHtml(item.description || '説明がありません')}</div>
            <div class="card-meta">
                ${item.language && item.language !== 'Unknown' ? `
                    <span class="meta-item">
                        <span class="lang-dot" style="background:${langColor}"></span>
                        ${escapeHtml(item.language)}
                    </span>
                ` : ''}
                <span class="meta-item">
                    <i class="fa-regular fa-star" style="color:#e3b341"></i> ${formatNum(item.stars)}
                </span>
            </div>
        `;

        list.appendChild(card);
    });
}

// ============================================================
// エラー表示
// ============================================================
function showErrorState(message) {
    ['zenn-list', 'qiita-list', 'github-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<div class="loading-state error-state">
                <i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}
            </div>`;
        }
    });
}

// ============================================================
// XSS対策エスケープ
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
