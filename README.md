# GMS KPI Dashboard（MVP）

Excel 由来の KPI を `public/data/kpi-from-excel.json` から読み込み、React Flow で可視化するフロントのみのダッシュボードです。

## ローカル

```bash
npm install
npm run dev
```

データを Excel から再生成する場合（Python 環境が必要）:

```bash
npm run export-kpi
```

## 他の人に URL で見せる（GitHub + Vercel）

手元の `mountaineering` プロジェクトと同様に、**GitHub に push → Vercel でそのリポジトリを import** すれば公開 URL が発行されます。

1. **GitHub** に空のリポジトリを作り、このフォルダを push する（`node_modules` は含めない）。
2. [Vercel](https://vercel.com/) にログインし、「Add New… → Project」でそのリポジトリを選ぶ。
3. **Root Directory** がリポジトリ直下でこのアプリだけならそのまま。モノレポの場合は `kpi-dashboard` を Root に指定する。
4. Framework は自動で **Vite** と認識されることが多い。手動なら **Build Command** `npm run build`、**Output Directory** `dist`（リポジトリに `vercel.json` があるので通常はそのまま）。
5. Deploy 後に表示される `https://….vercel.app` を共有する。

プレビュー用に CLI を使う場合:

```bash
npx vercel
```

### Neon について

登山アプリのように **サーバー＋Postgres** が要る構成ではありません。現状はビルド時に `public/data/` の JSON が `dist/` にコピーされ、静的ファイルとして配信されます。

将来、**認証付き API で KPI を配信**したくなったときに Neon 等の DB とサーバーレス関数を足す、という形が自然です。

### 注意（機密データ）

`public/data/kpi-from-excel.json` を **パブリック GitHub + Vercel** に載せると、URL を知っている人なら誰でも取得できます。社外秘の数値の場合は **非公開リポジトリ**にするか、Vercel の [Deployment Protection](https://vercel.com/docs/security/deployment-protection) や別の認証レイヤーを検討してください。
