/**
 * Tech Trend Dashboard
 * - data/trends.json を読み込み、UIを描画する
 */

document.addEventListener('DOMContentLoaded', () => {
    // 現在の年をフッターにセット
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // データフェッチ処理開始
    fetchDashboardData();
});

/**
 * trends.jsonを非同期で取得して各セクションを描画する
 */
async function fetchDashboardData() {
    try {
        // GitHub Pages等でも動くように相対パスでJSONを取得
        // キャッシュパージのためにタイムスタンプを付与（任意）
        const timestamp = new Date().getTime();
        const response = await fetch(`data/trends.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // データの描画
        renderLastUpdated(data.metadata.last_updated);
        renderZenn(data.trends.zenn);
        renderQiita(data.trends.qiita);
        renderGitHub(data.trends.github);
        
    } catch (error) {
        console.error("データの取得に失敗しました:", error);
        showErrorState("データの読み込みに失敗しました。後でもう一度お試しください。");
    }
}

/**
 * 最終更新日時を描画
 * @param {string} isoString UTCの日時文字列
 */
function renderLastUpdated(isoString) {
    if (!isoString) return;
    const date = new Date(isoString);
    const formatted = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    const el = document.getElementById('last-updated');
    el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> 最終更新: ${formatted}`;
}

/**
 * Zennのトレンドを描画
 * @param {Array} items 
 */
function renderZenn(items) {
    const list = document.getElementById('zenn-list');
    list.innerHTML = '';
    
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="loading-state">データがありません</div>';
        return;
    }
    
    items.forEach(item => {
        // パースした日時を見やすくフォーマット
        const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';
        
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        
        card.innerHTML = `
            <div class="card-title">${escapeHtml(item.title)}</div>
            <div class="card-meta">
                <span class="meta-item meta-author"><i class="fa-regular fa-user"></i> ${escapeHtml(item.author)}</span>
                ${dateStr ? `<span class="meta-item"><i class="fa-regular fa-calendar"></i> ${escapeHtml(dateStr)}</span>` : ''}
            </div>
        `;
        
        list.appendChild(card);
    });
}

/**
 * Qiitaのトレンドを描画
 * @param {Array} items 
 */
function renderQiita(items) {
    const list = document.getElementById('qiita-list');
    list.innerHTML = '';
    
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="loading-state">データがありません</div>';
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        
        card.innerHTML = `
            <div class="card-title">${escapeHtml(item.title)}</div>
            <div class="card-meta">
                <span class="meta-item meta-author">
                    ${item.avatar_url ? `<img src="${item.avatar_url}" width="16" height="16" style="border-radius:50%;object-fit:cover;">` : '<i class="fa-regular fa-user"></i>'}
                    ${escapeHtml(item.author)}
                </span>
                <span class="meta-item" style="color:var(--qiita-color)"><i class="fa-solid fa-thumbs-up"></i> ${item.likes}</span>
            </div>
            ${item.tags && item.tags.length > 0 ? `
            <div class="card-tags" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                ${item.tags.map(tag => `<span style="font-size:0.75rem; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:12px;">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ` : ''}
        `;
        
        list.appendChild(card);
    });
}

/**
 * GitHubのトレンド（急上昇リポジトリ）を描画
 * @param {Array} items 
 */
function renderGitHub(items) {
    const list = document.getElementById('github-list');
    list.innerHTML = '';
    
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="loading-state">データがありません</div>';
        return;
    }
    
    // JS側で3桁カンマ区切りにする関数
    const formatNum = (n) => new Intl.NumberFormat().format(n);
    
    items.forEach(item => {
        const card = document.createElement('a');
        card.className = 'trend-card';
        card.href = item.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        
        card.innerHTML = `
            <div class="card-title repo-name"><i class="fa-solid fa-book-bookmark"></i> ${escapeHtml(item.name)}</div>
            <div class="card-desc">${escapeHtml(item.description || '説明がありません')}</div>
            <div class="card-meta">
                ${item.language && item.language !== 'Unknown' ? `
                    <span class="meta-item">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:var(--zenn-color);"></span> 
                        ${escapeHtml(item.language)}
                    </span>
                ` : ''}
                <span class="meta-item"><i class="fa-regular fa-star"></i> ${formatNum(item.stars)}</span>
            </div>
        `;
        
        list.appendChild(card);
    });
}

/**
 * エラー時の表示
 * @param {string} message 
 */
function showErrorState(message) {
    const lists = ['zenn-list', 'qiita-list', 'github-list'];
    lists.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = `<div class="loading-state" style="color:#f85149;"><i class="fa-solid fa-circle-exclamation"></i> ${message}</div>`;
        }
    });
}

/**
 * XSS対策エスケープ処理
 * @param {string} str 
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
