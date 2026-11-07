# 蘇菲の存鑽與存歌 — GitHub Pages 完整版 v2

## 上傳方式
1. 解壓 ZIP，將裡面的 `index.html`、`copyright.html`、`script.js`、`style.css` 和 `assets` 資料夾 **全部** 上傳至 GitHub Repository 根目錄。
2. GitHub → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save。
3. 若替換已上線網站，請整批覆蓋舊檔案。此版本已將 HTML 引用的靜態資源版本號更新為 v2，以減少舊 CSS/JS 快取。

## Google Sheets
- 資料網址：https://docs.google.com/spreadsheets/d/1VedCZeT903VN71HMJ9zK1w1MNROpfxoZmTwAPhNWZL4/edit
- `script.js` 內 `SHEET_GID=0` 指定資料工作表。若改用其他分頁請更新 gid。
- **A～G** 是網站展示欄位，**第 1 列 A～G 是表頭**：帳號、名字、歌、試音、鑽、單、更新時間；顯示時會優先使用試算表表頭，必要時用這七個已確認的欄名回填，避免數字欄位表頭消失。
- A 有帳號或 B 有名字的資料列都會顯示，搜尋同時比對 **A 欄帳號**、**B 欄名字**，不區分大小寫。
- L 欄放 `網站標題`、`網站小標題` 等設定名稱；M 欄放相應的網站文字。這兩欄僅用於設定，不顯示於表格。
- Google Sheets 需開放「知道連結的任何人可檢視」，資料會公開於網站。

## 更新規則
- **只有重新整理頁面（或首次開啟）時才讀取一次**，不再每 20 秒或切換分頁自動更新。
- 新頁面會先顯示載入中，不會保留上一輪資料；資料取得使用無快取參數及 `cache:no-store`。
- 先嘗試 CSV，失敗才使用 Google Visualization JSONP；失敗則顯示錯誤、不套用舊表格資料。
- 請注意 Google 本身的資料同步延遲不受前端控制；瀏覽器端可以避免沿用舊網站資料，但不能絕對保證 Google 每一筆編輯在刷新當下立即同步。

## 字體與原版相符
沿用原始範例的 Google Fonts（`Ma Shan Zheng` / `Noto Sans TC` / `Noto Serif TC`），回復原本主要的字體選用與標題字級，保留蘇菲深紫玫瑰背景。

© 2026 LionLionTomato. All Rights Reserved.
