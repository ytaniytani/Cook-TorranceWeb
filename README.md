# Cook-Torrance 完全理解

ゲームCGの標準シェーディングモデル **Cook-Torrance（GGX）** を、中学数学から一歩ずつ完全に理解するためのインタラクティブ教材です。

- 依存ライブラリ **ゼロ**（Three.js も使わず WebGL を直接利用）
- ビルド **不要**
- 完全 **オフライン** 動作

## 見かた

### PC（ダウンロードして開く）
1. このページ右上の緑の `Code` → `Download ZIP`
2. zip を解凍
3. `index.html` を **ダブルクリック** → ブラウザで開く

サーバーもネット接続も不要で全機能が動きます。

### スマホ（iPhone など・ダウンロード不要）
GitHub Pages を有効にすると、URL をタップするだけで開けます。

**設定（リポジトリで一度だけ）:**
1. `Settings` → 左メニュー `Pages`
2. Source を **Deploy from a branch**
3. Branch = `main` / フォルダ = `/ (root)` → Save
4. 数分後、次のURLで公開されます:
   `https://ytaniytani.github.io/Cook-TorranceWeb/`

※ リポジトリが public である必要があります（private で Pages を使うには有料プラン）。
ホーム画面に追加すればアプリのように使えます。

> GitHub のファイル一覧から `index.html` を直接クリックしてもソースが表示されるだけで動きません。上記の方法で開いてください。

## いま入っているもの（フェーズ1）

- **総合ビューポート**（`viewport.html`）
  - 球体・オービットカメラ（回転／ズーム、タッチ対応）
  - ベースカラー・ラフネス・メタリック・F0・ライト（平行光／点光源・色・強度・方向）
  - **環境（IBL）**：HDRI 環境マップ（Sky 751 / Sky 758）と 黒（環境なし）を切替。背景・鏡面反射・拡散の環境光に反映。環境強度スライダー付き
  - **項別表示**：Final / Diffuse / Specular / D / F / G / n·l を単独表示
  - **ピクセル検査**：球体をクリックすると、その点の内積・D・F・G・最終色まで全計算値を表示

  ※ HDRI は `fetch()` を使わずオフライン動作させるため、`.hdr` を RGBM 符号化して `js/envmap.js` に焼き込んでいます（`file://` でも動作）。
- 目次ページ（`index.html`）にライブプレビュー

第0〜12章の解説とウィジェットは順次追加予定です（`Cook-TorranceWeb_仕様書.md` 参照）。

## ファイル構成

```
index.html          目次 + ライブプレビュー
viewport.html       総合ビューポート
css/style.css       デザインシステム
js/glmini.js        最小WebGL（行列・球・カメラ・ピッキング）
js/shaders.js       GLSL（Cook-Torrance / GGX）
js/math.js          CPU版計算（シェーダと同一・検査用）
js/viewport.js      ビューポート本体（章で再利用）
```

## 実装している式

- D（法線分布）: GGX / Trowbridge-Reitz（α = roughness²）
- F（フレネル）: Schlick 近似
- G（幾何減衰）: Smith + Schlick-GGX（k = (roughness+1)²/8）
- Diffuse: Lambert（albedo / π）
- ライト: 1灯の解析的評価

オリジナルの Cook-Torrance（1982）が使った Beckmann 分布は第8章コラムで比較解説予定です。
