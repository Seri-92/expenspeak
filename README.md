# expenspeak

Next.js 14 + TypeScript + Supabase で構成された家計簿アプリです。

## 開発環境セットアップ

1. 依存関係をインストールします。

```bash
yarn install
```

2. 環境変数ファイルを作成します。

```bash
cp .env.local.example .env.local
```

3. `.env.local` に Supabase の `dev` プロジェクト値を設定します。

4. 開発サーバーを起動します。

```bash
yarn dev
```

## Docker を使わない Supabase 運用

このプロジェクトは Docker なし運用を前提にできます。  
ローカルPC上にDBを立てず、Supabase クラウドの `dev` プロジェクトへ接続してください。

- `prod` と `dev` は Supabase プロジェクトを分離する
- ローカル開発時の `.env.local` は必ず `dev` 側の URL/Anon Key を使う
- Google OAuth のリダイレクトURLは `dev`/`prod` でそれぞれ設定する

### 推奨リダイレクトURL

- `http://localhost:3000/auth/callback`
- `https://<your-production-domain>/auth/callback`

## 開発コマンド

- `yarn dev`: 開発サーバー起動
- `yarn lint`: Lint
- `yarn test`: テスト
- `yarn build`: 本番ビルド

## 初期データ投入

`db/dev_seed.sql` に `dev` 環境向けのサンプルSQLを用意しています。  
Supabase Dashboard の SQL Editor で `dev` プロジェクトに対して実行してください。
