/* =========================================================================
   GradePay POP — Assistant de vente en 5 étapes
   Catégorie → Étalonnage → Mon produit → Estimation IA → Publier
   + Édition d'une vente existante
   + Diffusion Réseaux Sociaux (Facebook, Instagram, TikTok, WhatsApp, X…)
   + Impression (Affiche A4, Étiquette étal, Planche 6 QR codes)
   + Bouton PayPal & QR Code PayPal partout
   + Paramètres : Choix Modèle Google Gemini, Clé API, Compte PayPal
   100 % front-end, aucune dépendance serveur. Données en localStorage.
   ========================================================================= */
(() => {
  'use strict';

  /* ---------- Utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round2 = (n) => Math.round(n * 100) / 100;
  const fmt = (n) => (+n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const STEPS = ['Category', 'Calibration', 'My Product', 'AI Appraisal', 'Publish'];
  const LS_SALES = 'p2_sales';
  const LS_CALIB = 'p2_calib_';
  const LS_SETTINGS = 'p2_settings';
  const MAX_MEDIA = 6;
  const NO_EYE_FISH_SVG = `<svg class="no-eye-fish-svg" viewBox="0 0 36 36" fill="none" stroke="#14121f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M 4 18 C 9 10 23 10 28 15 L 34 9 L 32 18 L 34 27 L 28 21 C 23 26 9 26 4 18 Z" fill="#3A86FF"/><path d="M 14 11 C 16 6 21 6 23 11" fill="#60A5FA"/><path d="M 15 25 C 17 30 21 30 23 25" fill="#60A5FA"/><path d="M 10 14 C 12 16 12 20 10 22" stroke="#14121f" stroke-width="1.8" fill="none"/></svg>`;
  const OTHER = { id: 'autre', family: 'terroir', name: 'Custom Product', emoji: '✏️', unit: 'piece', color: '#FF5DA2' };
  const GRADES = {
    S: { label: 'Exceptional', min: 85 },
    A: { label: 'High Quality', min: 60 },
    B: { label: 'Good Quality', min: 35 },
    C: { label: 'Modest Quality', min: 0 },
  };

  const DEFAULT_SETTINGS = {
    geminiModel: 'gemini-3.8-flash',
    geminiKey: '',
    paypalAccount: '',
    paypalCurrency: 'EUR',
  };

  function loadSettings() {
    try {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LS_SETTINGS)) };
      if (parsed.geminiModel !== 'gemini-3.8-flash' && parsed.geminiModel !== 'local-sim') {
        parsed.geminiModel = 'gemini-3.8-flash';
      }
      return parsed;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(s) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
    updateTopStatusTag();
  }

  function updateTopStatusTag() {
    const cfg = loadSettings();
    const tag = $('#topStatusTag');
    if (!tag) return;
    const hasKey = !!cfg.geminiKey?.trim();
    const isLocal = cfg.geminiModel === 'local-sim';
    const modelLbl = isLocal ? 'Offline Mode' : (cfg.geminiModel || 'Gemini 3.8 Flash');
    const hasPaypal = !!cfg.paypalAccount?.trim();

    tag.className = 'topbar-chips';
    tag.onclick = null;
    tag.removeAttribute('title');
    tag.innerHTML = `
      <button type="button" class="top-chip chip-ai ${hasKey && !isLocal ? 'has-key' : ''}" id="topChipAi" title="AI Model: ${esc(cfg.geminiModel || 'Gemini 3.8 Flash')} (${hasKey ? 'Key Configured' : 'Local Offline Simulation'})\nClick to configure AI model">
        <span>🤖</span>
        <span>${esc(modelLbl)}</span>
      </button>
      <button type="button" class="top-chip chip-paypal ${hasPaypal ? 'ok' : 'setup'}" id="topChipPaypal" title="${hasPaypal ? 'PayPal Merchant Account: ' + esc(cfg.paypalAccount) : 'PayPal account not set (Demo mode active)\nClick to enter your PayPal handle'}">
        <span>💳</span>
        <span>${hasPaypal ? 'PayPal: ' + esc(cfg.paypalAccount) : 'Set up PayPal'}</span>
        <span class="top-chip-badge">${hasPaypal ? '✓' : 'Optional'}</span>
      </button>`;

    $('#topChipAi')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal('gemini');
    });

    $('#topChipPaypal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal('paypal');
    });
  }

  const SOCIAL_NETWORKS = [
    { id: 'facebook',  name: 'Facebook',  icon: '📘', color: '#1877F2', badge: 'Post & Marketplace' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C', badge: 'Post & Story QR' },
    { id: 'tiktok',    name: 'TikTok',    icon: '🎵', color: '#14121f', badge: 'Video & QR Sticker' },
    { id: 'whatsapp',  name: 'WhatsApp',  icon: '💬', color: '#25D366', badge: 'Direct Message' },
    { id: 'x',         name: 'X / Twitter', icon: '🐦', color: '#1DA1F2', badge: 'Tweet + PayPal Link' },
    { id: 'embed',     name: 'Site / HTML', icon: '💻', color: '#8338EC', badge: 'Embed Button + QR' },
  ];

  const PRINT_FORMATS = [
    {
      id: 'poster',
      name: 'A4 Stand & Stall Poster',
      icon: '📄',
      color: '#ff4b8b',
      badge: 'A4 Poster Format',
      desc: 'Ideal for market stalls, farm stands, storefronts with large scannable PayPal QR Code',
    },
    {
      id: 'label',
      name: 'Shelf & Crate Label',
      icon: '🏷️',
      color: '#00c48c',
      badge: 'Label Format',
      desc: 'Compact format for jars, baskets, crates, or checkout counters',
    },
    {
      id: 'sheet6',
      name: 'Sheet of 6 PayPal QRs',
      icon: '🔢',
      color: '#3975ff',
      badge: '6 Ready-to-cut QRs',
      desc: '6 individual printable stickers on A4 paper ready to paste on products',
    },
  ];

  /* ---------- État ---------- */
  let state;
  const mkRef = () => ({ mode: 'photo', photo: null, video: null, desc: '', price: '' });
  function reset() {
    const cfg = loadSettings();
    state = {
      step: -1,
      editingId: null,
      catId: null,
      otherName: '',
      unit: 'piece',
      calibFor: null,
      refList: null,
      refs: { low: mkRef(), high: mkRef() },
      product: { title: '', media: [], desc: '', qty: 1, isFresh: false, decayHours: 24, floorPrice: '', simHours: 0 },
      estimate: null,
      analyzing: false,
      finalPrice: '',
      sale: { paypal: cfg.paypalAccount || '', contact: '' },
      channels: [],
      published: null,
      pubTab: 'social',     // 'social' | 'print' | 'paypal'
      socialNet: 'facebook',
      printFormat: 'poster', // 'poster' | 'label' | 'sheet6'
    };
  }
  reset();

  const customCategories = [];
  const getAllCategories = () => [...CATEGORIES, ...customCategories];

  const isOther = () => state.catId === 'autre';
  const cat = () => (isOther()
    ? { ...OTHER, name: state.otherName.trim() || 'Autre' }
    : getAllCategories().find((c) => c.id === state.catId) || OTHER);
  const dirty = () => { state.estimate = null; };

  /* ---------- Fraîcheur Dynamique & Dégressivité PayPal en Temps Réel ---------- */
  function computeDecayedSale(s, simHours = null) {
    if (!s) return s;
    if (!s.isFresh) {
      return {
        ...s,
        currentPrice: round2(+s.price || 0),
        currentGrade: s.grade || 'B',
        currentScore: s.score ?? 75,
        elapsedHours: 0,
        freshnessPercent: 100,
        isFresh: false,
      };
    }

    const basePrice = +s.basePrice || +s.initialPrice || +s.price || 0;
    const floorPrice = +s.floorPrice || Math.max(1, (+s.lowPrice || 10) * (+s.qty || 1));
    const baseScore = +s.baseScore || +s.initialScore || +s.score || 95;
    const maxHours = Math.max(1, +s.decayHours || 24);

    let elapsedHours = 0;
    if (simHours != null) {
      elapsedHours = Math.max(0, +simHours);
    } else if (s.simHours != null && s.simHours > 0) {
      elapsedHours = +s.simHours;
    } else if (s.date) {
      const elapsedMs = Date.now() - new Date(s.date).getTime();
      elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
    }

    const decayRatio = Math.min(1, elapsedHours / maxHours);
    const currentPrice = round2(Math.max(floorPrice, basePrice - decayRatio * (basePrice - floorPrice)));
    const currentScore = Math.round(Math.max(35, baseScore - decayRatio * (baseScore - 35)));

    let currentGrade = 'S';
    if (currentScore < 50) currentGrade = 'C';
    else if (currentScore < 75) currentGrade = 'B';
    else if (currentScore < 90) currentGrade = 'A';
    else currentGrade = 'S';

    const freshnessPercent = Math.max(0, Math.round((1 - decayRatio) * 100));

    return {
      ...s,
      price: currentPrice,
      currentPrice,
      grade: currentGrade,
      currentGrade,
      score: currentScore,
      currentScore,
      elapsedHours: Math.round(elapsedHours * 10) / 10,
      freshnessPercent,
      decayRatio,
      maxHours,
      basePrice,
      floorPrice,
    };
  }

  /* ---------- PayPal & QR Code ---------- */
  function paypalLink(s, fallbackDemo = true) {
    const cur = computeDecayedSale(s);
    const id = (cur?.paypal || '').trim();
    const price = round2(+cur?.price || 0);
    const title = cur?.title || 'Produit GradePay';
    if (!id) {
      return fallbackDemo
        ? `https://www.paypal.com/paypalme/gradepaypop/${price}EUR`
        : '';
    }
    if (id.includes('@')) {
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(id)}&item_name=${encodeURIComponent(title)}&amount=${price}&currency_code=EUR`;
    }
    const clean = id.replace(/^.*paypal\.me\//i, '').replace(/\/.*$/, '');
    return `https://www.paypal.me/${encodeURIComponent(clean)}/${price}EUR`;
  }

  function makeQrMatrix(text) {
    if (typeof window.qrcode !== 'function') return null;
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(String(text || 'https://www.paypal.com'));
      qr.make();
      return qr;
    } catch {
      return null;
    }
  }

  function makeQrSvg(text, cellSize = 4, margin = 2) {
    const qr = makeQrMatrix(text);
    if (!qr) return `<div class="qr-fallback">QR PayPal</div>`;
    return qr.createSvgTag({ cellSize, margin, scalable: true });
  }

  function drawQrOnCanvas(ctx, text, x, y, size) {
    const qr = makeQrMatrix(text);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#14121f';
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
    if (!qr) {
      ctx.restore();
      return;
    }
    const count = qr.getModuleCount();
    const pad = Math.round(size * 0.08);
    const inner = size - pad * 2;
    const cell = inner / count;
    ctx.fillStyle = '#14121f';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(
            Math.floor(x + pad + c * cell),
            Math.floor(y + pad + r * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
    ctx.restore();
  }

  function downloadQrPng(sale) {
    const link = paypalLink(sale, true);
    const cv = document.createElement('canvas');
    cv.width = 520;
    cv.height = 640;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#14121f';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, cv.width - 10, cv.height - 10);

    // En-tête
    ctx.fillStyle = '#14121f';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO PAY', cv.width / 2, 52);

    // QR
    drawQrOnCanvas(ctx, link, 60, 75, 400);

    // Infos produit + bouton PayPal
    ctx.fillStyle = '#14121f';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText((sale.title || 'Product').slice(0, 32), cv.width / 2, 515);

    ctx.fillStyle = '#003087';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(`PayPal · ${fmt(sale.price)}`, cv.width / 2, 560);

    ctx.fillStyle = '#14121f';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(`AI Certified Quality: Grade ${sale.grade} (${sale.score}/100)`, cv.width / 2, 602);

    const a = document.createElement('a');
    a.download = `qr-paypal-${(sale.title || 'listing').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  async function downloadSocialCardPng(sale, thumb, netId = 'instagram') {
    const isVertical = netId === 'tiktok';
    const W = 900;
    const H = isVertical ? 1200 : 900;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');

    // Fond POP
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = sale.color || '#ffd23f';
    ctx.fillRect(0, 0, W, 110);

    ctx.strokeStyle = '#14121f';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // Bandeau haut
    ctx.fillStyle = '#14121f';
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(`💸 GradePay · ${sale.category}`, 32, 68);

    // Zone image
    const imgH = isVertical ? 540 : 410;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, 136, W - 72, imgH);
    ctx.strokeRect(36, 136, W - 72, imgH);

    if (thumb) {
      try {
        const img = await loadImg(thumb);
        const r = Math.max((W - 72) / img.naturalWidth, imgH / img.naturalHeight);
        const nw = img.naturalWidth * r, nh = img.naturalHeight * r;
        ctx.save();
        ctx.beginPath();
        ctx.rect(40, 140, W - 80, imgH - 8);
        ctx.clip();
        ctx.drawImage(img, 36 + ((W - 72) - nw) / 2, 136 + (imgH - nh) / 2, nw, nh);
        ctx.restore();
      } catch {
        ctx.font = '140px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sale.emoji || '⭐', W / 2, 136 + imgH / 2 + 45);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.font = '140px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sale.emoji || '⭐', W / 2, 136 + imgH / 2 + 45);
      ctx.textAlign = 'left';
    }

    // Badge Grade IA
    const gx = W - 125, gy = 195;
    ctx.fillStyle = { S: '#8338ec', A: '#06d6a0', B: '#ffd23f', C: '#ff8c42' }[sale.grade] || '#ffd23f';
    ctx.beginPath();
    ctx.arc(gx, gy, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sale.grade === 'S' ? '#ffffff' : '#14121f';
    ctx.font = '800 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sale.grade, gx, gy + 18);
    ctx.textAlign = 'left';

    // Détails + QR Code PayPal en bas
    const baseY = 136 + imgH + 48;
    ctx.fillStyle = '#14121f';
    ctx.font = '800 38px system-ui, sans-serif';
    ctx.fillText((sale.title || '').slice(0, 30), 36, baseY);

    ctx.font = '600 24px system-ui, sans-serif';
    const desc = (sale.desc || `AI Certified Quality (${sale.score}/100)`).slice(0, 62);
    ctx.fillText(desc, 36, baseY + 42);

    // Prix géant
    ctx.fillStyle = '#ff5da2';
    ctx.font = '800 58px system-ui, sans-serif';
    ctx.fillText(`${fmt(sale.price)}`, 36, baseY + 115);
    ctx.fillStyle = '#14121f';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(`Lot: ${sale.qty} ${sale.unit} · AI Score ${sale.score}/100`, 36, baseY + 152);

    // Bouton PayPal dessiné
    const btnY = baseY + 178;
    ctx.fillStyle = '#ffc439';
    ctx.fillRect(36, btnY, 480, 74);
    ctx.strokeRect(36, btnY, 480, 74);
    ctx.fillStyle = '#003087';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText('💳 Pay with PayPal → Scan QR Code', 58, btnY + 48);

    // QR Code PayPal à droite
    const qrSize = isVertical ? 260 : 230;
    const qrX = W - qrSize - 36;
    const qrY = H - qrSize - 44;
    drawQrOnCanvas(ctx, paypalLink(sale, true), qrX, qrY, qrSize);
    ctx.fillStyle = '#14121f';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN & PAY PAL', qrX + qrSize / 2, H - 16);

    const a = document.createElement('a');
    a.download = `${netId}-${(sale.title || 'listing').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  /* ---------- Images / vidéos ---------- */
  const loadImg = (src) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });

  function drawToDataUrl(drawable, w, h, max, q = 0.82) {
    const s = Math.min(1, max / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(drawable, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', q);
  }

  async function fileToDataUrl(file, max) {
    const url = URL.createObjectURL(file);
    try { const img = await loadImg(url); return drawToDataUrl(img, img.naturalWidth, img.naturalHeight, max); }
    finally { URL.revokeObjectURL(url); }
  }

  const frameFromVideo = (url) => new Promise((res, rej) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const to = setTimeout(() => rej(new Error('timeout')), 8000);
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => { clearTimeout(to); res(v); };
    v.onerror = () => { clearTimeout(to); rej(new Error('video')); };
  });

  async function shrink(src, max) {
    try { const img = await loadImg(src); return drawToDataUrl(img, img.naturalWidth || 600, img.naturalHeight || 450, max, 0.7); }
    catch { return null; }
  }

  async function ensureJpegBase64(src) {
    if (!src) return null;
    try {
      const img = await loadImg(src);
      const cv = document.createElement('canvas');
      const maxDim = 800;
      const s = Math.min(1, maxDim / Math.max(img.naturalWidth || 600, img.naturalHeight || 450));
      cv.width = Math.max(1, Math.round((img.naturalWidth || 600) * s));
      cv.height = Math.max(1, Math.round((img.naturalHeight || 450) * s));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const dataUrl = cv.toDataURL('image/jpeg', 0.85);
      const match = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /* ---------- Google Gemini API & Vision ---------- */
  async function testGeminiApiKey(key, model) {
    if (!key || !key.trim()) return { ok: false, msg: '⚠️ Please enter your Gemini API key first.' };
    const m = (model && model !== 'local-sim') ? model : 'gemini-3.8-flash';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK only' }] }]
        })
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        return { ok: true, msg: `✅ Connected to Google AI Studio! Model ${m} is ready.` };
      }
      const data = await resp.json().catch(() => ({}));
      const msg = data.error?.message || `Erreur HTTP ${resp.status}`;
      if (resp.status === 503) {
        return { ok: true, is503: true, msg: `⚠️ Temporary Google server overload (503). Your key is valid! Click "Save Settings" below.` };
      }
      return { ok: false, msg: `❌ Google Error (${resp.status}): ${msg}` };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return {
          ok: true,
          isTimeout: true,
          msg: `⏱️ Google servers are taking longer to respond (high traffic). Your key is valid, click "💾 Save Settings"!`
        };
      }
      return { ok: false, msg: `❌ Unable to reach Google API (${err.message})` };
    }
  }

  function interpolatePriceFromTiers(score, refList) {
    if (!refList || refList.length < 2) {
      const l = +state.refs.low.price || 0, h = +state.refs.high.price || 0;
      return l + (score / 100) * (h - l);
    }
    const count = refList.length;
    // Tiers ordonnés du plus haut (index 0) au plus bas (index count - 1)
    const anchors = refList.map((r, idx) => {
      const anchorScore = Math.round(95 - (idx / (count - 1)) * 80);
      return { score: anchorScore, price: +r.price || 0 };
    });

    if (score >= anchors[0].score) return anchors[0].price;
    if (score <= anchors[count - 1].score) return anchors[count - 1].price;

    for (let i = 0; i < count - 1; i++) {
      const upper = anchors[i];
      const lower = anchors[i + 1];
      if (score <= upper.score && score >= lower.score) {
        const span = Math.max(1, upper.score - lower.score);
        const ratio = (score - lower.score) / span;
        return lower.price + ratio * (upper.price - lower.price);
      }
    }
    return anchors[count - 1].price;
  }

  async function callGeminiVision(model, apiKey) {
    const c = cat();
    const refs = (state.refList && state.refList.length >= 2) ? state.refList : [state.refs.high, state.refs.low];
    const prod = state.product;

    const tiersText = refs.map((r, i) =>
      `- Tier ${i + 1} (${r.title || (i === 0 ? 'Top Tier - Grade S' : i === refs.length - 1 ? 'Lowest Tier - Grade C' : 'Mid Tier')}): "${r.desc || 'No description'}" (${r.price} € / ${state.unit})`
    ).join('\n');

    const parts = [
      {
        text: `You are an expert appraiser and quality grading specialist for the GradePay application.
Category: "${c.name}".
Unit: "${state.unit}".
Seller's benchmark calibration reference standards (ordered from highest to lowest quality tier):
${tiersText}

Here is the seller's product batch to appraise:
- Title: "${prod.title || c.name}"
- Description: "${prod.desc || 'Not specified'}"
- Quantity: ${prod.qty} ${state.unit}

In the images below:
- The first images are the seller's benchmark calibration standards (ordered from highest to lowest quality tier).
- The subsequent images are the real photos of the seller's actual product batch.

Rigorously compare the seller's batch against the reference standards.
You must return a valid strict JSON response without markdown code blocks:
{
  "score": <integer from 0 to 100>,
  "grade": "<C, B, A, or S>",
  "explanation": "<clear 1 to 2 sentence justification for the score in English>",
  "features": [
    {"name": "Color / Saturation", "percent": <number 0-100>},
    {"name": "Luster / Brightness", "percent": <number 0-100>},
    {"name": "Texture / Freshness", "percent": <number 0-100>},
    {"name": "Morphological Integrity", "percent": <number 0-100>}
  ]
}`
      }
    ];

    for (const r of refs) {
      const b64 = await ensureJpegBase64(r.photo);
      if (b64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } });
    }

    for (const m of prod.media) {
      const b64 = await ensureJpegBase64(m.thumb);
      if (b64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    let resp;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(to);
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  }

  /* ---------- "IA" visuelle locale ---------- */
  const FEATS = ['Color / Saturation', 'Luster / Brightness', 'Contrast', 'Sharpness / Texture'];

  function featuresFromDrawable(d) {
    const N = 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(d, 0, 0, N, N);
    const px = ctx.getImageData(0, 0, N, N).data;
    const L = new Float32Array(N * N);
    let sS = 0, sV = 0, sL = 0, sL2 = 0;
    for (let i = 0, k = 0; i < px.length; i += 4, k++) {
      const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      sS += mx ? (mx - mn) / mx : 0; sV += mx; sL += l; sL2 += l * l; L[k] = l;
    }
    const n = N * N, mean = sL / n;
    const std = Math.sqrt(Math.max(0, sL2 / n - mean * mean));
    let edge = 0;
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const k = y * N + x;
      edge += Math.abs(4 * L[k] - L[k - 1] - L[k + 1] - L[k - N] - L[k + N]);
    }
    edge /= (N - 2) * (N - 2);
    return [sS / n, sV / n, clamp(std / 0.35, 0, 1), clamp(edge / 0.25, 0, 1)];
  }

  async function featuresFromSrc(src) { return featuresFromDrawable(await loadImg(src)); }

  async function refFeatures(q) {
    syncRefs();
    const r = state.refs?.[q] || (q === 'high' ? state.refList?.[0] : state.refList?.[state.refList?.length - 1]);
    if (!r) return null;
    const order = r.mode === 'video' ? ['video', 'photo'] : ['photo', 'video'];
    for (const kind of order) {
      try {
        if (kind === 'photo' && r.photo) return await featuresFromSrc(r.photo);
        if (kind === 'video' && r.video) return featuresFromDrawable(await frameFromVideo(r.video));
      } catch { /* source suivante */ }
    }
    return null;
  }

  const POS_WORDS = ['fresh', 'intact', 'perfect', 'bright', 'firm', 'rare', 'pure', 'extra', 'excellent', 'flawless', 'vibrant', 'lively', 'large', 'graded', 'prime', 'whole', 'premium', 'superb', 'unblemished', 'frais', 'fraîche', 'fraiche', 'brillant', 'ferme', 'pur'];
  const NEG_WORDS = ['damaged', 'broken', 'cracked', 'spotted', 'soft', 'old', 'defect', 'small', 'dry', 'dull', 'bruised', 'split', 'incomplete', 'rotten', 'decayed', 'stale', 'abîm', 'cassé', 'fissur', 'tache', 'terne', 'pourri'];

  function keywordScore(text) {
    const t = (text || '').toLowerCase();
    const pos = POS_WORDS.filter((w) => t.includes(w));
    const neg = NEG_WORDS.filter((w) => t.includes(w));
    return { pos, neg, delta: clamp((pos.length - neg.length) * 0.04, -0.15, 0.15) };
  }

  const avg = (arr) => arr.length ? arr[0].map((_, i) => arr.reduce((s, a) => s + a[i], 0) / arr.length) : null;
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

  let runId = 0;
  async function analyze() {
    const my = ++runId;
    state.analyzing = true;
    const t0 = performance.now();

    try {
      const cfg = loadSettings();
      const low = +state.refs.low.price || 0, high = +state.refs.high.price || 0;
      const qty = +state.product.qty || 1;

      // Tentative d'appel à l'API Google Gemini Vision si configurée
      if (cfg.geminiKey && cfg.geminiModel && cfg.geminiModel !== 'local-sim') {
        try {
          const geminiRes = await callGeminiVision(cfg.geminiModel, cfg.geminiKey.trim());
          if (my !== runId) return;
          if (geminiRes && typeof geminiRes.score === 'number') {
            const score = clamp(Math.round(geminiRes.score), 0, 100);
            const t = score / 100;
            const grade = ['S', 'A', 'B', 'C'].includes(geminiRes.grade)
              ? geminiRes.grade
              : (Object.keys(GRADES).find((g) => score >= GRADES[g].min) || 'B');
            const unitP = state.refList ? interpolatePriceFromTiers(score, state.refList) : (low + t * (high - low));
            const perFeat = Array.isArray(geminiRes.features)
              ? geminiRes.features.map((f) => ({ name: f.name, v: clamp((+f.percent || 50) / 100, 0, 1) }))
              : FEATS.map((name) => ({ name, v: t }));

            await wait(Math.max(0, 1500 - (performance.now() - t0)));
            if (my !== runId) return;
            state.estimate = {
              t, score, grade, unitP, total: unitP * qty, perFeat,
              kw: keywordScore(state.product.desc),
              visual: true,
              refsOk: true,
              n: state.product.media.length,
              low, high, qty,
              geminiModelUsed: cfg.geminiModel,
              aiExplanation: geminiRes.explanation || ''
            };
            state.finalPrice = round2(unitP * qty);
            state.analyzing = false;
            if (state.step === 3) render();
            return;
          }
        } catch (err) {
          console.warn('Fallback analyse locale suite à erreur Gemini:', err);
        }
      }

      const [fl, fh] = await Promise.all([refFeatures('low'), refFeatures('high')]);
      const prodFeats = (await Promise.all(state.product.media.map((m) =>
        (m.thumb ? featuresFromSrc(m.thumb) : Promise.reject()).catch(() => null)))).filter(Boolean);
      const p = avg(prodFeats);

      let t = 0.5, perFeat = [], visual = false;
      if (fl && fh && p) {
        const d = sub(fh, fl), n2 = dot(d, d);
        if (n2 > 0.0004) {
          t = clamp(dot(sub(p, fl), d) / n2, 0, 1);
          visual = true;
          perFeat = FEATS.map((name, i) => ({ name, v: Math.abs(d[i]) > 0.02 ? clamp((p[i] - fl[i]) / d[i], 0, 1) : null }));
        }
      }
      if (!visual && p) t = clamp(0.45 * p[0] + 0.2 * p[1] + 0.15 * p[2] + 0.2 * p[3] + 0.1, 0, 1);

      const kw = keywordScore(state.product.desc);
      t = clamp(t + kw.delta, 0, 1);

      const score = Math.round(t * 100);
      const grade = Object.keys(GRADES).find((g) => score >= GRADES[g].min) || 'B';
      const unitP = state.refList ? interpolatePriceFromTiers(score, state.refList) : (low + t * (high - low));

      await wait(Math.max(0, 1800 - (performance.now() - t0)));
      if (my !== runId) return;
      state.estimate = { t, score, grade, unitP, total: unitP * qty, perFeat, kw, visual, refsOk: !!(fl && fh), n: prodFeats.length, low, high, qty };
      state.finalPrice = round2(unitP * qty);
    } catch (err) {
      console.error('Erreur critique pendant analyze():', err);
      const defaultScore = 75;
      const defaultGrade = 'A';
      const defaultLow = +state.refs?.low?.price || 10;
      const defaultHigh = +state.refs?.high?.price || 100;
      const defaultUnitP = state.refList ? interpolatePriceFromTiers(defaultScore, state.refList) : (defaultLow + 0.75 * (defaultHigh - defaultLow));
      state.estimate = {
        t: 0.75, score: defaultScore, grade: defaultGrade,
        unitP: defaultUnitP, total: defaultUnitP * (+state.product.qty || 1),
        perFeat: [], kw: { pos: [], neg: [], delta: 0 },
        visual: false, refsOk: true, n: 1,
        low: defaultLow, high: defaultHigh, qty: +state.product.qty || 1
      };
      state.finalPrice = round2(state.estimate.total);
    } finally {
      state.analyzing = false;
      if (state.step === 3) render();
    }
  }

  /* ---------- Stockage & 3 Ventes Initiales Officielles (Jade, Truffe, Poisson) ---------- */
  const INITIAL_SALES = [
    {
      id: 'sale-jade-01',
      catId: 'roches',
      title: 'Raw Burmese Imperial Jadeite (Type A)',
      category: 'Rocks & Minerals',
      emoji: '💎',
      color: '#00BBF9',
      grade: 'S',
      score: 98,
      price: 1850,
      basePrice: 1850,
      baseScore: 98,
      floorPrice: 120,
      isFresh: false,
      qty: 1,
      unit: 'piece',
      thumb: 'assets/product_images/produit_jade.jpg',
      desc: 'Exceptional natural untreated Imperial Jadeite specimen (Type A). Deep emerald glassy translucency, luminous micro-crystalline core, and pure greasy luster with zero surface fissures. Certified Grade S.',
      date: '2026-11-11T20:00:00.000Z',
      paypal: 'vendeur@gradepay.ai',
      contact: 'Gemological Cabinet & Rare Minerals',
      lowPrice: 120,
      highPrice: 2000,
      channels: ['facebook', 'instagram', 'tiktok', 'whatsapp', 'x', 'html'],
    },
    {
      id: 'sale-truffe-02',
      catId: 'truffes',
      title: 'Périgord Black Truffle (Tuber melanosporum)',
      category: 'Truffles',
      emoji: '🌰',
      color: '#8D6E63',
      grade: 'S',
      score: 98,
      price: 340,
      basePrice: 340,
      baseScore: 98,
      floorPrice: 130,
      isFresh: true,
      decayHours: 48,
      simHours: 0,
      qty: 0.25,
      unit: 'kg',
      thumb: 'assets/product_images/produit_truffe.jpg',
      desc: 'Freshly harvested Black Diamond from oak truffières. Uniform black pyramid-faceted peridium, surgical cut displaying dense dark chocolate gleba marbled with tight ivory veins and an intense woodland aroma.',
      date: '2026-11-11T20:05:00.000Z',
      paypal: 'vendeur@gradepay.ai',
      contact: 'Domaine des Chênes Truffière',
      lowPrice: 250,
      highPrice: 1400,
      channels: ['facebook', 'instagram', 'tiktok', 'whatsapp', 'x', 'html'],
    },
    {
      id: 'sale-poisson-03',
      catId: 'poissons',
      title: 'Wild Bluefin Tuna Otoro Loin (Ikejime)',
      category: 'Wild Fish',
      emoji: '🐟',
      color: '#3A86FF',
      grade: 'S',
      score: 97,
      price: 195,
      basePrice: 195,
      baseScore: 97,
      floorPrice: 65,
      isFresh: true,
      decayHours: 24,
      simHours: 0,
      qty: 1.5,
      unit: 'kg',
      thumb: 'assets/product_images/produit_poisson_thon.jpg',
      desc: 'Line-caught wild bluefin tuna sashimi Otoro block, dispatched using traditional Ikejime technique. Dense spiderweb intramuscular marbling, zero bruising, supreme freshness, and a velvety melt-in-mouth texture.',
      date: '2026-11-11T20:10:00.000Z',
      paypal: 'vendeur@gradepay.ai',
      contact: 'Artisanal Fleet & Fish Auction',
      lowPrice: 25,
      highPrice: 140,
      channels: ['facebook', 'instagram', 'tiktok', 'whatsapp', 'x', 'html'],
    },
  ];

  const LS_SALES_VERSION_KEY = 'p2_sales_v_en_20261111_v14';
  const loadSales = () => {
    try {
      if (!localStorage.getItem(LS_SALES_VERSION_KEY)) {
        localStorage.setItem(LS_SALES, JSON.stringify(INITIAL_SALES));
        localStorage.setItem(LS_SALES_VERSION_KEY, 'done');
        return INITIAL_SALES;
      }
      const raw = localStorage.getItem(LS_SALES);
      return raw ? JSON.parse(raw) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  };
  const saveSales = (s) => localStorage.setItem(LS_SALES, JSON.stringify(s));
  const loadCalib = (id) => { try { return JSON.parse(localStorage.getItem(LS_CALIB + id)); } catch { return null; } };

  function syncRefs() {
    if (!state.refList || state.refList.length === 0) return;
    state.refs.high = state.refList[0];
    state.refs.low = state.refList[state.refList.length - 1];
  }

  function saveCalib() {
    if (isOther() || !state.catId) return;
    syncRefs();
    const pack = (r) => ({
      title: r.title,
      desc: r.desc,
      price: r.price,
      photo: r.photo && (r.photo.startsWith('data:image/jpeg') || !r.photo.startsWith('data:')) ? r.photo : null,
    });
    const listPack = (state.refList || []).map((r) => pack(r));
    const data = {
      unit: state.unit,
      low: pack(state.refs.low),
      high: pack(state.refs.high),
      list: listPack,
    };
    try {
      localStorage.setItem(LS_CALIB + state.catId, JSON.stringify(data));
    } catch {
      data.low.photo = data.high.photo = null;
      if (data.list) data.list.forEach((item) => { item.photo = null; });
      try { localStorage.setItem(LS_CALIB + state.catId, JSON.stringify(data)); } catch { /* quota */ }
    }
  }

  const LS_CALIB_VERSION_KEY = 'p2_calib_v_clean_3cards_v6';
  try {
    if (!localStorage.getItem(LS_CALIB_VERSION_KEY)) {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(LS_CALIB)) localStorage.removeItem(k);
      });
      localStorage.setItem(LS_CALIB_VERSION_KEY, 'done');
    }
  } catch { /* ignore */ }

  function prepareCalibration() {
    if (state.calibFor === state.catId && state.refList && state.refList.length === 3) {
      // S'assurer que les photos ne sont jamais manquantes
      const c = cat();
      if (!state.refList[0].photo) state.refList[0].photo = getReferenceImage(c, 'high');
      if (!state.refList[1].photo) state.refList[1].photo = getReferenceImage(c, 'mid');
      if (!state.refList[2].photo) state.refList[2].photo = getReferenceImage(c, 'low');
      return;
    }
    state.calibFor = state.catId;
    dirty();

    if (isOther()) {
      const highP = +state.refs.high?.price || 100;
      const lowP = +state.refs.low?.price || 10;
      const midP = Math.round(((highP + lowP) / 2) * 2) / 2;
      state.refList = [
        {
          id: 'ref-high',
          title: 'Top Quality (Grade S)',
          mode: 'photo',
          video: null,
          photo: null,
          desc: 'Exceptional specimen with zero flaws, maximum freshness or purity.',
          price: highP,
        },
        {
          id: 'ref-mid',
          title: 'Standard Quality (Grade A / B)',
          mode: 'photo',
          video: null,
          photo: null,
          desc: 'Commercial healthy grade, balanced appearance with minor natural variations.',
          price: midP,
        },
        {
          id: 'ref-low',
          title: 'Lower Quality (Grade C)',
          mode: 'photo',
          video: null,
          photo: null,
          desc: 'Modest quality, visible imperfections, smaller caliber or clearance tier.',
          price: lowP,
        },
      ];
      syncRefs();
      return;
    }

    const c = cat(), saved = loadCalib(c?.id || state.catId);
    state.unit = saved?.unit || c?.unit || 'piece';

    const highP = saved?.high?.price ?? (state.catId === 'roches' || state.catId === 'pierres' ? 2000 : c?.high?.price ?? 100);
    const lowP = saved?.low?.price ?? (state.catId === 'roches' || state.catId === 'pierres' ? 120 : c?.low?.price ?? 10);
    const midP = Math.round(((highP + lowP) / 2) * 2) / 2;

    if (saved && Array.isArray(saved.list) && saved.list.length >= 2 && saved.list.length <= 3) {
      // Forcer au maximum 3 cartes
      state.refList = saved.list.slice(0, 3).map((r, idx) => ({
        id: `ref-${Date.now()}-${idx}`,
        title: r.title || (idx === 0 ? 'Top Quality (Grade S)' : idx === 1 ? 'Standard Quality (Grade A / B)' : 'Lower Quality (Grade C)'),
        mode: r.mode || 'photo',
        video: null,
        photo: r.photo || (idx === 0 ? getReferenceImage(c, 'high') : idx === 1 ? getReferenceImage(c, 'mid') : getReferenceImage(c, 'low')),
        desc: r.desc || '',
        price: r.price ?? (idx === 0 ? highP : idx === 1 ? midP : lowP),
      }));
      // Si seulement 2 cartes dans le cache, ajouter la 3ème avec photo
      if (state.refList.length === 2) {
        state.refList.splice(1, 0, {
          id: `ref-${Date.now()}-mid`,
          title: 'Standard Quality (Grade A / B)',
          mode: 'photo',
          video: null,
          photo: getReferenceImage(c, 'mid'),
          desc: 'Commercial healthy grade, balanced appearance with minor natural variations.',
          price: midP,
        });
      }
    } else {
      // 3 cartes officielles par défaut : Grade S, Grade A/B, Grade C avec leurs 3 photos HD
      state.refList = [
        {
          id: 'ref-high',
          title: 'Top Quality (Grade S)',
          mode: 'photo',
          video: null,
          photo: getReferenceImage(c, 'high'),
          desc: saved?.high?.desc ?? c?.high?.desc ?? 'Exceptional specimen with zero flaws, maximum purity or freshness.',
          price: highP,
        },
        {
          id: 'ref-mid',
          title: 'Standard Quality (Grade A / B)',
          mode: 'photo',
          video: null,
          photo: getReferenceImage(c, 'mid'),
          desc: 'Commercial healthy grade, balanced appearance with minor natural variations.',
          price: midP,
        },
        {
          id: 'ref-low',
          title: 'Lower Quality (Grade C)',
          mode: 'photo',
          video: null,
          photo: getReferenceImage(c, 'low'),
          desc: saved?.low?.desc ?? c?.low?.desc ?? 'Modest quality, visible imperfections, clearance tier or floor price.',
          price: lowP,
        },
      ];
    }
    syncRefs();
  }

  /* ---------- Chargement d'une vente existante pour édition ou diffusion ---------- */
  function loadSaleIntoState(saleId, targetStep = 2, asPublished = false) {
    const s = loadSales().find((x) => x.id === saleId);
    if (!s) return;
    reset();
    state.editingId = s.id;
    const foundCat = getAllCategories().find((c) => c.id === s.catId || c.name === s.category);
    if (foundCat) {
      state.catId = foundCat.id;
    } else {
      state.catId = 'autre';
      state.otherName = s.category || 'Autre';
    }
    prepareCalibration();
    state.unit = s.unit || state.unit;
    if (s.lowPrice) state.refs.low.price = s.lowPrice;
    if (s.highPrice) state.refs.high.price = s.highPrice;
    if (state.refList && state.refList.length === 3) {
      if (s.highPrice) state.refList[0].price = s.highPrice;
      if (s.lowPrice) state.refList[2].price = s.lowPrice;
      const midP = Math.round((((+s.highPrice || 100) + (+s.lowPrice || 10)) / 2) * 2) / 2;
      state.refList[1].price = midP;
    }

    state.product = {
      title: s.title || '',
      media: s.thumb ? [{ type: 'photo', url: s.thumb, thumb: s.thumb }] : [],
      desc: s.desc || '',
      qty: s.qty || 1,
      isFresh: !!s.isFresh,
      decayHours: s.decayHours || 24,
      floorPrice: s.floorPrice || '',
      simHours: s.simHours || 0,
    };
    const low = +state.refs.low.price || 10;
    const high = +state.refs.high.price || 100;
    const score = s.score ?? 70;
    const grade = s.grade || Object.keys(GRADES).find((g) => score >= GRADES[g].min) || 'B';
    const unitP = round2((+s.price || 0) / (+s.qty || 1));
    state.estimate = {
      t: clamp(score / 100, 0, 1),
      score,
      grade,
      unitP,
      total: +s.price || 0,
      perFeat: [],
      kw: keywordScore(s.desc || ''),
      visual: false,
      refsOk: true,
      n: state.product.media.length,
      low,
      high,
      qty: +s.qty || 1,
    };
    state.finalPrice = s.price;
    state.sale = { paypal: s.paypal || '', contact: s.contact || '' };
    state.channels = Array.isArray(s.channels) ? [...s.channels] : [];
    if (asPublished) {
      state.published = s;
      state.step = 4;
    } else {
      state.step = targetStep;
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Navigation ---------- */
  function go(step) { state.step = step; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function canNext() {
    switch (state.step) {
      case 0: return !!state.catId && (!isOther() || state.otherName.trim().length > 1);
      case 1:
        if (state.refList && state.refList.length >= 2) {
          return state.refList.every((r) => +r.price > 0);
        }
        return +state.refs.low.price > 0 && +state.refs.high.price > 0;
      case 2: return state.product.media.length > 0 && +state.product.qty > 0 && state.product.title.trim().length > 0;
      case 3: return !!state.estimate && +state.finalPrice > 0;
      case 4: return !state.published;
      default: return false;
    }
  }

  function updateNav() {
    if (state.step < 0) return;
    const next = $('#btnNext');
    if (next) {
      next.disabled = !canNext();
      next.textContent = 'Next →';
      next.classList.toggle('hidden', !!state.published);
    }
    const back = $('#btnBack');
    if (back) {
      back.textContent = '← Back';
      back.classList.toggle('hidden', !!state.published);
    }
  }

  $('#btnNext')?.addEventListener('click', async () => {
    if (!canNext()) return;
    if (state.step === 0) { prepareCalibration(); if (!state.product.title) state.product.title = defaultTitle(); }
    if (state.step === 1) saveCalib();
    if (state.step === 4) return publish();
    go(state.step + 1);
  });

  $('#btnBack')?.addEventListener('click', () => (state.step === 0 ? goHome() : go(state.step - 1)));
  $('#brand')?.addEventListener('click', goHome);

  function goHome() {
    if (state.step >= 0 && !state.published && state.catId && !confirm('Leave without saving?')) return;
    reset(); render();
  }

  function defaultTitle() {
    const d = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    return `${cat().name} — lot of ${d}`;
  }

  /* ---------- Rendu ---------- */
  function render() {
    const s = state.step;
    const isHome = s < 0;
    document.body.classList.toggle('is-home', isHome);
    document.body.classList.toggle('is-category', s === 0);
    document.body.classList.toggle('is-calib', s === 1);
    document.body.classList.toggle('is-product', s === 2);
    document.body.classList.toggle('is-estimate', s === 3);
    document.body.classList.toggle('is-publish', s === 4);
    const screen = $('#screen');
    screen.className = isHome ? 'screen home-screen' : `screen step-${s} ${s === 0 ? 'category-screen' : ''} ${s === 1 ? 'calib-screen' : ''} ${s === 2 ? 'product-screen' : ''} ${s === 3 ? 'estimate-screen' : ''} ${s === 4 ? 'publish-screen' : ''}`;
    $('#stepper').classList.toggle('hidden', isHome);
    if (s >= 0) renderStepper();
    const screens = [renderCategory, renderCalibration, renderProduct, renderEstimate, renderPublish];
    (s >= 0 ? screens[s] : renderHome)();
    updateNav();
  }

  function renderStepper() {
    const isEditing = !!state.editingId;
    const isPub = !!state.published;
    const bannerWrap = $('#editBannerWrap');
    if (bannerWrap) {
      if (isPub) {
        bannerWrap.innerHTML = `
          <div class="edit-banner pub-success-banner">
            <div class="edit-banner-title">
              🎉 <b>${isEditing ? 'Listing updated successfully!' : 'Listing published successfully!'}</b>
              <span>${esc(state.published.title || '')}</span>
            </div>
            <div class="edit-banner-actions">
              <a class="btn paypal small" href="${paypalLink(state.published, true)}" target="_blank" rel="noopener">💳 Test PayPal</a>
              <button class="btn small" id="editPublishedSale">✏️ Edit</button>
              <button class="btn primary small" id="newSale">＋ New Listing</button>
              <button class="btn ghost small" id="toHome">🏠 Home</button>
            </div>
          </div>`;
        $('#editPublishedSale')?.addEventListener('click', () => {
          const id = state.published.id;
          state.published = null;
          state.editingId = id;
          go(2);
        });
        $('#newSale')?.addEventListener('click', () => { reset(); go(0); });
        $('#toHome')?.addEventListener('click', () => { reset(); render(); });
      } else if (isEditing) {
        bannerWrap.innerHTML = `
          <div class="edit-banner">
            <div class="edit-banner-title">✏️ <b>Editing:</b> <span>${esc(state.product.title || 'Listing')}</span></div>
            <div class="edit-banner-actions">
              <button class="btn small primary" id="quickSaveBtn">💾 Save Now</button>
              <button class="btn small ghost" id="cancelEditBtn">✕ Cancel</button>
            </div>
          </div>`;
        $('#quickSaveBtn')?.addEventListener('click', () => publish());
        $('#cancelEditBtn')?.addEventListener('click', () => { reset(); render(); });
      } else {
        bannerWrap.innerHTML = '';
      }
    }

    const stepsOl = $('#stepperSteps');
    if (stepsOl) {
      stepsOl.innerHTML = STEPS.map((n, i) => {
        const clickable = (isEditing || i < state.step) && !state.published;
        return `
          <li class="${i < state.step || (isEditing && i !== state.step) ? 'done' : ''} ${i === state.step ? 'on' : ''}" ${clickable ? `data-go="${i}"` : ''}>
            <span class="dot">${i < state.step ? '✓' : i + 1}</span><span class="lbl">${n}</span>
          </li>`;
      }).join('');
      $$('#stepperSteps [data-go]').forEach((li) => li.addEventListener('click', () => go(+li.dataset.go)));
    }
  }

  /* ===== Accueil (2 Cartes : Gauche Hero, Droite Mes Ventes sur 2 Lignes avec Barre Principale) ===== */
  function renderHome() {
    const sales = loadSales();
    if (sales.length && (!state.selectedSaleId || !sales.some((x) => x.id === state.selectedSaleId))) {
      state.selectedSaleId = sales[0].id;
    }
    const selectedSale = sales.find((x) => x.id === state.selectedSaleId) || sales[0] || null;

    $('#screen').innerHTML = `
      <div class="home-container">
        <!-- Carte Gauche : Présentation Hero & Action Principale -->
        <section class="card home-left-card">
          <div class="home-left-content">
            <h1>Sell your treasures<br><span class="hl">at the fair price</span> ✨</h1>
            <p>Foraging, fishing, rare finds… Photograph your product: AI appraises it against your quality standards, calculates the exact fair price, generates your <b>PayPal Button & QR Code</b>, and publishes your listing.</p>

            <div class="hero-btns">
              <button class="btn primary big full-w" id="startBtn">＋ Add a Listing</button>
            </div>
          </div>

          <div class="hero-emojis" aria-hidden="true">
            <span>⛏️</span>
            <span title="Poisson sans yeux">${NO_EYE_FISH_SVG}</span>
            <span>🍄</span>
            <span>💎</span>
            <span>🌿</span>
            <span>🍯</span>
          </div>
        </section>

        <!-- Carte Droite : Mes ventes expansives remplissant l'espace disponible -->
        <section class="card home-right-card">
          <div class="home-right-header">
            <h2>My Published Listings <span class="count">${sales.length}</span></h2>
            ${sales.length ? `
              <div class="sales-actions-bar" id="salesActionsBar" role="toolbar" aria-label="Actions on selected listing">
                <button type="button" class="btn-sale-action edit" id="btnSaleEdit" title="Edit selected listing">
                  ✏️ Edit
                </button>
                <button type="button" class="btn-sale-action share" id="btnSaleShare" title="Share on social media with PayPal QR">
                  📢 Share & Pay
                </button>
                <button type="button" class="btn-sale-action print" id="btnSalePrint" title="Print A4 poster or labels">
                  🖨️ Print
                </button>
                <button type="button" class="btn-sale-action del" id="btnSaleDel" title="Delete selected listing">
                  🗑️ Delete
                </button>
              </div>
            ` : ''}
          </div>

          ${sales.length ? `
            <!-- Grille expansive qui remplit tout l'espace disponible -->
            <div class="sales-expansive-grid" id="salesGrid">
              ${sales.map((s) => expansiveSaleCard(s, s.id === selectedSale?.id)).join('')}
            </div>
          ` : `
            <div class="empty-home-box">
              <span style="font-size:2.6rem;margin-bottom:8px;">📦</span>
              <b>No listings published yet</b>
              <p>Click <b>＋ Add a Listing</b> to grade a product and generate your instant PayPal link & QR Code!</p>
            </div>
          `}
        </section>
      </div>`;

    $('#startBtn').addEventListener('click', () => { reset(); go(0); });

    const getTargetSaleId = () => {
      if (state.selectedSaleId && sales.some((s) => s.id === state.selectedSaleId)) {
        return state.selectedSaleId;
      }
      return sales[0]?.id || null;
    };

    function updateToolbarTooltips() {
      const id = getTargetSaleId();
      const currentSales = loadSales();
      const s = currentSales.find((x) => x.id === id);
      const titleSuffix = s ? ` ("${s.title}")` : '';
      const editBtn = $('#btnSaleEdit');
      const shareBtn = $('#btnSaleShare');
      const printBtn = $('#btnSalePrint');
      const delBtn = $('#btnSaleDel');
      if (editBtn) editBtn.title = `Edit selected listing${titleSuffix}`;
      if (shareBtn) shareBtn.title = `Share with live PayPal link & QR${titleSuffix}`;
      if (printBtn) printBtn.title = `Print A4 poster or labels${titleSuffix}`;
      if (delBtn) delBtn.title = `Delete selected listing${titleSuffix}`;
    }

    function selectSale(id) {
      state.selectedSaleId = id;
      $$('.sale-card').forEach((el) => {
        el.classList.toggle('selected', el.dataset.id === id);
      });
      updateToolbarTooltips();
    }

    // Actions de la barre supérieure sur la vente sélectionnée
    $('#btnSaleEdit')?.addEventListener('click', () => {
      const id = getTargetSaleId();
      if (!id) return;
      loadSaleIntoState(id, 2, false);
    });

    $('#btnSaleShare')?.addEventListener('click', () => {
      const id = getTargetSaleId();
      if (!id) return;
      loadSaleIntoState(id, 4, true);
    });

    $('#btnSalePrint')?.addEventListener('click', () => {
      const id = getTargetSaleId();
      if (!id) return;
      loadSaleIntoState(id, 4, true);
      state.pubTab = 'print';
      render();
    });

    $('#btnSaleDel')?.addEventListener('click', () => {
      const id = getTargetSaleId();
      if (!id) return;
      const curSales = loadSales();
      const targetSale = curSales.find((s) => s.id === id);
      const name = targetSale ? targetSale.title : 'this listing';
      if (!confirm(`Delete listing "${name}"?`)) return;
      const nextSales = curSales.filter((s) => s.id !== id);
      saveSales(nextSales);
      state.selectedSaleId = nextSales[0]?.id || null;
      render();
    });

    // Clic sur une carte pour la sélectionner, double-clic pour modifier
    $$('.sale-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectSale(card.dataset.id);
      });

      card.addEventListener('dblclick', () => {
        loadSaleIntoState(card.dataset.id, 2, false);
      });
    });

    updateToolbarTooltips();
  }

  /* Carte de vente carrée : Image en haut, Catégorie & Prix, Titre (sans boutons) */
  function expansiveSaleCard(s, isSelected) {
    const cur = computeDecayedSale(s);
    const gradeObj = GRADES[cur.grade] || { label: 'Certified Quality' };
    const isDiscounted = cur.isFresh && cur.basePrice > cur.price;
    return `
      <article class="sale-card ${isSelected ? 'selected' : ''}" data-id="${s.id}" style="--c:${s.color || '#ffd23f'}" title="Click to select this listing">
        <div class="sale-card-media">
          ${s.thumb ? `<img src="${s.thumb}" alt="${esc(s.title)}">` : `<span class="emo">${s.emoji}</span>`}
          <div class="sale-card-grade g-${cur.grade}" title="Quality: Grade ${cur.grade} (${esc(gradeObj.label)})">
            <span class="grade-letter">${cur.grade}</span>
            ${cur.score ? `<span class="grade-score">${cur.score}</span>` : ''}
          </div>
          ${cur.isFresh ? `<div class="sale-card-fresh-badge ${cur.freshnessPercent <= 50 ? 'warn' : ''}" title="Perishable fresh product · Current freshness ${cur.freshnessPercent}%">⏱️ ${cur.freshnessPercent}%</div>` : ''}
        </div>

        <div class="sale-card-body">
          <div class="sale-card-top">
            <span class="sale-card-cat" title="${esc(s.unit ? s.qty + ' ' + s.unit : 'Certified Batch')}">${s.emoji || '📦'} ${esc(s.unit ? s.qty + ' ' + s.unit : 'Certified Batch')}</span>
            <span class="sale-card-price ${isDiscounted ? 'is-decayed' : ''}">
              ${isDiscounted ? `<small><del>${fmt(cur.basePrice)}</del></small>` : ''}
              ${fmt(cur.price)}
            </span>
          </div>

          <div class="sale-card-title" title="${esc(s.title)}">${esc(s.title)}</div>
        </div>
      </article>`;
  }

  /* ===== 1. Catégorie (Organisée par famille · 100% On-Screen) ===== */
  function renderCategory() {
    const activeFamily = state.activeCatFamily || 'all';

    const allCats = [...CATEGORIES, ...customCategories, OTHER];
    const displayedCats = activeFamily === 'all'
      ? allCats
      : allCats.filter((c) => c.family === activeFamily);

    // Rendu des boutons filtres par famille + Bouton Nouveau Produit (dans la zone marquée)
    const filtersHtml = `
      <div class="cat-family-filters" role="tablist">
        <button type="button" class="btn-family-filter ${activeFamily === 'all' ? 'on' : ''}" data-fam="all">
          🌟 <b>All</b> <span class="pill-count">${allCats.length}</span>
        </button>
        ${FAMILIES.map((f) => {
          const count = allCats.filter((c) => c.family === f.id).length;
          return `
            <button type="button" class="btn-family-filter ${activeFamily === f.id ? 'on' : ''}" data-fam="${f.id}">
              <span>${f.emoji}</span> <b>${esc(f.name)}</b> <span class="pill-count">${count}</span>
            </button>`;
        }).join('')}
        <button type="button" class="btn-new-product" id="btnNewProduct" title="Create and calibrate a new custom product">
          ➕ <b>Custom Product</b>
        </button>
      </div>`;

    // Grille compacte unique, ordonnée par famille, tenant entièrement dans l'écran
    const gridHtml = `
      <div class="cat-grid">
        ${displayedCats.map((c) => {
          const fMeta = FAMILIES.find((f) => f.id === c.family) || FAMILIES[3];
          const isCustom = !!c.isCustom;
          return `
            <button type="button" class="cat ${state.catId === c.id ? 'on' : ''} ${c.id === 'autre' ? 'other' : ''} ${isCustom ? 'is-custom' : ''}" data-id="${c.id}" style="--c:${c.color}" title="${esc(c.name)} · Family: ${esc(fMeta.name)}">
              <span class="cat-fam-indicator" title="${esc(fMeta.name)}">${fMeta.emoji}</span>
              <span class="emo">${c.id === 'poissons' || c.emoji === '🐟' ? NO_EYE_FISH_SVG : c.emoji}</span>
              <span class="name">${esc(c.name)}</span>
            </button>`;
        }).join('')}
      </div>`;

    $('#screen').innerHTML = `
      <div class="screen-title-row">
        <h2 class="screen-title">What do you want to sell?</h2>
        <span class="sub-inline">Choose a category · Fair price dynamically adapts to certified quality</span>
      </div>
      ${filtersHtml}
      ${gridHtml}
      <div class="card other-box ${isOther() ? '' : 'hidden'}" id="otherBox">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <label class="lbl" for="otherInput" style="margin:0;">✏️ Specify your product</label>
          <button type="button" class="btn ghost small" id="btnOpenFullNewProd" style="padding:2px 8px;font-size:.78rem;font-weight:800;">Open full custom form ↗</button>
        </div>
        <input id="otherInput" maxlength="60" placeholder="ex: Raw amber, sea urchins, argan, caviar…" value="${esc(state.otherName)}">
      </div>`;

    // Bouton Nouveau Produit
    $('#btnNewProduct')?.addEventListener('click', () => {
      openNewProductModal(state.activeCatFamily !== 'all' ? state.activeCatFamily : 'terroir');
    });

    $('#btnOpenFullNewProd')?.addEventListener('click', () => {
      openNewProductModal('terroir', state.otherName);
    });

    // Événements boutons filtres
    $$('.btn-family-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeCatFamily = btn.dataset.fam;
        renderCategory();
      });
    });

    // Événements sélection catégorie
    $$('.cat').forEach((b) => b.addEventListener('click', () => {
      state.catId = b.dataset.id;
      $$('.cat').forEach((x) => x.classList.toggle('on', x === b));
      $('#otherBox').classList.toggle('hidden', !isOther());
      if (isOther()) $('#otherInput').focus();
      if (!state.editingId) {
        const selected = cat();
        state.product.title = selected.id !== 'autre' ? selected.name : '';
      }
      prepareCalibration();
      updateNav();
    }));

    $('#otherInput')?.addEventListener('input', (e) => {
      state.otherName = e.target.value;
      if (!state.editingId) state.product.title = '';
      updateNav();
    });
    $('#otherInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnNext').click(); });
  }

  /* Modal de création d'un nouveau produit personnalisé */
  function openNewProductModal(prefillFamily = 'terroir', prefillName = '') {
    const activeFam = state.activeCatFamily !== 'all' ? state.activeCatFamily : prefillFamily;
    const initialName = prefillName || (isOther() ? state.otherName : '');

    const emojis = ['📦', '🐟', '🦞', '🦪', '⛏️', '💎', '🐚', '🍄', '🌰', '🪵', '🍯', '🌸', '🌴', '🫒', '🍓', '☕', '✨', '🌿', '🍇', '🧀', '🥩', '🍵'];

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'newProductModalBackdrop';

    backdrop.innerHTML = `
      <div class="settings-modal new-product-modal" role="document">
        <div class="modal-header">
          <h2>➕ New Custom Product</h2>
          <button type="button" class="modal-close" id="btnCloseNewProdModal" title="Close">✕</button>
        </div>

        <div class="new-prod-modal-body">
          <div id="newProdErrors" class="hidden" style="background:#fee2e2;border:2px solid #ef4444;border-radius:10px;padding:6px 10px;font-size:.82rem;font-weight:700;color:#b91c1c;margin-bottom:4px;line-height:1.35;"></div>

          <div class="form-field">
            <label class="lbl" for="newProdName">Product Name <span style="color:#ef4444;">*</span></label>
            <input type="text" id="newProdName" class="inp" placeholder="e.g., Black Morels, Raw Amber, Caviar, Fresh Oysters..." value="${esc(initialName)}" autofocus maxlength="50">
          </div>

          <div class="form-field">
            <label class="lbl">Product Family <span style="color:#ef4444;">*</span></label>
            <div class="new-prod-family-picker">
              ${FAMILIES.map((f) => `
                <label class="family-radio-label ${f.id === activeFam ? 'selected' : ''}">
                  <input type="radio" name="newProdFamily" value="${f.id}" ${f.id === activeFam ? 'checked' : ''}>
                  <span>${f.emoji}</span> <b>${esc(f.name)}</b>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-field">
            <label class="lbl" for="newProdEmoji">Icon / Emoji</label>
            <div class="emoji-picker-row">
              <input type="text" id="newProdEmoji" class="inp emoji-preview-inp" value="📦" maxlength="4" title="Selected icon">
              <div class="emoji-quick-picks">
                ${['🐟', '🦞', '🦪', '⛏️', '💎', '🐚', '🍄', '🌰', '🪵', '🍯', '🌸', '🌴', '🫒', '🍓', '☕', '✨', '🌿', '🍇', '🧀'].map((em) => `
                  <button type="button" class="btn-quick-emoji" data-emoji="${em}" title="Choisir ${em}">${em}</button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="form-field">
            <label class="lbl" for="newProdUnit">Selling Unit <span style="color:#ef4444;">*</span></label>
            <select id="newProdUnit" class="inp select-styled unit-select-wide">
              <option value="piece" ${(state.unit || 'piece') === 'piece' ? 'selected' : ''}>piece — Per item (e.g., wild fish, mineral, gemstone...)</option>
              <option value="kg" ${(state.unit || 'piece') === 'kg' ? 'selected' : ''}>kg — Per kilogram (e.g., truffles, mushrooms, honey, fruit...)</option>
              <option value="g" ${(state.unit || 'piece') === 'g' ? 'selected' : ''}>g — Per gram (e.g., saffron, rare spices...)</option>
              <option value="L" ${(state.unit || 'piece') === 'L' ? 'selected' : ''}>L — Per liter (e.g., olive oil, cider, vinegar...)</option>
              <option value="carat" ${(state.unit || 'piece') === 'carat' ? 'selected' : ''}>carat — Per carat (e.g., precious gems, diamonds...)</option>
              <option value="lot" ${(state.unit || 'piece') === 'lot' ? 'selected' : ''}>lot — Full batch / set (e.g., collection, crate...)</option>
              <option value="dozen" ${(state.unit || 'piece') === 'dozen' ? 'selected' : ''}>dozen — Per dozen (e.g., oysters, shellfish...)</option>
            </select>
          </div>
        </div>

        <div class="calib-modal-footer">
          <button type="button" class="btn ghost" id="btnCancelNewProd">✕ Cancel</button>
          <button type="button" class="btn primary" id="btnSaveNewProd">✨ Create & Select</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Focus sur le champ nom
    setTimeout(() => {
      const nameInput = $('#newProdName');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 50);

    // Événements changement de famille
    backdrop.querySelectorAll('input[name="newProdFamily"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        backdrop.querySelectorAll('.family-radio-label').forEach((lbl) => {
          lbl.classList.toggle('selected', lbl.querySelector('input').checked);
        });
      });
    });

    // Événements clic emoji rapide
    backdrop.querySelectorAll('.btn-quick-emoji').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emojiInput = $('#newProdEmoji');
        if (emojiInput) emojiInput.value = btn.dataset.emoji;
      });
    });

    const close = () => { backdrop.remove(); };
    $('#btnCloseNewProdModal')?.addEventListener('click', close);
    $('#btnCancelNewProd')?.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    // Validation et création
    const save = () => {
      const name = $('#newProdName')?.value.trim() || '';
      const errBox = $('#newProdErrors');
      if (!name) {
        if (errBox) {
          errBox.textContent = '⚠️ Product name is required.';
          errBox.classList.remove('hidden');
        }
        $('#newProdName')?.focus();
        return;
      }

      const famRadio = backdrop.querySelector('input[name="newProdFamily"]:checked');
      const familyId = famRadio ? famRadio.value : 'terroir';
      const fMeta = FAMILIES.find((f) => f.id === familyId) || FAMILIES[3];
      const emoji = $('#newProdEmoji')?.value.trim() || '📦';
      const unit = $('#newProdUnit')?.value || 'piece';

      const newCat = {
        id: 'custom_' + Date.now(),
        family: familyId,
        name: name,
        emoji: emoji,
        unit: unit,
        color: fMeta.borderColor || '#FF5DA2',
        isCustom: true,
        low: { price: 10, desc: `Commercial standard grade of ${name.toLowerCase()}, healthy appearance with minor variations.` },
        high: { price: 100, desc: `Exceptional high grade of ${name.toLowerCase()}, rare specimen with zero flaws.` }
      };

      customCategories.push(newCat);
      state.catId = newCat.id;
      state.otherName = '';
      state.unit = newCat.unit;
      if (!state.editingId) state.product.title = newCat.name;
      prepareCalibration();

      close();
      renderCategory();
      updateNav();
    };

    $('#btnSaveNewProd')?.addEventListener('click', save);
    $('#newProdName')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }

  /* ===== 2. Étalonnage ===== */
  function mediaHtml(r) {
    if (r.mode === 'video') {
      return r.video
        ? `<video src="${r.video}" controls muted playsinline loop></video>`
        : `<div class="placeholder"><span>🎬</span>Drag video here<br><small>or click Upload</small></div>`;
    }
    return r.photo
      ? `<img src="${r.photo}" alt="">`
      : `<div class="placeholder"><span>📷</span>Drag photo here<br><small>or click Upload</small></div>`;
  }

  function calibWarnings() {
    return '';
  }

  function refCard(r, index, total, isSelected) {
    const isTop = index === 0;
    const isBottom = index === total - 1;
    const rankClass = isTop ? 'is-rank-1' : isBottom ? 'is-rank-last' : 'is-rank-mid';
    const rankBadgeHtml = isTop
      ? `<span class="rank-badge rank-top">🏆 Tier 1 • Top</span>`
      : isBottom
      ? `<span class="rank-badge rank-bottom">🔻 Tier ${index + 1} • Low</span>`
      : `<span class="rank-badge rank-mid">⭐ Tier ${index + 1}</span>`;

    const mediaThumb = r.mode === 'video'
      ? (r.video
          ? `<video src="${r.video}" muted playsinline></video>`
          : `<div class="ref-thumb-placeholder"><span>🎬</span><small>No video set</small></div>`)
      : (r.photo
          ? `<img src="${r.photo}" alt="${esc(r.title)}">`
          : `<div class="ref-thumb-placeholder"><span>📷</span><small>No photo set</small></div>`);

    return `
      <div class="card ref-card-ranked ${rankClass} ${isSelected ? 'is-selected' : ''}" data-idx="${index}" draggable="true" title="Click to select, double-click to edit">
        <div class="ref-card-head">
          <div class="ref-card-head-left">
            <span class="drag-handle" title="Drag to reorder">⠿</span>
            ${rankBadgeHtml}
          </div>
          <div class="ref-card-head-right">
            <button type="button" class="btn small mini btn-card-quick-edit" data-idx="${index}" title="Edit this quality tier">✏️ Edit</button>
          </div>
        </div>

        <div class="ref-card-media-box">
          ${mediaThumb}
          <span class="ref-media-mode-pill">${r.mode === 'video' ? '🎬 Video' : '📷 Photo'}</span>
        </div>

        <div class="ref-card-info">
          <h3 class="ref-card-title">${esc(r.title || `Tier ${index + 1}`)}</h3>
          <div class="ref-card-desc" title="${esc(r.desc || '')}">
            ${esc(r.desc || 'No visual criteria specified.')}
          </div>
          <div class="ref-card-price-row">
            <span class="ref-price-label">Tier Price</span>
            <div class="ref-price-badge">
              <b>${esc(r.price ?? '0')} €</b> / <span class="unitLbl">${esc(state.unit)}</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderCalibration() {
    if (!state.refList || state.refList.length === 0) {
      prepareCalibration();
    }
    syncRefs();

    const total = state.refList.length;
    if (state.selectedCalibIdx == null || state.selectedCalibIdx < 0 || state.selectedCalibIdx >= total) {
      state.selectedCalibIdx = 0;
    }
    const selIdx = state.selectedCalibIdx;
    const canMovePrev = selIdx > 0;
    const canMoveNext = selIdx < total - 1;
    const canDelete = total > 2;

    const cardsHtml = state.refList.map((r, idx) => refCard(r, idx, total, idx === selIdx)).join('');

    $('#screen').innerHTML = `
      <div class="calib-toolbar">
        <div class="calib-toolbar-left">
          <span class="calib-toolbar-title">⚖️ Calibration Standards:</span>
        </div>

        <div class="calib-toolbar-center">
          <button type="button" class="btn small primary btn-calib-action" id="btnCalibAdd" title="Add a new quality tier">
            ➕ Add Tier
          </button>
          <button type="button" class="btn small btn-calib-action" id="btnCalibEdit" title="Edit selected quality tier">
            ✏️ Edit
          </button>
          <button type="button" class="btn small btn-calib-action" id="btnCalibMovePrev" ${canMovePrev ? '' : 'disabled'} title="Move tier up (higher quality level)">
            ◀ Move Up
          </button>
          <button type="button" class="btn small btn-calib-action" id="btnCalibMoveNext" ${canMoveNext ? '' : 'disabled'} title="Move tier down (lower quality level)">
            Move Down ▶
          </button>
          <button type="button" class="btn small ghost del btn-calib-action" id="btnCalibDel" ${canDelete ? '' : 'disabled'} title="Delete selected tier (minimum 2 tiers required)">
            🗑️ Delete
          </button>
        </div>

        <div class="calib-toolbar-right">
          <div class="unit-inline-pill mini">
            <span>💶 Price per</span>
            <select id="unitSel">${UNITS.map((u) => `<option ${u === state.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>
          </div>
        </div>
      </div>

      <div class="ref-ranked-grid" id="refCardsContainer">
        ${cardsHtml}
      </div>`;

    // Événement sélecteur d'unité
    $('#unitSel')?.addEventListener('change', (e) => {
      state.unit = e.target.value;
      $$('.unitLbl').forEach((x) => { x.textContent = state.unit; });
      dirty();
    });

    // Bouton Barre : ➕ Ajouter
    $('#btnCalibAdd')?.addEventListener('click', () => {
      openCalibEditModal(state.refList.length, true);
    });

    // Bouton Barre : ✏️ Modifier
    $('#btnCalibEdit')?.addEventListener('click', () => {
      openCalibEditModal(selIdx, false);
    });

    // Bouton Barre : ◀ Déplacer avant
    $('#btnCalibMovePrev')?.addEventListener('click', () => {
      if (selIdx <= 0) return;
      const tmp = state.refList[selIdx];
      state.refList[selIdx] = state.refList[selIdx - 1];
      state.refList[selIdx - 1] = tmp;
      state.selectedCalibIdx = selIdx - 1;
      syncRefs();
      dirty();
      saveCalib();
      render();
    });

    // Bouton Barre : Déplacer arrière ▶
    $('#btnCalibMoveNext')?.addEventListener('click', () => {
      if (selIdx >= state.refList.length - 1) return;
      const tmp = state.refList[selIdx];
      state.refList[selIdx] = state.refList[selIdx + 1];
      state.refList[selIdx + 1] = tmp;
      state.selectedCalibIdx = selIdx + 1;
      syncRefs();
      dirty();
      saveCalib();
      render();
    });

    // Bouton Barre : 🗑️ Supprimer
    $('#btnCalibDel')?.addEventListener('click', () => {
      if (state.refList.length <= 2) return;
      const cur = state.refList[selIdx];
      const name = cur?.title || `Tier ${selIdx + 1}`;
      if (confirm(`Permanently delete "${name}"?`)) {
        state.refList.splice(selIdx, 1);
        if (state.selectedCalibIdx >= state.refList.length) {
          state.selectedCalibIdx = state.refList.length - 1;
        }
        syncRefs();
        dirty();
        saveCalib();
        render();
      }
    });

    // Événements sur chaque carte d'étalon
    $$('.ref-card-ranked').forEach((card) => {
      const idx = +card.dataset.idx;

      // Clic pour sélectionner
      card.addEventListener('click', () => {
        if (state.selectedCalibIdx !== idx) {
          state.selectedCalibIdx = idx;
          render();
        }
      });

      // Double-clic pour ouvrir la boîte de dialogue d'édition
      card.addEventListener('dblclick', () => {
        state.selectedCalibIdx = idx;
        openCalibEditModal(idx, false);
      });

      // Bouton rapide "✏️ Éditer" sur la carte
      $('.btn-card-quick-edit', card)?.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedCalibIdx = idx;
        openCalibEditModal(idx, false);
      });

      // Drag and Drop HTML5 pour réordonner les cartes
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', String(idx));
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        $$('.ref-card-ranked').forEach((c) => c.classList.remove('dragover'));
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('dragover');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('dragover');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('dragover');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIdx = idx;
        if (!isNaN(fromIdx) && fromIdx !== toIdx) {
          const item = state.refList.splice(fromIdx, 1)[0];
          state.refList.splice(toIdx, 0, item);
          state.selectedCalibIdx = toIdx;
          syncRefs();
          dirty();
          saveCalib();
          render();
        }
      });
    });
  }

  function openCalibEditModal(index, isNew = false) {
    const modal = $('#calibEditModal');
    if (!modal) return;

    if (!state.refList || state.refList.length === 0) prepareCalibration();

    const total = state.refList.length;
    const isTop = !isNew && index === 0;
    const isBottom = !isNew && index === total - 1;
    const rankLabel = isNew
      ? `New Tier (Tier ${total + 1})`
      : isTop
      ? `Tier 1 • Top Level (Grade S)`
      : isBottom
      ? `Tier ${index + 1} • Lowest Level (Grade C)`
      : `Tier ${index + 1} • Intermediate Level`;

    const prevPrice = index > 0 ? +state.refList[index - 1]?.price || 50 : 100;
    const nextPrice = index < total ? +state.refList[index]?.price || 10 : 20;
    const suggestedPrice = Math.max(1, Math.round(((prevPrice + nextPrice) / 2) * 2) / 2);

    let draft = isNew
      ? {
          id: `ref-${Date.now()}`,
          title: '',
          mode: 'photo',
          video: null,
          photo: null,
          desc: '',
          price: '',
        }
      : { ...state.refList[index] };

    function renderModalContent() {
      const hasMedia = draft.mode === 'video' ? !!draft.video : !!draft.photo;
      const mediaPreviewHtml = draft.mode === 'video'
        ? (draft.video
            ? `<video src="${draft.video}" controls muted playsinline loop style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<div class="placeholder"><span>🎬</span>Drag video here<br><small>or click Upload</small></div>`)
        : (draft.photo
            ? `<img src="${draft.photo}" style="width:100%;height:100%;object-fit:cover;" alt="">`
            : `<div class="placeholder"><span>📷</span>Drag photo here<br><small>ou clique sur Importer</small></div>`);

      modal.innerHTML = `
        <div class="settings-modal calib-modal-dialog" role="document">
          <div class="modal-header">
            <h2>${isNew ? '➕ Add Quality Tier' : '✏️ Edit Quality Tier'} · <small style="font-size:.9rem;opacity:.8;">${esc(rankLabel)}</small></h2>
            <button type="button" class="modal-close" id="btnCloseCalibEditModal" title="Close">✕</button>
          </div>

          <div class="calib-modal-body">
            <div id="modalRefErrors" class="hidden" style="background:#fee2e2;border:2px solid #ef4444;border-radius:10px;padding:6px 10px;font-size:.82rem;font-weight:700;color:#b91c1c;margin-bottom:4px;line-height:1.35;"></div>

            <div class="form-field">
              <label class="lbl">Tier Name <span style="color:#ef4444;">*</span></label>
              <input type="text" id="modalRefTitle" class="inp" value="${esc(draft.title)}" placeholder="e.g., Top Grade S, Premium Grade A, Commercial Standard...">
            </div>

            <div class="calib-modal-split">
              <!-- Colonne média -->
              <div class="calib-modal-media-col">
                <label class="lbl">Visual Benchmark</label>
                <div class="tabs" role="tablist">
                  <button type="button" class="tab ${draft.mode === 'photo' ? 'on' : ''}" id="modalTabPhoto">📷 Photo</button>
                  <button type="button" class="tab ${draft.mode === 'video' ? 'on' : ''}" id="modalTabVideo">🎬 Video</button>
                </div>
                <div class="media-box modal-media-box" id="modalMediaBox" style="height:125px;min-height:125px;">
                  ${mediaPreviewHtml}
                </div>
                <div class="media-actions" style="margin-top:6px;">
                  <label class="btn small mini">⬆ Upload
                    <input type="file" id="modalFileInput" hidden accept="${draft.mode === 'photo' ? 'image/*' : 'video/*'}">
                  </label>
                  ${hasMedia ? `<button type="button" class="btn small ghost mini" id="modalBtnClearMedia" title="Remove media">✕ Remove</button>` : ''}
                </div>
              </div>

              <!-- Colonne texte & prix -->
              <div class="calib-modal-text-col">
                <div class="form-field" style="flex:1;">
                  <label class="lbl">Visual Criteria <span style="color:#ef4444;">*</span></label>
                  <textarea id="modalRefDesc" rows="3" style="height:78px;min-height:70px;max-height:110px;resize:vertical;" placeholder="Describe color, luster, allowed imperfections, freshness, texture...">${esc(draft.desc)}</textarea>
                </div>
                <div class="form-field" style="margin-top:6px;">
                  <label class="lbl">Benchmark Tier Price <span style="color:#ef4444;">*</span></label>
                  <div class="price-field" style="display:inline-flex;align-items:center;gap:8px;">
                    <input type="number" min="0.01" step="0.01" id="modalRefPrice" class="price" value="${esc(draft.price)}" placeholder="0.00" style="width:105px;height:36px;padding:3px 8px;font-size:1.05rem;font-weight:800;border:2px solid var(--ink);border-radius:10px;background:#fff;box-shadow:2px 2px 0 var(--ink);">
                    <span style="font-size:.85rem;font-weight:800;background:var(--yellow);padding:3px 8px;border-radius:9px;border:1.5px solid var(--ink);box-shadow:1.5px 1.5px 0 var(--ink);white-space:nowrap;">€ / ${esc(state.unit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="calib-modal-footer">
            <button type="button" class="btn ghost" id="modalBtnCancel">✕ Cancel</button>
            <button type="button" class="btn primary" id="modalBtnSave">💾 Save Quality Tier</button>
          </div>
        </div>`;

      function captureFormInputs() {
        const t = $('#modalRefTitle')?.value;
        if (t !== undefined) draft.title = t.trim();
        const d = $('#modalRefDesc')?.value;
        if (d !== undefined) draft.desc = d.trim();
        const p = $('#modalRefPrice')?.value;
        if (p !== undefined) draft.price = p.trim();
      }

      // Handlers
      $('#btnCloseCalibEditModal').onclick = closeCalibEditModal;
      $('#modalBtnCancel').onclick = closeCalibEditModal;

      $('#modalTabPhoto').onclick = () => {
        captureFormInputs();
        draft.mode = 'photo';
        renderModalContent();
      };
      $('#modalTabVideo').onclick = () => {
        captureFormInputs();
        draft.mode = 'video';
        renderModalContent();
      };

      $('#modalFileInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        captureFormInputs();
        if (file.type.startsWith('video/')) {
          if (draft.video?.startsWith('blob:')) URL.revokeObjectURL(draft.video);
          draft.video = URL.createObjectURL(file);
          draft.mode = 'video';
          renderModalContent();
        } else if (file.type.startsWith('image/')) {
          try {
            draft.photo = await fileToDataUrl(file, 900);
            draft.mode = 'photo';
            renderModalContent();
          } catch {
            alert('Image illisible.');
          }
        }
      });

      $('#modalBtnClearMedia')?.addEventListener('click', () => {
        captureFormInputs();
        if (draft.mode === 'video') draft.video = null;
        else draft.photo = null;
        renderModalContent();
      });

      const modalBox = $('#modalMediaBox');
      if (modalBox) {
        enableDrop(modalBox, async (files) => {
          const file = files[0];
          if (!file) return;
          captureFormInputs();
          if (file.type.startsWith('video/')) {
            if (draft.video?.startsWith('blob:')) URL.revokeObjectURL(draft.video);
            draft.video = URL.createObjectURL(file);
            draft.mode = 'video';
            renderModalContent();
          } else if (file.type.startsWith('image/')) {
            try {
              draft.photo = await fileToDataUrl(file, 900);
              draft.mode = 'photo';
              renderModalContent();
            } catch {
              alert('Image illisible.');
            }
          }
        });
      }

      $('#modalBtnSave').onclick = () => {
        captureFormInputs();
        const titleVal = draft.title;
        const descVal = draft.desc;
        const priceNum = parseFloat(draft.price);
        const hasMedia = draft.mode === 'video' ? !!draft.video : !!draft.photo;

        const errors = [];
        if (!titleVal) {
          errors.push("Tier name is required.");
        }
        if (!descVal && !hasMedia) {
          errors.push("Provide visual criteria or upload a reference photo / video.");
        }
        if (isNaN(priceNum) || priceNum <= 0) {
          errors.push("Provide a valid benchmark price greater than 0.");
        }

        if (errors.length > 0) {
          const errBox = $('#modalRefErrors');
          if (errBox) {
            errBox.innerHTML = errors.map((err) => `<div>⚠️ ${err}</div>`).join('');
            errBox.classList.remove('hidden');
          } else {
            alert(errors.join('\n'));
          }
          return;
        }

        draft.title = titleVal;
        draft.desc = descVal || '';
        draft.price = priceNum;

        if (isNew) {
          const insertAt = Math.min(state.refList.length, (state.selectedCalibIdx ?? state.refList.length - 1) + 1);
          state.refList.splice(insertAt, 0, draft);
          state.selectedCalibIdx = insertAt;
        } else {
          state.refList[index] = draft;
        }

        syncRefs();
        dirty();
        saveCalib();
        closeCalibEditModal();
        render();
      };
    }

    modal.classList.remove('hidden');
    renderModalContent();
  }

  function closeCalibEditModal() {
    const modal = $('#calibEditModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.innerHTML = '';
    }
  }

  async function setRefFile(idxOrQ, f) {
    const r = typeof idxOrQ === 'number'
      ? state.refList[idxOrQ]
      : (state.refList?.find((x) => x.id === idxOrQ) || state.refs[idxOrQ]);
    if (!r) return;
    if (f.type.startsWith('video/')) {
      if (r.video?.startsWith('blob:')) URL.revokeObjectURL(r.video);
      r.video = URL.createObjectURL(f);
      r.mode = 'video';
    } else if (f.type.startsWith('image/')) {
      try {
        r.photo = await fileToDataUrl(f, 900);
        r.mode = 'photo';
      } catch {
        alert('Image illisible.');
      }
    }
    syncRefs();
    dirty();
    render();
  }

  function enableDrop(el, onFiles) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag'));
    el.addEventListener('drop', (e) => {
      e.preventDefault(); el.classList.remove('drag');
      if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
    });
  }

  /* ===== 3. Mon produit (2 Cartes Pleine Hauteur) ===== */
  function renderProduct() {
    const c = cat(), p = state.product;
    $('#screen').innerHTML = `
      <div class="product-grid">
        <!-- Carte 1 : Photos & Vidéos -->
        <div class="card form-card product-form-card product-media-card">
          <div class="form-lbl-row">
            <label class="lbl">📸 Photos & Videos <small>(${p.media.length}/${MAX_MEDIA})</small></label>
            <span class="sub-inline mini">Up to ${MAX_MEDIA} media files</span>
          </div>
          <div class="media-grid" id="mediaGrid">
            ${p.media.map((m, i) => `
              <div class="tile">
                ${m.type === 'video' ? `<video src="${m.url}" muted playsinline loop ${m.thumb ? `poster="${m.thumb}"` : ''}></video><span class="tile-tag">🎬</span>` : `<img src="${m.url}" alt="">`}
                <button class="tile-del" data-i="${i}" title="Retirer">✕</button>
              </div>`).join('')}
            ${p.media.length < MAX_MEDIA ? `
              <label class="tile add">＋<span>Photo / Video</span>
                <input type="file" hidden multiple accept="image/*,video/*" id="pFiles"></label>
              <label class="tile add cam">📸<span>Take Photo</span>
                <input type="file" hidden accept="image/*" capture="environment" id="pCam"></label>` : ''}
          </div>
          <p class="hint">💡 Photo & video supported · Drag & drop files or take a live photo.</p>
        </div>

        <!-- Carte 2 : Informations & Description -->
        <div class="card form-card product-form-card product-info-card">
          <div class="form-lbl-row" style="margin-bottom:2px;">
            <label class="lbl">📝 Listing Details</label>
            <span class="sub-inline mini">Title, quantity & description</span>
          </div>

          <div class="form-row-2">
            <div class="form-field flex-grow">
              <label class="lbl" for="pTitle">Listing Title</label>
              <input id="pTitle" maxlength="80" value="${esc(p.title)}" placeholder="ex: ${esc(c.name)} — fresh catch of the day">
            </div>
            <div class="form-field form-field-qty">
              <label class="lbl" for="pQty">Quantity (${esc(state.unit)})</label>
              <div class="price-field qty"><input id="pQty" type="number" min="0" step="0.01" value="${esc(p.qty)}"><span>${esc(state.unit)}</span></div>
            </div>
          </div>

          <div class="form-field desc-field">
            <label class="lbl" for="pDesc">Description</label>
            <textarea id="pDesc" placeholder="ex: fresh morning catch, firm shiny flesh, uniform caliber, pristine condition…">${esc(p.desc)}</textarea>
            <p class="hint">💡 Words like "fresh", "firm", "intact", "flawless", "blemished"… help AI evaluate quality.</p>
          </div>

          <!-- Option Produit Frais Périssable avec Prix PayPal Dynamique -->
          <div class="fresh-decay-card-box">
            <label class="fresh-checkbox-row" for="pIsFresh">
              <input type="checkbox" id="pIsFresh" ${p.isFresh ? 'checked' : ''}>
              <span class="fresh-check-text">
                <span class="fresh-title">⏱️ Fresh / Perishable Product (Live Quality & Dynamic PayPal Price)</span>
                <span class="fresh-desc">Enables automated time-decay pricing and real-time live updates of your PayPal checkout link & QR Code.</span>
              </span>
            </label>
            ${p.isFresh ? `
              <div class="fresh-decay-details">
                <div class="form-row-2">
                  <div class="form-field">
                    <label class="lbl" for="pDecayHours">⏳ Optimal Freshness Window</label>
                    <select id="pDecayHours" class="inp">
                      <option value="12" ${p.decayHours === 12 ? 'selected' : ''}>12h (Ultra-fresh daily catch / tide)</option>
                      <option value="24" ${p.decayHours === 24 || !p.decayHours ? 'selected' : ''}>24h (Standard day-fresh)</option>
                      <option value="48" ${p.decayHours === 48 ? 'selected' : ''}>48h (Truffles & wild mushrooms)</option>
                      <option value="72" ${p.decayHours === 72 ? 'selected' : ''}>72h (3 days)</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label class="lbl" for="pFloorPrice">🏷️ Guaranteed Floor Price (${esc(state.unit)})</label>
                    <div class="price-field"><input id="pFloorPrice" type="number" min="0" step="0.5" value="${p.floorPrice !== '' && p.floorPrice !== undefined ? p.floorPrice : Math.round((+state.refs.low.price || 10) * (+p.qty || 1))}"><span>€</span></div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>`;

    $('#pTitle').addEventListener('input', (e) => { p.title = e.target.value; updateNav(); });
    $('#pDesc').addEventListener('input', (e) => { p.desc = e.target.value; dirty(); });
    $('#pQty').addEventListener('input', (e) => { p.qty = e.target.value; dirty(); updateNav(); });
    $('#pIsFresh')?.addEventListener('change', (e) => {
      p.isFresh = e.target.checked;
      if (p.isFresh && (!p.floorPrice || +p.floorPrice <= 0)) {
        p.floorPrice = Math.round((+state.refs.low.price || 10) * (+p.qty || 1));
      }
      dirty();
      renderProduct();
    });
    $('#pDecayHours')?.addEventListener('change', (e) => {
      p.decayHours = +e.target.value;
      dirty();
    });
    $('#pFloorPrice')?.addEventListener('input', (e) => {
      p.floorPrice = e.target.value;
      dirty();
    });
    $('#pFiles')?.addEventListener('change', (e) => addProductFiles([...e.target.files]));
    $('#pCam')?.addEventListener('change', (e) => addProductFiles([...e.target.files]));
    $$('.tile-del').forEach((b) => b.addEventListener('click', () => {
      const [m] = p.media.splice(+b.dataset.i, 1);
      if (m?.url.startsWith('blob:')) URL.revokeObjectURL(m.url);
      dirty(); render();
    }));
    $$('.tile video').forEach((v) => { v.addEventListener('mouseenter', () => v.play()); v.addEventListener('mouseleave', () => v.pause()); });
    enableDrop($('#mediaGrid'), addProductFiles);
  }

  async function addProductFiles(files) {
    const p = state.product;
    for (const f of files) {
      if (p.media.length >= MAX_MEDIA) break;
      if (f.type.startsWith('image/')) {
        try { const url = await fileToDataUrl(f, 1000); p.media.push({ type: 'photo', url, thumb: url }); } catch { /* ignore */ }
      } else if (f.type.startsWith('video/')) {
        const url = URL.createObjectURL(f);
        let thumb = null;
        try { const v = await frameFromVideo(url); thumb = drawToDataUrl(v, v.videoWidth, v.videoHeight, 700); } catch { /* ignore */ }
        p.media.push({ type: 'video', url, thumb });
      }
    }
    dirty(); render();
  }

  /* ===== 4. Estimation IA ===== */
  function renderEstimate() {
    const e = state.estimate;
    const firstThumb = state.product.media.find((m) => m.thumb)?.thumb;
    if (!e) {
      $('#screen').innerHTML = `
        <div class="scan-dialog-backdrop">
          <div class="scan-dialog-box" role="dialog" aria-modal="true">
            <!-- Barre de titre de la boîte de dialogue -->
            <div class="scan-dialog-bar">
              <div class="scan-dialog-bar-left">
                <span class="dialog-dot red"></span>
                <span class="dialog-dot yellow"></span>
                <span class="dialog-dot green"></span>
                <span class="scan-dialog-title">🤖 AI Quality Appraisal</span>
              </div>
              <span class="scan-dialog-chip">Google Gemini Vision</span>
            </div>

            <!-- Corps de la boîte de dialogue -->
            <div class="scan-dialog-body">
              <div class="scan-dialog-media">
                <div class="scan-img">
                  ${firstThumb ? `<img src="${firstThumb}" alt="Produit">` : `<span class="emo">${cat().emoji}</span>`}
                  <div class="scan-line"></div>
                  <div class="scan-corner tl"></div>
                  <div class="scan-corner tr"></div>
                  <div class="scan-corner bl"></div>
                  <div class="scan-corner br"></div>
                </div>
              </div>

              <div class="scan-dialog-info">
                <div class="scan-live-badge">
                  <span class="pulse-dot"></span>
                  <span>Live multimodal scanning & AI comparison…</span>
                </div>

                <ul class="scan-steps">
                  <li>🎨 Color & luster analysis…</li>
                  <li>🔍 Texture, sharpness & flaw detection…</li>
                  <li>⚖️ Benchmarking against reference standards…</li>
                  <li>💶 Dynamic score & fair price calculation…</li>
                </ul>

                <div class="scan-progress-wrap">
                  <div class="scan-progress-track">
                    <div class="scan-progress-bar"></div>
                  </div>
                  <div class="scan-progress-label">
                    <span>Multimodal Calibration</span>
                    <span class="scan-percent">Appraising…</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pied de la boîte de dialogue -->
            <div class="scan-dialog-footer">
              <span class="scan-footer-hint">✨ Calibrated against your quality benchmark standards</span>
            </div>
          </div>
        </div>`;
      if (!state.analyzing) analyze();
      return;
    }

    const g = GRADES[e.grade];
    const reasons = [];
    if (e.geminiModelUsed) {
      reasons.push(`<li class="full" style="background:#e8fff7;border:2px solid var(--green)">🤖 <b>Google Gemini Vision (${esc(e.geminiModelUsed)}) Certified Appraisal</b> : ${esc(e.aiExplanation || 'Multimodal analysis of texture, luster, freshness and standard tier benchmarking.')}</li>`);
    }
    if (e.visual) {
      e.perFeat.filter((f) => f.v !== null).forEach((f) => {
        const pct = Math.round(f.v * 100);
        reasons.push(`<li><b>${f.name}</b><div class="mini-bar"><i style="width:${pct}%"></i></div><span>${pct}% towards top tier</span></li>`);
      });
    } else {
      reasons.push(`<li class="full">${e.refsOk ? 'Calibrated against benchmark standards' : 'Benchmarks fallback'} : score calculated from visual metrics and criteria.</li>`);
    }
    if (e.kw.pos.length) reasons.push(`<li class="full">✅ Positive quality terms detected: <b>${e.kw.pos.map(esc).join(', ')}</b></li>`);
    if (e.kw.neg.length) reasons.push(`<li class="full">⚠️ Flaw / risk indicators detected: <b>${e.kw.neg.map(esc).join(', ')}</b></li>`);
    reasons.push(`<li class="full">📷 ${e.n} product photo(s) benchmarked against calibration standards.</li>`);

    $('#screen').innerHTML = `
      <div class="estimate-grid">
        <!-- Carte 1 (Gauche) : Note, Score & Justification IA -->
        <div class="card estimate-card estimate-left-card g-${e.grade}">
          <div class="grade-banner">
            <div class="grade">${e.grade}</div>
            <div class="grade-info">
              <div class="score">${e.score}<small>/100</small></div>
              <div class="grade-lbl">${g.label}</div>
            </div>
            ${firstThumb ? `<div class="est-thumb"><img src="${firstThumb}" alt="Preview"></div>` : ''}
          </div>

          <div class="reasons-box">
            <h4>🧠 AI Appraisal Breakdown & Rationale</h4>
            <ul class="reasons">${reasons.join('')}</ul>
          </div>

          <div class="est-footer">
            <small class="muted">${e.geminiModelUsed ? `✨ Google Gemini (${esc(e.geminiModelUsed)})` : 'AI Certified.'}</small>
            <div class="est-actions">
              <button class="btn small ghost" id="reAnalyze">↻ Re-analyze</button>
            </div>
          </div>
        </div>

        <!-- Carte 2 (Droite) : Échelle & Prix final -->
        <div class="card estimate-card estimate-right-card">
          <div class="form-lbl-row">
            <label class="lbl">📈 Quality Scale Position</label>
            <span class="sub-inline mini">Tier Interpolation</span>
          </div>

          <div class="scale-box">
            <div class="scale">
              <div class="scale-bar"></div>
              <div class="marker" style="left:${e.t * 100}%">${firstThumb ? `<img src="${firstThumb}" alt="">` : cat().emoji}</div>
            </div>
            <div class="scale-legend"><span>★ Low · ${fmt(e.low)}</span><span>High ★★★★★ · ${fmt(e.high)}</span></div>
          </div>

          <div class="price-lines">
            <div><span>Calculated Unit Price</span><b>${fmt(round2(e.unitP))} / ${esc(state.unit)}</b></div>
            <div><span>Appraised Quantity</span><b>${esc(e.qty)} ${esc(state.unit)}</b></div>
            <div class="total"><span>Suggested Total</span><b>${fmt(round2(e.total))}</b></div>
          </div>

          <div class="final-price-box">
            <label class="lbl" for="finalPrice">Final Selling Price (Editable)</label>
            <div class="price-field big"><input id="finalPrice" type="number" min="0" step="0.01" value="${esc(state.finalPrice)}"><span>€</span></div>
          </div>
        </div>
      </div>`;

    $('#finalPrice').addEventListener('input', (ev) => { state.finalPrice = ev.target.value; updateNav(); });
    $('#reAnalyze').addEventListener('click', () => { dirty(); state.analyzing = false; render(); });
  }

  /* ===== 5. Publier, Diffuser (FB/IG/TikTok/WA…) & Imprimer ===== */
  function currentSale() {
    const c = cat(), e = state.estimate || { grade: 'B', score: 70 }, p = state.product;
    const baseP = round2(+state.finalPrice || 0);
    const floorP = +p.floorPrice || Math.round((+state.refs.low.price || 10) * (+p.qty || 1));
    return {
      id: state.editingId || state.published?.id || 'preview',
      catId: state.catId,
      title: p.title.trim() || defaultTitle(),
      category: c.name,
      emoji: c.emoji,
      color: c.color,
      grade: e.grade,
      score: e.score,
      price: baseP,
      basePrice: baseP,
      baseScore: e.score,
      floorPrice: floorP,
      isFresh: !!p.isFresh,
      decayHours: +p.decayHours || 24,
      simHours: +p.simHours || 0,
      qty: p.qty,
      unit: state.unit,
      desc: p.desc.trim(),
      paypal: state.sale.paypal.trim(),
      contact: state.sale.contact.trim(),
      lowPrice: +state.refs.low.price || 0,
      highPrice: +state.refs.high.price || 0,
      channels: [...state.channels],
    };
  }

  function socialCaption(s, netId) {
    const cur = computeDecayedSale(s);
    const link = paypalLink(cur, true);
    const freshNotice = cur.isFresh
      ? `\n⏱️ Active Freshness: ${cur.freshnessPercent}% (Live real-time dynamic decay pricing)`
      : '';
    const base = `${cur.emoji} ${cur.title} — ${fmt(cur.price)} (${cur.qty} ${cur.unit})${freshNotice}\n✨ AI Certified Quality: Grade ${cur.grade} (${GRADES[cur.grade]?.label || 'Certified'} · ${cur.score}/100)\n${cur.desc ? `📝 ${cur.desc}\n` : ''}${cur.contact ? `📍 ${cur.contact}\n` : ''}💳 Instant & Secure Checkout with PayPal: ${link}`;
    if (netId === 'instagram' || netId === 'tiktok') {
      return `${base}\n📱 Scan the PayPal QR Code on the image to buy instantly!\n#GradePay #PayPal #${cur.category.replace(/[^a-zA-Z0-9]/g, '')} #AICertified #DirectSale`;
    }
    return base;
  }

  function embedSnippet(s) {
    const link = paypalLink(s, true);
    return `<!-- GradePay + PayPal Embed Widget -->
<div style="border:3px solid #14121f;border-radius:18px;padding:16px;max-width:360px;font-family:sans-serif;background:#fff4dc;color:#14121f;box-shadow:5px 5px 0 #14121f;">
  <div style="font-weight:800;font-size:13px;">${s.emoji} ${esc(s.category)} · AI Grade ${s.grade} (${s.score}/100)</div>
  <h3 style="margin:6px 0;font-size:18px;">${esc(s.title)}</h3>
  <p style="font-size:13px;margin:4px 0 10px;">${esc(s.desc)}</p>
  <div style="font-size:24px;font-weight:800;margin-bottom:10px;">${fmt(s.price)} <small style="font-size:13px;">(${esc(s.qty)} ${esc(s.unit)})</small></div>
  <a href="${link}" target="_blank" style="display:block;text-align:center;background:#ffc439;color:#003087;padding:12px;border-radius:12px;border:2px solid #14121f;font-weight:800;text-decoration:none;">💳 Pay with PayPal</a>
</div>`;
  }

  function previewHtml(s, thumb) {
    const active = computeDecayedSale(s, state.product?.simHours ?? s.simHours ?? 0);
    const link = paypalLink(active, true);
    let displayTitle = esc(active.title || '');
    const catName = esc(active.category || '');
    if (displayTitle.toLowerCase().startsWith(catName.toLowerCase() + ' — ')) {
      displayTitle = displayTitle.slice(catName.length + 3);
    }
    const isDiscounted = active.isFresh && active.basePrice > active.price;

    return `
      <article class="card ticket" style="--c:${active.color}">
        <div class="ticket-img">${thumb ? `<img src="${thumb}" alt="">` : `<span class="emo">${active.emoji}</span>`}
          <span class="grade-badge g-${active.grade}" id="tkGradeBadge">${active.grade}</span>
          ${active.isFresh ? `<span class="ticket-fresh-pill ${active.freshnessPercent <= 50 ? 'warning' : ''}" id="tkFreshPill">⏱️ ${active.freshnessPercent}% Freshness</span>` : ''}
        </div>
        <div class="ticket-body">
          <div class="ticket-head-row">
            <span class="chip small" style="--c:${active.color}">${active.emoji} ${catName}</span>
            <span class="ticket-title">${displayTitle}</span>
          </div>
          <div class="ticket-price-row">
            <div class="sale-price" id="tkSalePrice">
              ${isDiscounted ? `<del class="ticket-old-price">${fmt(active.basePrice)}</del>` : ''}
              ${fmt(active.price)} <small>· ${esc(active.qty)} ${esc(active.unit)}</small>
            </div>
            <span class="ticket-grade-pill g-${active.grade}" id="tkGradePill">Grade ${active.grade} · ${active.score}/100</span>
          </div>
          ${active.desc ? `<p class="ticket-desc">${esc(active.desc)}</p>` : ''}
          ${active.contact ? `<div class="ticket-meta" id="tkContact">📍 ${esc(active.contact)}</div>` : ''}

          ${active.isFresh ? `
            <div class="fresh-decay-banner">
              <div class="fresh-decay-banner-head">
                <div class="fresh-decay-title">
                  <span class="fresh-pulse-dot"></span>
                  <b>⏱️ Real-Time Freshness Decay & Live PayPal Sync</b>
                  <span class="fresh-decay-badge" id="tkDecayBadge">${active.freshnessPercent}% freshness</span>
                </div>
                <span class="fresh-timer-text" id="tkTimerText">+${active.elapsedHours || 0}h elapsed</span>
              </div>
              <div class="fresh-decay-slider-row">
                <div style="display:flex;justify-content:space-between;">
                  <span>0h (100% fresh)</span>
                  <span>Max : ${active.maxHours || 24}h (${fmt(active.floorPrice)})</span>
                </div>
                <input type="range" id="decaySimSlider" min="0" max="${active.maxHours || 24}" step="0.5" value="${active.elapsedHours || 0}">
              </div>
              <div class="fresh-quick-btns">
                <button type="button" class="btn-decay-step ${active.elapsedHours === 0 ? 'active' : ''}" data-h="0">⚡ Fresh (0h)</button>
                <button type="button" class="btn-decay-step ${Math.round(active.elapsedHours) === Math.round((active.maxHours || 24) * 0.33) ? 'active' : ''}" data-h="${Math.round((active.maxHours || 24) * 0.33)}">+${Math.round((active.maxHours || 24) * 0.33)}h</button>
                <button type="button" class="btn-decay-step ${Math.round(active.elapsedHours) === Math.round((active.maxHours || 24) * 0.66) ? 'active' : ''}" data-h="${Math.round((active.maxHours || 24) * 0.66)}">+${Math.round((active.maxHours || 24) * 0.66)}h</button>
                <button type="button" class="btn-decay-step ${Math.round(active.elapsedHours) === (active.maxHours || 24) ? 'active' : ''}" data-h="${active.maxHours || 24}">⏳ End of Window</button>
              </div>
              <div class="fresh-sync-log" id="freshSyncLog">
                ✅ <b>PayPal Link & QR Code live-synced to ${fmt(active.price)}</b> (Grade ${active.grade} · ${active.score}/100)
              </div>
            </div>
          ` : ''}

          <div class="ticket-paypal-box">
            <div class="ticket-qr" id="tkQr">${makeQrSvg(link, 4, 1)}</div>
            <div class="ticket-paypal-cta">
              <a class="btn paypal full-w" id="tkPayBtn" href="${link}" target="_blank" rel="noopener">💳 Pay ${fmt(active.price)} with PayPal</a>
              <small class="qr-hint">📱 Scan QR code or click to pay with PayPal</small>
            </div>
          </div>
        </div>
      </article>`;
  }

  function buildPrintSheetHtml(s, thumb, format) {
    const link = paypalLink(s, true);
    if (format === 'label') {
      return `
        <div class="print-label-card">
          <div class="pl-top">
            <span class="pl-cat">${s.emoji} ${esc(s.category)}</span>
            <span class="pl-grade g-${s.grade}">AI GRADE ${s.grade} · ${s.score}/100</span>
          </div>
          <div class="pl-main">
            <div class="pl-info">
              <h2>${esc(s.title)}</h2>
              <div class="pl-price">${fmt(s.price)} <small>/ ${esc(s.qty)} ${esc(s.unit)}</small></div>
              ${s.contact ? `<div class="pl-meta">📍 ${esc(s.contact)}</div>` : ''}
              <div class="pl-pp-pill">💳 Instant PayPal Checkout</div>
            </div>
            <div class="pl-qr">
              ${makeQrSvg(link, 4, 1)}
              <span>SCAN & PAY PAL</span>
            </div>
          </div>
        </div>`;
    }
    if (format === 'sheet6') {
      const item = `
        <div class="sheet6-item">
          <div class="s6-head"><b>${s.emoji} ${esc(s.title)}</b><span class="s6-grade g-${s.grade}">${s.grade}</span></div>
          <div class="s6-body">
            <div>
              <div class="s6-price">${fmt(s.price)}</div>
              <small>${esc(s.qty)} ${esc(s.unit)} · IA ${s.score}/100</small>
              <div class="s6-pp">💳 PayPal QR</div>
            </div>
            <div class="s6-qr">${makeQrSvg(link, 3, 1)}</div>
          </div>
        </div>`;
      return `<div class="print-sheet6">${Array(6).fill(item).join('')}</div>`;
    }
    return `
      <div class="print-poster">
        <div class="pp-header" style="--c:${s.color}">
          <div>💸 <b>GradePay</b> · Official Sale Certificate & Poster</div>
          <span class="chip small" style="--c:${s.color}">${s.emoji} ${esc(s.category)}</span>
        </div>
        <div class="pp-hero">
          <div class="pp-img">
            ${thumb ? `<img src="${thumb}" alt="">` : `<span class="emo">${s.emoji}</span>`}
            <span class="grade-badge g-${s.grade}">${s.grade}</span>
          </div>
          <div class="pp-details">
            <h1>${esc(s.title)}</h1>
            <div class="pp-score">✨ AI Certified Quality: <b>Grade ${s.grade} (${GRADES[s.grade]?.label || 'Certified'}) · ${s.score}/100</b></div>
            ${s.desc ? `<p class="pp-desc">${esc(s.desc)}</p>` : ''}
            ${s.contact ? `<div class="pp-contact">📍 ${esc(s.contact)}</div>` : ''}
            <div class="pp-price-box">
              <div class="pp-price">${fmt(s.price)}</div>
              <div class="pp-qty">For ${esc(s.qty)} ${esc(s.unit)}</div>
            </div>
          </div>
        </div>
        <div class="pp-footer">
          <div class="pp-footer-txt">
            <h3>💳 Instant Checkout with PayPal</h3>
            <p>Open your smartphone camera or PayPal app and scan this QR code to complete payment in seconds.</p>
            <div class="pp-fake-btn">💳 Pay ${fmt(s.price)} with PayPal</div>
          </div>
          <div class="pp-qr-big">
            ${makeQrSvg(link, 5, 2)}
            <span>SCAN TO PAY</span>
          </div>
        </div>
      </div>`;
  }

  function renderPublishHub(s, thumb) {
    const link = paypalLink(s, true);
    const activeNet = SOCIAL_NETWORKS.find((n) => n.id === state.socialNet) || SOCIAL_NETWORKS[0];
    const caption = state.socialNet === 'embed' ? embedSnippet(s) : socialCaption(s, state.socialNet);

    return `
      <div class="card hub-card publish-right-card">
        <div class="publish-fields-row">
          <div class="form-field flex-grow">
            <label class="lbl" for="ppId">💳 PayPal Email or PayPal.me username</label>
            <input id="ppId" placeholder="seller@business.com  or  username" value="${esc(state.sale.paypal || s.paypal || '')}">
          </div>
          <div class="form-field form-field-contact">
            <label class="lbl" for="contact">📍 Location / Contact (optional)</label>
            <input id="contact" placeholder="ex: Harbor Dock #4 · +1 (555) 234-5678" value="${esc(state.sale.contact || s.contact || '')}">
          </div>
          <div class="mini-recap">
            <div><span>Price</span><b>${fmt(+state.finalPrice || s.price)}</b></div>
            <div><span>Grade</span><b>${s.grade} · ${s.score}/100</b></div>
          </div>
        </div>

        <div class="hub-tabs">
          <button class="hub-tab ${state.pubTab === 'social' ? 'on' : ''}" data-ptab="social">📱 Social Media</button>
          <button class="hub-tab ${state.pubTab === 'print' ? 'on' : ''}" data-ptab="print">🖨️ Print & QR Labels</button>
          <button class="hub-tab ${state.pubTab === 'paypal' ? 'on' : ''}" data-ptab="paypal">💳 PayPal Button & QR Code</button>
        </div>

        ${state.pubTab === 'social' ? `
          <div class="hub-body social-hub-body">
            <p class="hint" style="margin-bottom:8px">Choose a social platform to <b>preview and publish</b> your listing with its PayPal Button & QR Code:</p>
            <div class="social-cards-grid">
              ${SOCIAL_NETWORKS.map((n) => {
                const isShared = state.channels.includes(n.id);
                return `
                  <button type="button" class="social-card-btn ${isShared ? 'is-shared' : ''}" data-open-social="${n.id}" style="--sc:${n.color}">
                    <span class="sc-ico">${n.icon}</span>
                    <div class="sc-info">
                      <b class="sc-name">${n.name}</b>
                      <span class="sc-badge">${isShared ? '✅ Published' : n.badge}</span>
                    </div>
                    <span class="sc-arrow">→</span>
                  </button>`;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${state.pubTab === 'print' ? `
          <div class="hub-body print-hub-body">
            <p class="hint" style="margin-bottom:8px">Choose a format to open the <b>print dialog</b> with your scannable PayPal QR Code:</p>
            <div class="print-cards-grid">
              ${PRINT_FORMATS.map((f) => `
                <button type="button" class="print-card-btn" data-open-print="${f.id}" style="--pc:${f.color}">
                  <span class="pc-ico">${f.icon}</span>
                  <div class="pc-info">
                    <div class="pc-head">
                      <b class="pc-name">${f.name}</b>
                      <span class="pc-badge">${f.badge}</span>
                    </div>
                    <small class="pc-desc">${f.desc}</small>
                  </div>
                  <span class="pc-arrow">→</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${state.pubTab === 'paypal' ? `
          <div class="hub-body paypal-hub">
            <div class="qr-showcase card">
              <div class="qr-big-svg">${makeQrSvg(link, 5, 2)}</div>
              <b>Official PayPal QR Code</b>
              <small>${esc(s.title)} · ${fmt(s.price)}</small>
            </div>
            <div class="paypal-hub-actions">
              <h3>💳 Direct PayPal Checkout</h3>
              <p class="hint">Your buyers can scan this QR code with their mobile phone or click the PayPal button to pay <b>${fmt(s.price)}</b>.</p>
              <a class="btn paypal big full-w" href="${link}" target="_blank" rel="noopener">💳 Pay ${fmt(s.price)} with PayPal</a>
              <button class="btn full-w" id="btnDownloadQrPng">⬇ Download PayPal QR Code (PNG)</button>
              <button class="btn ghost full-w" id="btnCopyPayLink">📋 Copy PayPal Payment Link</button>
              <div class="pay-url-box">${esc(link)}</div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  function bindPublishHubEvents(getSale, thumb) {
    $$('[data-ptab]').forEach((b) => b.addEventListener('click', () => {
      state.pubTab = b.dataset.ptab;
      render();
    }));

    $$('[data-open-social]').forEach((b) => b.addEventListener('click', () => {
      openSocialModal(b.dataset.openSocial, getSale(), thumb);
    }));

    $$('[data-open-print]').forEach((b) => b.addEventListener('click', () => {
      openPrintModal(b.dataset.openPrint, getSale(), thumb);
    }));

    $('#btnDownloadQrPng')?.addEventListener('click', () => downloadQrPng(getSale()));

    $('#btnCopyPayLink')?.addEventListener('click', async (e) => {
      const link = paypalLink(getSale(), true);
      try { await navigator.clipboard.writeText(link); e.target.textContent = '✅ PayPal link copied!'; }
      catch { prompt('Copy this link:', link); }
    });
  }

  function openSocialModal(netId, s, thumb) {
    const modal = $('#socialModal');
    if (!modal) return;
    state.socialNet = netId;
    const n = SOCIAL_NETWORKS.find((x) => x.id === netId) || SOCIAL_NETWORKS[0];
    const link = paypalLink(s, true);
    const caption = netId === 'embed' ? embedSnippet(s) : socialCaption(s, netId);

    modal.innerHTML = `
      <div class="settings-modal social-modal" role="document">
        <div class="modal-header">
          <h2>${n.icon} Preview & Share · ${n.name}</h2>
          <button class="modal-close" id="btnCloseSocialModal" title="Close">✕</button>
        </div>
        <div class="social-modal-body">
          <div class="row-between social-modal-chips">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="chip" style="background:${n.color}22; border:1.5px solid var(--ink); font-weight:800;">
                ${n.icon} <b>${n.name}</b> · ${n.badge}
              </span>
              <span class="chip" style="background:#e8fff7; border:1.5px solid var(--ink); font-weight:700;">
                💳 PayPal Button & QR Included
              </span>
            </div>
            <span class="chip" style="background:var(--yellow); border:1.5px solid var(--ink); font-weight:800;">
              ${fmt(s.price)}
            </span>
          </div>

          <div class="social-modal-grid">
            <div class="social-modal-qr-side">
              <div class="modal-qr-card">
                <div class="modal-qr-svg">${makeQrSvg(link, 4, 1)}</div>
                <div class="modal-qr-info">
                  <b>QR Code PayPal</b>
                  <small>Scan to test or pay</small>
                </div>
              </div>
              <a class="btn paypal small full-w" href="${link}" target="_blank" rel="noopener">
                💳 Pay ${fmt(s.price)}
              </a>
            </div>

            <div class="social-modal-text-side">
              <label class="lbl" for="modalSocialCaption" style="font-size:.88rem; font-weight:800; margin:0 0 4px;">
                📝 Listing Text & Direct PayPal Link:
              </label>
              <textarea id="modalSocialCaption">${esc(caption)}</textarea>
            </div>
          </div>

          <div id="modalSocialFeedback" class="social-feedback hidden"></div>
        </div>
        <div class="modal-footer social-modal-footer">
          <button class="btn ghost" id="btnCloseSocialModalBottom">✕ Close</button>
          <div class="social-modal-actions">
            <button class="btn" id="btnModalCopyCaption">📋 Copy Text</button>
            ${netId !== 'whatsapp' && netId !== 'embed' ? `
              <button class="btn" id="btnModalDownloadImg">🖼️ PNG Card + QR</button>
            ` : ''}
            <button class="btn primary" id="btnModalPublishNow">🚀 Publish to ${n.name}</button>
          </div>
        </div>
      </div>`;

    modal.classList.remove('hidden');

    $('#btnCloseSocialModal').onclick = closeSocialModal;
    $('#btnCloseSocialModalBottom').onclick = closeSocialModal;

    $('#btnModalCopyCaption')?.addEventListener('click', async (e) => {
      const txt = $('#modalSocialCaption')?.value || '';
      try {
        await navigator.clipboard.writeText(txt);
        showModalFeedback('✅ Listing text and PayPal link copied to clipboard!');
      } catch {
        prompt('Copy this text:', txt);
      }
    });

    $('#btnModalDownloadImg')?.addEventListener('click', () => {
      downloadSocialCardPng(s, thumb, netId);
      markChannelPublished(netId, `✅ ${n.name} card downloaded!`);
      showModalFeedback(`✅ ${n.name} story card with PayPal QR downloaded!`);
      render();
    });

    $('#btnModalPublishNow')?.addEventListener('click', async () => {
      const txt = $('#modalSocialCaption')?.value || socialCaption(s, netId);
      try { await navigator.clipboard.writeText(txt); } catch { /* ignore */ }

      if (netId === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        markChannelPublished('facebook', '✅ Caption copied & Facebook opened!');
      } else if (netId === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        markChannelPublished('whatsapp', '✅ WhatsApp opened!');
      } else if (netId === 'x') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        markChannelPublished('x', '✅ Tweet with PayPal link ready!');
      } else if (netId === 'instagram') {
        await downloadSocialCardPng(s, thumb, 'instagram');
        window.open('https://www.instagram.com/', '_blank', 'noopener');
        markChannelPublished('instagram', '✅ Image downloaded & Instagram opened!');
      } else if (netId === 'tiktok') {
        await downloadSocialCardPng(s, thumb, 'tiktok');
        window.open('https://www.tiktok.com/upload', '_blank', 'noopener');
        markChannelPublished('tiktok', '✅ Image downloaded & TikTok opened!');
      } else if (netId === 'embed') {
        markChannelPublished('embed', '✅ HTML Embed Code copied!');
      }

      showModalFeedback(`🎉 Published to ${n.name}!`);
      render();
    });
  }

  function showModalFeedback(msg) {
    const fb = $('#modalSocialFeedback');
    if (fb) {
      fb.textContent = msg;
      fb.classList.remove('hidden');
    }
  }

  function closeSocialModal() {
    const modal = $('#socialModal');
    if (modal) modal.classList.add('hidden');
  }

  function openPrintModal(formatId, s, thumb) {
    const modal = $('#printModal');
    if (!modal) return;
    state.printFormat = formatId || state.printFormat || 'poster';
    const currentFmt = PRINT_FORMATS.find((f) => f.id === state.printFormat) || PRINT_FORMATS[0];

    modal.innerHTML = `
      <div class="settings-modal print-modal" role="document">
        <div class="modal-header">
          <h2>🖨️ Print & QR Labels · ${currentFmt.name}</h2>
          <button class="modal-close" id="btnClosePrintModal" title="Close">✕</button>
        </div>
        <div class="print-modal-body">
          <div class="print-modal-top-bar">
            <div class="print-fmt-tabs">
              ${PRINT_FORMATS.map((f) => `
                <button type="button" class="btn small ${f.id === state.printFormat ? 'primary' : 'ghost'}" data-modal-pfmt="${f.id}">
                  ${f.icon} ${f.name}
                </button>
              `).join('')}
            </div>
            <span class="chip" style="background:#e8fff7; border:1.5px solid var(--ink); font-weight:700;">
              💳 QR Code PayPal inclus
            </span>
          </div>

          <div class="print-modal-preview-zone">
            <div class="print-modal-sheet-wrap">
              ${buildPrintSheetHtml(s, thumb, state.printFormat)}
            </div>
          </div>

          <div class="print-modal-hint">
            💡 <b>Tip:</b> You can print directly to your physical printer or select <b>"Save as PDF"</b> to save your stickers & labels.
          </div>
        </div>
        <div class="modal-footer print-modal-footer">
          <button class="btn ghost" id="btnClosePrintModalBottom">✕ Close</button>
          <div class="print-modal-actions">
            <button class="btn paypal" id="btnModalPrintNow">🖨️ Print Now (${currentFmt.name})</button>
          </div>
        </div>
      </div>`;

    modal.classList.remove('hidden');

    $('#btnClosePrintModal').onclick = closePrintModal;
    $('#btnClosePrintModalBottom').onclick = closePrintModal;

    $$('[data-modal-pfmt]').forEach((b) => b.addEventListener('click', () => {
      openPrintModal(b.dataset.modalPfmt, s, thumb);
    }));

    $('#btnModalPrintNow')?.addEventListener('click', () => {
      $('#printArea').innerHTML = buildPrintSheetHtml(s, thumb, state.printFormat);
      window.print();
    });
  }

  function closePrintModal() {
    const modal = $('#printModal');
    if (modal) modal.classList.add('hidden');
  }

  function markChannelPublished(netId, msg) {
    if (!state.channels.includes(netId)) state.channels.push(netId);
    if (state.published) {
      state.published.channels = [...state.channels];
      const sales = loadSales().map((x) => (x.id === state.published.id ? state.published : x));
      try { saveSales(sales); } catch { /* ignore */ }
    }
    const fb = $('#socialFeedback');
    if (fb) {
      fb.textContent = msg;
      fb.classList.remove('hidden');
    }
  }

  function renderPublish() {
    const thumb = state.product.media.find((m) => m.thumb)?.thumb || state.published?.thumb;
    const isPub = !!state.published;
    const s = state.published || currentSale();

    if (!isPub && !state.sale.paypal) {
      state.sale.paypal = loadSettings().paypalAccount || '';
    }

    const link = paypalLink(s, true);

    $('#screen').innerHTML = `
      <div class="publish-grid ${isPub ? 'is-published' : ''}">
        <!-- Carte 1 (Gauche) : Listing Preview / Ticket PayPal -->
        <div class="card form-card publish-preview-card">
          <div class="form-lbl-row preview-lbl-row">
            <label class="lbl">🎟️ Listing Preview & Ticket</label>
            <span class="sub-inline mini">${isPub ? 'Live Listing' : 'PayPal Button & QR'}</span>
          </div>
          <div id="previewWrap" class="ticket-wrap">${previewHtml(s, s.thumb || thumb)}</div>
        </div>

        <!-- Carte 2 (Droite) : Configuration & Diffusion -->
        ${renderPublishHub(s, s.thumb || thumb)}
      </div>`;

    $('#ppId')?.addEventListener('input', (e) => {
      state.sale.paypal = e.target.value;
      if (state.published) {
        state.published.paypal = e.target.value;
        const sales = loadSales().map((x) => (x.id === state.published.id ? state.published : x));
        try { saveSales(sales); } catch { /* ignore */ }
      }
      const updated = state.published || currentSale();
      const l = paypalLink(updated, true);
      const qrEl = $('#tkQr');
      if (qrEl) qrEl.innerHTML = makeQrSvg(l, 3, 1);
      const payBtn = $('#tkPayBtn');
      if (payBtn) payBtn.href = l;
      const topPaypalBtn = $('#editBannerWrap .btn.paypal');
      if (topPaypalBtn) topPaypalBtn.href = l;
      if ($('#socialCaptionBox') && state.socialNet !== 'embed') {
        $('#socialCaptionBox').value = socialCaption(updated, state.socialNet);
      }
    });
    $('#contact')?.addEventListener('input', (e) => {
      state.sale.contact = e.target.value;
      if (state.published) {
        state.published.contact = e.target.value;
        const sales = loadSales().map((x) => (x.id === state.published.id ? state.published : x));
        try { saveSales(sales); } catch { /* ignore */ }
      }
      const cEl = $('#tkContact');
      if (cEl) cEl.textContent = e.target.value.trim() ? `📍 ${e.target.value.trim()}` : '';
    });

    // Contrôles interactifs de dégressivité fraîcheur & synchronisation PayPal
    function updateDecaySimulation(hours) {
      hours = Math.max(0, +hours || 0);
      state.product.simHours = hours;
      if (state.published) {
        state.published.simHours = hours;
        const curSales = loadSales().map((x) => (x.id === state.published.id ? { ...state.published, simHours: hours } : x));
        try { saveSales(curSales); } catch { /* ignore */ }
      }
      const rawSale = state.published || currentSale();
      const active = computeDecayedSale(rawSale, hours);
      const l = paypalLink(active, true);

      const qrEl = $('#tkQr');
      if (qrEl) qrEl.innerHTML = makeQrSvg(l, 4, 1);

      const payBtn = $('#tkPayBtn');
      if (payBtn) {
        payBtn.href = l;
        payBtn.textContent = `💳 Pay ${fmt(active.price)} with PayPal`;
      }
      const topPaypalBtn = $('#editBannerWrap .btn.paypal');
      if (topPaypalBtn) topPaypalBtn.href = l;

      const isDiscounted = active.isFresh && active.basePrice > active.price;
      const priceEl = $('#tkSalePrice');
      if (priceEl) {
        priceEl.innerHTML = `${isDiscounted ? `<del class="ticket-old-price">${fmt(active.basePrice)}</del>` : ''}${fmt(active.price)} <small>· ${esc(active.qty)} ${esc(active.unit)}</small>`;
      }

      const gradeBadge = $('#tkGradeBadge');
      if (gradeBadge) {
        gradeBadge.className = `grade-badge g-${active.grade}`;
        gradeBadge.textContent = active.grade;
      }

      const gradePill = $('#tkGradePill');
      if (gradePill) {
        gradePill.className = `ticket-grade-pill g-${active.grade}`;
        gradePill.textContent = `Grade ${active.grade} · ${active.score}/100`;
      }

      const freshPill = $('#tkFreshPill');
      if (freshPill) {
        freshPill.className = `ticket-fresh-pill ${active.freshnessPercent <= 50 ? 'warning' : ''}`;
        freshPill.textContent = `⏱️ ${active.freshnessPercent}% Freshness`;
      }

      const decayBadge = $('#tkDecayBadge');
      if (decayBadge) decayBadge.textContent = `${active.freshnessPercent}% freshness`;

      const timerText = $('#tkTimerText');
      if (timerText) timerText.textContent = `+${active.elapsedHours}h elapsed`;

      const slider = $('#decaySimSlider');
      if (slider && Math.abs(+slider.value - hours) > 0.1) slider.value = hours;

      $$('.btn-decay-step').forEach((btn) => {
        btn.classList.toggle('active', Math.abs(+btn.dataset.h - hours) < 0.2);
      });

      const syncLog = $('#freshSyncLog');
      if (syncLog) {
        syncLog.innerHTML = `✅ <b>PayPal Link & QR Code live-synced to ${fmt(active.price)}</b> (Grade ${active.grade} · ${active.score}/100)`;
        syncLog.classList.remove('flash');
        void syncLog.offsetWidth;
        syncLog.classList.add('flash');
      }

      if ($('#socialCaptionBox') && state.socialNet !== 'embed') {
        $('#socialCaptionBox').value = socialCaption(active, state.socialNet);
      }
    }

    $('#decaySimSlider')?.addEventListener('input', (e) => {
      updateDecaySimulation(+e.target.value);
    });

    $$('.btn-decay-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateDecaySimulation(+btn.dataset.h);
      });
    });

    bindPublishHubEvents(() => (state.published || currentSale()), thumb);
  }

  async function publish() {
    const btn = $('#btnNext'); btn.disabled = true; btn.textContent = 'Saving…';
    const m0 = state.product.media.find((m) => m.thumb);
    const thumbData = m0 ? await shrink(m0.thumb, 380) : null;
    const sales = loadSales();

    let sale;
    if (state.editingId) {
      const idx = sales.findIndex((x) => x.id === state.editingId);
      const prev = idx >= 0 ? sales[idx] : {};
      sale = {
        ...prev,
        ...currentSale(),
        id: state.editingId,
        date: prev.date || new Date().toISOString(),
        thumb: thumbData || prev.thumb || null,
      };
      if (idx >= 0) sales[idx] = sale;
      else sales.unshift(sale);
    } else {
      sale = {
        ...currentSale(),
        id: Date.now().toString(36),
        date: new Date().toISOString(),
        thumb: thumbData,
      };
      sales.unshift(sale);
    }

    try { saveSales(sales); }
    catch { sale.thumb = null; try { saveSales(sales); } catch { /* quota plein */ } }
    state.published = sale;
    state.step = 4;
    confetti(); render();
  }

  /* ---------- Modale Paramètres (2 Onglets : Gemini & PayPal) ---------- */
  function openSettingsModal(defaultTab = 'gemini') {
    if (typeof defaultTab !== 'string') defaultTab = 'gemini';
    const modal = $('#settingsModal');
    if (!modal) return;
    const cfg = loadSettings();
    const hasKey = !!cfg.geminiKey?.trim();
    const hasPaypal = !!cfg.paypalAccount?.trim();

    modal.innerHTML = `
      <div class="settings-modal" role="document">
        <div class="modal-header">
          <h2>⚙️ Settings & Connections</h2>
          <button class="modal-close" id="btnCloseSettings" title="Fermer">✕</button>
        </div>

        <!-- 2 Onglets pour éviter tout défilement vertical -->
        <div class="modal-tabs">
          <button type="button" class="modal-tab on" id="tabBtnGemini">🤖 Google Gemini AI</button>
          <button type="button" class="modal-tab" id="tabBtnPaypal">💳 PayPal Account</button>
        </div>

        <!-- Volet 1 : Google Gemini -->
        <div class="modal-pane settings-sec" id="paneGemini">
          <div class="settings-sec-title">
            <span>🤖 Google Gemini Model & Key</span>
            <span class="status-pill ${hasKey ? 'ok' : 'warn'}" id="statusGeminiPill">${hasKey ? 'Key Configured' : 'Offline Mode'}</span>
          </div>
          
          <label class="lbl" for="selGeminiModel">Google Gemini Model</label>
          <select id="selGeminiModel">
            <option value="gemini-3.8-flash" ${cfg.geminiModel === 'gemini-3.8-flash' || !cfg.geminiModel ? 'selected' : ''}>⚡ Gemini 3.8 Flash (Recommended • Google AI Studio • Ultra-Fast Vision)</option>
            <option value="local-sim" ${cfg.geminiModel === 'local-sim' ? 'selected' : ''}>💻 Local Offline Simulation (No API Key Required)</option>
          </select>

          <label class="lbl" for="inputGeminiKey">Google Gemini API Key</label>
          <div class="input-with-btn">
            <input type="password" id="inputGeminiKey" placeholder="AIzaSy..." value="${esc(cfg.geminiKey)}">
            <button class="btn small" type="button" id="btnToggleKeyVis" title="Toggle key visibility">👁️</button>
          </div>
          <div class="row-between" style="margin-top:2px;">
            <button class="btn small" type="button" id="btnTestGeminiKey">🧪 Test Key</button>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="hint" style="color:var(--blue);font-weight:700;">Get a free API key →</a>
          </div>
          <div id="testKeyFeedback" class="test-key-feedback hidden"></div>
        </div>

        <!-- Volet 2 : Compte Marchand PayPal -->
        <div class="modal-pane settings-sec hidden" id="panePaypal">
          <div class="settings-sec-title">
            <span>💳 PayPal Merchant Account</span>
            <span class="status-pill ${hasPaypal ? 'ok' : 'warn'}" id="statusPaypalPill">${hasPaypal ? 'Configured' : 'Optional'}</span>
          </div>
          <label class="lbl" for="inputPaypalDefault">Default PayPal Email or PayPal.me username</label>
          <input id="inputPaypalDefault" placeholder="seller@business.com  or  username" value="${esc(cfg.paypalAccount)}">
          <p class="hint">Automatically pre-filled for each listing to generate instant PayPal buttons and QR codes.</p>
          
          <label class="lbl" for="selDefaultCurrency">Default Currency</label>
          <select id="selDefaultCurrency" style="max-width:240px;">
            <option value="EUR" ${cfg.paypalCurrency === 'EUR' ? 'selected' : ''}>EUR (€) — Euro</option>
            <option value="USD" ${cfg.paypalCurrency === 'USD' ? 'selected' : ''}>USD ($) — Dollar US</option>
            <option value="CAD" ${cfg.paypalCurrency === 'CAD' ? 'selected' : ''}>CAD ($) — Dollar Canadien</option>
            <option value="GBP" ${cfg.paypalCurrency === 'GBP' ? 'selected' : ''}>GBP (£) — Livre Sterling</option>
            <option value="CHF" ${cfg.paypalCurrency === 'CHF' ? 'selected' : ''}>CHF — Franc Suisse</option>
          </select>
        </div>

        <!-- Actions Footer : Toujours visible sans défilement ni coupure -->
        <div class="modal-footer">
          <button class="btn ghost small" type="button" id="btnCancelSettings">Cancel</button>
          <button class="btn primary small" type="button" id="btnSaveSettings">💾 Save Settings</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    // Fermeture par clic sur le fond sombre (backdrop)
    modal.onclick = (e) => {
      if (e.target === modal) closeSettingsModal();
    };

    const tabGemini = $('#tabBtnGemini');
    const tabPaypal = $('#tabBtnPaypal');
    const paneGemini = $('#paneGemini');
    const panePaypal = $('#panePaypal');

    tabGemini.onclick = () => {
      tabGemini.classList.add('on');
      tabPaypal.classList.remove('on');
      paneGemini.classList.remove('hidden');
      panePaypal.classList.add('hidden');
    };

    tabPaypal.onclick = () => {
      tabPaypal.classList.add('on');
      tabGemini.classList.remove('on');
      panePaypal.classList.remove('hidden');
      paneGemini.classList.add('hidden');
    };

    if (defaultTab === 'paypal') {
      tabPaypal.onclick();
    } else {
      tabGemini.onclick();
    }

    $('#btnCloseSettings').onclick = closeSettingsModal;
    $('#btnCancelSettings').onclick = closeSettingsModal;

    const keyInp = $('#inputGeminiKey');
    $('#btnToggleKeyVis').onclick = () => {
      keyInp.type = keyInp.type === 'password' ? 'text' : 'password';
    };

    $('#btnTestGeminiKey').onclick = async () => {
      const btnTest = $('#btnTestGeminiKey');
      btnTest.disabled = true;
      btnTest.textContent = '⏳ Testing…';
      const fb = $('#testKeyFeedback');
      fb.classList.remove('hidden');
      fb.style.background = '#fff1c2';
      fb.textContent = '⏳ Connecting to Google AI Studio (please wait a few seconds)…';
      try {
        const res = await testGeminiApiKey(keyInp.value, $('#selGeminiModel').value);
        fb.style.background = res.ok ? (res.isTimeout || res.is503 ? '#fffbe6' : '#e8fff7') : '#ffe4f1';
        fb.textContent = res.msg;
        const pill = $('#statusGeminiPill');
        if (res.ok) {
          pill.className = 'status-pill ok';
          pill.textContent = res.isTimeout || res.is503 ? 'Key Recognized' : 'Key Validated';
        } else {
          pill.className = 'status-pill warn';
          pill.textContent = 'Key Error';
        }
      } finally {
        btnTest.disabled = false;
        btnTest.textContent = '🧪 Test Key';
      }
    };

    $('#btnSaveSettings').onclick = () => {
      const newCfg = {
        geminiModel: $('#selGeminiModel').value,
        geminiKey: keyInp.value.trim(),
        paypalAccount: $('#inputPaypalDefault').value.trim(),
        paypalCurrency: $('#selDefaultCurrency').value,
      };
      saveSettings(newCfg);
      closeSettingsModal();
      render();
    };
  }

  function closeSettingsModal() {
    const modal = $('#settingsModal');
    if (modal) modal.classList.add('hidden');
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsModal();
  });

  /* ---------- Confettis ---------- */
  function confetti() {
    const box = $('#confetti');
    const colors = ['#FFD23F', '#FF5DA2', '#3A86FF', '#06D6A0', '#FF8C42', '#8338EC'];
    for (let i = 0; i < 90; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.6 + 's';
      s.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(s);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4200);
  }

  /* ---------- Démarrage & Écouteurs globaux ---------- */
  $('#btnSettingsTop')?.addEventListener('click', openSettingsModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
      closeSocialModal();
      closePrintModal();
      closeCalibEditModal();
    }
  });
  $('#settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') closeSettingsModal();
  });
  $('#socialModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'socialModal') closeSocialModal();
  });
  $('#printModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'printModal') closePrintModal();
  });
  $('#calibEditModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'calibEditModal') closeCalibEditModal();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const qStep = urlParams.get('step');
  if (qStep !== null) {
    const sIdx = parseInt(qStep, 10);
    if (!isNaN(sIdx) && sIdx >= 0 && sIdx < STEPS.length) {
      state.catId = urlParams.get('cat') || 'poissons';
      prepareCalibration();
      if (!state.product.title) state.product.title = defaultTitle();
      state.step = sIdx;
    }
  }

  updateTopStatusTag();
  render();
})();
