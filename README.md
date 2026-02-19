# Tech Trend Dashboard

日本の最新ITトレンドを自動で収集・可視化するダッシュボードアプリケーションです。
Qiita、Zenn、GitHubから「今読まれている記事」や「注目されているリポジトリ」を取得し、一覧表示します。

## 概要
このプロジェクトは、日々のIT業界のトレンド情報収集を効率化・自動化することを目的としています。
バックエンドではPythonスクリプトを用いて各プラットフォームのAPIやRSSフィードからデータを取得し、JSONファイルとして保存します。
フロントエンドは、外部フレームワークに依存しないVanilla JS、HTML、CSSで軽量に構築されており、取得したデータを動的に描画します。
GitHub Actionsと連携することで、情報を毎日自動更新する仕組みが想定されています。

## 主な機能
- **Zenn 注目記事の取得**: ZennのRSSフィードを解析し、最新の注目記事を取得します。
- **Qiita 急上昇記事の取得**: Qiita APIを利用し、直近で「いいね（LGTM）」が多く集まっている記事を抽出します。
- **GitHub トレンドの取得**: GitHub Search APIを用いて、直近でスター数を多く獲得した人気リポジトリを表示します。
- **軽量なUIと自動更新**: シンプルで直感的なダッシュボードUIを提供し、GitHub Actionsによる定期的なデータ更新を行うことができます。

## 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **データ収集 (バックエンド)**: Python 3
  - 利用パッケージ: `requests`
- **自動化・CI/CD**: GitHub Actions (日次での自動データ更新想定)

## ファイルおよびディレクトリ構成
```text
.
├── .github/          # GitHub Actions ワークフロー等の設定ディレクトリ
├── data/             # 生成された JSON データの出力先ディレクトリ
│   └── trends.json  # 各サービスから取得されたトレンドデータの実体
├── fetch_data.py     # 各サービスからデータを取得するPythonスクリプト
├── app.js            # JSONデータを読み込みフロントエンドに描画するJavaScript
├── index.html        # ダッシュボード用HTMLファイル
├── style.css         # ダッシュボード用CSSファイル
├── requirements.txt  # Pythonスクリプトの依存パッケージリスト
└── README.md         # このファイル
```

## ローカルでの実行方法

ローカル環境でダッシュボードを確認し、データを最新に更新する手順は以下の通りです。

### 1. リポジトリのクローンと移動
```bash
git clone <本リポジトリのURL>
cd daily-report
```

### 2. データ収集の準備と実行
Python 3.x の環境が必要です。
```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# データ取得スクリプトの実行（実行後、data/trends.json が生成・更新されます）
python fetch_data.py
```

### 3. ダッシュボードの表示 (ローカルサーバー起動)
ブラウザのCORS制限（ローカルファイルからのAJAXリクエスト制限）を回避するため、簡易的なローカルサーバーを起動します。
```bash
python -m http.server 8000
```
起動完了後、ウェブブラウザで [http://localhost:8000](http://localhost:8000) にアクセスするとダッシュボードが表示されます。

## 今後の拡張性について
- GitHub Actionsによる自動化（cronでのスケジュール実行およびデータファイルコミット）
- GitHub Pages等の静的ホスティングサービスとの連携
- 対応プラットフォーム（X(旧Twitter)やはてなブックマークなど）の追加