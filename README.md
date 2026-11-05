# せかいを しる（単独アプリ）
- 構成：index.html / sekai.js（出題エンジン・教科書ユニット・イラスト/声/おかね/かぞく同期）/ ill/（ChatGPTで描いた絵 240点）/ voice/（VOICEVOX:ずんだもん・index.json）/ sw.js / manifest
- 教科書：算数 啓林館『わくわく さんすう1』p76〜、国語 東京書籍『新しいこくご 一下』p49〜（娘の書き込み位置から）。メモは ../教科書メモ/
- おかね：1問5円。たんまつごとの「ためた額」＋「つかった記録」で管理（かぞく同期しても増減しない）。おうちの人画面（暗証番号）で現金に替えた分を記録
- かぞく同期：Supabase sowers-gym に sekai_ 接頭辞で相乗り。SQL＝../supabase/2026-11-05_sekai_family.sql（木原さんがRun）
- ほかのゲームから：sekaiWallet() で残高、sekaiSpend(円, 理由) で支払い
