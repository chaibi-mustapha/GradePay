# 💸 GradePay — Smart Quality Grading & Dynamic PayPal Payments

> **PayPal AI Hackathon 2026** Project  
> AI-powered quality grading that automatically calculates fair prices and generates dynamic PayPal checkout buttons & QR codes in real-time.

100% Client-Side Pure Web App: **No complex build steps, zero server dependencies, instant offline & online execution**.

---

## 🚀 Quick Start & How to Run

### Option 1: Double-click launcher (Windows)
Double-click `lancer.cmd` — it will start the local server and automatically open `http://localhost:5500` in your browser.

### Option 2: Node.js static server
```bash
cd "Projet 2"
node serveur.js
```
Open **`http://localhost:5500`** in any modern web browser.

### Option 3: Direct browser opening
Open `index.html` directly in your favorite browser (Chrome, Edge, Firefox, Safari).

---

## 🌟 What GradePay Solves

In agricultural markets, fisheries, artisanal foraging (truffles, wild mushrooms, honey), and raw gemstone trading, **quality fluctuates widely from item to item**:
- A Grade S Bluefin Tuna loin or Périgord Black Truffle is worth 10× more than a blemished or lower-grade one.
- In addition, fresh perishable goods lose value over time if not sold promptly.
- Sellers often lack objective grading tools and must manually create payment links for fluctuating prices.

**GradePay bridges vision AI and payments**:
1. **Multimodal Calibration**: Sellers define their benchmark tiers (Top Grade S, Standard Grade A/B, Lower Grade C) with reference photos and target prices.
2. **Google Gemini Multimodal Vision AI**: Automatically analyzes seller's product photos/videos, detecting color, luster, texture, freshness, and defects against benchmark standards to produce a certified grade (`S`, `A`, `B`, `C`) and score (/100).
3. **Dynamic Fair Pricing Engine**: Interpolates fair market price across calibration tiers based on the AI quality score.
4. **Time-Decay Engine & Live PayPal Sync**: For fresh perishables, prices automatically decay across a defined freshness window (e.g. 12h, 24h, 48h) to prevent food waste, while **live-syncing the PayPal payload, direct payment URL, and high-contrast SVG QR Code in real time**.
5. **Multi-Channel Instant Checkout**:
   - **One-click PayPal payment button** with pre-filled dynamic amount.
   - **Live scannable PayPal QR Code** for frictionless contactless mobile checkout.
   - **Social Story cards with embedded PayPal QR** for Facebook, Instagram, TikTok, WhatsApp, X.
   - **Print-ready Point-of-Sale (POS) assets**: A4 Stand Posters, Shelf & Crate Labels, and Sheets of 6 ready-to-cut QR stickers.

---

## 🧭 Application Flow

| # | Screen | Description |
|---|--------|-------------|
| **0** | **Home Dashboard** | Neo-brutalist split-screen: Left hero with direct listing creation; right interactive toolbar with published listings, live freshness status, and single-click edit / share / print actions. |
| **1** | **Category Selection** | 15+ curated trade categories organized by families (Terroir & Foraging, Seafood & Fishing, Minerals & Gems, Crafts & Luxury) + **Custom Product Modal** with custom selling unit (kg, g, piece, carat, liter, dozen). |
| **2** | **Calibration Standards** | Clean 3-tier benchmark scale (Top Grade S, Standard Grade A/B, Lower Grade C) with drag-and-drop reordering, reference photos/videos, visual criteria, and unit prices. |
| **3** | **Product Input** | Multi-media upload (photos & videos) with camera support, descriptions, quantities, and optional **Fresh / Perishable Decay toggle** with customizable freshness window and guaranteed floor price. |
| **4** | **AI Appraisal** | Interactive modal scanning dialog followed by certified Grade banner, detailed AI breakdown with visual attribute bars (Color, Luster, Texture, Morphological Integrity), quality scale marker, and editable final price. |
| **5** | **Publish & POS Hub** | Dynamic ticket preview with live freshness simulation slider, instant PayPal checkout button, SVG QR Code, social sharing tabs, and printable marketing materials. |

---

## ⚙️ Configuration & Settings

Click the **`⚙️ Settings`** button (or the top navigation chip) to configure:

### 1. 🤖 Google Gemini AI
- **Model Choice**:
  - `gemini-3.8-flash` *(Recommended: Ultra-fast multimodal vision via Google AI Studio)*
  - `local-sim` *(Offline fallback simulation requiring no API key)*
- **API Key**: Enter your key from [Google AI Studio](https://aistudio.google.com/app/apikey) with built-in `🧪 Test Key` button.

### 2. 💳 PayPal Merchant Settings
- **PayPal Account**: Enter your business email (e.g., `seller@business.com`) or `PayPal.me` handle.
- **Default Currency**: `EUR` (€), `USD` ($), `CAD` ($), `GBP` (£), or `CHF`.

---

## 📦 Project Structure

```
Projet 2/
├── index.html          # Clean semantic HTML5 structure with neo-brutalist UI
├── styles.css          # Fully responsive neo-brutalist styling (v4.0)
├── app.js              # Core application logic, Vision AI, PayPal payload & QR generator
├── categories.js       # Curated trading categories, benchmark units & descriptions
├── serveur.js          # Lightweight local zero-dependency Node.js HTTP server
├── lancer.cmd          # 1-click launcher for Windows
├── assets/
│   ├── calibration_images/  # HD benchmark calibration reference photos
│   ├── product_images/    # HD sample product photos (Jade, Truffle, Bluefin Tuna)
│   └── videos/             # Video sample files
└── lib/
    └── qrcode.min.js   # Client-side QR Code SVG generator
```

---

## 🛡️ License

MIT License — Built for the PayPal AI Hackathon 2026.
