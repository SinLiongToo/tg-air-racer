/**
 * 台語賽車衝衝衝 (TG Air Racer) - 台語詞彙資料庫與連音變調引擎
 * 依據教育部《臺灣閩南語常用詞辭典》與台灣閩南語羅馬字拼音方案 (Tâi-lô)
 */
(function (root) {
  "use strict";

  // 連音變調規則 (教育部優勢腔：前字變調，後字本調)
  // 1 (55) -> 7 (33)
  // 2 (51) -> 1 (55)
  // 3 (21) -> 2 (51)
  // 4 (-h) -> 2 (51), 4 (-p/-t/-k) -> 8 (5)
  // 5 (24) -> 7 (33)
  // 7 (33) -> 3 (21)
  // 8 (-h) -> 3 (21), 8 (-p/-t/-k) -> 4 (2)
  function getSandhiTone(syllable) {
    const s = syllable.toLowerCase();
    // 找出調號 (1-8)
    const m = s.match(/([a-zptkh]+)([1-8])/);
    if (!m) return syllable;
    const body = m[1];
    const tone = parseInt(m[2], 10);
    const lastChar = body.slice(-1);
    const isStop = ['p', 't', 'k'].includes(lastChar);
    const isGlottal = lastChar === 'h';

    let newTone = tone;
    if (tone === 1) newTone = 7;
    else if (tone === 2) newTone = 1;
    else if (tone === 3) newTone = 2;
    else if (tone === 4) newTone = isGlottal ? 2 : 8;
    else if (tone === 5) newTone = 7;
    else if (tone === 7) newTone = 3;
    else if (tone === 8) newTone = isGlottal ? 3 : 4;

    return body + newTone;
  }

  // 40+ 精選賽車與生活台語詞彙
  const VOCABULARY = [
    // 關卡 1：淡水紅毛城・金色水岸！ (新北淡水)
    { id: "tam-tsui", hanji: "淡水", tailo: "Tām-tsuí", toneNum: "tam7-tsui2", sandhi: "Tām-tsuí", meaning: "淡水 / Tamsui", en: "Tamsui", level: 0, icon: "🏰", desc: "金色水岸，紅毛城古蹟！" },
    { id: "hong", hanji: "風", tailo: "hong", toneNum: "hong1", sandhi: "hong (本調)", meaning: "風、海風 / Wind", en: "Wind", level: 0, icon: "💨", desc: "淡水港邊海風吹。" },
    { id: "thiau", hanji: "跳", tailo: "thiàu", toneNum: "thiau3", sandhi: "thiàu (本調)", meaning: "跳躍 / Hop", en: "Hop / Jump", level: 0, icon: "⬆️", desc: "向下噴氣，車仔彈懸懸！" },
    { id: "tsau", hanji: "走", tailo: "tsáu", toneNum: "tsau2", sandhi: "tsáu (本調)", meaning: "跑、奔馳 / Run", en: "Run / Drive fast", level: 0, icon: "🏃", desc: "加壓向前走！" },
    { id: "pui", hanji: "飛", tailo: "pui", toneNum: "pui1", sandhi: "pui (本調)", meaning: "飛翔 / Fly", en: "Fly", level: 0, icon: "🕊️", desc: "在空中像鳥仔在飛！" },
    { id: "thing", hanji: "停", tailo: "thîng", toneNum: "thing5", sandhi: "thîng (本調)", meaning: "停止 / Stop", en: "Stop", level: 0, icon: "🛑", desc: "踩煞車停落來。" },
    { id: "kiann", hanji: "行", tailo: "kiânn", toneNum: "kiann5", sandhi: "kiânn (本調)", meaning: "行走、前進 / Walk/Go", en: "Go / Walk", level: 0, icon: "🚶", desc: "向目標慢慢行。" },

    // 關卡 2：花蓮太魯閣・峽谷大迴圈！ (花蓮大理石峽谷)
    { id: "tsioh", hanji: "石", tailo: "tsio̍h", toneNum: "tsioh8", sandhi: "tsio̍h (本調)", meaning: "岩石、大理石 / Rock/Marble", en: "Rock / Marble", level: 1, icon: "🪨", desc: "太魯閣峽谷壯麗大理石！" },
    { id: "tshiong", hanji: "衝", tailo: "tshiong", toneNum: "tshiong1", sandhi: "tshiong (本調)", meaning: "狂飆、衝刺 / Zoom", en: "Zoom / Dash", level: 1, icon: "➡️", desc: "向後大噴氣，極速衝衝衝！" },
    { id: "kin", hanji: "緊", tailo: "kín", toneNum: "kin2", sandhi: "kín (本調)", meaning: "快、迅速 / Fast", en: "Fast / Quick", level: 1, icon: "⚡", desc: "車速真緊！" },
    { id: "hiong-tsian", hanji: "向前", tailo: "hiòng-tsiân", toneNum: "hiong3-tsian5", sandhi: "hiōng-tsiân", meaning: "向前前進 / Forward", en: "Forward", level: 1, icon: "⏩", desc: "不驚困難向前行！" },
    { id: "tng-lian", hanji: "轉輪", tailo: "tńg-lián", toneNum: "tng2-lian2", sandhi: "tng1-lián", meaning: "旋轉車輪 / Spinning wheel", en: "Spin wheel", level: 1, icon: "🔄", desc: "風火輪踅無停！" },
    { id: "suan", hanji: "旋", tailo: "suân", toneNum: "suan5", sandhi: "suân (本調)", meaning: "迴旋、旋轉 / Swirl", en: "Swirl / Loop", level: 1, icon: "🌀", desc: "過大迴圈一直旋！" },

    // 關卡 3：宜蘭雪山隧道・倒頭栽吸力！ (雪山隧道天花板)
    { id: "seh-suann", hanji: "雪山", tailo: "Seh-suann", toneNum: "seh4-suann1", sandhi: "Seh-suann", meaning: "雪山隧道 / Hsuehshan", en: "Hsuehshan Tunnel", level: 2, icon: "🚇", desc: "貫通雪山山脈的長長隧道！" },
    { id: "liam", hanji: "黏", tailo: "liâm", toneNum: "liam5", sandhi: "liâm (本調)", meaning: "黏住、吸附 / Stick", en: "Stick / Suction", level: 2, icon: "🧲", desc: "吸風扇開落去，黏實實！" },
    { id: "to-thau-tsai", hanji: "倒頭栽", tailo: "tò-thâu-tsai", toneNum: "to3-thau5-tsai1", sandhi: "tó-thâu-tsai", meaning: "頭朝下倒掛 / Upside-down", en: "Upside-down", level: 2, icon: "🙃", desc: "在天花板頂倒頭栽行駛！" },
    { id: "ting-kuan", hanji: "頂懸", tailo: "tíng-kuân", toneNum: "ting2-kuan5", sandhi: "ting1-kuân", meaning: "上方、上面 / Above", en: "Top / Above", level: 2, icon: "⬆️", desc: "車頂懸就是藍天！" },
    { id: "e-te", hanji: "下底", tailo: "ē-té", toneNum: "e7-te2", sandhi: "è-té", meaning: "下方、下面 / Below", en: "Bottom / Below", level: 2, icon: "⬇️", desc: "注意看下底的賽道！" },
    { id: "pinn-a", hanji: "邊仔", tailo: "pinn-á", toneNum: "pinn1-a2", sandhi: "pinn7-á", meaning: "旁邊 / Beside", en: "Beside / Side", level: 2, icon: "↔️", desc: "靠邊仔超車過去！" },

    // 關卡 4：盤山過嶺・阿里山！ (嘉義阿里山神木)
    { id: "a-li-san", hanji: "阿里山", tailo: "A-lí-san", toneNum: "a1-li2-san1", sandhi: "a7-li1-san1", meaning: "阿里山 / Alishan", en: "Alishan", level: 3, icon: "⛰️", desc: "台灣著名的神木與日出名山。" },
    { id: "puann-suann", hanji: "盤山", tailo: "puânn-suann", toneNum: "puann5-suann1", sandhi: "puānn-suann", meaning: "翻山越嶺 / Wind through mountain", en: "Over the hill", level: 3, icon: "🚵", desc: "盤山過嶺真快活！" },
    { id: "tshiu-na", hanji: "樹林", tailo: "tshiū-nâ", toneNum: "tshiu7-na5", sandhi: "tshiù-nâ", meaning: "森林 / Forest", en: "Forest / Woods", level: 3, icon: "🌲", desc: "滿滿的綠色樹林。" },
    { id: "tua-loo", hanji: "大路", tailo: "tuā-lōo", toneNum: "tua7-loo7", sandhi: "tuà-lōo", meaning: "大道、公路 / Main road", en: "Highway", level: 3, icon: "🛣️", desc: "寬闊平坦的柏油大路。" },
    { id: "kuan-suann", hanji: "懸山", tailo: "kuân-suann", toneNum: "kuan5-suann1", sandhi: "kuān-suann", meaning: "高山 / High mountain", en: "Tall mountain", level: 3, icon: "🏔️", desc: "聳立在雲頂的懸山。" },

    // 關卡 5：港都大跳躍・高雄港！ (高雄港灣大橋)
    { id: "ko-hiong-kang", hanji: "高雄港", tailo: "Ko-hiông-káng", toneNum: "ko1-hiong5-kang2", sandhi: "ko7-hiōng-káng", meaning: "高雄港 / Kaohsiung Port", en: "Kaohsiung Port", level: 4, icon: "🚢", desc: "台灣第一大港口！" },
    { id: "kang-khau", hanji: "港口", tailo: "káng-kháu", toneNum: "kang2-khau2", sandhi: "kang1-kháu", meaning: "海港、港灣 / Harbor", en: "Harbor", level: 4, icon: "⚓", desc: "大輪船停泊的港口。" },
    { id: "tsun-a", hanji: "船仔", tailo: "tsûn-á", toneNum: "tsun5-a2", sandhi: "tsūn-á", meaning: "小船、船隻 / Boat", en: "Boat", level: 4, icon: "⛵", desc: "在海面搖搖擺擺的船仔。" },
    { id: "tua-kio", hanji: "大橋", tailo: "tuā-kiô", toneNum: "tua7-kio5", sandhi: "tuà-kiô", meaning: "跨海大橋 / Grand Bridge", en: "Bridge", level: 4, icon: "🌉", desc: "雄偉跨過海灣的大橋！" },
    { id: "loh-tsui", hanji: "落水", tailo: "lo̍h-tsúi", toneNum: "loh8-tsui2", sandhi: "lò-tsúi", meaning: "掉入水中 / Splash into water", en: "Fall in water", level: 4, icon: "💦", desc: "免驚！無人機會來救起！" },

    // 關卡 6：億載金城・古城障礙賽！ (台南府城古蹟)
    { id: "it-tai-kim-siann", hanji: "億載金城", tailo: "It-tāi-kim-siânn", toneNum: "it4-tai7-kim1-siann5", sandhi: "it8-tài-kīm-siânn", meaning: "億載金城 / Eternal Golden Castle", en: "Eternal Castle", level: 5, icon: "🏰", desc: "台南百年紅磚西洋砲台古蹟！" },
    { id: "koo-siann", hanji: "古城", tailo: "kóo-siânn", toneNum: "koo2-siann5", sandhi: "kōo-siânn", meaning: "古老城池 / Ancient fortress", en: "Old fortress", level: 5, icon: "🏛️", desc: "留傳歷史記憶的古城。" },
    { id: "siann-mng", hanji: "城門", tailo: "siânn-mn̂g", toneNum: "siann5-mng5", sandhi: "siānn-mn̂g", meaning: "城門 / Castle Gate", en: "City gate", level: 5, icon: "🚪", desc: "高大厚實的圓形拱門。" },
    { id: "tsng-a", hanji: "磚仔", tailo: "tsng-á", toneNum: "tsng1-a2", sandhi: "tsng7-á", meaning: "紅磚 / Brick", en: "Brick", level: 5, icon: "🧱", desc: "砌城牆的堅固紅磚仔。" },
    { id: "lik-su", hanji: "歷史", tailo: "li̍k-sú", toneNum: "lik8-su2", sandhi: "li̍k-sú", meaning: "歷史 / History", en: "History", level: 5, icon: "📜", desc: "祖先留落來的故事。" },

    // 關卡 7：雙重迴圈螺旋・台北101！ (台北信義天際線)
    { id: "tai-pak", hanji: "台北", tailo: "Tâi-pak", toneNum: "tai5-pak4", sandhi: "tāi-pak", meaning: "台北 / Taipei", en: "Taipei", level: 6, icon: "🏙️", desc: "繁華的台灣首都大都市。" },
    { id: "tsin-kuan", hanji: "真懸", tailo: "tsin kuân", toneNum: "tsin1-kuan5", sandhi: "tsīn kuân", meaning: "好高、極高 / Very high", en: "Very high", level: 6, icon: "☁️", desc: "101大樓插在雲天頂，真懸！" },
    { id: "thinn-ting", hanji: "天頂", tailo: "thinn-tíng", toneNum: "thinn1-ting2", sandhi: "thīnn-tíng", meaning: "空中、天上 / In the sky", en: "Sky / Up above", level: 6, icon: "🌤️", desc: "向上飛到天頂看雲彩。" },
    { id: "sui-lah", hanji: "水啦", tailo: "suí--lah", toneNum: "sui2-lah", sandhi: "suí--lah (輕聲)", meaning: "太美了、漂漂亮亮 / Awesome/Great!", en: "Awesome!", level: 6, icon: "✨", desc: "跑出完美路線，大家喊水啦！" },
    { id: "song-khuai", hanji: "爽快", tailo: "sóng-khuài", toneNum: "song2-khuai3", sandhi: "sōng-khuài", meaning: "痛快、過癮 / Exhilarating", en: "Thrilling", level: 6, icon: "🎉", desc: "極速衝刺兜圈，真正爽快！" },

    // 關卡 8：國境之南・墾丁鵝鑾鼻大獎賽！ (屏東墾丁海岸燈塔)
    { id: "ting-tah", hanji: "燈塔", tailo: "ting-tah", toneNum: "ting1-tah4", sandhi: "tīng-tah", meaning: "燈塔 / Lighthouse", en: "Lighthouse", level: 7, icon: "🗼", desc: "鵝鑾鼻燈塔，東亞之光！" },
    { id: "hai", hanji: "海", tailo: "hái", toneNum: "hai2", sandhi: "hái (本調)", meaning: "大海、太平洋 / Ocean", en: "Ocean / Sea", level: 7, icon: "🌊", desc: "國境之南蔚藍太平洋！" },
    { id: "tshia-sin", hanji: "車神", tailo: "tshia-sîn", toneNum: "tshia1-sin5", sandhi: "tshīa-sîn", meaning: "賽車之神 / Racing master", en: "Racer Legend", level: 7, icon: "🏎️", desc: "手藝出神入化的台語車神！" },
    { id: "te-it-mia", hanji: "第一名", tailo: "tē-it-miâ", toneNum: "te7-it4-mia5", sandhi: "tè-it8-miâ", meaning: "冠軍、首位 / Number One", en: "First Place", level: 7, icon: "🥇", desc: "衝過終點線，勇奪第一名！" },
    { id: "kuan-kun", hanji: "冠軍", tailo: "kuan-kun", toneNum: "kuan1-kun1", sandhi: "kuān-kun", meaning: "王者桂冠 / Champion", en: "Champion", level: 7, icon: "🏆", desc: "台語賽車大獎賽總冠軍！" },
    { id: "su-iann", hanji: "輸贏", tailo: "su-iânn", toneNum: "su1-iann5", sandhi: "sū-iânn", meaning: "勝負、比試 / Match outcome", en: "Win or lose", level: 7, icon: "⚖️", desc: "全力以赴，無論輸贏攏好玩！" },
    { id: "tsan-lah", hanji: "讚啦", tailo: "tsàn--lah", toneNum: "tsan3-lah", sandhi: "tsàn--lah (輕聲)", meaning: "太棒了 / Superb!", en: "Fantastic!", level: 7, icon: "👍", desc: "表現一百分，真正讚啦！" },
    { id: "ka-iu", hanji: "加油", tailo: "ka-iû", toneNum: "ka1-iu5", sandhi: "kā-iû", meaning: "加氣、努力 / Add oil / Go for it", en: "Keep going!", level: 7, icon: "⛽", desc: "氣桶加滿，繼續向前衝！" },

    // 特殊動作標語
    { id: "un-un-loh-te", hanji: "穩穩降落", tailo: "ún-ún lo̍h-tē", toneNum: "un2-un2-loh8-te7", sandhi: "ūn-ùn-lò-tē", meaning: "平穩著陸 / Smooth landing", en: "Smooth landing", level: -1, icon: "🛬", desc: "著陸前輕輕一噴，完美落地加金幣！" },
    { id: "long-tioh", hanji: "挵著矣", tailo: "lòng--tio̍h--ah", toneNum: "long3-tioh-ah", sandhi: "lòng--tio̍h--ah", meaning: "撞到了 / Bonk!", en: "Bumped into!", level: -1, icon: "💥", desc: "挵到障礙物免驚，再接再厲！" }
  ];

  // 輔助函式：根據關卡取得該關的詞彙
  function getVocabByLevel(levelIndex) {
    if (levelIndex < 0) return VOCABULARY.slice(0, 35); // 無限模式
    return VOCABULARY.filter(v => v.level === levelIndex);
  }

  // 取得隨機詞彙
  function getRandomVocab() {
    return VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
  }

  // 依照 ID 找尋詞彙
  function getVocabById(id) {
    return VOCABULARY.find(v => v.id === id) || null;
  }

  const TG_DICT = {
    VOCABULARY,
    getSandhiTone,
    getVocabByLevel,
    getRandomVocab,
    getVocabById
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TG_DICT;
  } else {
    root.TG_DICT = TG_DICT;
  }
})(typeof window !== "undefined" ? window : globalThis);
