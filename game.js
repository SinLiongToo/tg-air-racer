/**
 * 台語賽車衝衝衝 (TG Air Racer) - Phaser 3 主遊戲邏輯
 * 畫面採用高品質水彩繪本原畫 (WebP)，音效採用零延遲 Web Audio 程序化合成
 * 確保 60fps 絲滑柔順無卡頓 (Silky Smooth 60fps)
 */
(function () {
  "use strict";

  const W = 1280, H = 720;
  const FONT = '"Baloo 2", "Noto Sans TC", "Trebuchet MS", sans-serif';
  const V = window.TG_VOICE || { sfx: {}, speakTG: () => {}, playTaiwaneseTonePitch: () => {} };
  const S = V.sfx || {};
  const P = window.TG_Sim || {};
  const LEVELS = P.LEVELS || [];
  const DICT = window.TG_DICT || { VOCABULARY: [] };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CAR_W = 132;

  /* ------------------------------------------------------------ 存檔管理 ------------------------------------------------------------ */
  const BLANK_SAVE = () => ({
    stars: {},
    bolts: 60,
    up: { tank: 0, puff: 0, soft: 0 },
    skin: 0,
    unlockedSkins: [0],
    words: ["thiau", "tshiong", "liam"],
    best: 0,
    smooth: 0
  });

  const save = {
    get() {
      try {
        const raw = localStorage.getItem("tg-race-save");
        return Object.assign(BLANK_SAVE(), raw ? JSON.parse(raw) : {});
      } catch (e) {
        return BLANK_SAVE();
      }
    },
    set(v) {
      try {
        localStorage.setItem("tg-race-save", JSON.stringify(v));
      } catch (e) {}
    }
  };

  const GARAGE_ITEMS = [
    { k: "tank", name: "風鼓大氣缸 (Khì-kóo)", desc: "裝更多壓縮空氣，噴氣更持久", costs: [40, 110, 200], icon: "bubble" },
    { k: "puff", name: "極速噴射機 (Tshiong-sok)", desc: "跳躍與衝刺推力大幅增強", costs: [50, 130, 220], icon: "bolt" },
    { k: "soft", name: "軟性避震彈簧 (Ún-tāng)", desc: "抗震軟著陸，更容易達成穩穩降落", costs: [40, 110, 200], icon: "zip" },
  ];

  const SKINS = [
    { id: 0, name: "台灣黑熊號 (O͘-hîm-hō)", desc: "經典翠綠黑熊配色，活力非凡", tint: 0xffffff, cost: 0 },
    { id: 1, name: "番薯火箭號 (Han-tsû-hō)", desc: "活力金黃地瓜配色，衝刺如火", tint: 0xffa040, cost: 60 },
    { id: 2, name: "石虎閃電號 (Chio̍h-hó͘-hō)", desc: "台灣石虎琥珀條紋，超高靈敏度", tint: 0xf6b93b, cost: 120 },
    { id: 3, name: "藍鵲天王號 (Nâ-chhiat-hō)", desc: "台灣特有種藍鵲深邃寶藍", tint: 0x4a90e2, cost: 180 },
  ];

  /* ------------------------------------------------------------ 輔助繪圖函式 ------------------------------------------------------------ */
  function txt(sc, x, y, s, size, color, opts) {
    return sc.add.text(x, y, s, Object.assign({
      fontFamily: FONT,
      fontSize: size + "px",
      fontStyle: "800",
      color: color || "#ffffff",
      stroke: "#2b2350",
      strokeThickness: Math.max(3, Math.floor(size / 6)),
      align: "center"
    }, opts || {})).setOrigin(0.5);
  }

  function button(sc, x, y, w, h, label, fill, onClick, size) {
    const c = sc.add.container(x, y);
    const g = sc.add.graphics();
    const draw = (d) => {
      g.clear();
      g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, h / 2);
      g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2 + (d ? 5 : 0), w, h, h / 2);
      g.fillStyle(0xffffff, 0.22).fillRoundedRect(-w / 2 + 10, -h / 2 + 6 + (d ? 5 : 0), w - 20, h * 0.3, h * 0.15);
    };
    draw(false);

    const t = txt(sc, 0, -2, label, size || 28);
    c.add([g, t]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });

    c.on("pointerdown", () => {
      draw(true);
      t.y = 3;
      c.pressed = true;
    });
    c.on("pointerup", () => {
      draw(false);
      t.y = -2;
      if (c.pressed) {
        c.pressed = false;
        if (S.tap) S.tap();
        onClick();
      }
    });
    c.on("pointerout", () => {
      draw(false);
      t.y = -2;
      c.pressed = false;
    });
    c.label = t;
    return c;
  }

  function fit(img, size) {
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }

  function panel(sc, x, y, w, h, borderColor) {
    const g = sc.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x - w / 2, y - h / 2 + 10, w, h, 36);
    g.fillStyle(0xfff8ec, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 36);
    g.lineStyle(6, borderColor || 0xff8a3d, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 36);
    return g;
  }

  function sky(sc) {
    const t = sc.textures.get("tile_sky").getSourceImage();
    const s = H / t.height;
    return sc.add.tileSprite(W / 2, H / 2, W, H, "tile_sky").setTileScale(s, s).setScrollFactor(0);
  }

  /* ============================================================ SCENE: BOOT ============================================================ */
  const ART = ["zip", "dash", "rio", "cone", "truck", "pump", "drone", "bg_sky"];

  class Boot extends Phaser.Scene {
    constructor() { super("boot"); }

    preload() {
      txt(this, W / 2, H / 2 - 60, "空氣氣槽灌氣中... (Khì-kóo kuàn khì...)", 38, "#ffffff");
      const bar = this.add.graphics();
      this.load.on("progress", v => {
        bar.clear()
          .fillStyle(0xffffff, 0.3).fillRoundedRect(440, H / 2, 400, 28, 14)
          .fillStyle(0x7fd8ff, 1).fillRoundedRect(440, H / 2, 400 * v, 28, 14);
      });

      // 載入水彩手繪繪本插畫 (優先使用 Base64 Data URI，完全避開 file:/// 的 CORS 封鎖)
      ART.forEach(k => {
        if (typeof window !== "undefined" && window.TG_ART && window.TG_ART[k]) {
          this.load.image(k, window.TG_ART[k]);
        } else {
          this.load.image(k, "img/" + k + ".webp");
        }
      });
    }

    create() {
      const g = this.make.graphics({ add: false });

      // 1. 噴射火焰粒子 (Cyan/White thruster jet glow)
      for (let k = 0; k < 6; k++) {
        g.fillStyle(k < 3 ? 0x7fe9ff : 0xffffff, [0.12, 0.2, 0.35, 0.6, 0.85, 1][k]);
        g.fillRoundedRect(k * 3, 7 + k * 1.2, 60 - k * 6, 14 - k * 2.4, (14 - k * 2.4) / 2);
      }
      g.generateTexture("jet", 60, 28);
      g.clear();

      // 2. 金幣 (六角螺帽金幣)
      const hex = (cx, cy, r) => {
        const pts = [];
        for (let i = 0; i < 6; i++) pts.push({ x: cx + r * Math.cos(i * Math.PI / 3), y: cy + r * Math.sin(i * Math.PI / 3) });
        return pts;
      };
      g.fillStyle(0xc98a12, 1).fillPoints(hex(22, 24, 20), true);
      g.fillStyle(0xffd23f, 1).fillPoints(hex(22, 21, 19), true);
      g.fillStyle(0xfff3b0, 1).fillCircle(16, 15, 4);
      g.fillStyle(0xb57a0c, 1).fillCircle(22, 21, 7);
      g.fillStyle(0x8fd3ff, 1).fillCircle(22, 21, 4);
      g.generateTexture("bolt", 44, 46);
      g.clear();

      // 3. 空氣氣泡
      g.fillStyle(0x9fe3ff, 0.45).fillCircle(26, 26, 25);
      g.lineStyle(4, 0xffffff, 0.95).strokeCircle(26, 26, 22);
      g.fillStyle(0xffffff, 0.95).fillCircle(17, 16, 6);
      g.fillStyle(0xffffff, 0.6).fillCircle(33, 35, 3);
      g.generateTexture("bubble", 52, 52);
      g.clear();

      // 4. 台語字卡寶石標章
      g.fillStyle(0x6b21a8, 0.92).fillRoundedRect(2, 2, 76, 76, 22);
      g.lineStyle(4, 0xfacc15, 1).strokeRoundedRect(2, 2, 76, 76, 22);
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(8, 8, 64, 26, 10);
      g.generateTexture("gem_badge", 80, 80);
      g.clear();

      // 5. 台語加速門 (Boost Gate Arch)
      g.fillStyle(0x38bdf8, 0.85).fillRect(10, 0, 16, 140).fillRect(74, 0, 16, 140);
      g.fillStyle(0xf59e0b, 1).fillRoundedRect(0, 0, 100, 32, 14);
      g.generateTexture("boost_gate", 100, 140);
      g.clear();

      // 6. 終點黑白格子旗
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          g.fillStyle((i + j) % 2 ? 0x2b2350 : 0xffffff, 1).fillRect(i * 16, j * 16, 16, 16);
        }
      }
      g.generateTexture("checker", 96, 64);
      g.destroy();

      // 備份圖案 (若有缺失插畫時防崩潰)
      const fake = (k, w, h, draw) => {
        if (this.textures.exists(k)) return;
        const f = this.make.graphics({ add: false });
        draw(f);
        f.generateTexture(k, w, h);
        f.destroy();
      };
      const car = col => f => {
        f.fillStyle(col, 1).fillRoundedRect(10, 40, 240, 70, 34).fillRoundedRect(70, 10, 120, 60, 30);
        f.fillStyle(0xbfe9ff, 1).fillRoundedRect(86, 20, 88, 36, 16);
        f.fillStyle(0x2b2350, 1).fillCircle(64, 112, 26).fillCircle(196, 112, 26);
        f.fillStyle(0xffffff, 1).fillCircle(228, 66, 12);
        f.fillStyle(0x2b2350, 1).fillCircle(231, 66, 6);
      };
      fake("zip", 260, 140, car(0x5fd6a8));
      fake("dash", 260, 140, car(0xff8a3d));
      fake("rio", 160, 220, f => {
        f.fillStyle(0xff8a3d, 1).fillRoundedRect(40, 90, 80, 100, 30);
        f.fillStyle(0xffd9b8, 1).fillCircle(80, 60, 44);
        f.fillStyle(0x4a3424, 1).fillEllipse(80, 30, 96, 44);
      });
      fake("cone", 80, 96, f => {
        f.fillStyle(0xff7a2f, 1).fillTriangle(40, 4, 8, 86, 72, 86);
        f.fillStyle(0xffffff, 1).fillRect(22, 44, 36, 12);
        f.fillStyle(0xe2611a, 1).fillRoundedRect(0, 82, 80, 14, 6);
      });
      fake("truck", 260, 140, f => {
        f.fillStyle(0x4f86f7, 1).fillRoundedRect(0, 20, 180, 90, 14);
        f.fillStyle(0xffc44d, 1).fillRoundedRect(184, 44, 72, 66, 14);
        f.fillStyle(0xbfe9ff, 1).fillRoundedRect(206, 54, 38, 26, 8);
        f.fillStyle(0x2b2350, 1).fillCircle(50, 116, 22).fillCircle(140, 116, 22).fillCircle(220, 116, 22);
      });
      fake("pump", 120, 170, f => {
        f.fillStyle(0x3fa9f5, 1).fillRoundedRect(20, 20, 80, 140, 18);
        f.fillStyle(0xffffff, 1).fillCircle(60, 60, 26);
        f.fillStyle(0x2b2350, 1).fillRect(58, 42, 4, 20);
      });
      fake("drone", 180, 100, f => {
        f.fillStyle(0x8a95a5, 1).fillRoundedRect(50, 40, 80, 34, 14);
        f.fillStyle(0x2b2350, 1).fillRect(20, 30, 140, 8);
        f.fillStyle(0xc9f0ff, 1).fillEllipse(24, 26, 44, 10).fillEllipse(156, 26, 44, 10);
      });
      if (!this.textures.exists("bg_sky")) {
        fake("bg_sky", 512, 288, f => {
          f.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xe8f7ff, 0xe8f7ff, 1).fillRect(0, 0, 512, 288);
          f.fillStyle(0xb8e39a, 1).fillEllipse(120, 300, 400, 160).fillEllipse(400, 310, 420, 180);
        });
      }

      // 無縫鏡像天空全景 (The painting next to its mirror image)
      const skyImg = this.textures.get("bg_sky").getSourceImage();
      const skyCanv = this.textures.createCanvas("tile_sky", skyImg.width * 2, skyImg.height);
      const ctx = skyCanv.getContext();
      ctx.drawImage(skyImg, 0, 0);
      ctx.save();
      ctx.translate(skyImg.width * 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(skyImg, 0, 0);
      ctx.restore();
      skyCanv.refresh();

      this.scene.start("title");
    }
  }

  /* ============================================================ SCENE: TITLE ============================================================ */
  class Title extends Phaser.Scene {
    constructor() { super("title"); }

    create() {
      this.bg = sky(this);
      const sv = save.get();
      const allUnlock = /[?&]unlock=1/.test(location.search);

      // 主標題
      const titleMain = txt(this, W / 2, 68, "台語賽車衝衝衝！", 72, "#ffffff", { strokeThickness: 11 });
      const titleSub = txt(this, W / 2, 126, "Tâi-gí Chhiong-chhiong-chhiong! | 噴氣飆速學台語", 28, "#fff1b8", { strokeThickness: 5 });
      this.tweens.add({ targets: [titleMain, titleSub], y: "+=6", yoyo: true, repeat: -1, duration: 1300, ease: "Sine.inOut" });

      // 阿吉號
      const sk = SKINS[sv.skin || 0] || SKINS[0];
      const zip = fit(this.add.image(190, 210, "zip"), 210);
      if (sk.tint && sk.tint !== 0xffffff) zip.setTint(sk.tint);
      this.tweens.add({ targets: zip, y: 196, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });

      // 阿公
      fit(this.add.image(1090, 210, "rio"), 170);

      // 金幣與詞彙統計
      const totalWords = DICT.VOCABULARY ? DICT.VOCABULARY.length : 38;
      const collectedCount = sv.words ? sv.words.length : 3;
      txt(this, 1090, 312, "🪙 " + sv.bolts + "   📖 " + collectedCount + "/" + totalWords, 26, "#fff1b8");

      // 8 大關卡按鈕網格
      LEVELS.forEach((L, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 205 + col * 290;
        const y = 345 + row * 148;

        const open = allUnlock || i === 0 || (sv.stars[i] || 0) > 0;
        const st = sv.stars[i + 1] || 0;

        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.3).fillRoundedRect(-135, -58 + 8, 270, 118, 28);
        g.fillStyle(open ? [0xff8a3d, 0x4f86f7, 0x5ccf6a, 0x9b6cf2][row * 2 + (col >> 1)] : 0x6e7488, 1)
          .fillRoundedRect(-135, -58, 270, 118, 28);
        c.add(g);

        c.add(txt(this, 0, -30, open ? (i + 1) + ". " + L.name : "🔒 第 " + (i + 1) + " 關", 22));
        c.add(txt(this, 0, 4, open ? L.tailo : "", 16, "#ffffff", { strokeThickness: 3 }));
        c.add(txt(this, 0, 36, open ? "★".repeat(st) + "☆".repeat(3 - st) : "", 28, st ? "#ffd93a" : "#ffffff"));

        if (open) {
          c.setSize(270, 118).setInteractive({ useHandCursor: true });
          c.on("pointerup", () => {
            if (S.puff) S.puff();
            this.scene.start("play", { level: i });
          });
          c.on("pointerover", () => this.tweens.add({ targets: c, scale: 1.05, duration: 100 }));
          c.on("pointerout", () => this.tweens.add({ targets: c, scale: 1, duration: 100 }));
        }
      });

      // 底部導航按鈕
      const endlessOpen = allUnlock || (sv.stars[1] || 0) > 0;
      button(this, 310, 656, 340, 74, endlessOpen ? "∞ 永遠衝衝衝 (Endless)" : "🔒 無限模式：過第1關",
        endlessOpen ? 0x6c5ce7 : 0x8a95a5, () => {
          if (endlessOpen) this.scene.start("play", { level: -1 });
          else if (S.oops) S.oops();
        }, 22);

      button(this, 670, 656, 280, 74, "🔧 阿公ㄟ車庫", 0x5ccf6a, () => this.scene.start("garage"), 26);
      button(this, 990, 656, 280, 74, "📖 台語詞典圖鑑", 0xff8a3d, () => this.scene.start("dict"), 26);
    }

    update(t, d) {
      if (this.bg) this.bg.tilePositionX += 25 * d / 1000;
    }
  }

  /* ============================================================ SCENE: GARAGE ============================================================ */
  class Garage extends Phaser.Scene {
    constructor() { super("garage"); }

    create() {
      sky(this);
      this.draw();
    }

    draw() {
      if (this.box) this.box.destroy();
      const sv = save.get();
      const c = this.box = this.add.container(0, 0);

      c.add(panel(this, W / 2, H / 2, 1060, 650, 0x5ccf6a));
      c.add(txt(this, W / 2, 75, "🔧 阿公ㄟ車庫 (A-kong ê Ku-lá-ji)", 44, "#2b2350", { strokeThickness: 0 }));
      c.add(txt(this, W / 2, 118, "少年仔，用金幣來給阿吉號大改造！   🪙 擁有金幣: " + sv.bolts, 24, "#5b4f73", { strokeThickness: 0 }));

      // 配件升級
      GARAGE_ITEMS.forEach((u, i) => {
        const y = 195 + i * 105;
        const lvl = sv.up[u.k] || 0;
        const max = lvl >= u.costs.length;
        const cost = u.costs[lvl];

        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1).fillRoundedRect(160, y - 44, 940, 88, 22).lineStyle(3, 0xe3dcef, 1).strokeRoundedRect(160, y - 44, 940, 88, 22);
        c.add(g);

        c.add(fit(this.add.image(215, y, u.icon), 64));
        c.add(txt(this, 280, y - 16, u.name + "  " + "●".repeat(lvl) + "○".repeat(u.costs.length - lvl), 25, "#2b2350", { strokeThickness: 0 }).setOrigin(0, 0.5));
        c.add(txt(this, 280, y + 16, u.desc, 18, "#5b4f73", { strokeThickness: 0 }).setOrigin(0, 0.5));

        c.add(button(this, 1020, y, 140, 58, max ? "MAX" : "🪙 " + cost, max ? 0xa8b3b8 : (sv.bolts >= cost ? 0xff8a3d : 0xa8b3b8), () => {
          if (max) return;
          const s2 = save.get();
          if (s2.bolts < cost) {
            if (S.oops) S.oops();
            return;
          }
          s2.bolts -= cost;
          s2.up[u.k] = lvl + 1;
          save.set(s2);
          if (S.yay) S.yay();
          this.draw();
        }, 22));
      });

      // 4 款專屬車身塗裝
      const skinY = 515;
      c.add(txt(this, W / 2, skinY - 32, "🎨 車身塗裝造型 (Chhia-sin Séng-sek)", 25, "#2b2350", { strokeThickness: 0 }));

      SKINS.forEach((sk, i) => {
        const x = 230 + i * 270;
        const isUnlocked = (sv.unlockedSkins || [0]).includes(sk.id);
        const isSelected = sv.skin === sk.id;

        const g = this.add.graphics();
        g.fillStyle(isSelected ? 0xdff3ff : 0xffffff, 1).fillRoundedRect(x - 125, skinY - 12, 250, 80, 18);
        g.lineStyle(3, isSelected ? 0x4f86f7 : 0xe3dcef, 1).strokeRoundedRect(x - 125, skinY - 12, 250, 80, 18);
        c.add(g);

        c.add(txt(this, x, skinY + 12, sk.name, 17, "#2b2350", { strokeThickness: 0 }));

        const btnLabel = isSelected ? "使用中 ✓" : (isUnlocked ? "更換塗裝" : "🪙 " + sk.cost);
        const btnCol = isSelected ? 0x5ccf6a : (isUnlocked ? 0x4f86f7 : (sv.bolts >= sk.cost ? 0xff8a3d : 0xa8b3b8));

        c.add(button(this, x, skinY + 45, 160, 36, btnLabel, btnCol, () => {
          const s2 = save.get();
          if (isUnlocked) {
            s2.skin = sk.id;
            save.set(s2);
            if (S.tap) S.tap();
            this.draw();
          } else {
            if (s2.bolts < sk.cost) {
              if (S.oops) S.oops();
              return;
            }
            s2.bolts -= sk.cost;
            s2.unlockedSkins = s2.unlockedSkins || [0];
            s2.unlockedSkins.push(sk.id);
            s2.skin = sk.id;
            save.set(s2);
            if (S.yay) S.yay();
            this.draw();
          }
        }, 16));
      });

      c.add(button(this, W / 2, 650, 260, 62, "◀ 回首頁 (Tńg-khì)", 0x4f86f7, () => this.scene.start("title"), 26));
    }
  }

  /* ============================================================ SCENE: DICT BOOK ============================================================ */
  class DictBook extends Phaser.Scene {
    constructor() { super("dict"); }

    create() {
      sky(this);
      const sv = save.get();
      const allWords = DICT.VOCABULARY || [];
      const collected = sv.words || [];

      panel(this, W / 2, H / 2, 1140, 660, 0xff8a3d);
      txt(this, W / 2, 70, "📖 台語詞典圖鑑 (Tâi-gí Sû-tián)", 44, "#2b2350", { strokeThickness: 0 });
      txt(this, W / 2, 112, "在賽道上吃寶石收集台語詞彙！點擊 🔊 喇叭可聆聽標準台羅發音", 22, "#5b4f73", { strokeThickness: 0 });
      txt(this, W - 140, 70, "收集: " + collected.length + "/" + allWords.length, 22, "#e0662f");

      const pageWords = allWords.slice(0, 12);
      pageWords.forEach((item, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 200 + col * 290;
        const y = 185 + row * 125;

        const isGot = collected.includes(item.id);
        const g = this.add.graphics();
        g.fillStyle(isGot ? 0xfff3e6 : 0xf1f5f9, 1).fillRoundedRect(x - 135, y - 52, 270, 104, 20);
        g.lineStyle(3, isGot ? 0xff8a3d : 0xcbd5e1, 1).strokeRoundedRect(x - 135, y - 52, 270, 104, 20);

        txt(this, x - 75, y - 16, item.hanji, 32, isGot ? "#2b2350" : "#64748b", { strokeThickness: 0 });
        txt(this, x + 25, y - 20, item.tailo, 19, isGot ? "#e0662f" : "#475569", { strokeThickness: 0 });
        txt(this, x + 25, y + 6, item.meaning, 15, "#475569", { strokeThickness: 0 });
        txt(this, x + 25, y + 28, "變調: " + item.sandhi, 13, "#64748b", { strokeThickness: 0 });

        const sndBtn = txt(this, x - 75, y + 24, "🔊 聽發音", 15, "#e0662f", { strokeThickness: 0 })
          .setInteractive({ useHandCursor: true });
        sndBtn.on("pointerup", () => {
          if (V.playWord) V.playWord(item.id);
          else if (V.speakTG) V.speakTG(item.hanji, { toneNum: item.toneNum });
        });
      });

      button(this, W / 2, 650, 260, 62, "◀ 回首頁 (Tńg-khì)", 0x4f86f7, () => this.scene.start("title"), 26);
    }
  }

  /* ============================================================ SCENE: PLAY ============================================================ */
  class Play extends Phaser.Scene {
    constructor() { super("play"); }

    init(d) {
      this.li = d.level;
    }

    create() {
      const L = this.L = this.li < 0
        ? { name: "無限奔馳賽道", tailo: "Éng-oán Chhiong-chhiong-chhiong!", btn: "hzs", endless: true, tip: "開多久就跑多遠！落水三次挑戰結束。" }
        : LEVELS[this.li];

      const sv = this.sv = save.get();
      const T = this.T = P.buildLevel(this.li);
      this.sim = new P.Sim(T, { btn: L.btn, up: sv.up });

      // 對手阿飛號 (Ghost Line)
      if (!L.endless) {
        const g = P.run(T, P.bot(), { btn: L.btn, rec: true });
        this.ghost = g.rec;
        this.dashT = g.t * L.dash;
      }

      this.bg = sky(this);
      this.drawTrack();
      this.makeItems();
      this.puffs = [];

      // 車輛造型 (使用水彩 WebP)
      const sk = SKINS[sv.skin || 0] || SKINS[0];
      this.dash = this.ghost ? fit(this.add.image(0, 0, "dash"), CAR_W).setDepth(5) : null;
      this.dashTag = this.dash ? txt(this, 0, 0, "阿飛號 (Dash)", 20, "#ffe2c8").setDepth(6) : null;
      this.car = fit(this.add.image(0, 0, "zip"), CAR_W).setDepth(7);
      if (sk.tint && sk.tint !== 0xffffff) this.car.setTint(sk.tint);
      this.carScale = this.car.scaleX;

      this.drone = fit(this.add.image(0, -500, "drone"), 150).setDepth(9).setVisible(false);
      this.fan = this.add.graphics().setDepth(6);
      this.cam = this.cameras.main;
      this.cam.scrollX = -W * 0.3;
      this.cam.scrollY = T.base - H * 0.74;

      this.hud();

      // 鍵盤操控綁定
      this.keys = this.input.keyboard.addKeys({
        up: "UP", sp: "SPACE", w: "W",
        right: "RIGHT", d: "D",
        down: "DOWN", s: "S", sh: "SHIFT"
      });
      this.input.addPointer(2);

      this.state = "count";
      this.clock = 0;
      this.lastTag = "";
      this.toastT = 0;
      this.sndT = {};

      this.countdown();
    }

    /* ---------------- 繪製賽道路面 ---------------- */
    drawTrack() {
      const T = this.T, CH = 1600;
      const chunks = new Map(), back = new Map();
      const gfx = x => {
        const k = Math.floor(x / CH);
        if (!chunks.has(k)) chunks.set(k, this.add.graphics().setDepth(2));
        return chunks.get(k);
      };
      const bgfx = x => {
        const k = Math.floor(x / CH);
        if (!back.has(k)) back.set(k, this.add.graphics().setDepth(1));
        return back.get(k);
      };

      // 水塘水面
      for (let x = -800; x < T.endX + 1600; x += CH) {
        const g = bgfx(x);
        g.fillStyle(0x55b8e8, 1).fillRect(x, T.waterY, CH + 2, 900);
        g.fillStyle(0xffffff, 0.5);
        for (let k = 0; k < CH; k += 90) g.fillEllipse(x + k + 30, T.waterY + 8, 40, 6);
      }
      for (const w of T.ponds) {
        const g = bgfx(w.x0);
        g.fillStyle(0x3fa0dc, 1).fillRect(w.x0 - 4, w.y, w.x1 - w.x0 + 8, T.floorY + 400 - w.y);
        g.fillStyle(0x7fd0f5, 1).fillRect(w.x0 - 4, w.y, w.x1 - w.x0 + 8, 10);
        g.fillStyle(0xffffff, 0.6);
        for (let k = w.x0 + 20; k < w.x1 - 20; k += 70) g.fillEllipse(k, w.y + 22, 34, 5);
      }

      const first = T.surfs[0].pts[0];
      T.surfs.forEach((S_surf, si) => {
        const pts = S_surf.pts;
        let run = [];
        const flush = () => {
          if (run.length > 1) {
            for (let i = 0; i < run.length - 1; i += 40) {
              const seg = run.slice(i, i + 41), g = bgfx(seg[0].x);
              const poly = seg.map(p => ({ x: p.x, y: p.y + 10 }))
                .concat([{ x: seg[seg.length - 1].x, y: T.floorY + 400 }, { x: seg[0].x, y: T.floorY + 400 }]);
              g.fillStyle(0xd9a86c, 1).fillPoints(poly, true);
              g.fillStyle(0x7ccf5a, 1).fillPoints(
                seg.map(p => ({ x: p.x, y: p.y + 8 }))
                  .concat(seg.slice().reverse().map(p => ({ x: p.x, y: p.y + 30 }))), true
              );
            }
          }
          run = [];
        };

        for (const p of pts) {
          if (p.tag === "" || p.tag === "twist") run.push(p);
          else flush();
        }
        flush();

        if (si === 0) {
          const g = bgfx(first.x - 10);
          g.fillStyle(0xd9a86c, 1).fillRect(first.x - 1600, first.y + 10, 1600, 1600);
          g.fillStyle(0x7ccf5a, 1).fillRect(first.x - 1600, first.y + 8, 1600, 22);
        }

        // 賽道本體
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1], g = (p.tag === "loop" && i % 2) ? bgfx(p.x) : gfx(p.x);
          const quad = (r) => {
            const c = Math.cos(r.phi), sn = Math.abs(Math.sin(r.phi));
            const nx = Math.sin(r.a), ny = -Math.cos(r.a);
            const th = 18 * Math.abs(c) + 46 * sn, mid = -c * 10;
            return [mid + th / 2, mid - th / 2].map(d => ({ x: r.x + nx * d, y: r.y + ny * d }));
          };
          const A = quad(p), B = quad(q), sn = Math.abs(Math.sin(p.phi));
          const col = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(0x4b4f63),
            Phaser.Display.Color.ValueToColor(0x9aa3c2), 100, sn * 100
          );
          g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1).fillPoints([A[0], B[0], B[1], A[1]], true);

          const cnx = Math.sin(p.a) * Math.cos(p.phi), cny = -Math.cos(p.a) * Math.cos(p.phi);
          if (p.tag && p.tag !== "") {
            g.fillStyle(Math.floor(i / 4) % 2 ? 0xff5a5a : 0xffffff, 1).fillPoints(
              [{ x: p.x, y: p.y }, { x: q.x, y: q.y }, { x: q.x - cnx * 6, y: q.y - cny * 6 }, { x: p.x - cnx * 6, y: p.y - cny * 6 }], true
            );
          } else if (Math.floor(i / 6) % 3 === 0) {
            g.fillStyle(0xfff6d8, 0.9).fillPoints(
              [{ x: p.x - cnx * 8, y: p.y - cny * 8 }, { x: q.x - cnx * 8, y: q.y - cny * 8 }, { x: q.x - cnx * 11, y: q.y - cny * 11 }, { x: p.x - cnx * 11, y: p.y - cny * 11 }], true
            );
          }

          if ((p.tag === "rise" || p.tag === "ceil") && i % 22 === 0) {
            const c = Math.cos(p.phi), gb = bgfx(p.x);
            gb.fillStyle(0x8a7fa6, 1);
            if (c > 0) gb.fillRect(p.x - 5, p.y + 14, 10, T.waterY + 40 - p.y);
            else gb.fillRect(p.x - 5, p.y - 520, 10, 506);
          }
        }
      });

      // 天花板懸吊鋼樑
      T.surfs.forEach(S_surf => {
        const c = S_surf.pts.filter(p => p.tag === "ceil");
        if (c.length) {
          const g = bgfx(c[0].x);
          g.fillStyle(0x6f6590, 1).fillRect(c[0].x - 60, c[0].y - 540, c[c.length - 1].x - c[0].x + 120, 34);
        }
      });

      // 終點拱門
      const fy = this.T.at(this.T.surfs.length - 1, 0).y, fx = T.finishX;
      const g = gfx(fx);
      g.fillStyle(0x2b2350, 1).fillRect(fx - 8, fy - 280, 16, 280);
      const fl = this.add.tileSprite(fx + 60, fy - 250, 120, 64, "checker").setDepth(3);
      this.tweens.add({ targets: fl, scaleX: 0.92, yoyo: true, repeat: -1, duration: 400 });
      txt(this, fx, fy - 310, "過關終點 FINISH", 32, "#ffe066").setDepth(3);

      this.chunkList = [...chunks.entries(), ...back.entries()];
    }

    /* ---------------- 生成物品與台語字卡 ---------------- */
    makeItems() {
      this.sprites = [];
      for (const o of this.sim.items) {
        let sp;
        if (o.kind === "bolt") {
          sp = this.add.image(o.x, o.y, "bolt").setScale(0.9);
          this.tweens.add({ targets: sp, angle: 360, repeat: -1, duration: 2400 });
        } else if (o.kind === "bubble") {
          sp = this.add.image(o.x, o.y, "bubble");
          this.tweens.add({ targets: sp, y: o.y - 10, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
        } else if (o.kind === "cone") {
          sp = fit(this.add.image(o.x, o.y + 26, "cone"), 64).setOrigin(0.5, 1);
        } else if (o.kind === "truck") {
          sp = fit(this.add.image(o.x, o.y + o.h / 2 + 4, "truck"), o.w + 30).setOrigin(0.5, 1);
        } else if (o.kind === "pump") {
          sp = fit(this.add.image(o.x, o.y + 70, "pump"), 150).setOrigin(0.5, 1);
          txt(this, o.x, o.y - 100, "加氣站 AIR", 26, "#bfefff").setDepth(4);
        } else if (o.kind === "boost_gate") {
          sp = fit(this.add.image(o.x, o.y + 40, "boost_gate"), 140).setOrigin(0.5, 1);
          txt(this, o.x, o.y - 80, "加速門 TURBO", 24, "#ffd23f").setDepth(4);
        } else if (o.kind === "word_gem") {
          const vData = (DICT.getVocabById && DICT.getVocabById(o.vocabId)) || { hanji: "字", tailo: "jī" };
          const cont = this.add.container(o.x, o.y);
          const badge = this.add.image(0, 0, "gem_badge").setScale(0.85);
          const hText = txt(this, 0, -8, vData.hanji, 26, "#fef08a", { strokeThickness: 4 });
          const tText = txt(this, 0, 18, vData.tailo, 13, "#ffffff", { strokeThickness: 3 });
          cont.add([badge, hText, tText]);
          this.tweens.add({ targets: cont, y: o.y - 10, yoyo: true, repeat: -1, duration: 800, ease: "Sine.inOut" });
          sp = cont;
        }

        if (sp) {
          sp.setDepth(4);
          o.spr = sp;
          this.sprites.push(o);
        }
      }
    }

    /* ---------------- HUD 與控制大按鈕 ---------------- */
    hud() {
      const ui = [];
      const g = this.add.graphics();
      ui.push(g);
      this.hudG = g;

      ui.push(txt(this, 66, 40, "💨", 34));
      this.boltTxt = txt(this, 380, 40, "🔩 0", 30, "#fff1b8").setOrigin(0, 0.5);
      ui.push(this.boltTxt);

      this.timeTxt = txt(this, W - 150, 40, "0.0 s", 30).setOrigin(1, 0.5);
      ui.push(this.timeTxt);

      ui.push(button(this, W - 60, 40, 84, 60, "⌂", 0x4f86f7, () => this.scene.start("title"), 32));

      ui.push(this.toastBox = this.add.graphics());
      this.toastBox.setVisible(false);
      ui.push(this.toastTxt = txt(this, W / 2, 128, "", 30, "#2b2350", { strokeThickness: 0, wordWrap: { width: 900 } }).setVisible(false));

      // 3 大拇指大按鈕
      this.btn = {};
      const B = (k, x, y, r, col, icon, label, tgLabel) => {
        const c = this.add.container(x, y);
        const gg = this.add.graphics();
        c.add([
          gg,
          txt(this, 0, -14, icon, r * 0.6),
          txt(this, 0, r * 0.32, label, r * 0.28, "#ffffff", { strokeThickness: 4 }),
          txt(this, 0, r * 0.62, tgLabel, r * 0.22, "#fef08a", { strokeThickness: 3 })
        ]);
        c.setSize(r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
        const o = { c, gg, r, col, held: false, pid: -1, on: this.sim.can(k[0]) };
        o.draw = () => {
          gg.clear();
          const a = o.on ? 1 : 0.35, d = o.held ? 4 : 0;
          gg.fillStyle(0x000000, 0.28 * a).fillCircle(0, 6, r);
          gg.fillStyle(o.on ? col : 0x8a95a5, 0.92 * a).fillCircle(0, d, r);
          gg.lineStyle(5, 0xffffff, 0.85 * a).strokeCircle(0, d, r - 3);
        };
        o.draw();
        c.setAlpha(o.on ? 1 : 0.5);

        c.on("pointerdown", p => {
          o.held = true;
          o.pid = p.id;
          o.draw();
        });
        this.btn[k] = o;
        ui.push(c);
      };

      B("stick", 128, H - 120, 92, 0x9b6cf2, "🌀", "STICK", "黏");
      B("zoom", W - 330, H - 100, 86, 0xff8a3d, "➡", "ZOOM", "衝");
      B("hop", W - 132, H - 150, 104, 0x3fa9f5, "⬆", "HOP", "跳");

      this.input.on("pointerup", p => {
        for (const k in this.btn) {
          const o = this.btn[k];
          if (o.pid === p.id) {
            o.held = false;
            o.pid = -1;
            o.draw();
          }
        }
      });

      ui.push(this.prog = this.add.graphics());
      ui.forEach(o => o.setScrollFactor(0).setDepth(o.depth || 50));
      this.toastBox.setDepth(60);
      this.toastTxt.setDepth(61);
    }

    drawHud() {
      const g = this.hudG, sim = this.sim, f = sim.air / sim.cap;
      g.clear();
      g.fillStyle(0x2b2350, 0.55).fillRoundedRect(96, 22, 260, 36, 18);
      g.fillStyle(f < 0.2 ? 0xff7a7a : 0x7fd8ff, 1).fillRoundedRect(102, 28, Math.max(10, 248 * f), 24, 12);
      g.fillStyle(0xffffff, 0.4).fillRoundedRect(108, 30, Math.max(4, 236 * f), 7, 4);

      this.boltTxt.setText("🔩 " + sim.bolts);
      this.timeTxt.setText(this.L.endless ? Math.floor(sim.x / 50) + " m   " + "💦".repeat(sim.rescues) : sim.t.toFixed(1) + " s");

      const p = this.prog;
      p.clear();
      if (!this.L.endless) {
        const x0 = 520, w = 360;
        p.fillStyle(0x2b2350, 0.5).fillRoundedRect(x0 - 6, 30, w + 12, 20, 10);
        p.fillStyle(0xffffff, 0.8).fillRoundedRect(x0, 36, w, 8, 4);
        const dp = clamp(this.dashX / this.T.finishX, 0, 1);
        p.fillStyle(0xff8a3d, 1).fillCircle(x0 + w * dp, 40, 11).lineStyle(3, 0xffffff, 1).strokeCircle(x0 + w * dp, 40, 11);
        p.fillStyle(0x5fd6a8, 1).fillCircle(x0 + w * sim.progress(), 40, 13).lineStyle(3, 0xffffff, 1).strokeCircle(x0 + w * sim.progress(), 40, 13);
        p.fillStyle(0xffe066, 1).fillRect(x0 + w, 24, 6, 32);
      }
    }

    pulse(k, on) {
      const o = this.btn[k];
      if (!o || !o.on) return;
      const s = on ? 1 + 0.08 * Math.sin(this.time.now / 90) : 1;
      o.c.setScale(s);
    }

    toast(s, ms) {
      this.toastTxt.setText(s).setVisible(true);
      const b = this.toastTxt.getBounds();
      this.toastBox.clear().fillStyle(0xfff8ec, 0.95).fillRoundedRect(b.x - 24, b.y - 12, b.width + 48, b.height + 24, 22)
        .lineStyle(4, 0xff8a3d, 1).strokeRoundedRect(b.x - 24, b.y - 12, b.width + 48, b.height + 24, 22).setVisible(true);
      this.toastT = (ms || 2600) / 1000;
    }

    pop(x, y, s, col) {
      const t = txt(this, x, y, s, 34, col || "#ffffff").setDepth(30);
      this.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1100, ease: "Cubic.out", onComplete: () => t.destroy() });
    }

    // 零卡頓音效節流器 (精準防破音與音訊隊列壅塞)
    snd(k, gap) {
      const n = this.time.now;
      if ((this.sndT[k] || 0) > n) return;
      this.sndT[k] = n + (gap || 120);
      if (S[k]) S[k]();
    }

    countdown() {
      this.toast(this.L.tip, 5200);
      const nums = ["3", "2", "1", "GO! 衝！"];
      nums.forEach((n, i) => this.time.delayedCall(700 + i * 650, () => {
        const t = txt(this, W / 2, H / 2 - 40, n, i === 3 ? 96 : 120, i === 3 ? "#ffe066" : "#ffffff")
          .setScrollFactor(0).setDepth(70);
        this.tweens.add({ targets: t, scale: 1.6, alpha: 0, duration: 600, onComplete: () => t.destroy() });
        if (i === 3) {
          if (S.puff) S.puff();
          this.state = "go";
        } else {
          if (S.tick) S.tick();
        }
      }));
    }

    /* ---------------- 噴氣火焰粒子 ---------------- */
    puff(x, y, vx, vy, n, col, life) {
      for (let i = 0; i < n; i++) {
        let p = this.puffs.find(q => !q.alive);
        if (!p) {
          if (this.puffs.length > 160) return;
          p = { img: this.add.image(0, 0, "jet").setDepth(6) };
          this.puffs.push(p);
        }
        p.alive = true;
        p.img.setVisible(true).setPosition(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6)).setTint(col || 0xffffff);
        p.vx = vx * (0.8 + Math.random() * 0.5) + Phaser.Math.Between(-25, 25);
        p.vy = vy * (0.8 + Math.random() * 0.5) + Phaser.Math.Between(-25, 25);
        p.life = p.max = (life || 0.28) * (0.7 + Math.random() * 0.5);
        p.img.setRotation(Math.atan2(p.vy, p.vx));
      }
    }

    puffStep(dt) {
      for (const p of this.puffs) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          p.img.setVisible(false);
          continue;
        }
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.img.x += p.vx * dt;
        p.img.y += p.vy * dt;
        const k = p.life / p.max;
        p.img.setAlpha(k).setScale(0.6 + (1 - k) * 0.9, 0.7 * k + 0.2);
      }
    }

    /* ---------------- 主循環 ---------------- */
    input3() {
      const k = this.keys, b = this.btn;
      return {
        hop: b.hop.held || k.up.isDown || k.sp.isDown || k.w.isDown,
        zoom: b.zoom.held || k.right.isDown || k.d.isDown,
        stick: b.stick.held || k.down.isDown || k.s.isDown || k.sh.isDown
      };
    }

    update(t, d) {
      const dtF = Math.min(d / 1000, 0.05);
      const sim = this.sim;

      if (this.state === "go") {
        let inp = this.input3();
        const n = Math.max(1, Math.round(dtF * 120));
        for (let i = 0; i < n; i++) {
          sim.step(dtF / n, inp);
          if (sim.done) break;
        }
        this.clock += dtF;
        this.handle();
        if (sim.done) this.finish(true);
        if (this.L.endless && sim.rescues >= 3) this.finish(false);
      }

      this.puffStep(dtF);
      this.paint(dtF);
      if (this.toastT > 0) {
        this.toastT -= dtF;
        if (this.toastT <= 0) {
          this.toastTxt.setVisible(false);
          this.toastBox.setVisible(false);
        }
      }
    }

    handle() {
      const sim = this.sim;
      for (const e of sim.ev.splice(0)) {
        switch (e.type) {
          case "hop":
            this.snd("puff", 90);
            if ((this.hops = (this.hops || 0) + 1) <= 2 || this.hops % 8 === 0) {
              this.pop(e.x, e.y + 70, "跳！Thiàu!", "#bff6ff");
              if (V.playWord) V.playWord("thiau");
            }
            break;
          case "smooth":
            this.pop(e.x, e.y - 90, "穩穩降落！Ún-ún lo̍h-tē! +2🔩", "#b8ffcf");
            this.snd("sparkle");
            if (V.playWord) V.playWord("un-un-loh-te");
            break;
          case "bonk":
            this.pop(e.x, e.y - 80, "挵著矣！Lòng--tio̍h--ah!", "#ffd0d0");
            this.snd("oops", 300);
            if (V.playWord) V.playWord("long-tioh");
            this.cam.shake(160, 0.006);
            if (e.item && e.item.spr) {
              this.tweens.add({ targets: e.item.spr, angle: 70, x: e.item.spr.x + 90, y: e.item.spr.y - 30, alpha: 0.35, duration: 500, ease: "Cubic.out" });
            }
            break;
          case "bolt":
            this.snd("tick", 60);
            this.grab(e.x, e.y);
            break;
          case "bubble":
            this.pop(e.x, e.y - 30, "+💨 氣量", "#bfefff");
            this.snd("pop");
            this.grab(e.x, e.y);
            break;
          case "refill":
            this.pop(e.x, e.y - 120, "氣槽灌滿！滿氣！💨", "#bfefff");
            this.snd("ding");
            break;
          case "boost_gate":
            this.pop(e.x, e.y - 120, "極速衝刺！衝衝衝！", "#ffe066");
            this.snd("sparkle");
            if (V.playWord) V.playWord("tshiong");
            this.grab(e.x, e.y);
            break;
          case "word_gem":
            const vObj = DICT.getVocabById ? DICT.getVocabById(e.vocabId) : null;
            if (vObj) {
              this.pop(e.x, e.y - 100, "【" + vObj.hanji + "】 " + vObj.tailo, "#fff1b8");
              if (V.playWord) V.playWord(vObj.id);
              else if (V.playTaiwaneseTonePitch) V.playTaiwaneseTonePitch(vObj.toneNum);
            }
            this.snd("sparkle");
            this.grab(e.x, e.y);
            break;
          case "empty":
            if (this.toastT <= 0) this.toast("沒氣囉！小氣泵回氣中，快吃 💨 氣泡！", 2600);
            break;
          case "whoops":
            this.toast(sim.can("s") ? "太慢翻不過去！按住 🌀【黏】緊貼路面！" : "速度不夠！按住 ➡【衝】加速過迴圈！", 3200);
            this.snd("oops");
            this.rescue();
            break;
          case "splash":
            this.pop(e.x, e.y - 40, "落水矣！Lo̍h-tsúi--ah!", "#bfefff");
            this.snd("splash");
            if (V.playWord) V.playWord("loh-tsui");
            this.puff(e.x, e.y, 0, -420, 14, 0xbfe9ff, 0.5);
            this.rescue();
            this.toast(sim.lastCeil ? "落水！行駛倒頭栽天花板時，要全程按住 🌀【黏】喔！" : "落水！經過大水池前，要在邊緣按 ⬆【跳】飛過去！", 3200);
            break;
          case "drop":
            this.drone.setVisible(false);
            this.snd("pop");
            break;
          case "high":
            if (this.toastT <= 0 || !this.highToast) {
              this.highToast = true;
              this.toast("飛得夠高了！放開 ⬆【跳】回落降落吧！", 2600);
            }
            break;
        }
      }

      const tag = sim.mode === "ground" ? sim.p.tag : "";
      if (this.lastTag === "loop" && tag === "" && sim.mode === "ground") {
        sim.loops++;
        this.pop(sim.x, sim.y - 120, "大迴圈過關！水啦！🌀", "#e6d6ff");
        this.snd("yay", 400);
        if (V.playWord) V.playWord("sui-lah");
      }
      if (sim.mode === "ground") sim.lastCeil = tag === "ceil" || tag === "rise";
      if (tag === "ceil" && this.lastTag !== "ceil") {
        this.pop(sim.x, sim.y + 110, "倒頭栽！Tò-thâu-tsai!", "#e6d6ff");
        if (V.playWord) V.playWord("to-thau-tsai");
      }
      this.lastTag = tag;
    }

    grab(x, y) {
      const o = this.sprites.find(q => q.gone && !q.taken && Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2);
      if (!o) return;
      o.taken = true;
      this.tweens.killTweensOf(o.spr);
      this.tweens.add({ targets: o.spr, scale: o.spr.scale * 1.6, alpha: 0, duration: 260, onComplete: () => o.spr.setVisible(false) });
    }

    rescue() {
      const sim = this.sim, cp = sim.T.at(sim.cp.si, sim.cp.s);
      this.resc = { x0: this.car.x, y0: this.car.y, x1: cp.x, y1: cp.y - 40, t: 0 };
      this.drone.setVisible(true).setPosition(this.car.x, this.car.y - 400);
    }

    /* ---------------- 60fps 平滑渲染與鏡頭 Lerp ---------------- */
    paint(dt) {
      const sim = this.sim, car = this.car, T = this.T;
      const ux = Math.sin(sim.ang) * Math.cos(sim.roll), uy = -Math.cos(sim.ang) * Math.cos(sim.roll);
      let cx = sim.x + ux * 34, cy = sim.y + uy * 34;

      if (sim.mode === "rescue" && this.resc) {
        const R = this.resc;
        R.t += dt;
        const k = clamp((R.t - 0.35) / 0.85, 0, 1), e = k * k * (3 - 2 * k);
        if (R.t < 0.35) {
          const q = R.t / 0.35;
          this.drone.setPosition(R.x0, R.y0 - 400 + 330 * q);
          cx = R.x0;
          cy = R.y0;
        } else {
          cx = R.x0 + (R.x1 - R.x0) * e;
          cy = R.y0 + (R.y1 - R.y0) * e - Math.sin(e * Math.PI) * 160;
          this.drone.setPosition(cx, cy - 70);
        }
        car.setRotation(0).setScale(this.carScale, this.carScale);
      } else {
        car.setRotation(sim.ang).setScale(
          this.carScale,
          this.carScale * (Math.abs(Math.cos(sim.roll)) < 0.08 ? 0.08 * Math.sign(Math.cos(sim.roll) || 1) : Math.cos(sim.roll))
        );
      }
      car.setPosition(cx, cy);

      // 噴射氣流粒子效果
      const fx = Math.cos(sim.ang), fy = Math.sin(sim.ang);
      if (sim.puffing && sim.puffing.hop) {
        this.puff(cx - ux * 30, cy - uy * 30, -ux * 900, -uy * 900, 3, 0x9fefff);
      }
      if (sim.puffing && sim.puffing.zoom && !this.zoomSaid && sim.mode === "ground") {
        this.zoomSaid = true;
        this.pop(cx - 60, cy - 90, "衝！Tshiong!", "#ffe2c8");
      }
      if (sim.puffing && sim.puffing.zoom) {
        this.puff(cx - fx * 66, cy - fy * 66, -fx * 1000, -fy * 1000, 3, 0x9fefff);
        this.snd("hiss", 200);
      }

      this.fan.clear();
      if (sim.inp.stick && sim.mode !== "rescue") {
        const bx = cx - ux * 30, by = cy - uy * 30, ph = (this.time.now / 300) % 1;
        this.fan.lineStyle(4, 0x7fe9ff, 0.9);
        for (let i = -2; i <= 2; i++) {
          const kk = (ph + (i + 2) / 5) % 1, ox = fx * i * 24, oy = fy * i * 24, dd = 34 * (1 - kk);
          this.fan.lineBetween(bx + ox - ux * dd, by + oy - uy * dd, bx + ox - ux * (dd - 10), by + oy - uy * (dd - 10));
        }
        if (!this.humOn) {
          this.humOn = true;
          if (S.hum) S.hum();
        }
      } else {
        this.humOn = false;
      }

      // 對手阿飛號 (Ghost)
      if (this.dash) {
        const f = this.ghost.length ? clamp(Math.floor(this.clock / (2 / 120 * this.L.dash)), 0, this.ghost.length - 1) : 0;
        const g = this.ghost[f] || [0, T.base, 0, 0, 0];
        const dux = Math.sin(g[2]) * Math.cos(g[3]), duy = -Math.cos(g[2]) * Math.cos(g[3]);
        this.dash.setPosition(g[0] + dux * 34, g[1] + duy * 34).setRotation(g[2]).setScale(this.dash.scaleX, Math.abs(this.dash.scaleX) * (Math.cos(g[3]) || 0.05)).setAlpha(g[4] ? 0.3 : 1);
        this.dashTag.setPosition(this.dash.x, this.dash.y - 64 * Math.sign(Math.cos(g[3]) || 1));
        this.dashX = this.clock > this.dashT ? T.finishX : g[0];
      }

      // 絲滑柔順的鏡頭插值 (與 reference 100% 對齊)
      const gy = sim.mode === "ground" ? sim.y : (sim.mode === "air" && T.below(sim.x, sim.y) < 900 ? sim.y + T.below(sim.x, sim.y) : cy);
      let ty = gy - H * 0.74;
      ty = Math.min(ty, cy - 150);
      ty = Math.min(ty, T.floorY - H + 100);
      const tx = cx - W * 0.33;
      this.cam.scrollX += (tx - this.cam.scrollX) * Math.min(1, dt * 8);
      this.cam.scrollY += (ty - this.cam.scrollY) * Math.min(1, dt * (cy - this.cam.scrollY < 170 ? 10 : 4));

      if (this.bg && this.bg.tileScaleX) {
        this.bg.tilePositionX = this.cam.scrollX * 0.2 / this.bg.tileScaleX;
      }

      for (const [k, g] of this.chunkList) {
        g.setVisible(Math.abs((k + 0.5) * 1600 - (this.cam.scrollX + W / 2)) < 1600 + W);
      }

      // 按鈕閃爍導引提示
      const ahead = x => sim.x > x - 260 && sim.x < x;
      let hopHint = sim.mode === "air" && sim.vyMax > sim.soft * 0.8 && sim.vy > 200 && T.below(sim.x, sim.y) < 240;
      if (this.li >= 0 && this.li < 3 && sim.mode === "ground") {
        for (const c of T.cues) if (c.act === "hop" && ahead(c.x + 40)) hopHint = true;
      }
      let stickHint = false, zoomHint = false;
      for (const z of T.zones) {
        if (sim.x > z.x0 - 120 && sim.x < z.x1) {
          if (z.act === "stick") stickHint = !sim.inp.stick;
          else zoomHint = !sim.inp.zoom;
        }
      }
      this.pulse("hop", hopHint && !sim.inp.hop);
      this.pulse("stick", stickHint);
      this.pulse("zoom", zoomHint);
      this.btn.hop.c.setAlpha(this.btn.hop.on ? (sim.inp.stick ? 0.45 : 1) : 0.5);

      this.drawHud();
    }

    /* ---------------- 完賽結算面板 ---------------- */
    finish(win) {
      if (this.state === "done") return;
      this.state = "done";
      const sim = this.sim, L = this.L, sv = save.get();
      const beat = win && !L.endless && sim.t <= this.dashT;
      const stars = win && !L.endless ? 1 + (beat ? 1 : 0) + (sim.rescues === 0 ? 1 : 0) : 0;

      sv.bolts += sim.bolts;
      sv.smooth = (sv.smooth || 0) + sim.smooth;

      sv.words = sv.words || [];
      sim.collectedWords.forEach(wid => {
        if (!sv.words.includes(wid)) sv.words.push(wid);
      });

      if (!L.endless) sv.stars[this.li + 1] = Math.max(sv.stars[this.li + 1] || 0, stars);
      const m = Math.floor(sim.x / 50);
      if (L.endless) sv.best = Math.max(sv.best || 0, m);
      save.set(sv);

      for (const k in this.btn) this.btn[k].c.setVisible(false);
      this.time.delayedCall(L.endless ? 600 : 900, () => this.endPanel(win, stars, beat, m, sv));
    }

    endPanel(win, stars, beat, m, sv) {
      const sim = this.sim, L = this.L;
      const c = this.add.container(0, 0).setDepth(80).setScrollFactor(0);
      c.add(panel(this, W / 2, H / 2, 900, 600, win ? 0x5ccf6a : 0xff8a3d));

      if (L.endless) {
        c.add(fit(this.add.image(W / 2, 150, "zip"), 220));
        c.add(txt(this, W / 2, 250, "阿吉號奔馳了 " + m + " 公尺！", 50, "#2b2350", { strokeThickness: 0 }));
        c.add(txt(this, W / 2, 310, m >= sv.best ? "🏆 刷新最高紀錄！" : "歷史最佳: " + sv.best + " 公尺", 32, "#e0662f", { strokeThickness: 0 }));
        if (S.yay) S.yay();
        if (V.playWord) V.playWord("tsan-lah");
      } else {
        c.add(fit(this.add.image(W / 2 - 150, 150, "zip"), 200));
        c.add(fit(this.add.image(W / 2 + 150, 150, beat ? "rio" : "dash"), beat ? 150 : 180));
        c.add(txt(this, W / 2, 248, beat ? "你贏過了阿飛號！第一名！🏁" : "阿飛號先抵達！精彩的一場比賽！", 44, "#2b2350", { strokeThickness: 0 }));

        const st = txt(this, W / 2, 314, "★".repeat(stars) + "☆".repeat(3 - stars), 66, "#ffc83a", { stroke: "#e0a21a", strokeThickness: 4 });
        st.setScale(0.2);
        this.tweens.add({ targets: st, scale: 1, duration: 500, ease: "Back.out" });
        c.add(st);

        c.add(txt(this, W / 2, 372, "✓ 順利過關   " + (beat ? "✓" : "✗") + " 擊敗阿飛號 (" + sim.t.toFixed(1) + "秒 / " + this.dashT.toFixed(1) + "秒)   " + (sim.rescues ? "✗" : "✓") + " 無落水", 23, "#5b4f73", { strokeThickness: 0 }));
        if (S.yay) S.yay();
        if (V.playWord) V.playWord(beat ? "kuan-kun" : "ka-iu");
      }

      c.add(txt(this, W / 2, 425, "🔩 +" + sim.bolts + "    ✨ " + sim.smooth + " 次穩穩降落    📖 收集詞彙: " + sim.collectedWords.length + " 個", 28, "#e0662f", { strokeThickness: 0 }));
      c.add(txt(this, W / 2, 478, L.fact || "「作用力與反作用力」：推動空氣，空氣就會推動賽車！", 25, "#3b2f4a", { strokeThickness: 0, wordWrap: { width: 780 } }));

      const next = win && !L.endless && this.li < LEVELS.length - 1;
      const btns = [
        ["⌂ 回關卡", 0x4f86f7, () => this.scene.start("title")],
        ["↻ 再跑一次", 0xff8a3d, () => this.scene.start("play", { level: this.li })]
      ];
      if (next) {
        btns.push(["下一關 ▶", 0x5ccf6a, () => this.scene.start("play", { level: this.li + 1 })]);
      }
      btns.push(["🔧 車庫", 0x9b6cf2, () => this.scene.start("garage")]);
      btns.push(["📖 詞典", 0x4f86f7, () => this.scene.start("dict")]);

      btns.forEach((b, i) => {
        c.add(button(this, W / 2 + (i - (btns.length - 1) / 2) * 184, 572, 170, 70, b[0], b[1], b[2], 24));
      });
      c.iterate(o => o.setScrollFactor && o.setScrollFactor(0));
    }
  }

  /* ---------------- 啟動 Phaser 遊戲 (字體預載保證文字不抖動) ---------------- */
  function start() {
    const ready = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load('800 32px "Baloo 2"')]).catch(() => {})
      : Promise.resolve();

    Promise.race([ready, new Promise(r => setTimeout(r, 2000))]).then(() => {
      window.__tgGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game",
        backgroundColor: "#8fd3ff",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: W,
          height: H
        },
        input: { activePointers: 3 },
        scene: [Boot, Title, Garage, DictBook, Play],
      });
    });
  }

  window.TGRacer = { start };
})();
