# 仙台空港アクセス線アプリ (SAAL App)

仙台空港アクセス線の8駅（仙台、長町、太子堂、南仙台、名取、杜せきのした、美田園、仙台空港）を確認するための非公式Webアプリです。

このアプリは仙台空港鉄道、JR東日本、仙台市交通局、名取市などの事業者とは無関係です。収録データの内容について、各事業者へ問い合わせないでください。

## 主な機能

- 縦型路線図と、列車のリアルタイム表示
- 駅ごとの電光掲示板（LED発車標）の再現
- 仙台空港アクセス線、東北本線、常磐線の時刻表と列車詳細
- 仙台市地下鉄、仙台市営バス、なとりん号への乗り換え案内
- 運賃表

## 開発環境

React、TypeScript、Vite、Tailwind CSS、HeroUIによる構成です。時刻表データの生成スクリプトにはPython 3、本アプリの開発とこの README の作成には生成AIを使っています。

```bash
npm install
npm run dev
npm run build
```

`npm run dev` は、ポート5173で開発サーバーを起動します。

## データの出典

### 列車の所定両数

列車の所定両数は鉄道運用Hub「JR東日本 仙台地区」のデータをもとにしています。仙台〜名取間を走行する列車の所定両数を抜粋し、アプリ用のJSONへ変換して使っています。

- 鉄道運用Hub: <https://unyohub.2pd.jp/>
- データ入力担当: いずみ茶 氏
- 運用表の原典: むねむねエクスプレス 氏（<https://munexpress.web.fc2.com/index.html>）
- ライセンス: 運用表は CC BY-NC 4.0（<https://creativecommons.org/licenses/by-nc/4.0/deed.ja>）、そのほかの時刻表・編成表データは CC BY 4.0（<https://creativecommons.org/licenses/by/4.0/deed.ja>）

運用表には非営利利用の条件が付いているため、このアプリでは営利利用を行いません。

### そのほかのデータ

- 全駅の着発時刻: Yahoo!路線情報（<https://transit.yahoo.co.jp/>）
- 列車の番線と公式列車番号: JR東日本デジタル時刻表（<https://timetables.jreast.co.jp/>）
- 運賃表: 仙台空港鉄道 運賃情報（<https://www.senat.co.jp/fare/>）をもとに作成
- 仙台市地下鉄の時刻表: 仙台市地下鉄のダイヤCSV（令和5年7月1日改正、<https://www.city.sendai.jp/joho-kikaku/shise/security/kokai/opendata_example.html>）
- なとりん号の時刻表と運賃: 名取市コミュニティバス「なとりん号」のGTFSデータ（2025年4月15日版、<https://miyagi.dataeye.jp/resources/32285>）
- 仙台市営バスの発車時刻: 本アプリ作者が開発した Sendai Bus Map V2（<https://busmap.haruday0.live/>）のAPIから取得
- 案内用図記号: JIS Z 8210（案内用図記号）の形状に準拠した独自のSVGコンポーネント（参考: 交通エコロジー・モビリティ財団 <https://www.ecomo.or.jp/>）

表示される運賃や時刻は参考情報です。正確な運賃と運行情報は、仙台空港鉄道やJR東日本などの公式サイトでご確認ください。

## ライセンス

- ソースコード: MIT License（[LICENSE](./LICENSE) をご覧ください。`src/data/` 内のデータファイルは対象外です）
- 電光掲示板の再現ドットデータ（`src/data/stationLedData.json`）: CC BY-NC 4.0（<https://creativecommons.org/licenses/by-nc/4.0/deed.ja>）。実駅の発車標表示を参考に独自に再現したデータであり、鉄道事業者や表示装置メーカーとは無関係です。出典の明記と非営利利用を条件に利用できます。
- 列車の所定両数（`src/data/trainSchedule.json` と `src/data/stationDepartures.json` に含まれる両数）: 鉄道運用Hubの運用表をもとにしているため、CC BY-NC 4.0 の条件に従います。出典は「列車の所定両数」の節をご覧ください。
- 仙台市地下鉄・なとりん号のデータ（`src/data/subwaySchedule.json`、`src/data/natoringoSchedule.json`）: それぞれのオープンデータ（CC BY 4.0、<https://creativecommons.org/licenses/by/4.0/deed.ja>）をJSON形式へ変換して収録しています。
- 運賃・着発時刻・番線・列車番号（`src/data/stationFares.json`、および `src/data/trainSchedule.json`・`src/data/stationDepartures.json` の両数以外）: 公式サイトや時刻表情報をもとに作成した参考データであり、各出典元の利用条件に従います。
