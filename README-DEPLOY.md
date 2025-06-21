# Receipt Scanner PWA - デプロイ手順

## 🚀 GitHub Pages 自動デプロイ

### 1. GitHubリポジトリ作成

1. https://github.com にアクセス
2. **New repository** をクリック
3. Repository name: `receipt-scanner`
4. **Public** を選択
5. **Create repository** をクリック

### 2. コードをアップロード

GitHub の指示に従って、以下のコマンドを実行：

```bash
cd /mnt/c/Users/owner/CascadeProjects/receipt-scanner

# Git初期化
git init
git add .
git commit -m "Receipt Scanner PWA"
git branch -M main

# リモートリポジトリ追加（YOUR_USERNAMEを実際のユーザー名に変更）
git remote add origin https://github.com/YOUR_USERNAME/receipt-scanner.git
git push -u origin main
```

### 3. GitHub Pages 有効化

1. GitHubリポジトリページで **Settings** タブ
2. 左メニューから **Pages** をクリック
3. Source: **GitHub Actions** を選択
4. 自動デプロイが開始される

### 4. デプロイ完了

数分後、以下のURLでアクセス可能：
```
https://YOUR_USERNAME.github.io/receipt-scanner/
https://YOUR_USERNAME.github.io/receipt-scanner/test-version.html
```

## 📱 iPhone テスト

生成されたHTTPS URLでPWAテストが可能です！