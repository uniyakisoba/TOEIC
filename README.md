# TOEIC 単語トレーナー

TOEIC 730点を目指すための単語学習 Web アプリ（PWA）。仕様は [docs/SPEC.md](docs/SPEC.md) を参照。

## 開発コマンド
| コマンド | 内容 |
|---|---|
| `npm install` | 必要なライブラリをインストール |
| `npm run dev` | 開発用サーバーを起動（保存すると即反映） |
| `npm run build` | 型チェック＋公開用ファイルを `dist/` に生成 |
| `npm run preview` | ビルド結果を手元で確認 |

## 公開
`main` ブランチに push すると GitHub Actions が自動でビルドし、GitHub Pages に公開する。
