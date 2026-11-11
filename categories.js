/* =========================================================================
   GradePay — Categories & Reference Calibration Standards
   -------------------------------------------------------------------------
   Products whose market value strongly depends on quality and freshness:
   evaluated against calibrated quality tiers (Grade S, Grade A/B, Grade C).
   ========================================================================= */

const UNITS = ['piece', 'kg', 'g', 'L', 'carat', 'lot', 'dozen'];

const MOCKUP_OVERRIDES = {
  poissons: {
    high: 'assets/calibration_images/Fish/poisson_thon_grade_s_otoro.jpg',
    mid:  'assets/calibration_images/Fish/poisson_thon_grade_a_akami.jpg',
    low:  'assets/calibration_images/Fish/poisson_thon_grade_c_rebut.jpg',
  },
  truffes: {
    high: 'assets/calibration_images/Truffle/truffe_noire_grade_s_extra.jpg',
    mid:  'assets/calibration_images/Truffle/truffe_noire_grade_a_standard.jpg',
    low:  'assets/calibration_images/Truffle/truffe_noire_grade_c_rebut.jpg',
  },
  roches: {
    high: 'assets/calibration_images/Jade/jade_imperial_grade_s_pur.jpg',
    mid:  'assets/calibration_images/Jade/jade_imperial_grade_a_icy.jpg',
    low:  'assets/calibration_images/Jade/jade_imperial_grade_c_rebut.jpg',
  },
  pierres: {
    high: 'assets/calibration_images/Jade/jade_imperial_grade_s_pur.jpg',
    mid:  'assets/calibration_images/Jade/jade_imperial_grade_a_icy.jpg',
    low:  'assets/calibration_images/Jade/jade_imperial_grade_c_rebut.jpg',
  },
};

const FAMILIES = [
  { id: 'mer', name: 'Fishery & Ocean', emoji: '🌊', color: '#e0f2fe', borderColor: '#0284c7' },
  { id: 'mineraux', name: 'Minerals & Gems', emoji: '💎', color: '#f3e8ff', borderColor: '#9333ea' },
  { id: 'foret', name: 'Foraging & Forest', emoji: '🍄', color: '#fef3c7', borderColor: '#d97706' },
  { id: 'terroir', name: 'Harvest & Farm Goods', emoji: '🌿', color: '#dcfce7', borderColor: '#16a34a' },
];

const CATEGORIES = [
  /* --- 🌊 Fishery & Ocean --- */
  { id: 'poissons', family: 'mer', name: 'Wild Fish', emoji: '🐟', unit: 'kg', color: '#3A86FF',
    low:  { price: 6,  desc: 'Dull eye, damaged scales, softer flesh, caught over 48h ago.' },
    high: { price: 35, desc: 'Clear bright eye, vivid red gills, firm sashimi-grade flesh, fresh daily catch.' } },

  { id: 'fruits-de-mer', family: 'mer', name: 'Shellfish & Seafood', emoji: '🦞', unit: 'kg', color: '#FF4D4D',
    low:  { price: 12, desc: 'Dull shell, low vitality, small size, missing limbs.' },
    high: { price: 70, desc: 'Lively and vigorous, shiny shell, large caliber, intact.' } },

  { id: 'perles', family: 'mer', name: 'Pearls & Shells', emoji: '🦪', unit: 'piece', color: '#F15BB5',
    low:  { price: 15,  desc: 'Irregular shape, low luster, surface blemishes.' },
    high: { price: 320, desc: 'Round, mirror luster, flawless clean surface, rare diameter.' } },

  /* --- 💎 Minerals & Geology --- */
  { id: 'roches', family: 'mineraux', name: 'Rocks & Minerals', emoji: '⛏️', unit: 'piece', color: '#A78BFA',
    low:  { price: 10,  desc: 'Common stone, matte surface, small fractures, faint crystallization.' },
    high: { price: 180, desc: 'Rare specimen, sharp shiny crystals, vivid deep color, zero cracks.' } },

  { id: 'pierres', family: 'mineraux', name: 'Gemstones', emoji: '💎', unit: 'carat', color: '#00BBF9',
    low:  { price: 20,  desc: 'Visible inclusions, pale saturation, rough cut.' },
    high: { price: 450, desc: 'High clarity, intense saturation, precision cut, brilliant fire.' } },

  { id: 'fossiles', family: 'mineraux', name: 'Fossils & Meteorites', emoji: '🐚', unit: 'piece', color: '#E9C46A',
    low:  { price: 20,  desc: 'Incomplete fragment, eroded details, damaged matrix.' },
    high: { price: 600, desc: 'Complete specimen, razor-sharp anatomical details, museum prep.' } },

  /* --- 🍄 Foraging & Forest --- */
  { id: 'truffes', family: 'foret', name: 'Truffles', emoji: '🌰', unit: 'kg', color: '#8D6E63',
    low:  { price: 250,  desc: 'Small, irregular shape, weak aroma, minor notches or bug marks.' },
    high: { price: 1400, desc: 'Large, firm round shape, dense pyramid peridium, intense earthy aroma, rich white marbling.' } },

  { id: 'champignons', family: 'foret', name: 'Wild Mushrooms', emoji: '🍄', unit: 'kg', color: '#FF8C42',
    low:  { price: 12, desc: 'Damaged caps, soft or worm-marked stems, picked over 2 days ago.' },
    high: { price: 60, desc: 'Firm porcini/morels, intact caps, pristine white stems, morning harvest.' } },

  { id: 'bois', family: 'foret', name: 'Precious Wood', emoji: '🌳', unit: 'piece', color: '#A0522D',
    low:  { price: 15,  desc: 'Split wood, numerous knots, dull grain.' },
    high: { price: 280, desc: 'Rare burl or fiddleback, dramatic figure, dry seasoned heartwood.' } },

  /* --- 🌿 Harvest & Specialty Food --- */
  { id: 'miel', family: 'terroir', name: 'Artisan Honey', emoji: '🍯', unit: 'kg', color: '#FFB703',
    low:  { price: 8,  desc: 'Blended polyfloral, uneven crystallization, cloudy hue.' },
    high: { price: 45, desc: 'Rare single-origin cru (jujube, thyme), crystal clear, intense bouquet.' } },

  { id: 'safran', family: 'terroir', name: 'Pure Saffron', emoji: '🌸', unit: 'g', color: '#C77DFF',
    low:  { price: 3,  desc: 'Broken filaments, mixed yellow styles, pale red color.' },
    high: { price: 25, desc: 'Whole deep red sargol stigmas, zero yellow style, intense floral aroma.' } },

  { id: 'dattes', family: 'terroir', name: 'Premium Dates', emoji: '🌴', unit: 'kg', color: '#B5651D',
    low:  { price: 3,  desc: 'Dry skin, detached peel, small size, surface spotting.' },
    high: { price: 18, desc: 'Plump Medjool/Deglet Nour, translucent golden glow, tender caramel texture.' } },

  { id: 'huile', family: 'terroir', name: 'Extra Virgin Olive Oil', emoji: '🌿', unit: 'L', color: '#7CB518',
    low:  { price: 6,  desc: 'Virgin oil, flat aroma, dull color, older harvest.' },
    high: { price: 28, desc: 'Cold-pressed extra virgin, intense green fruitiness, current year crop.' } },

  { id: 'fruits', family: 'terroir', name: 'Seasonal Fruits', emoji: '🍓', unit: 'kg', color: '#EF476F',
    low:  { price: 2,  desc: 'Small, bruised or overripe, uneven sizing.' },
    high: { price: 14, desc: 'Graded caliber, vibrant color, firm, vine-ripened tree harvest.' } },

  { id: 'cafe', family: 'terroir', name: 'Specialty Coffee & Cocoa', emoji: '☕', unit: 'kg', color: '#6F4E37',
    low:  { price: 8,  desc: 'Broken beans, uneven color, multiple defect points.' },
    high: { price: 55, desc: 'Homogeneous whole specialty beans, single-estate, zero defects.' } },
];

/* -------------------------------------------------------------------------
   Génération d'images mockup (SVG) — temporaires, en attendant les vraies.
   - Moindre qualité : couleurs ternes, flou, taches
   - Haute qualité   : couleurs éclatantes, nettes, étincelles
   ------------------------------------------------------------------------- */
function makeMockup(cat, quality) {
  const hi = quality === 'high';
  const c = cat.color;

  const bg = hi
    ? `<radialGradient id="g" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="${c}"/><stop offset="1" stop-color="#1d1840"/></radialGradient>`
    : `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6d0c6"/><stop offset="1" stop-color="#8e877d"/></linearGradient>`;

  const filter = hi
    ? `<filter id="f"><feColorMatrix type="saturate" values="1.5"/></filter>`
    : `<filter id="f"><feColorMatrix type="saturate" values="0.12"/><feGaussianBlur stdDeviation="2.4"/></filter>`;

  const sparkles = hi
    ? [[90, 90, 1], [500, 80, .8], [520, 300, 1.1], [70, 320, .7], [300, 50, .6]]
        .map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -26 L7 -7 L26 0 L7 7 L0 26 L-7 7 L-26 0 L-7 -7Z" fill="#FFE45E" stroke="#14121f" stroke-width="3"/>`).join('')
    : [[240, 190, 18], [350, 250, 13], [290, 290, 10], [210, 260, 8], [380, 175, 9]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4a3b2a" opacity=".55"/>`).join('') +
      `<path d="M190 140 L230 200 L215 240" stroke="#3b3128" stroke-width="4" fill="none" opacity=".5"/>`;

  const label = hi ? 'TOP QUALITY ★★★★★' : 'LOWER QUALITY ★☆☆☆☆';
  const labelBg = hi ? '#06D6A0' : '#FF8C42';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <defs>${bg}${filter}</defs>
  <rect width="600" height="450" fill="url(#g)"/>
  <ellipse cx="300" cy="345" rx="170" ry="22" fill="#000" opacity="${hi ? .25 : .15}"/>
  <text x="300" y="300" font-size="${hi ? 230 : 190}" text-anchor="middle" filter="url(#f)">${cat.emoji}</text>
  ${sparkles}
  <rect x="110" y="380" width="380" height="50" rx="14" fill="${labelBg}" stroke="#14121f" stroke-width="4"/>
  <text x="300" y="413" font-family="Arial, sans-serif" font-weight="800" font-size="22" fill="#14121f" text-anchor="middle">${label}</text>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Renvoie l'image de référence proposée (override réel si déclaré, sinon mockup). */
function getReferenceImage(cat, quality) {
  return (MOCKUP_OVERRIDES[cat.id] && MOCKUP_OVERRIDES[cat.id][quality]) || makeMockup(cat, quality);
}
