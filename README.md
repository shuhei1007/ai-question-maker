# KIKUMON — 質問文メーカー

学習内容・実現したいこと・エラー・試したこと・コードを入力すると、ChatGPTへそのまま貼り付けられる質問文を生成するReactアプリです。

## 起動方法

```bash
npm install
npm run dev
```

ターミナルに表示されたローカルURLをブラウザで開いてください。

## コマンド

- `npm run dev` — 開発サーバーを起動
- `npm run build` — 型チェックと本番ビルド
- `npm run preview` — 本番ビルドをローカルで確認

## 主な機能

- 4種類の目的別テンプレートから質問文をリアルタイム生成
- 必須入力・空白・文字数上限のチェック
- コピー成功・失敗のフィードバック表示
- `localStorage`への下書き自動保存と復元
- 入力例の自動セットと、保存済み下書きを含む一括削除
- 入力進捗の表示
- 長い文章・コードを含むスマートフォン表示への対応
- GoogleフォームとInstagramへの案内導線

入力内容はブラウザ内だけで処理され、そのブラウザの`localStorage`に保存されます。外部サーバーには送信されません。

## 外部リンクの設定

プロジェクト直下に`.env.local`を作成し、実際のリンクとアカウント名を設定してください。

```env
VITE_FEEDBACK_FORM_URL=https://forms.gle/x7LW7Mkpqso79owGA
VITE_INSTAGRAM_URL=https://www.instagram.com/shuhei_mikeiken_eng/
VITE_INSTAGRAM_HANDLE=しゅうへい│携帯店員からWebエンジニア
```

現在の公開URLと表示名は既定値として組み込まれています。環境変数を設定すると、コードを変更せず別のリンクや表示名へ差し替えられます。
