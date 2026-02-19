import json
import os
import requests
from datetime import datetime
import xml.etree.ElementTree as ET

# 出力先ディレクトリ
OUTPUT_DIR = "data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "trends.json")

# User-Agentの設定（APIへのマナーとして設定）
HEADERS = {
    "User-Agent": "GitHubTrendDashboard/1.0"
}

def fetch_qiita_trends():
    """QiitaAPIから直近の人気記事を取得する"""
    print("Fetching Qiita trends...")
    url = "https://qiita.com/api/v2/items"
    
    # 過去1週間でストック数（いいね等）が多い記事を取得するクエリ
    params = {
        "page": 1,
        "per_page": 10,
        "query": "created:>2024-01-01 stocks:>50" # 最近の記事でLGTMが多いもの
    }
    
    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()
        items = response.json()
        
        trends = []
        for item in items:
            trends.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "likes": item.get("likes_count", 0),
                "author": item.get("user", {}).get("id", "Unknown"),
                "avatar_url": item.get("user", {}).get("profile_image_url", ""),
                "tags": [tag.get("name") for tag in item.get("tags", [])][:3]
            })
            
        # いいね順にソート
        trends.sort(key=lambda x: x["likes"], reverse=True)
        return trends[:5] # トップ5を返す
        
    except Exception as e:
        print(f"Error fetching Qiita trends: {e}")
        return []

def fetch_zenn_trends():
    """ZennのRSSフィードからトレンド記事を取得する"""
    print("Fetching Zenn trends...")
    # ZennのトレンドRSSフィード
    url = "https://zenn.dev/feed"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        # XML(RSS)をパースする
        root = ET.fromstring(response.content)
        
        trends = []
        # RSS2.0フォーマット: channel -> item
        for item in root.findall('.//item')[:5]: # トップ5
            title = item.find('title')
            link = item.find('link')
            pubDate = item.find('pubDate')
            creator = item.find('{http://purl.org/dc/elements/1.1/}creator')
            enclosure = item.find('enclosure') # ヘッダー画像
            
            trends.append({
                "title": title.text if title is not None else "",
                "url": link.text if link is not None else "",
                "author": creator.text if creator is not None else "Zenn User",
                "date": pubDate.text if pubDate is not None else "",
                "image_url": enclosure.attrib.get('url') if enclosure is not None else ""
            })
            
        return trends
        
    except Exception as e:
        print(f"Error fetching Zenn trends: {e}")
        return []

def fetch_github_trends():
    """GitHub Search APIから直近の人気リポジトリを取得する"""
    print("Fetching GitHub trends...")
    url = "https://api.github.com/search/repositories"
    
    # 過去1週間に作成または更新されたリポジトリで、スター数が多い順
    # today - 7days の日付を生成するのがベストだが、簡略化のため固定クエリに近い形
    # 実際にはGitHub Actions側で実行時点での過去7日などを計算して渡す等も可能
    
    params = {
        "q": "created:>2024-01-01 stars:>500",
        "sort": "stars",
        "order": "desc",
        "per_page": 5
    }
    
    # GitHub APIは独自ヘッダーを要求する場合がある
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitHubTrendDashboard/1.0"
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        trends = []
        for repo in data.get("items", []):
            trends.append({
                "name": repo.get("full_name", ""),
                "description": repo.get("description", ""),
                "url": repo.get("html_url", ""),
                "stars": repo.get("stargazers_count", 0),
                "language": repo.get("language", "Unknown"),
                "owner_avatar": repo.get("owner", {}).get("avatar_url", "")
            })
            
        return trends
        
    except Exception as e:
        print(f"Error fetching GitHub trends: {e}")
        return []

def main():
    print("Starting data collection...")
    
    # データの収集
    qiita_data = fetch_qiita_trends()
    zenn_data = fetch_zenn_trends()
    github_data = fetch_github_trends()
    
    # JSON構造の作成
    dashboard_data = {
        "metadata": {
            "last_updated": datetime.utcnow().isoformat() + "Z",
        },
        "trends": {
            "qiita": qiita_data,
            "zenn": zenn_data,
            "github": github_data
        }
    }
    
    # 出力ディレクトリの作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # JSONとして保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
        
    print(f"Data successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
