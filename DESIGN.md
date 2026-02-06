# Expenspeak 設計ドキュメント

## 概要

Expenspeakは、個人の支出を管理するためのWebアプリケーションです。Next.js 14（App Router）とSupabaseを使用して構築されており、ユーザーは支出を追加、表示、フィルタリングすることができます。

## アーキテクチャ

### 技術スタック

#### フロントエンド
- **Next.js 14**: React フレームワーク（App Router使用）
- **TypeScript**: 型安全性を提供
- **React 18**: UIライブラリ
- **Tailwind CSS**: スタイリング
- **shadcn/ui**: UIコンポーネントライブラリ
  - Radix UI をベースにしたアクセシブルなコンポーネント
  - Card, Button, Input, Select, Dialog, Label, Popover などを使用

#### バックエンド
- **Supabase**: BaaS（Backend as a Service）
  - PostgreSQL データベース
  - 認証（Google OAuth）
  - REST API（現在使用中）

#### 開発ツール
- **Vitest 3.0.5**: テストフレームワーク（高速なユニットテスト）
- **ESLint**: コード品質チェック
- **TypeScript 5**: 型チェック

### プロジェクト構造

```
expenspeak/
├── app/                      # Next.js App Router
│   ├── page.tsx             # ホームページ（最新3件の支出表示）
│   ├── ExpenseList.tsx      # 支出リストと追加フォーム
│   ├── layout.tsx           # ルートレイアウト
│   ├── login/               # ログインページ
│   │   └── page.tsx
│   ├── expenses/            # 支出一覧ページ
│   │   └── page.tsx         # フィルタリング機能付き
│   ├── auth/                # 認証コールバック
│   │   └── callback/
│   └── globals.css          # グローバルスタイル
├── components/              # Reactコンポーネント
│   ├── ui/                  # shadcn/uiコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── ...
│   └── custom/              # カスタムコンポーネント
│       ├── ProtectedRoute.tsx      # 認証保護
│       ├── ExpenseListDisplay.tsx  # 支出リスト表示
│       └── multi-select.tsx        # マルチセレクト
├── lib/                     # ユーティリティとクライアント
│   ├── supabaseClient.ts    # Supabaseクライアント設定
│   ├── auth.ts              # 認証ヘルパー
│   └── utils.ts             # 汎用ユーティリティ
├── types/                   # TypeScript型定義
│   ├── expense.ts           # Expense, ExpenseCategory型
│   ├── category.ts          # Category型
│   └── index.ts             # 型のエクスポート
└── __tests__/               # テストファイル
    └── expenses/
        └── page.test.tsx
```

## データモデル

### データベーススキーマ

#### テーブル: `expenses`
支出情報を格納するメインテーブル

| カラム      | 型        | 説明               |
|-------------|-----------|-------------------|
| id          | number    | 主キー（自動生成）  |
| amount      | number    | 支出金額           |
| description | string    | 支出の説明         |
| date        | string    | 支出日（ISO 8601） |

#### テーブル: `categories`
支出のカテゴリー情報

| カラム | 型     | 説明               |
|--------|--------|-------------------|
| id     | number | 主キー（自動生成）  |
| name   | string | カテゴリー名       |

#### テーブル: `expense_categories`
支出とカテゴリーの多対多リレーションシップ

| カラム      | 型     | 説明                          |
|-------------|--------|------------------------------|
| expense_id  | number | 外部キー（expenses.id）       |
| category_id | number | 外部キー（categories.id）     |

### TypeScript型定義

```typescript
// types/expense.ts
interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
}

interface ExpenseCategory {
  expense_id: number;
  category_id: number;
}

// types/category.ts
interface Category {
  id: number;
  name: string;
}
```

## 主要機能

### 1. 認証システム

#### 技術
- Supabase Auth を使用した Google OAuth 認証
- セッションベースの認証管理

#### 実装
- **ログインページ** (`app/login/page.tsx`): Googleログインボタン
- **認証ヘルパー** (`lib/auth.ts`): OAuth フロー処理
- **保護ルート** (`components/custom/ProtectedRoute.tsx`): 
  - 未認証ユーザーをログインページにリダイレクト
  - セッションチェック

### 2. 支出管理

#### 支出の追加
- **場所**: ホームページ (`app/page.tsx` と `app/ExpenseList.tsx`)
- **機能**:
  - 金額、日付、説明、カテゴリーを入力
  - Supabaseに新規支出を挿入
  - カテゴリーとの関連付け
  - 追加後、リストを自動更新

#### 支出の表示
2つの表示モード:

1. **ホームページ** (`app/page.tsx`)
   - サーバーサイドレンダリング（SSR）
   - 最新3件の支出を表示
   - `ExpenseListDisplay` コンポーネントで表示

2. **支出一覧ページ** (`app/expenses/page.tsx`)
   - クライアントサイドレンダリング（CSR）
   - 全支出の詳細表示
   - フィルタリング機能付き

### 3. フィルタリング機能

#### 月別フィルター
- 月選択入力（`<input type="month">`）
- 選択した月の支出のみを表示
- タイムゾーン調整（JST対応）

#### カテゴリーフィルター
- マルチセレクトコンポーネント（`components/custom/multi-select.tsx`）
- 複数カテゴリーの同時選択
- 選択されたカテゴリーに属する支出のみを表示

#### 実装詳細
```typescript
// app/expenses/page.tsx
// 1. カテゴリーIDから expense_id を取得
// 2. 月の範囲でフィルター（gte/lte）
// 3. カテゴリーフィルターが設定されている場合は in 句で絞り込み
```

### 4. 集計機能

- **合計金額表示**: フィルター条件に基づいた支出の合計を計算
- **リアルタイム更新**: フィルター変更時に自動再計算

## コンポーネント設計

### カスタムコンポーネント

#### `ProtectedRoute`
```typescript
// 認証チェックを行い、未認証の場合はリダイレクト
- useEffect でセッション確認
- ローディング状態の管理
- 認証済みの場合のみ children をレンダリング
```

#### `ExpenseListDisplay`
```typescript
// 支出リストを表示する再利用可能なコンポーネント
- props: expenses[], limit?
- limit が指定されている場合は制限付きで表示
- Card コンポーネントで各支出を表示
```

#### `MultiSelect`
```typescript
// 複数選択可能なドロップダウン
- Radix UI の Popover と Command を使用
- 選択状態の管理
- バッジ表示で選択項目を視覚化
```

### UIコンポーネント（shadcn/ui）

再利用可能なコンポーネントライブラリ:
- **Card**: コンテンツのカード表示
- **Button**: アクション用ボタン
- **Input**: フォーム入力
- **Select**: ドロップダウン選択
- **Label**: フォームラベル
- **Dialog**: モーダルダイアログ
- **Popover**: ポップオーバー

すべてのコンポーネントは:
- アクセシビリティ対応
- Tailwind CSS でスタイリング
- カスタマイズ可能なバリアント

## データフロー

### 支出の追加フロー
```
1. ユーザーがフォームに入力
2. クライアント側でバリデーション
3. Supabase に INSERT リクエスト
4. expense_categories テーブルに関連付けを追加
5. 最新データを再フェッチ
6. UI を更新
```

### 支出の表示フロー（ホームページ）
```
1. サーバーサイドで Supabase からデータフェッチ
2. SSR で初期 HTML を生成
3. クライアントでハイドレーション
4. ProtectedRoute で認証チェック
```

### 支出の表示フロー（一覧ページ）
```
1. ページマウント時にカテゴリーをフェッチ
2. フィルター条件に基づいて支出をフェッチ
3. useEffect でフィルター変更を監視
4. フィルター変更時に自動再フェッチ
5. UI を更新
```

## 状態管理

### クライアントサイド状態
- **React useState**: ローカル状態管理
  - 支出リスト
  - フォーム入力値
  - フィルター条件
  - ローディング状態

### サーバーサイド状態
- **Supabase**: データベース状態
- **Next.js SSR**: 初期データの事前フェッチ

## セキュリティ

### 認証・認可
- Google OAuth による認証
- Supabase セッション管理
- ProtectedRoute による保護
- 環境変数による機密情報の管理

### データ保護
- TypeScript による型安全性
- クライアント側バリデーション
- Supabase RLS (Row Level Security) 対応可能

## パフォーマンス最適化

### レンダリング戦略
- **ホームページ**: サーバーサイドレンダリング（SSR）
  - React Server Components による初期表示の高速化
  - SEO 最適化
  - サーバーでのデータフェッチ
- **一覧ページ**: クライアントサイドレンダリング（CSR）
  - インタラクティブなフィルタリング
  - 動的な状態管理

### 最適化技術
- **Next.js App Router**: 自動コード分割
- **React Server Components**: サーバーサイドでのコンポーネントレンダリング
- **Next.js Image**: 画像最適化（将来的に使用可能）
- **クエリ最適化**: 必要なフィールドのみ SELECT
- **リスト制限**: ホームページで最新3件のみ表示

## テスト戦略

### テストフレームワーク
- **Vitest**: 高速なユニットテスト
- **Testing Library**: React コンポーネントテスト

### テストカバレッジ
現在のテスト:
- 支出一覧ページの初期表示テスト
- 月選択フィルターのテスト
- Supabase モックによる統合テスト

### テスト例
```typescript
// __tests__/expenses/page.test.tsx
- 初期表示で現在の月がセットされている
- 月選択を変更すると state が更新される
```

## 開発ワークフロー

### 開発環境
```bash
yarn dev          # 開発サーバー起動
yarn build        # プロダクションビルド
yarn start        # プロダクションサーバー起動
yarn lint         # ESLint 実行
yarn test         # テスト実行
```

### 環境変数
```
NEXT_PUBLIC_SUPABASE_URL      # Supabase プロジェクト URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase 匿名キー
```

## 今後の拡張可能性

### 機能拡張
- 支出の編集・削除機能
- 統計・グラフ表示
- 予算設定と通知
- カテゴリー管理機能
- エクスポート機能（CSV, PDF）
- 収入管理機能

### 技術的改善
- リアルタイムデータ同期（Supabase Realtime）
- オフライン対応（PWA）
- パフォーマンスモニタリング
- E2E テストの追加
- CI/CD パイプラインの構築

## デザインパターン

### コンポーネント設計パターン
- **Container/Presentational Pattern**: 
  - ページコンポーネント: データフェッチとロジック
  - Display コンポーネント: プレゼンテーション
- **Compound Components**: shadcn/ui コンポーネント
- **Custom Hooks**: 将来的に追加可能

### コード構成原則
- **関心の分離**: UI、ロジック、データアクセスの分離
- **再利用性**: 汎用コンポーネントの作成
- **型安全性**: TypeScript による厳格な型チェック
- **単一責任の原則**: 各コンポーネントは単一の責任を持つ

## まとめ

Expenspeakは、モダンなWebアプリケーションのベストプラクティスに従った設計となっています:

1. **モダンなスタック**: Next.js 14 + Supabase
2. **型安全性**: TypeScript による堅牢なコード
3. **コンポーネントベース**: 再利用可能なUIコンポーネント
4. **レスポンシブデザイン**: Tailwind CSS による柔軟なスタイリング
5. **認証統合**: Supabase Auth によるセキュアな認証
6. **テスタブル**: Vitest によるテストサポート

このアーキテクチャにより、機能追加やメンテナンスが容易で、スケーラブルなアプリケーションとなっています。
