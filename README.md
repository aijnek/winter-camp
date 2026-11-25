# winter-camp

Claude のデスクトップアプリとモバイルアプリの背景を、冬の晴れた夜のキャンプ場の風景にする mod です。山並みの上に星空と月が広がり、手前にテントとロードバイクがあります。

セッションの context 利用率が風景に反映されます。

- 月は 0% で細い三日月、100% で満月になります。
- 月が満ちるほど空と雪面が明るくなり、暗い星から順に見えなくなります。天の川も薄れます。
- 流れ星がときどき流れます。位置と向きは背景を描き直すたびに変わります。

配色は紺色の暗い色調に固定しています。ターミナルとエディタでは背景は描かれません。

## インストール

ターミナルのセッションのプロンプトで次を入力します。

```
/plugin install winter-camp --marketplace aijnek/winter-camp
```

シェルからは次のとおりです。

```bash
claude plugin install winter-camp --marketplace aijnek/winter-camp
```

デスクトップアプリでは、入力欄の横の + から Plugins を開き、Add marketplace に `aijnek/winter-camp` を指定してから Add plugin を選びます。

インストール後に始めたセッションから有効になります。

## 外し方

```bash
claude plugin uninstall winter-camp
```

## 構成

- `hooks/register.tsx` は配色と背景を設定し、context 利用率を受け取ります。
- `hooks/scene.ts` は風景の SVG を組み立てます。絵を変えるときはここを編集します。
- `hooks/make-colors.js` は Claude Code の plugin-authoring スキルに付属する配色の補助コードです。

## ライセンス

MIT
