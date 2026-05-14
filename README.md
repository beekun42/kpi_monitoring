# GMS KPI Dashboard（MVP）

Excel 由来の KPI を `public/data/kpi-from-excel.json` から読み込み、React Flow で可視化するフロントのみのダッシュボードです。

## プロジェクトの場所（固定パス）

開発は次のフォルダを正とします（Cursor では **File → Open Folder** でこのフォルダを開いてください）。

`C:\Users\yosuke.akagi\kpi-dashboard`

以前 Cursor の Temp 配下にあったコピーは捨てて構いません。今後の編集・Git・デプロイはすべてここで行う想定です。

### 更新の反映（GitHub を正とする）

コードや `public/data/*.json` の変更は、**この PC で編集 → `git commit` → `git push` で GitHub の `main` に載せる**運用にします。Vercel と連携済みなら、`main` への push がトリガーで本番 URL も更新されます。

GitHub の Web 上だけで編集する必要はありません（ローカル＋push が分かりやすく、履歴も残りやすいです）。小さな修正をブラウザから直すこともできますが、通常の開発はローカル推奨です。

## ローカル

```bash
cd C:\Users\yosuke.akagi\kpi-dashboard
npm install
npm run dev
```

データを Excel から再生成する場合（Python 環境が必要）:

```bash
npm run export-kpi
```

---

## GitHub に載せる（手順を細かく）

前提: PC に [Git for Windows](https://git-scm.com/download/win) が入っていて、ターミナルで `git --version` が通ること。

### 1. GitHub 側で空のリポジトリを作る

1. ブラウザで [https://github.com](https://github.com) にログインする。
2. 右上の **+** → **New repository** を選ぶ。
3. **Repository name** に例: `kpi-dashboard` を入力する。
4. **Public** か **Private** を選ぶ（社外秘の数値を JSON に含むなら **Private** を推奨）。
5. **Add a README** など「初期ファイルを付ける」チェックは**すべてオフ**にする（ローカルに既にコードがあるため）。
6. **Create repository** を押す。

### 2. ローカルでリモートを登録して push する

このフォルダにはすでに `git init` と初回コミットが入っています。GitHub の作成直後に表示される画面の **「…or push an existing repository from the command line」** に近い流れで進めます。

PowerShell またはターミナルで:

```powershell
cd C:\Users\yosuke.akagi\kpi-dashboard
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

`<あなたのユーザー名>` と `<リポジトリ名>` は、手順 1 で作ったリポジトリの URL に合わせて**必ず実際の文字列に置き換え**てください（例: `https://github.com/beekun42/kpi_monitoring.git`）。プレースホルダのまま `add` すると push 先が間違います。

- **`error: remote origin already exists`** と出たら、`add` は使わず次で URL を差し替えます。  
  `git remote set-url origin https://github.com/<ユーザー名>/<リポジトリ名>.git`  
  現在の設定を確認するには `git remote -v`。
- `origin` を消してから付け直す場合: `git remote remove origin` のあと `git remote add origin ...`。
- `git push` で認証を求められたら、GitHub の案内に従います。HTTPS の場合は **Personal Access Token**（classic で `repo` 権限）をパスワードの代わりに使うことが多いです。GitHub CLI や **Git Credential Manager** を使う方法もあります。

push が成功すると、GitHub のリポジトリページにソースコードが表示されます。

### 3. 以降の日常作業

コードを変えたあと:

```powershell
cd C:\Users\yosuke.akagi\kpi-dashboard
git add -A
git status
git commit -m "変更内容が分かる日本語や英語の一言"
git push
```

---

## Vercel で公開する（手順を細かく）

このアプリは **Neon 不要**の静的サイトです。`vercel.json` で `npm run build` と出力先 `dist` を指定済みです。

### 1. Vercel にログインする

1. [https://vercel.com](https://vercel.com) を開く。
2. **Sign Up** または **Log In** で **GitHub アカウントと連携**してログインする（GitHub のリポジトリ一覧を読むため）。

### 2. プロジェクトを新規作成する

1. ダッシュボードで **Add New…** → **Project**（または **Import Project**）。
2. **Import Git Repository** の一覧から、先ほど push した **`kpi-dashboard`（リポジトリ名は環境による）** を選ぶ。見つからない場合は **Adjust GitHub App Permissions** でリポジトリへのアクセスを追加する。
3. **Framework Preset** が **Vite** と出ていればそのまま。**Build Command** が `npm run build`、**Output Directory** が `dist` になっているか確認する（`vercel.json` があるので通常は自動で合う）。
4. **Environment Variables** は、パスワード不要なら空のままでよい。パスワード保護を使う場合は後述の **`SITE_PASSWORD`** を追加する。
5. **Deploy** を押す。

### 3. 公開 URL を確認する

ビルドが成功すると **Congratulations** のような画面に **Visit** や本番 URL（例: `https://kpi-dashboard-xxx.vercel.app`）が表示されます。その URL を共有すると、他の人もブラウザから同じ画面を見られます。

### 4. 以降の自動デプロイ

GitHub の **main** ブランチに `git push` するたびに、Vercel が自動で再ビルド・本番反映することが多いです（連携時のデフォルト設定のままの場合）。

### 5. CLI で試す（任意）

```bash
cd C:\Users\yosuke.akagi\kpi-dashboard
npx vercel
```

ブラウザでログインを求められたら従い、プレビュー用 URL が発行されます。

---

## パスワード保護（`SITE_PASSWORD`）

Vercel の **Routing Middleware** と **Edge Function**（`/api/login`・`/api/logout`）で、共有用 URL に簡易的なパスワード壁をかけられます。

### 挙動

- Vercel の **Environment Variables** に **`SITE_PASSWORD`** を設定すると有効になります（値はサイト用のパスワード。英数字＋記号の長めを推奨）。
- 未設定のときは従来どおり **誰でもアクセス可能**です。
- 有効時は、未ログインのブラウザは **`/login.html`** に誘導されます。正しいパスワードでログインすると **HttpOnly Cookie**（約 7 日）が付き、`/`・`/data/*`・`/assets/*` などへアクセスできます。
- アプリ上部に **「ログアウト」** が出ます（`SITE_PASSWORD` を **ビルド時**に読める必要があるため、Vercel では変数のスコープで **Production / Preview の Build** にも含めてください）。

### ローカル（`npm run dev`）について

Vite の開発サーバでは **Vercel の middleware は動きません**（ローカルでは URL を知っていればガードなし）。パスワード付きの挙動を PC で試すには:

```bash
npx vercel dev
```

`.env.local` に `SITE_PASSWORD=...` を書くと、`vercel dev` および Vite ビルド時の「ログアウト表示」に使えます。テンプレートは `.env.example` を参照してください。

### 注意

- パスワードは **サーバー側の環境変数**のみに置き、リポジトリにコミットしないでください。
- Cookie 署名にも同じ秘密を使っているため、**`SITE_PASSWORD` を変えると既存のログインセッションは無効**になります。

---

### Neon について

手元の `mountaineering` のように **サーバー＋Postgres** が要る構成ではありません。ビルド時に `public/data/` の JSON が `dist/` にコピーされ、静的ファイルとして配信されます。将来、認証付き API で KPI を配信したくなったときに Neon 等を足す、という形が自然です。

### 注意（機密データ）

`public/data/kpi-from-excel.json` を **パブリック GitHub + Vercel** に載せると、URL を知っている人なら誰でも JSON を取得できます。社外秘の数値の場合は **非公開リポジトリ**にするか、Vercel の [Deployment Protection](https://vercel.com/docs/security/deployment-protection) や別の認証レイヤーを検討してください。本リポジトリの **`SITE_PASSWORD`** は「未ログインからのぞき見」を防ぐ簡易壁であり、**ログイン済みユーザーは引き続き JSON を取得できます**。
