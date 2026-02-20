# Agents.md

## 目的
このリポジトリで作業するエージェント向けの最小ガイドです。実装・修正時は既存構成に合わせ、不要な大規模リファクタは避けてください。

## プロジェクト概要
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- UI: Tailwind CSS + Radix UI 系コンポーネント
- Auth/Data: Supabase
- Test: Vitest + Testing Library

## 主要コマンド
- 依存関係インストール: `yarn install`
- 開発サーバー: `yarn dev`
- Lint: `yarn lint`
- Test: `yarn test`
- Build: `yarn build`

## 主要ディレクトリ
- `app/`: ページ・ルート定義
- `components/`: UI/カスタムコンポーネント
- `lib/`: 共通ロジック（auth/supabase/utils）
- `types/`: 型定義
- `__tests__/`: テストコード

## 作業ルール
- 変更は必要最小限にし、関連しないファイルは触らない。
- 既存の命名規則・実装スタイルを優先する。
- 新しいロジック追加時は、可能ならテストを追加する。
- 検証として `yarn lint` と `yarn test` を優先して実行する。
- Docker を使わないため、ローカル開発は Supabase `dev` プロジェクト接続を前提にする。
- `.env.local` は `.env.local.example` をベースに作成し、秘密情報はコミットしない。

## 注意点
- Supabase 関連の動作は `.env.local` の設定に依存します。
- 認証関連の修正時は `app/auth/callback/route.ts` と `lib/auth.ts` の整合性を確認してください。
- `prod` と `dev` の Supabase プロジェクトを分離し、開発時に `prod` を参照しない。
