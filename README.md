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
- `yarn db:link -- --project-ref <project-ref> -p <db-password>`: `dev` プロジェクトへリンク
- `yarn db:pull`: `dev` のスキーマを `supabase/migrations/` へ取り込む
- `yarn db:push`: migration を `dev` へ反映
- `yarn db:types`: Supabase の型を `types/database.generated.ts` へ生成
- `yarn db:new <name>`: 新しい migration を作成

## 初期データ投入

`db/dev_seed.sql` に `dev` 環境向けのサンプルSQLを用意しています。  
Supabase Dashboard の SQL Editor で `dev` プロジェクトに対して実行してください。

## Supabase スキーマ管理

このリポジトリでは、Supabase のテーブル定義を `supabase/migrations/` でコード管理します。  
Docker 非依存で運用するため、初回は既存の `dev` スキーマを手で baseline migration に落とし込みます。

### 初回セットアップ

1. Supabase CLI を使える状態にします。
   - 例: `npx supabase --version`
2. `dev` プロジェクトへリンクします。

```bash
yarn db:link -- --project-ref <your-dev-project-ref> -p <your-db-password>
```

3. SQL Editor / Dashboard で現在の `dev` スキーマを確認し、`supabase/migrations/` の baseline migration に反映します。

4. 必要であれば型を生成します。

```bash
yarn db:types
```

補足: `yarn db:pull` は Supabase CLI の実行環境によってはコンテナランタイムを要求します。このリポジトリでは初回取り込みの標準手順としては使いません。

### 以後の運用

- DB スキーマ変更は Supabase Console で直接行わず、migration 経由で管理する
- 新規 migration は `yarn db:new <name>` で作成する
- migration を `dev` へ適用する時は `yarn db:push` を使う
- 緊急対応で Supabase Console を直接変更した場合は、変更内容を migration に手で反映してリポジトリへ同期する
- RLS や policy は既存アプリの挙動確認後に別 migration で段階的に導入する

### 型管理の方針

- 現在のアプリでは `types/expense.ts` と `types/category.ts` の手書き型を利用しています
- 今後は `types/database.generated.ts` を生成元として併用し、段階的に置き換えます
- 今回は生成基盤のみ追加し、既存のアプリコードは最小変更に留めます
