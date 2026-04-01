import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import requests

OUTPUT_DIR = "data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "trends.json")

HEADERS = {
    "User-Agent": "TechTrendDashboard/1.1"
}


def isoformat_utc(dt):
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fetch_qiita_trends():
    print("Fetching Qiita trends...")
    url = "https://qiita.com/api/v2/items"
    since = (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%Y-%m-%d")
    params = {
        "page": 1,
        "per_page": 20,
        "query": f"created:>{since} stocks:>20",
    }

    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        response.raise_for_status()
        items = response.json()

        trends = [{
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "likes": item.get("likes_count", 0),
            "author": item.get("user", {}).get("id", "Unknown"),
            "avatar_url": item.get("user", {}).get("profile_image_url", ""),
            "tags": [tag.get("name") for tag in item.get("tags", []) if tag.get("name")][:4],
            "created_at": item.get("created_at", ""),
        } for item in items]

        trends.sort(key=lambda item: (item["likes"], item["created_at"]), reverse=True)
        return trends[:6]
    except Exception as exc:
        print(f"Error fetching Qiita trends: {exc}")
        return []


def fetch_zenn_trends():
    print("Fetching Zenn trends...")
    url = "https://zenn.dev/feed"

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        root = ET.fromstring(response.content)

        trends = []
        for item in root.findall(".//item")[:6]:
            title = item.find("title")
            link = item.find("link")
            pub_date = item.find("pubDate")
            creator = item.find("{http://purl.org/dc/elements/1.1/}creator")
            enclosure = item.find("enclosure")

            trends.append({
                "title": title.text if title is not None else "",
                "url": link.text if link is not None else "",
                "author": creator.text if creator is not None else "Zenn User",
                "date": pub_date.text if pub_date is not None else "",
                "image_url": enclosure.attrib.get("url", "") if enclosure is not None else "",
            })

        return trends
    except Exception as exc:
        print(f"Error fetching Zenn trends: {exc}")
        return []


def fetch_github_trends():
    print("Fetching GitHub trends...")
    url = "https://api.github.com/search/repositories"
    since = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    params = {
        "q": f"created:>{since} stars:>50",
        "sort": "stars",
        "order": "desc",
        "per_page": 6,
    }
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "TechTrendDashboard/1.1",
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        return [{
            "name": repo.get("full_name", ""),
            "description": repo.get("description", ""),
            "url": repo.get("html_url", ""),
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language") or "",
            "owner_avatar": repo.get("owner", {}).get("avatar_url", ""),
        } for repo in data.get("items", [])]
    except Exception as exc:
        print(f"Error fetching GitHub trends: {exc}")
        return []


def main():
    print("Starting data collection...")

    dashboard_data = {
        "metadata": {
            "last_updated": isoformat_utc(datetime.now(timezone.utc)),
        },
        "trends": {
            "qiita": fetch_qiita_trends(),
            "zenn": fetch_zenn_trends(),
            "github": fetch_github_trends(),
        },
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(dashboard_data, file, ensure_ascii=False, indent=2)

    print(f"Data successfully saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
