/**
 * 台語賽車衝衝衝 (TG Air Racer) - 零延遲 Web Audio 賽車音效與台語發音引擎
 * 採用同 Blast Racer 的高品質程序化 Web Audio 合成器，零掉幀、零延遲、溫潤柔順
 */
(function (root) {
  "use strict";

  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem("tg-muted") === "1";
  } catch (e) {}

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(a, secs) {
    const b = a.createBuffer(1, Math.floor(a.sampleRate * secs), a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function tone(type, f1, f2, dur, vol, delay) {
    const a = ac();
    if (!a || muted) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, f1, f2, vol, type, delay) {
    const a = ac();
    if (!a || muted) return;
    const t = a.currentTime + (delay || 0);
    const s = a.createBufferSource();
    s.buffer = noiseBuffer(a, dur + 0.1);
    const f = a.createBiquadFilter();
    f.type = type || "lowpass";
    f.frequency.setValueAtTime(f1, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.4, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination);
    s.start(t);
    s.stop(t + dur + 0.1);
  }

  // 精緻調校的程序化音效庫 (同 Blast Racer 繪本引擎)
  const SFX = {
    pop()     { tone("sine", 500, 900, 0.12, 0.25); },
    tap()     { tone("triangle", 660, 990, 0.1, 0.18); },
    ding()    { tone("sine", 880, 0, 0.5, 0.2); tone("sine", 1320, 0, 0.6, 0.12, 0.08); },
    yay()     { [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, 0, 0.25, 0.18, i * 0.09)); },
    oops()    { tone("sawtooth", 300, 150, 0.3, 0.1); },
    whoosh()  { noise(1.3, 300, 3500, 0.35, "bandpass"); },
    splash()  { noise(0.7, 4000, 500, 0.3, "highpass"); },
    tick()    { tone("square", 1800, 0, 0.03, 0.06); },
    sparkle() { [1568, 2093, 2637].forEach((f, i) => tone("sine", f, 0, 0.3, 0.08, i * 0.07)); },
    puff()    { noise(0.32, 2500, 7000, 0.16, "bandpass"); tone("sine", 700, 1400, 0.18, 0.05); }, // 空氣噴氣升空
    hiss()    { noise(0.16, 5200, 2400, 0.07, "highpass"); }, // 尾部渦輪增壓
    hum()     { tone("sine", 110, 140, 0.4, 0.12); tone("triangle", 220, 260, 0.3, 0.05); }, // 底盤吸風扇
  };

  // 台語聲調五度調值音律 (Tone Melodic Pitch)
  function playTaiwaneseTonePitch(toneNumber) {
    const a = ac();
    if (!a || muted) return;
    const tn = parseInt(toneNumber, 10);
    switch (tn) {
      case 1: // 高平 55 (440Hz)
        tone("sine", 440, 440, 0.18, 0.15);
        break;
      case 2: // 高降 51 (460 -> 230Hz)
        tone("triangle", 460, 230, 0.22, 0.18);
        break;
      case 3: // 低降 21 (280 -> 180Hz)
        tone("sine", 280, 180, 0.22, 0.15);
        break;
      case 4: // 陰入短促 (240Hz, 0.07s)
        tone("sine", 240, 200, 0.07, 0.18);
        break;
      case 5: // 低升 24 (220 -> 360Hz)
        tone("sine", 220, 360, 0.24, 0.16);
        break;
      case 7: // 中平 33 (330Hz)
        tone("sine", 330, 330, 0.18, 0.15);
        break;
      case 8: // 陽入短促 (420Hz, 0.08s)
        tone("triangle", 420, 400, 0.08, 0.18);
        break;
      default:
        tone("sine", 392, 392, 0.15, 0.12);
        break;
    }
  }

  // 真人教育部臺灣台語語音播放模組 (使用 Base64 Data URI，零延遲、無 CORS 問題、100% 離線可用)
  const audioCache = {};

  function playAudio(key, volume) {
    if (muted) return;
    const audios = (typeof window !== "undefined" && window.TG_AUDIO) || {};
    const dataUri = audios[key];
    if (!dataUri) return false;

    try {
      let snd = audioCache[key];
      if (!snd) {
        snd = new Audio(dataUri);
        audioCache[key] = snd;
      }
      // 支援連續觸發重播
      if (!snd.paused) {
        snd.currentTime = 0;
      }
      snd.volume = Math.min(1, Math.max(0, volume != null ? volume : 1.0));
      const p = snd.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  // 播放台語詞彙發音 (優先使用真實教育部錄音 MP3)
  function playWord(idOrHanji, options) {
    if (muted || !idOrHanji) return false;
    const opt = options || {};

    let key = idOrHanji;
    // 如果傳入的是中文字 (如 "跳")，查詢 TG_DICT 找到對應 id
    const dict = (typeof window !== "undefined" && window.TG_DICT && window.TG_DICT.VOCABULARY) || [];
    const found = dict.find(v => v.id === idOrHanji || v.hanji === idOrHanji);
    if (found) {
      key = found.id;
      if (opt.toneNum == null && found.toneNum) opt.toneNum = found.toneNum;
    }

    // 播放真實台語發音
    const ok = playAudio(key, opt.volume);
    if (!ok && opt.toneNum) {
      const m = opt.toneNum.match(/\d/);
      if (m) playTaiwaneseTonePitch(m[0]);
    }
    return ok;
  }

  // 異步非阻塞台語語音朗讀模組 (用於圖鑑點擊與吃寶石溫和提示)
  let preferredVoice = null;
  let voicesReady = false;
  let lastSpeakTime = 0;

  function initVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;
    voicesReady = true;

    // 優先尋找閩南語 / 台灣本地台語語音
    preferredVoice = voices.find(v =>
      /nan|hokkien|minnan|taiwanese/i.test(v.lang) || /nan|hokkien|minnan/i.test(v.name)
    ) || voices.find(v =>
      /zh-TW/i.test(v.lang) && /Mei-Jia|Hsiao-Chen|Yating|Zhiwei/i.test(v.name)
    ) || voices.find(v =>
      /zh-TW/i.test(v.lang)
    ) || voices[0];
  }

  if (typeof window !== "undefined" && 'speechSynthesis' in window) {
    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;
  }

  // 溫和非阻塞發音 (優先播放真人 MP3，若無則降級為語音合成)
  function speakTG(textOrId, options) {
    if (muted) return;
    const opt = options || {};

    // 優先調用真人台語 MP3
    if (playWord(textOrId, opt)) return;

    const now = Date.now();
    if (now - lastSpeakTime < 500) return; // 避免主線程音訊擁塞
    lastSpeakTime = now;

    // 播放聲調輪廓音階
    if (opt.toneNum) {
      const m = opt.toneNum.match(/\d/);
      if (m) playTaiwaneseTonePitch(m[0]);
    }

    if (!('speechSynthesis' in window)) return;
    try {
      if (!voicesReady) initVoices();
      const utter = new SpeechSynthesisUtterance(textOrId);
      if (preferredVoice) utter.voice = preferredVoice;
      utter.lang = (preferredVoice && preferredVoice.lang) || 'zh-TW';
      utter.rate = opt.rate || 1.0;
      utter.pitch = opt.pitch || 1.1;
      utter.volume = opt.volume || 0.9;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  function setMuted(val) {
    muted = !!val;
    try {
      localStorage.setItem("tg-muted", muted ? "1" : "0");
    } catch (e) {}
    if (muted && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  function isMuted() {
    return muted;
  }

  const TG_VOICE = {
    sfx: SFX,
    tone,
    noise,
    playTaiwaneseTonePitch,
    playAudio,
    playWord,
    speakTG,
    setMuted,
    isMuted
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TG_VOICE;
  } else {
    root.TG_VOICE = TG_VOICE;
  }
})(typeof window !== "undefined" ? window : globalThis);
