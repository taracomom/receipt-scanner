# Google Drive連携設定ガイド

## 🚀 必須設定手順

### ステップ 1: Google Cloud Console アクセス
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. Googleアカウントでログイン

### ステップ 2: 新しいプロジェクト作成
1. 画面上部「プロジェクトを選択」→「新しいプロジェクト」
2. プロジェクト名: `receipt-scanner` 
3. 「作成」をクリック
4. 作成されたプロジェクトを選択

### ステップ 3: Google Drive API 有効化
1. 左メニュー「APIs & Services」→「ライブラリ」
2. 検索欄に「Google Drive API」と入力
3. 「Google Drive API」をクリック
4. 「有効にする」をクリック

### ステップ 4: OAuth 同意画面設定
1. 「APIs & Services」→「OAuth同意画面」
2. User Type: 「外部」を選択→「作成」
3. 必須項目を入力：
   - アプリ名: `Receipt Scanner`
   - ユーザー サポートメール: あなたのGmailアドレス
   - デベロッパーの連絡先情報: あなたのGmailアドレス
4. 「保存して続行」を3回クリック

### ステップ 5: OAuth認証情報作成
1. 「APIs & Services」→「認証情報」
2. 「認証情報を作成」→「OAuth 2.0 クライアント ID」
3. 設定：
   - **アプリケーション タイプ**: ウェブアプリケーション
   - **名前**: Receipt Scanner  
   - **承認済みのリダイレクト URI**: 
     ```
     https://taracomom.github.io/receipt-scanner/drive-version.html
     ```
4. 「作成」をクリック

### ステップ 6: クライアントID コピー
- 表示されるクライアントID（`123456789-abcdefg.apps.googleusercontent.com` 形式）をコピー

## 🎯 設定完了後のテスト

1. [Drive版](https://taracomom.github.io/receipt-scanner/drive-version.html) にアクセス
2. コピーしたクライアントIDを入力
3. 「Google Drive接続」をクリック
4. Google認証画面で許可
5. レシート撮影→Google Drive保存テスト

## ⚠️ 重要な注意点

- **無料枠**: Google Cloud Consoleは無料で利用可能
- **API制限**: Drive API は月間1,000,000回まで無料  
- **ストレージ**: Google Drive 15GB まで無料
- **セキュリティ**: OAuth 2.0 で安全な認証

## 🔧 トラブルシューティング

| 問題 | 原因 | 解決方法 |
|-----|-----|---------|
| API有効化エラー | プロジェクト未選択 | 正しいプロジェクトを選択 |
| 認証エラー | リダイレクトURI不一致 | URLを正確に入力 |
| アップロードエラー | API未有効化 | Drive APIを有効化 |

設定は約10分で完了します！