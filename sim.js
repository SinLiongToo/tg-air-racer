/**
 * 台語賽車衝衝衝 (TG Air Racer) - 賽道構建器與 2D 物理模擬引擎
 * 支援台語詞彙寶石 (Word Gems)、台語加速門 (Boost Gates)、倒掛天花板 (Ceiling)、迴圈與對手幽靈車 (Bot)
 */
(function (root) {
  "use strict";

  const DS = 6; // 賽道取樣間隔 (px)
  const C = {
    G: 1800,       // 重力 (px/s²)
    V0: 440,       // 輪胎基本巡航速度
    VMAX: 1200,    // 最高速度
    HOP_V: 650,    // 向上跳躍瞬間推進速度
    HOP_T: 2700,   // 空中持續噴氣推力
    ZOOM_A: 2200,  // 向前噴射加速度
    STICK: 2600,   // 底盤吸力扇壓力 (大於重力，可倒掛行駛)
    MU: 1.1,       // 輪胎抓地係數
    ENG: 2650,     // 引擎輪胎最大推力
    SOFT: 440,     // 柔和降落閾值 (超過為碰撞 Bonk)
    MAXALT: 460,   // 噴氣高度上限
    TANK: 100,     // 儲氣槽基礎容量
    HOP_COST: 10,  // 單次起跳耗氣
    HOLD_COST: 30, // 空中滑翔每秒耗氣
    ZOOM_COST: 32, // 衝刺每秒耗氣
    PUMP: 5,       // 行駛中小氣泵自動回氣速度 (每秒)
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => {
    a = (a + Math.PI) % (2 * Math.PI);
    if (a < 0) a += 2 * Math.PI;
    return a - Math.PI;
  };

  /* ================================================================ TRACK BUILDER ================================================================ */
  class Builder {
    constructor(y0) {
      this.x = 0;
      this.y = y0 || 520;
      this.a = 0;
      this.phi = 0;
      this.base = this.y;
      this.surfs = [];
      this.cur = null;
      this.items = [];
      this.cps = [];
      this.cues = [];
      this.zones = [];
      this.start();
    }

    start() {
      this.a = 0;
      this.phi = 0;
      this.cur = { pts: [] };
      this.surfs.push(this.cur);
      this.pt("");
      return this;
    }

    pt(tag) {
      this.cur.pts.push({ x: this.x, y: this.y, a: this.a, phi: this.phi, tag });
    }

    step(a, dphi, tag) {
      this.a = a;
      this.x += Math.cos(a) * DS;
      this.y += Math.sin(a) * DS;
      this.phi += dphi;
      this.pt(tag);
    }

    road(len, tag) {
      const n = Math.max(1, Math.round(len / DS));
      for (let i = 0; i < n; i++) this.step(this.a, 0, tag || "");
      return this;
    }

    turn(R, deg, tag) {
      const tot = Math.abs(deg) * Math.PI / 180;
      const n = Math.max(1, Math.round(R * tot / DS));
      const dA = -Math.sign(deg) * tot / n;
      for (let i = 0; i < n; i++) this.step(this.a + dA, 0, tag || "");
      return this;
    }

    roll(len, dphi, rise, tag) {
      const n = Math.max(2, Math.round(len / DS));
      const a0 = this.a;
      const amp = Math.asin(clamp(-rise * Math.PI / (2 * n * DS), -0.9, 0.9));
      for (let i = 1; i <= n; i++) {
        this.step(a0 + amp * Math.sin(Math.PI * i / n), dphi / n, tag);
      }
      this.a = a0;
      return this;
    }

    end() {
      this.cur = null;
      return this;
    }

    jump(dx, dy) {
      this.x += dx;
      this.y += dy;
      return this.start();
    }

    at(dx, dy) {
      return { x: this.x + (dx || 0), y: this.y + (dy || 0) };
    }

    item(kind, dx, dy, o) {
      const p = this.at(dx, dy);
      this.items.push(Object.assign({ kind, x: p.x, y: p.y }, o || {}));
    }

    cp() {
      this.cps.push({ si: this.surfs.length - 1, s: (this.cur.pts.length - 1) * DS, x: this.x });
    }

    cue(act, x, o) {
      this.cues.push(Object.assign({ act, x }, o || {}));
    }

    zone(act, x0, x1) {
      this.zones.push({ act, x0, x1 });
    }

    // 放置台語字詞寶石
    word(vocabId, dx, dy) {
      this.item("word_gem", dx || 0, dy || -60, { vocabId });
      return this;
    }

    // 放置台語加速門
    boostGate(dx, dy) {
      this.item("boost_gate", dx || 0, dy || -50);
      return this;
    }

    flat(len, deco) {
      this.cp();
      if (deco) this.row(deco, len);
      return this.road(len);
    }

    row(kind, len, h) {
      const n = Math.max(3, Math.min(7, Math.floor(len / 140)));
      for (let i = 0; i < n; i++) {
        this.item(kind, len * (0.5 + (i - (n - 1) / 2) / (n + 1)), -(h || 50));
      }
    }

    cones(n, gap) {
      for (let i = 0; i < n; i++) {
        this.flat(gap || 560);
        this.item("cone", 0, -26, { r: 26 });
        this.cue("hop", this.x - 150);
        this.item("bolt", 0, -150);
      }
      return this.flat(380);
    }

    truck() {
      this.flat(640);
      this.item("truck", 120, -55, { r: 70, w: 210, h: 110 });
      this.cue("hop", this.x - 90, { hold: 0.3 });
      for (let i = 0; i < 4; i++) {
        this.item("bolt", -10 + i * 80, -240 - Math.sin(i / 3 * Math.PI) * 30);
      }
      return this.flat(560);
    }

    hill(R, deg, deco) {
      this.cp();
      if (deco) this.item(deco, R * deg / 57, -R * (1 - Math.cos(deg / 57)) - 70);
      return this.turn(R, deg).turn(R, -2 * deg).turn(R, deg).road(200);
    }

    gap(len, dy) {
      this.flat(520);
      this.item("bubble", 260, -50);
      this.cue("hop", this.x - 40, { hold: len > 220 ? 0.3 : 0 });
      const x0 = this.x, y0 = this.y;
      this.end();
      this.jump(len, dy || 0);
      for (let i = 1; i <= 3; i++) {
        this.items.push({ kind: "bolt", x: x0 + len * i / 4, y: y0 - 130 - 30 * Math.sin(i / 4 * Math.PI) + (dy || 0) * i / 4 });
      }
      return this.flat(520);
    }

    drop(dy, dx) {
      this.flat(560);
      this.end();
      this.jump(dx || 120, dy);
      this.item("bubble", 60, -dy / 2 - 40);
      return this.flat(700);
    }

    loop(R, how) {
      this.flat(620);
      const x0 = this.x;
      this.zone(how || "stick", x0 - 260, x0 + 60);
      this.item("bolt", 0, -2 * R + 40);
      this.item("bolt", -R * 0.7, -R);
      this.item("bolt", R * 0.7, -R);
      this.turn(R, 360, "loop");
      this.zone(how || "stick", x0, x0 + 40);
      return this.flat(560);
    }

    spiral(R, turns) {
      this.flat(620);
      const x0 = this.x;
      this.zone("stick", x0 - 260, x0 + 40);
      for (let t = 0; t < turns; t++) {
        this.item("bolt", 0, -2 * R + 40);
        this.turn(R, 360, "loop");
      }
      this.zone("stick", x0, x0 + 40);
      return this.flat(560);
    }

    twist(len) {
      this.flat(560);
      const x0 = this.x;
      this.item("bolt", len * 0.25, -60);
      this.item("bolt", len * 0.5, 40);
      this.item("bolt", len * 0.75, -60);
      this.roll(len, 2 * Math.PI, 0, "twist");
      this.zone("stick", x0 - 200, this.x + 40);
      return this.flat(480);
    }

    ceiling(len) {
      this.flat(560);
      const x0 = this.x;
      this.roll(520, Math.PI, 230, "rise");
      for (let i = 0; i < 4; i++) this.item("bolt", 120 + i * (len - 160) / 3, 48);
      this.road(len, "ceil");
      this.zone("stick", x0 - 200, this.x - 10);
      const xe = this.x;
      this.end();
      this.jump(150, 300);
      this.item("bubble", -40, -150);
      this.cue("land", xe);
      return this.flat(700);
    }

    station() {
      this.flat(500);
      this.item("pump", 0, -70, { r: 80 });
      return this.flat(400);
    }

    finish() {
      this.flat(400);
      this.finishX = this.x;
      this.road(1400);
      return this;
    }

    build() {
      return new Track(this);
    }
  }

  /* ================================================================ TRACK ================================================================ */
  class Track {
    constructor(b) {
      this.surfs = b.surfs.filter(s => s.pts.length > 1);
      let maxY = -1e9, minY = 1e9;
      for (const S of this.surfs) {
        const P = S.pts;
        S.len = (P.length - 1) * DS;
        for (let i = 0; i < P.length; i++) {
          const p = P[i], a = P[Math.max(0, i - 1)], c = P[Math.min(P.length - 1, i + 1)];
          p.s = i * DS;
          p.k = c === a ? 0 : -(c.a - a.a) / ((Math.min(P.length - 1, i + 1) - Math.max(0, i - 1)) * DS);
          maxY = Math.max(maxY, p.y);
          minY = Math.min(minY, p.y);
        }
      }
      this.items = b.items;
      this.cps = b.cps;
      this.cues = b.cues.sort((a, c) => a.x - c.x);
      this.zones = b.zones;
      this.finishX = b.finishX || (b.x - 1400);
      this.endX = b.x;
      this.maxY = maxY;
      this.minY = minY;
      this.floorY = maxY + 420;
      this.waterY = maxY + 150;
      this.base = b.base;

      this.ponds = [];
      for (let i = 0; i < this.surfs.length - 1; i++) {
        const A = this.surfs[i].pts, a = A[A.length - 1], c = this.surfs[i + 1].pts[0];
        if (c.x > a.x + 20 && Math.cos(a.phi) > 0.5) {
          this.ponds.push({ x0: a.x, x1: c.x, y: Math.max(a.y, c.y) + 110 });
        }
        const r = A.find(p => p.tag === "rise");
        if (r && Math.cos(a.phi) < 0) {
          this.ponds.push({ x0: r.x + 40, x1: c.x, y: c.y + 110 });
        }
      }

      this.B = 128;
      this.idx = new Map();
      this.surfs.forEach((S, si) => {
        for (let i = 0; i < S.pts.length - 1; i++) {
          const p = S.pts[i], q = S.pts[i + 1];
          if (Math.cos(p.phi) < 0.5 || p.tag === "loop") continue;
          for (let k = Math.floor(Math.min(p.x, q.x) / this.B); k <= Math.floor(Math.max(p.x, q.x) / this.B); k++) {
            if (!this.idx.has(k)) this.idx.set(k, []);
            this.idx.get(k).push([si, i]);
          }
        }
      });
    }

    at(si, s) {
      const P = this.surfs[si].pts;
      const f = clamp(s / DS, 0, P.length - 1.0001);
      const i = Math.floor(f), u = f - i;
      const p = P[i], q = P[i + 1];
      return {
        x: p.x + (q.x - p.x) * u,
        y: p.y + (q.y - p.y) * u,
        a: p.a + (q.a - p.a) * u,
        phi: p.phi + (q.phi - p.phi) * u,
        k: p.k,
        tag: p.tag
      };
    }

    below(x, y) {
      let best = Infinity;
      for (const [si, i] of this.idx.get(Math.floor(x / this.B)) || []) {
        const p = this.surfs[si].pts[i], q = this.surfs[si].pts[i + 1];
        if ((p.x - x) * (q.x - x) > 0 || p.x === q.x) continue;
        const yy = p.y + (q.y - p.y) * (x - p.x) / (q.x - p.x);
        if (yy >= y - 4) best = Math.min(best, yy - y);
      }
      return best;
    }
  }

  /* ================================================================ SIM ================================================================ */
  class Sim {
    constructor(track, opt) {
      opt = opt || {};
      const up = opt.up || {};
      this.T = track;
      this.btn = opt.btn || "hzs";
      this.cap = C.TANK + 35 * (up.tank || 0); // 氣槽擴充
      this.power = 1 + 0.15 * (up.puff || 0); // 噴射加強
      this.soft = C.SOFT + 95 * (up.soft || 0); // 軟彈簧避震
      this.items = track.items.map(o => Object.assign({}, o));

      this.mode = "ground";
      this.si = 0;
      this.s = 0;
      this.v = C.V0;
      this.x = 0;
      this.y = track.base;
      this.ang = 0;
      this.roll = 0;
      this.vx = C.V0;
      this.vy = 0;

      this.air = this.cap;
      this.bolts = 0;
      this.collectedWords = [];
      this.bonks = 0;
      this.smooth = 0;
      this.rescues = 0;
      this.loops = 0;
      this.done = false;
      this.t = 0;

      this.cp = track.cps[0] || { si: 0, s: 0 };
      this.p = this.T.at(0, 0);
      this.ev = [];
      this.inp = { hop: false, zoom: false, stick: false };
      this.place();
    }

    can(btn) {
      return this.btn.indexOf(btn) >= 0;
    }

    emit(type, o) {
      this.ev.push(Object.assign({ type, t: this.t, x: this.x, y: this.y }, o || {}));
    }

    place() {
      const p = this.p = this.T.at(this.si, this.s);
      this.x = p.x;
      this.y = p.y;
      this.ang = p.a;
      this.roll = p.phi;
      this.onLoop = p.tag === "loop" || p.tag === "twist" || p.tag === "rise" || p.tag === "ceil";
      this.onCeil = p.tag === "ceil" || p.tag === "rise";
    }

    step(dt, inp) {
      if (this.done) return;
      this.t += dt;
      inp = {
        hop: !!(inp && inp.hop && this.can("h")),
        zoom: !!(inp && inp.zoom && this.can("z")),
        stick: !!(inp && inp.stick && this.can("s")),
      };
      if (inp.stick) inp.hop = false;
      this.inp = inp;

      const cp = this.T.cps.slice().reverse().find(c => this.x >= c.x);
      if (cp) this.cp = cp;

      let use = 0;
      if (inp.zoom) use += C.ZOOM_COST * dt;
      if (inp.hop && this.mode === "air") use += C.HOLD_COST * dt;
      if (inp.stick) use += 12 * dt;

      if (use > 0) {
        if (this.air >= use) {
          this.air -= use;
        } else {
          this.air = 0;
          inp.hop = false;
          inp.zoom = false;
          this.emit("empty");
        }
      } else {
        this.air = Math.min(this.cap, this.air + C.PUMP * dt);
      }

      this.puffing = {
        hop: inp.hop && this.air > 0,
        zoom: inp.zoom && this.air > 0
      };

      if (this.mode === "ground") this.stepGround(dt, inp);
      else if (this.mode === "air") this.stepAir(dt, inp);
      else if (this.mode === "rescue") this.stepRescue(dt);

      this.touch();
      if (!this.done && this.x >= this.T.finishX) {
        this.done = true;
        this.emit("finish");
      }
    }

    takeoff(p, vx, vy) {
      this.mode = "air";
      this.vx = vx;
      this.vy = vy;
      this.x = p.x;
      this.y = p.y;
      this.ang = p.a;
      this.roll = p.phi;
      this.airT = 0;
      this.ignore = 0.06;
      this.lastSi = this.si;
      this.vyMax = 0;
      if (p.tag === "loop") this.whoops();
    }

    whoops() {
      this.mode = "rescue";
      this.rescueT = 1.3;
      this.rescues++;
      this.emit("whoops");
    }

    stepGround(dt, inp) {
      const T = this.T, S = T.surfs[this.si], p = T.at(this.si, this.s);
      const tx = Math.cos(p.a), ty = Math.sin(p.a), nx = ty, ny = -tx, c = Math.cos(p.phi);
      const gt = C.G * ty;
      const N = c * (this.v * this.v * p.k - C.G * ny);
      const stick = inp.stick ? C.STICK : 0;
      this.onLoop = p.tag === "loop" || p.tag === "twist" || p.tag === "rise" || p.tag === "ceil";

      if (inp.hop && !inp.stick && c > 0.3 && this.air >= C.HOP_COST) {
        this.air -= C.HOP_COST;
        this.takeoff(p, this.v * tx + nx * c * C.HOP_V * this.power, this.v * ty + ny * c * C.HOP_V * this.power);
        this.emit("hop");
        return;
      }

      if (N + stick < 0) {
        this.takeoff(p, this.v * tx, this.v * ty);
        return;
      }

      const grip = C.MU * (Math.max(N, 0) + stick);
      let aE;
      if (this.v < C.V0) aE = clamp((C.V0 - this.v) * 4 - gt, 0, Math.min(C.ENG, grip));
      else aE = -(this.v - C.V0) * 0.7;

      let aZ = 0;
      if (inp.zoom && this.air > 0) {
        aZ = C.ZOOM_A * this.power;
      }

      this.v = Math.min(C.VMAX, this.v + (gt + aE + aZ) * dt);
      if (p.tag === "loop" && this.v < 40) {
        this.whoops();
        return;
      }

      this.s += this.v * dt;
      if (this.s >= S.len) {
        this.s = S.len;
        const q = T.at(this.si, this.s);
        this.takeoff(q, this.v * Math.cos(q.a), this.v * Math.sin(q.a));
        return;
      }
      if (this.s < 0) {
        this.s = 0;
        this.v = Math.max(0, this.v);
      }
      this.place();
    }

    stepAir(dt, inp) {
      const T = this.T;
      this.airT = (this.airT || 0) + dt;
      this.ignore = (this.ignore || 0) - dt;
      let ax = 0, ay = C.G;
      const cr = Math.cos(this.roll);

      if (inp.hop && this.air > 0) {
        const alt = T.below(this.x, this.y);
        const fade = alt === Infinity ? 1 : clamp((C.MAXALT - alt) / 140, 0, 1);
        const k = C.HOP_T * this.power * Math.max(0, cr * Math.cos(this.ang)) * fade;
        ay -= k;
        if (fade < 0.4 && !this.highSaid) {
          this.highSaid = true;
          this.emit("high");
        }
        if (this.vy < 0) this.vy *= 1 - (1 - fade) * 6 * dt;
      }
      if (inp.zoom && this.air > 0) {
        ax += C.ZOOM_A * 0.5 * this.power;
      }

      const rr = (inp.hop && this.air > 0 ? 10 : 4.2) * dt;
      const ra = wrap(this.ang), rl = wrap(this.roll);
      this.ang = ra - clamp(ra, -rr, rr);
      this.roll = rl - clamp(rl, -rr, rr);

      this.vx += ax * dt;
      this.vy += ay * dt;
      this.vyMax = Math.max(this.vyMax, this.vy);

      const px = this.x, py = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // 著陸碰撞檢測
      const cand = T.idx.get(Math.floor(this.x / T.B)) || [];
      for (const [si, i] of cand) {
        if (this.ignore > 0 && si === this.lastSi) continue;
        const P_pts = T.surfs[si].pts, p = P_pts[i], q = P_pts[i + 1];
        const tx = (q.x - p.x) / DS, ty = (q.y - p.y) / DS, nx = ty, ny = -tx;
        const d0 = (px - p.x) * nx + (py - p.y) * ny;
        const d1 = (this.x - p.x) * nx + (this.y - p.y) * ny;
        const u = (this.x - p.x) * tx + (this.y - p.y) * ty;

        if (d0 >= -3 && d1 < 0 && u >= -3 && u <= DS + 3 && (this.vx * nx + this.vy * ny < 0)) {
          this.land(si, i * DS + clamp(u, 0, DS), tx, ty, nx, ny);
          return;
        }
      }

      // 落水或出界檢測
      const pond = T.ponds.find(w => this.x > w.x0 && this.x < w.x1 && this.y > w.y + 10);
      if (pond || this.y > T.floorY) {
        this.mode = "rescue";
        this.rescueT = 1.3;
        this.rescues++;
        this.emit("splash", { y: pond ? pond.y : T.waterY });
      }
    }

    land(si, s, tx, ty, nx, ny) {
      const vn = -(this.vx * nx + this.vy * ny);
      const vt = this.vx * tx + this.vy * ty;
      const dA = Math.abs(wrap(this.ang - Math.atan2(ty, tx)));
      const dR = Math.abs(wrap(this.roll));

      this.mode = "ground";
      this.si = si;
      this.s = s;

      if (vn > this.soft || dA > 0.9 || dR > 0.9) {
        // 重落地 (Bonk)
        this.v = Math.max(vt * 0.5, 140);
        this.bonks++;
        this.emit("bonk");
      } else {
        // 柔和降落 (Smooth Landing)
        this.v = vt;
        if (this.vyMax > this.soft * 0.85) {
          this.smooth++;
          this.bolts += 2;
          this.emit("smooth");
        }
      }
      this.place();
    }

    stepRescue(dt) {
      this.rescueT -= dt;
      if (this.rescueT <= 0) {
        this.mode = "ground";
        this.si = this.cp.si;
        this.s = this.cp.s;
        this.v = C.V0;
        this.place();
        this.emit("drop");
      }
    }

    touch() {
      if (this.mode === "rescue") return;
      const ux = Math.sin(this.ang) * Math.cos(this.roll);
      const uy = -Math.cos(this.ang) * Math.cos(this.roll);
      const cx = this.x + ux * 28, cy = this.y + uy * 28;

      for (const o of this.items) {
        if (o.gone || Math.abs(o.x - cx) > 160) continue;

        // 加氣站
        if (o.kind === "pump") {
          if (Math.abs(o.x - cx) < 60) {
            o.gone = true;
            this.air = this.cap;
            this.emit("refill", { x: o.x, y: o.y });
          }
          continue;
        }

        // 大貨車障礙物
        if (o.kind === "truck") {
          if (Math.abs(cx - o.x) < o.w / 2 + 34 && Math.abs(cy - o.y) < o.h / 2 + 12) {
            o.gone = true;
            this.bump(o);
          }
          continue;
        }

        // 加速門 (Boost Gate)
        if (o.kind === "boost_gate") {
          if (Math.abs(cx - o.x) < 40 && Math.abs(cy - o.y) < 60) {
            o.gone = true;
            this.air = this.cap;
            this.v = Math.min(C.VMAX, this.v + 350);
            this.emit("boost_gate", { x: o.x, y: o.y });
          }
          continue;
        }

        const r = (o.r || 24) + 32;
        if ((o.x - cx) ** 2 + (o.y - cy) ** 2 > r * r) continue;

        o.gone = true;

        if (o.kind === "cone") {
          this.bump(o);
        } else if (o.kind === "bolt") {
          this.bolts++;
          this.emit("bolt", { x: o.x, y: o.y });
        } else if (o.kind === "bubble") {
          this.air = Math.min(this.cap, this.air + 24);
          this.emit("bubble", { x: o.x, y: o.y });
        } else if (o.kind === "word_gem") {
          // 台語字卡寶石
          this.bolts += 3;
          if (!this.collectedWords.includes(o.vocabId)) {
            this.collectedWords.push(o.vocabId);
          }
          this.emit("word_gem", { x: o.x, y: o.y, vocabId: o.vocabId });
        }
      }
    }

    bump(o) {
      this.bonks++;
      this.emit("bonk", { x: o.x, y: o.y, item: o });
      if (this.mode === "ground") {
        this.v = Math.min(this.v, 200);
      } else {
        this.vx *= 0.5;
        this.vy = Math.min(this.vy, 0) * 0.3;
      }
    }

    progress() {
      return clamp(this.x / this.T.finishX, 0, 1);
    }
  }

  /* ================================================================ 8大台灣實景主題關卡設計 ================================================================ */
  const LEVELS = [
    {
      name: "淡水紅毛城・金色水岸！",
      tailo: "Tām-tsuí Âng-mn̂g-siânn: Thiàu--khí-lâi!",
      btn: "h",
      tip: "淡水河口海風迎面吹來！點擊 ⬆【跳 (Thiàu)】向下噴氣，越過淡水金色水岸與角錐，收集台語字卡！",
      fact: "淡水紅毛城是台灣最古老紅磚建築之一，俯瞰淡水河出海口！向下噴氣『跳 (thiàu)』起來！",
      dash: 1.18,
      vocabs: ["tam-tsui", "thiau", "hong", "tsau", "pui", "thing", "kiann"],
      build: b => b.flat(800, "bolt")
        .word("tam-tsui", 200, -80)
        .cones(2, 540)
        .word("thiau", 240, -80)
        .flat(500, "bubble")
        .word("hong", 220, -80)
        .gap(170)
        .word("pui", 300, -100)
        .cones(2, 520)
        .word("thing", 200, -80)
        .flat(500, "bolt")
        .gap(200)
        .word("kiann", 200, -80)
        .finish()
    },
    {
      name: "花蓮太魯閣・峽谷大迴圈！",
      tailo: "Thài-lóo-koh: Kek-sok Tshiong-chhì!",
      btn: "hz",
      tip: "穿越太魯閣大理石峭壁！按住 ➡【衝 (Tshiong)】向後大噴氣，累積足夠速度衝過 360 度大迴圈！",
      fact: "太魯閣國家公園擁有世界級大理石壯麗峽谷！向後噴出高壓空氣，極速『衝衝衝 (tshiong-chhiong-chhiong)』！",
      dash: 1.14,
      vocabs: ["tshiong", "kin", "tsioh", "hiong-tsian", "tng-lian", "suan"],
      build: b => b.flat(750, "bolt")
        .word("tshiong", 200, -80)
        .hill(600, 15, "bolt")
        .word("kin", 250, -80)
        .cones(1)
        .word("tsioh", 220, -80)
        .station()
        .word("suan", 180, -90)
        .loop(240, "zoom")
        .word("hiong-tsian", 220, -80)
        .boostGate(200)
        .gap(240)
        .word("tng-lian", 240, -80)
        .hill(600, 16)
        .loop(240, "zoom")
        .drop(260)
        .finish()
    },
    {
      name: "宜蘭雪山隧道・倒頭栽吸力！",
      tailo: "Seh-suann Suī-tō: Tò-thâu-tsai!",
      btn: "hzs",
      tip: "進入全台最長雪山隧道！按住 🌀【黏 (Liâm)】啟動底盤吸力扇，在隧道頂部天花板倒頭栽飛馳！",
      fact: "雪山隧道長達12.9公里！強力吸風扇把底盤空氣抽走，四周大氣壓力將車身緊貼路面，台語講『黏絚絚 (liâm-ân-ân)』！",
      dash: 1.12,
      vocabs: ["seh-suann", "liam", "to-thau-tsai", "ting-kuan", "e-te", "pinn-a"],
      build: b => b.flat(800, "bolt")
        .word("seh-suann", 220, -80)
        .loop(240)
        .word("liam", 220, -80)
        .word("ting-kuan", 250, -80)
        .twist(900)
        .word("to-thau-tsai", 300, -90)
        .ceiling(1000)
        .word("e-te", 200, -80)
        .flat(400, "bubble")
        .word("pinn-a", 240, -80)
        .gap(220)
        .loop(240)
        .drop(260)
        .finish()
    },
    {
      name: "盤山過嶺・阿里山！",
      tailo: "Puânn-suann: A-lí-san!",
      btn: "hzs",
      tip: "阿里山森林山道起伏蜿蜒，著陸前輕輕一噴打出【穩穩降落 (ún-ún lo̍h-tē)】拿雙倍金幣！",
      fact: "盤山過嶺的鐵道與神木美景是台灣國寶！高空落下時向下緩衝噴氣，就像火箭著陸一樣穩健！",
      dash: 1.10,
      vocabs: ["a-li-san", "puann-suann", "tshiu-na", "tua-loo", "kuan-suann"],
      build: b => b.flat(750, "bolt")
        .word("a-li-san", 200, -80)
        .truck()
        .word("tshiu-na", 240, -80)
        .hill(650, 18, "bolt")
        .word("puann-suann", 280, -90)
        .drop(260)
        .station()
        .word("tua-loo", 220, -80)
        .loop(240)
        .word("kuan-suann", 260, -90)
        .ceiling(900)
        .drop(300)
        .finish()
    },
    {
      name: "港都大跳躍・高雄港！",
      tailo: "Ko-hiông-káng Tāi-thiàu!",
      btn: "hzs",
      tip: "橫越海港大水池！看準跳躍時機點 ⬆ 跳躍，不要跌入海裡『落水 (lo̍h-tsúi)』囉！",
      fact: "高雄港海闊天空，如果不小心落水，無人機吊車會即刻救起，安全又免驚！",
      dash: 1.09,
      vocabs: ["ko-hiong-kang", "kang-khau", "tsun-a", "tua-kio", "loh-tsui"],
      build: b => b.flat(800, "bolt")
        .word("ko-hiong-kang", 220, -80)
        .gap(260)
        .word("kang-khau", 240, -80)
        .truck()
        .word("tua-kio", 260, -80)
        .gap(280)
        .station()
        .word("tsun-a", 240, -80)
        .loop(240)
        .word("loh-tsui", 220, -80)
        .gap(240)
        .drop(280)
        .finish()
    },
    {
      name: "億載金城・古城障礙賽！",
      tailo: "It-tāi-kim-siânn!",
      btn: "hzs",
      tip: "穿越台南古城砲台拱門！靈活切換【跳、衝、黏】三鍵，敏捷避開紅磚與障礙！",
      fact: "億載金城是台南清代砲台，由法國工程師設計，紅磚拱門歷史悠久！",
      dash: 1.08,
      vocabs: ["it-tai-kim-siann", "koo-siann", "siann-mng", "tsng-a", "lik-su"],
      build: b => b.flat(700, "bolt")
        .word("it-tai-kim-siann", 240, -80)
        .truck()
        .word("siann-mng", 220, -80)
        .cones(2)
        .word("koo-siann", 240, -80)
        .loop(240)
        .word("tsng-a", 220, -80)
        .ceiling(950)
        .station()
        .word("lik-su", 240, -80)
        .twist(900)
        .drop(300)
        .finish()
    },
    {
      name: "雙重螺旋・台北101！",
      tailo: "Tâi-pak 101!",
      btn: "hzs",
      tip: "連續大螺旋！按緊 🌀【黏】緊貼旋轉彎道，飛向天頂，高喊『水啦 (suí--lah)』！",
      fact: "連續螺旋是離心力與路面支撐力的極限對決！穩穩吸附就能一飛沖天！",
      dash: 1.07,
      vocabs: ["tai-pak", "tsin-kuan", "thinn-ting", "sui-lah", "song-khuai"],
      build: b => b.flat(800, "bolt")
        .word("tai-pak", 220, -80)
        .spiral(220, 2)
        .word("tsin-kuan", 260, -90)
        .drop(260)
        .twist(900)
        .word("thinn-ting", 240, -80)
        .station()
        .spiral(220, 2)
        .word("sui-lah", 240, -80)
        .ceiling(1000)
        .word("song-khuai", 250, -80)
        .drop(320)
        .finish()
    },
    {
      name: "國境之南・墾丁鵝鑾鼻大獎賽！",
      tailo: "Khún-ting Gô-luân-phīnn Grand Prix!",
      btn: "hzs",
      tip: "奔馳至台灣最南端鵝鑾鼻燈塔！太平洋蔚藍海岸線大決賽，爭奪台語車神總冠軍！",
      fact: "墾丁鵝鑾鼻燈塔位於台灣最南端，照射巴士海峽，號稱『東亞之光』！無論輸贏，全力奔馳就是大冠軍！",
      dash: 1.05,
      vocabs: ["ting-tah", "hai", "tshia-sin", "te-it-mia", "kuan-kun", "su-iann", "tsan-lah", "ka-iu"],
      build: b => b.flat(700, "bolt")
        .word("ting-tah", 240, -80)
        .cones(2)
        .loop(240)
        .word("hai", 220, -80)
        .word("tshia-sin", 240, -80)
        .truck()
        .station()
        .word("ka-iu", 220, -80)
        .word("su-iann", 240, -80)
        .ceiling(1000)
        .twist(900)
        .word("tsan-lah", 240, -80)
        .gap(260)
        .spiral(220, 2)
        .word("kuan-kun", 240, -80)
        .station()
        .boostGate(200)
        .drop(320)
        .word("te-it-mia", 260, -90)
        .truck()
        .loop(240)
        .ceiling(1100)
        .finish()
    }
  ];

  // 無限模式模組零件
  const ENDLESS_PARTS = [
    b => b.cones(2),
    b => b.truck(),
    b => b.gap(200 + Math.random() * 80),
    b => b.drop(220 + Math.random() * 120),
    b => b.loop(240),
    b => b.twist(900),
    b => b.ceiling(900 + Math.random() * 300),
    b => b.spiral(200, 2),
    b => b.hill(700, 16, "bolt"),
    b => b.flat(600, "bolt"),
  ];

  function buildLevel(i) {
    const b = new Builder();
    if (i < 0) {
      // 無限模式：長跑道隨機拼接
      b.flat(800, "bolt");
      const wordIds = root.TG_DICT ? root.TG_DICT.VOCABULARY.map(v => v.id) : ["thiau", "tshiong", "liam"];
      for (let k = 0; k < 60; k++) {
        ENDLESS_PARTS[Math.floor(Math.random() * ENDLESS_PARTS.length)](b);
        if (k % 2 === 0) {
          const randW = wordIds[Math.floor(Math.random() * wordIds.length)];
          b.word(randW, 200, -80);
        }
        if (k % 4 === 3) b.station();
      }
      b.finish();
    } else {
      LEVELS[i].build(b);
      if (!b.finishX) b.finish();
    }
    return b.build();
  }

  /* ================================================================ BOT (對手阿飛號 Dash 賽車線) ================================================================ */
  function bot(opts) {
    opts = opts || {};
    const late = opts.late || 0;
    let hold = 0;
    return sim => {
      const T = sim.T, x = sim.x, inp = { hop: false, zoom: false, stick: false };
      for (const z of T.zones) if (x >= z.x0 && x <= z.x1) inp[z.act] = true;
      if (sim.mode === "ground" && sim.onLoop) inp[sim.can("s") ? "stick" : "zoom"] = true;
      if (sim.mode === "ground") {
        hold = 0;
        for (const c of T.cues) {
          if (c.act === "hop" && x >= c.x + late && x < c.x + late + 12) {
            inp.hop = true;
            hold = c.hold || 0;
          }
        }
      } else if (sim.mode === "air") {
        if (hold > 0) { hold -= 1 / 120; inp.hop = true; }
        const d = T.below(x, sim.y), vy = sim.vy;
        if (sim.vyMax > sim.soft * 0.85 && vy > 200 && d < vy * vy / (2 * 800) + 40) inp.hop = true;
        if (Math.abs(wrap(sim.roll)) > 0.3 && sim.vy > 0) inp.hop = true;
        inp.stick = false;
      }
      if (inp.stick) inp.hop = false;
      return inp;
    };
  }

  function run(track, pilot, opt) {
    opt = opt || {};
    const sim = new Sim(track, opt);
    const dt = 1 / 120;
    const rec = [];
    let n = 0;
    while (!sim.done && n < (opt.max || 120 * 240)) {
      sim.step(dt, pilot(sim));
      n++;
      if (opt.rec && n % 2 === 0) rec.push([sim.x, sim.y, sim.ang, sim.roll, sim.mode === "rescue" ? 1 : 0]);
    }
    return {
      t: sim.t,
      done: sim.done,
      bonks: sim.bonks,
      smooth: sim.smooth,
      rescues: sim.rescues,
      bolts: sim.bolts,
      collectedWords: sim.collectedWords,
      air: sim.air,
      rec,
      sim
    };
  }

  const API = { C, DS, Builder, Track, Sim, LEVELS, buildLevel, bot, run, wrap };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.TG_Sim = API;
})(typeof window !== "undefined" ? window : globalThis);
