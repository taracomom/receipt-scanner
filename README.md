# Receipt Scanner PWA

iPhone Safari 対応の PWA レシートスキャナー。レシートを撮影 → OpenAI Vision API で OCR → Google Drive に自動アップロード。

## 機能

- 📱 PWA: ホーム画面にインストール可能
- 📷 カメラ撮影: リアカメラでレシート撮影
- 🤖 AI OCR: GPT-4o-mini Vision API でレシート解析
- 📁 自動アップロード: Google Drive に構造化ファイル名で保存
- ✏️ 手動編集: OCR 結果の確認・修正
- 💰 低コスト: 1枚あたり約0.3円

## セットアップ

### 1. API キー設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:
```
OPENAI_API_KEY=sk-your-openai-api-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 2. Google OAuth 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Drive API を有効化
3. OAuth 2.0 クライアント ID を作成
   - アプリケーションタイプ: ウェブアプリケーション
   - 承認済みリダイレクト URI: `https://yourdomain.com` (本番) / `http://localhost:8000` (開発)

### 3. OpenAI API キー取得

1. [OpenAI Platform](https://platform.openai.com/) でアカウント作成
2. API キーを生成
3. gpt-4o-mini へのアクセスを確認

## 開発

```bash
# 開発サーバー起動
npm run dev
# または
python3 -m http.server 8000 --directory public

# ブラウザで http://localhost:8000 を開く
```

## デプロイ

### Cloudflare Pages (推奨)

```bash
# Cloudflare CLI インストール
npm install -g wrangler

# デプロイ
wrangler pages publish public
```

### その他の静的ホスティング

- Netlify
- Vercel  
- GitHub Pages

## 使い方

1. PWA をホーム画面にインストール
2. カメラ権限を許可
3. レシートを撮影
4. AI 解析結果を確認・編集
5. Google Drive に保存

## ファイル名形式

```
YYYY-MM-DD_会社名_品名_価格.jpg
例: 2025-06-20_FamilyMart_Coffee_150.jpg
```

## コスト計算

- OpenAI GPT-4o-mini Vision: $0.01/4 per token ≈ $0.0025/画像
- Google Drive: 15GB まで無料
- 月1000枚処理: 約300円

## トラブルシューティング

### カメラが起動しない
- Safari の設定 → プライバシーとセキュリティ → カメラ を確認
- HTTPS 接続を使用 (localhost は HTTP で OK)

### OCR の精度が低い
- 明るい場所で撮影
- レシート全体をフレームに収める
- 手ブレを防ぐ

### Google Drive 認証エラー
- OAuth クライアント ID を確認
- リダイレクト URI が正しく設定されているか確認

## 技術スタック

- **Frontend**: Vanilla JS + Tailwind CSS
- **Camera**: WebRTC getUserMedia API
- **AI OCR**: OpenAI Vision API (gpt-4o-mini)
- **Storage**: Google Drive API v3
- **Auth**: OAuth 2.0 PKCE
- **PWA**: Service Worker + Web App Manifest

## ライセンス

MIT License