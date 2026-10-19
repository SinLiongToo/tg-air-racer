# 🏎️ 台語賽車衝衝衝！ (Tâi-gí Chhiong-chhiong-chhiong!)

> **空氣噴氣賽車學台語 · 8大台灣實景名勝 · 倒頭栽吸力 · 收集台語字卡 · 阿公ㄟ車庫改裝**  
> 依據教育部《臺灣閩南語常用詞辭典》與標準台羅 (Tâi-lô) 設計，受知名物理童書遊戲 [Blast Racer (The Car That Blasts Air)](https://lioneer32232002-commits.github.io/kids-picture-books/aircar/play.html) 啟發打造。

---

## 🎨 參考專案圖形生成原理解析 (How Reference Graphics Were Produced)

本遊戲核心物理模型靈感來自童書科技遊戲 [Blast Racer](https://lioneer32232002-commits.github.io/kids-picture-books/aircar/play.html)。在此特別解析參考專案的圖形生成原理，以及本專案如何解決顯示問題並以 AI 全面重繪昇華：

### 1. 原版參考專案的雙重繪圖架構
原版 Blast Racer 在底層設計了**兩套並行的圖形渲染體系**：
1. **實體水彩繪本掃描原畫 (Physical Watercolor Storybook Art)**：
   * 原作者為兒童科普繪本《The Car That Blasts Air》繪製了實體水彩手繪插畫（包含噴氣車、人物與山林背景）。
   * 將原稿掃描、去背並轉檔為 WebP 圖檔（如 `img/zip.webp`、`img/dash.webp`、`img/rio.webp`），在標準 HTTP/HTTPS 伺服器環境下供 Phaser 3 載入顯示。
2. **程序化向量/幾何安全回退機制 (Procedural Canvas/Vector Fallback)**：
   * 在程式碼 `Boot.create()` 中，原作者寫了應急回退函式 `fake(k, w, h, draw)`。
   * 若偵測到圖片不存在（`!this.textures.exists(k)`），Phaser 會利用 HTML5 Canvas 幾何繪圖指令動態繪製幾何圖形：
     * 賽車車身：`fillRoundedRect(10, 40, 240, 70, 34)`
     * 輪胎車燈：`fillCircle(64, 112, 26)`、`fillCircle(228, 66, 12)`
     * 交通錐：`fillTriangle(40, 4, 8, 86, 72, 86)`
     * 天空背景：`fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xe8f7ff, 0xe8f7ff, 1)`

### 2. 為何一開始在本地開啟會變成「死板的 SVG 幾何圖」？
* 當使用者直接在 Windows 檔案總管按兩下開啟 `index.html`（網址開頭為 `file:///`）時，現代瀏覽器（Chrome、Edge）基於**同源安全政策（CORS Sandbox）**，會強制阻擋本地端相對路徑的圖片 fetch/XHR 讀取請求。
* 這導致 Phaser 的資源載入器默默判定載入失敗，進而**觸發了上述的 `fake(...)` 程序化幾何繪圖**！
* 玩家看到的其實並非原本的水彩繪本插畫，而是瀏覽器臨時用圓角矩形、三角形拼湊出來的扁平向量線框，因此視覺感受顯得硬冷、死板。

### 3. 本專案的突破與 AI 昇華重繪
本專案透過兩大關鍵革新徹底解決問題，並完成台灣本土化重塑：
1. **Base64 雙離線封裝（Zero-CORS Architecture）**：
   * 將所有圖檔編碼為 Base64 Data URI，儲存於 [assets_data.js](file:///c:/Users/tu-hs/OneDrive/文件/2022_0308_MASA/2022-0708/Projects_antigravity/TG%20_RACE/assets_data.js) 與 [audio_data.js](file:///c:/Users/tu-hs/OneDrive/文件/2022_0308_MASA/2022-0708/Projects_antigravity/TG%20_RACE/audio_data.js)。
   * Data URI 具備零跨域限制特性，無論在 `file:///` 本地雙擊或 GitHub Pages 上皆能 100% 正常渲染原畫、播放真人語音。
2. **AI 童書水彩生圖工程（AI Bespoke Taiwan Storybook Art）**：
   * 脫離原版通用的奇幻噴氣車，使用專屬 2D 正側面（Orthogonal Profile）Prompt 咒語工程，重繪為**台灣黑熊號**、**番薯火箭號**、**斗笠牛仔修車阿公**、**阿里山日出神木雲海全景**。
   * 搭配 Python Pillow 自動去除純白底（Alpha Cutout）與自動外框裁切（Autocrop），打造專屬於台灣兒童教育的童書手繪質感。

---

## 🌟 遊戲特色 (Key Features)

### 1. 🐻 全套 AI 原創手繪水彩台灣在地視覺
- **阿吉號・台灣黑熊賽車 (`zip.webp`)**：圓潤萌感 Formosan black bear 車體，胸前招牌白色 V 字斑紋、翡翠綠滾邊、底部懸浮氣孔與尾部雙火箭噴射管。
- **阿飛號・番薯火箭賽車 (`dash.webp`)**：流線型烤地瓜暖金黃色調造型、靈動大眼、雙尾管火箭推進器。
- **修車阿公 (`rio.webp`)**：頭戴傳統編織斗笠、身穿經典藍色牛仔吊帶工作褲、手握可愛扳手笑咪咪揮手。
- **阿里山日出神木雲海全景 (`bg_sky.webp`)**：台灣阿里山千年巨木林海、層巒起伏青山、晨曦粉彩日出與翻騰雲海（具備無縫鏡像平滑捲動）。
- **道具與障礙物**：手繪橘白安全角錐 (`cone.webp`)、水藍鵝黃小貨車 (`truck.webp`)、復古指針空氣加氣泵站 (`pump.webp`)、四軸旋翼救援無人機 (`drone.webp`)。

### 2. 🎤 49 首教育部標準真人臺灣台語發音庫
告別機械式國語 TTS！收錄 **49 首教育部《臺灣閩南語常用詞辭典》（Moedict）標準真人錄音檔**：
- **賽道即時語音動作**：向上噴氣【跳 (thiàu)】、加速衝刺【衝 (tshiong)】、倒掛天花板【倒頭栽 (tò-thâu-tsai)】、平穩著陸【穩 (ún)】、碰撞障礙物【挵 (lòng)】、掉入水塘【落水 (lo̍h-tsúi)】、迴圈旋轉【水啦 (suí--lah)】、完賽結算【冠軍 (kuan-kun)】/【第一名 (tē-it-miâ)】/【讚啦 (tsàn--lah)】/【加油 (ka-iû)】。
- **能量字卡朗讀**：碰觸賽道寶石即刻以真人標準發音朗讀該詞彙！
- **圖鑑與速查彈窗**：隨時點擊 🔊 喇叭按鈕聆聽教育部真人標準原音。

### 3. 🏞️ 全台 8 大真實實景名勝關卡 (Grand Tour of Taiwan)
1. **第 1 關：新北淡水紅毛城・金色水岸！** (*Tām-tsuí Âng-mn̂g-siânn*) - 迎著淡水河海風向下噴氣，越過水岸木棧道與角錐！(淡水、風、跳、走、飛、停、行)
2. **第 2 關：花蓮太魯閣・峽谷大迴圈！** (*Thài-lóo-koh Kiap-kok*) - 穿越世界級大理石壯麗峭壁，向後噴氣極速狂飆！(石、衝、緊、向前、轉輪、旋)
3. **第 3 關：宜蘭雪山隧道・倒頭栽吸力！** (*Seh-suann Suī-tō*) - 深入12.9公里雪山隧道，啟動底盤吸扇在頂部天花板倒掛飛馳！(雪山、黏、倒頭栽、頂懸、下底、邊仔)
4. **第 4 關：嘉義阿里山・盤山過嶺神木林！** (*Ka-gī A-lí-san*) - 起伏蜿蜒的高山森林鐵道，平穩著陸達成「穩穩降落」！(阿里山、盤山、樹林、大路、懸山)
5. **第 5 關：高雄港港都・跨海大跳躍！** (*Ko-hiông-káng Tāi-thiàu*) - 遠眺海港大輪船與大橋，騰空飛躍大水塘，小心落水！(高雄港、港口、船仔、大橋、落水)
6. **第 6 關：台南億載金城・古城障礙賽！** (*It-tāi-kim-siânn*) - 穿梭百年紅磚西洋砲台古堡拱門，敏捷避開小貨車與障礙！(億載金城、古城、城門、磚仔、歷史)
7. **第 7 關：台北信義區・台北101雙重螺旋！** (*Tâi-pak 101*) - 直插天頂的摩天大樓連續雙螺旋，離心力與吸力極限對決！(台北、真懸、天頂、水啦、爽快)
8. **第 8 關：國境之南・墾丁鵝鑾鼻大獎賽！** (*Khún-ting Gô-luân-phīnn*) - 沿著太平洋蔚藍海岸線狂飆，繞過東亞之光白燈塔，勇奪車神總冠軍！(燈塔、海、車神、第一名、冠軍、輸贏、讚啦、加油)
- **無限奔馳模式 (Éng-oán Chhiong-chhiong-chhiong)**：無止境隨機拼接全台名勝地貌，挑戰最遠行駛距離！

### 4. 🕹️ 三大核心空氣動力物理 (Three Core Air Actions)
- ⬆️ **跳 (Thiàu / Hop)**：向下噴出壓縮空氣，阿吉號向上彈起！空中按住可滑翔；著陸前輕輕一噴達成**「穩穩降落 (ún-ún lo̍h-tē)」**，獲得額外雙倍金幣！
- ➡️ **衝 (Tshiong / Zoom)**：向後大噴氣極速衝刺，穿過 360 度大迴圈、陡坡與加速門！
- 🌀 **黏 (Liâm / Stick)**：底盤強力抽氣扇抽走空氣，大氣壓力將車身緊貼路面，即使**「倒頭栽 (tò-thâu-tsai)」**倒掛在天花板也牢牢吸住！

---

## 🎮 操作方式 (Controls)

| 動作 | 電腦鍵盤 | 手機 / 平板觸控 | 說明 |
|---|---|---|---|
| **跳 (Thiàu / Hop)** | ⬆ 方向鍵 / `W` / 空白鍵 (`Space`) | 右側上方藍色大按鈕 | 向下噴氣跳起，落地前噴氣可穩穩降落 |
| **衝 (Tshiong / Zoom)** | ➡ 方向鍵 / `D` | 右側下方橘色大按鈕 | 向後噴氣極速衝刺，過迴圈必備 |
| **黏 (Liâm / Stick)** | ⬇ 方向鍵 / `S` / `Shift` | 左側紫色大按鈕 | 抽走車底空氣緊吸路面，倒頭栽不怕摔（第3關起解鎖） |

---

## 🚀 部署至 GitHub Pages (Deploy to GitHub Pages)

本專案已完全優化為 100% 靜態純前端架構，並包含 `.nojekyll` 與 GitHub Actions 自動部署工作流，發布到 GitHub Pages 僅需 1 分鐘：

### 步驟 1：建立 GitHub 儲存庫並推送代碼
在您的 GitHub 帳號中新建一個公開儲存庫（Repository，例如 `tg-air-racer`），並在專案目錄下執行：
```bash
# 綁定您的 GitHub 遠端倉庫（請替換為您的倉庫網址）
git remote add origin https://github.com/<your-username>/<repo-name>.git

# 提交並推送到 main 分支
git commit -m "feat: complete TG Air Racer with Taiwan AI watercolor art and MOE voices"
git push -u origin main
```

### 步驟 2：啟用 GitHub Pages
1. 開啟您的 GitHub 倉庫頁面，點選頂部 **Settings** ➔ 側邊欄 **Pages**。
2. 在 **Build and deployment** ➔ **Source** 下拉選單中：
   * **推薦方式 (自動)**：選擇 **GitHub Actions**（本專案已內建 `.github/workflows/deploy.yml`，每次 push 自動建置發布！）。
   * **傳統方式**：選擇 **Deploy from a branch** ➔ 分支選 `main` ➔ 目錄選 `/ (root)` ➔ 點擊 **Save**。
3. 等候約 30 秒至 1 分鐘，即可在上方看到您的專屬發布網址：
   👉 `https://<your-username>.github.io/<repo-name>/`
   所有人點擊連結即可在任何電腦、手機、平板上免安裝即開即玩！

---

## 📂 專案檔案結構 (Project Structure)

```
TG _RACE/
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Pages 自動化 CI/CD 發布工作流
├── .nojekyll            # 停用 Jekyll 解析，確保 WebP、MP3 與特殊路徑原生服務
├── index.html           # 遊戲主頁與響應式介面、頂部導航列、詞典彈窗
├── game.js              # Phaser 3 核心場景 (Boot, Title, Garage, DictBook, Play)
├── sim.js               # 2D 物理模擬器、賽道構建器、120Hz 子步進、8大實景關卡
├── tg_dict.js           # 台語詞彙資料庫 (教育部標準台羅、連音變調引擎、華英雙語釋義)
├── tg_voice.js          # 零延遲 Web Audio 引擎與教育部真人台語發音即時播放器
├── assets_data.js       # 8 款 AI 原創水彩繪本插畫 Base64 離線封裝 (完美免除 file:/// CORS 封鎖)
├── audio_data.js        # 49 首教育部真人臺灣台語錄音 Base64 離線封裝 (零延遲、高音質)
├── img/                 # 原創高解析度水彩繪本 WebP 圖檔 (車輛、人物、山景天空、障礙物)
├── audio/               # 教育部真人閩南語常用詞辭典 MP3 錄音檔
├── css/
│   └── style.css        # 現代童書繪本風響應式樣式表 (支援明暗主題)
└── README.md            # 專案完整說明文件
```
