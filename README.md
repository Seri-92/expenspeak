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

## 月次集計

`/monthly-allocation` で、手取りを受け取った月を選択します。
たとえば2026年8月を選ぶと、8月の二人の手取りから、SSYの7月の対象支出と7月分の固定費を差し引いて二等分します。

- 収入は一人ずつ保存できます。既存の `/incomes` も同じ入力・保存部品を使用します。
- 変動費は食費・日用品・外で仕事にかかるお金の3分類だけを、日本時間の前月初日以上・当月初日未満で集計します。明細は分類ごとに開けます。
- 固定費は家賃・電気代・ガス代・水道代・インターネット代を、支出とは別に一項目ずつ保存します。保存対象は支払月ではなく、画面に表示された「何月分」かです。
- 未入力は0円と区別します。手取り2人分と固定費5項目がそろうまで取り分は入力待ちになります。請求がない固定費は0円を明示的に保存します。
- 取り分は1円単位で切り捨て、余り1円は残額として表示します。赤字の場合は不足額と1円単位で切り上げた一人あたり負担額を表示します。
- 締め・確定は行わず保存済みの内容から計算します。別端末の更新はページの再読み込みで反映します。

初回利用前に `20260905000000_monthly_allocation.sql` を **devプロジェクト** に適用してください。
このmigrationは `monthly_fixed_costs` と `monthly_allocation_settings` を追加し、既存の収入・支出データは変更しません。
SSYに対象3分類が名称一致で存在する場合は集計設定を作成します。名称が異なる場合は初回の集計画面で分類を選びます。
設定はグループIDと分類IDで保持するため、その後に名前を変更しても対象は維持されます。

Supabase CLIにログインしたうえで、`supabase projects list` でリンク先がdevであることを確認し、
`supabase db push --dry-run` で未適用migrationを確認してから `yarn db:push` で反映してください。
生成型を更新する場合は適用後に `yarn db:types` を使用します。

## 初期データ投入

`db/dev_seed.sql` に `dev` 環境向けのサンプルSQLを用意しています。  
Supabase Dashboard の SQL Editor で `dev` プロジェクトに対して実行してください。

## 管理者設定

`/admin` は `public.users.role = 'admin'` のユーザーだけが利用できます。  
初回は Supabase Dashboard の SQL Editor で対象プロジェクトを確認してから、次のように管理者を設定してください。

```sql
update public.users
set role = 'admin'
where email = 'your-email@example.com';
```

`dev` と `prod` は別プロジェクトなので、管理者設定もそれぞれの Supabase プロジェクトで個別に行います。

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
