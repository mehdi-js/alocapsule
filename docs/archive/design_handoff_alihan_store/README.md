> ⚠️ مربوط به علی حان — برای الو کپسول اعمال نشود.

# Handoff: Alihan Baklava Storefront (علی‌حان)

## Overview
A Persian (RTL) e-commerce storefront for **Alihan**, a premium Turkish baklava brand. Scope: 5 desktop pages + 4 mobile screens:

1. Desktop – Home (`/`)
2. Desktop – Shop / product listing (`/shop`)
3. Desktop – Product detail (`/product/[slug]`)
4. Desktop – Cart (`/cart`)
5. Desktop – About us (`/about`)
6. Mobile – Home, Product detail, Open hamburger menu, Cart

## About the Design Files
The files in this bundle are **design references built in HTML**. They're prototypes that show the intended look and behavior. They are **not production code to copy directly**. Rebuild them in the target codebase using its own patterns. The recommended stack, if nothing exists yet: **Next.js (App Router) + TypeScript + Tailwind CSS v4**, with data coming from the user's backend API.

To view: open `Alihan Website.dc.html` in a browser, with `support.js` and `ProductCard.dc.html` in the same folder. Every screen sits on one long canvas. Styles are inline, so read exact values straight from the markup.

## Fidelity
**High-fidelity.** Colors, type scale, spacing, radii and copy are final. Recreate them pixel-accurately.
**Exceptions:**
- **All images are placeholders.** They are grey boxes labelled with the recommended source size (for example `1400 × 520`). Replace them with real `next/image` assets. The client will supply photos.
- **The logo is temporary.** It's the wordmark «علی‌حان» next to a green double-arc SVG. Swap it for the final logo file when it's delivered. Keep it as a `<Logo />` component so the swap is one change.

## Global Rules
- `<html lang="fa" dir="rtl">`. Every layout is RTL: the start is on the right. Arrow icons point left for "forward/next".
- Show numbers in **Persian digits** (۰۱۲۳۴۵۶۷۸۹) with a comma thousands separator, for example `۲,۴۰۰,۰۰۰`. The currency label is «تومان», smaller and muted, after the number. Use a helper `formatToman(n)`: `n.toLocaleString('en-US')`, then map digits to Persian.
- Font: **Vazirmatn**, loaded via `next/font/local` (woff2, weights 400/500/600/700/800). Fallback: `Tahoma, system-ui, sans-serif`. The prototype uses the system font because no font file was supplied.
- Emails, phone numbers in LTR contexts, and SKU codes use `dir="ltr"`.
- Breakpoints: mobile ≤ 767 (designed at 390), tablet 768–1279, desktop ≥ 1280 (designed at 1440, content max-width ≈ 1400).

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `page` | `#071009` | outer page background (behind frame) |
| `canvas` | `#0B1F16` | main site background |
| `panel` | `#0F2A1D` | section panels, footer, accordion items, summary boxes |
| `card` | `#12301F` | product cards, icon buttons, inputs, stepper track |
| `placeholder` | `#2B342E` + `1px dashed rgba(245,240,232,.22)` | image placeholders |
| `action` | `#2FA84F` | primary buttons, active pills, price highlight, active nav underline, icons |
| `action-hover` | `#38BD5C` | |
| `action-ink` | `#08200F` | text/icons on `action` bg |
| `action-deep` | `#22713A` (hover `#2A8546`) | large hero/banner CTA on photography |
| `gold` | `#C9A876` (hover `#DBBC8C`) | eyebrows, section labels, badges, cart count, decorative lines, footer headings, secondary icon strokes |
| `ink` | `#F5F0E8` | primary text |
| `ink-2` | `#B4BFB8` | body paragraphs on dark |
| `muted` | `#94A29A` | secondary text, inactive nav |
| `faint` | `#6F7D74` | breadcrumbs, meta, copyright |
| `border-gold` | `rgba(201,168,118,.12–.30)` | hairlines (`.12–.16`), control borders (`.20–.30`), outline buttons (`.45`) |

Hero/banner overlay (on photo), RTL so text is on the right:
`linear-gradient(270deg, rgba(7,16,9,.97) 6%, rgba(7,16,9,.86) 34%, rgba(7,16,9,.1) 66%)`.
Mobile hero uses a bottom-up version: `linear-gradient(0deg, rgba(7,16,9,.97) 12%, rgba(7,16,9,.7) 46%, transparent 78%)`.

### Typography (Vazirmatn)
| Role | Size / weight / line-height |
|---|---|
| Hero H1 desktop | 64 / 800 / 1.16, letter-spacing −0.02em |
| Page H1 (shop, product) | 36 / 800 |
| Banner H2 | 42 / 800 / 1.35 |
| Section H2 | 34–38 / 800 |
| Sub-section H2 | 26–32 / 800 |
| Card title | 18 / 700 |
| Body large | 16–17 / 400 / 2.0–2.1 |
| Body | 14–15 / 400 / 2.0 |
| Caption / meta | 12–13 |
| Eyebrow | 14–15, color gold (or action on hero) |
| Button | 15–17 / 700–800 |
| Mobile hero H1 | 30 / 800 / 1.25 |

### Radius
card 24 · panel 22–30 · image placeholders 18–22 · thumbnails 14 · pills/buttons/inputs 999 (fully rounded) · checkbox 5.

### Spacing
Desktop page gutter 44px (header/content), with full-bleed-ish panels inset 20px from the frame. Section gap 24–52px. Card padding 14/18. Panel padding 24–36. Grid gaps 20. Mobile gutter 20px, gaps 12–18.

### Shadows
Primary CTA: `0 20px 44px -24px rgba(47,168,79,.8)`. Frame/elevated: `0 40px 90px -44px #000`. Otherwise flat. Depth comes from the panel/card color steps.

### Decorative ornament
Thin concentric partial arcs (green `#2FA84F` 1.3px + gold `#C9A876` 1px, `stroke-dasharray` for open arcs) at 50–65% opacity, placed in hero corners. They echo the logo arcs. Treat them as optional (a `showOrnaments` flag).

## Shared Components

**TopNav (desktop):** height ≈ 74, padding 16/44, bottom hairline `rgba(201,168,118,.12)`. Right: logo (32px arc + 24/800 wordmark). Center: links «صفحه اصلی، فروشگاه، آدرس شعب، وبلاگ، درباره ما، تماس با ما» (15px, muted). The active link is ink/700 with a 2px `action` bottom border and 5px padding-bottom. Left: three 42px round icon buttons (search, cart, account): bg `card`, border `rgba(201,168,118,.2)`, hover border `.55`. The cart shows a gold 20px count badge at the top-left, with dark 11/800 text.

**ProductCard** (`ProductCard.dc.html`): bg `card`, 1px gold border `.16`, radius 24, padding 14/14/18, gap 14. Image placeholder 186px high (square source 640×640, radius 18). Optional badge at the top-right (gold pill, 11/800: «پرفروش»، «جدید»). Title 18/700 ink, description 12/1.8 muted. Footer row: price 17/700 + «تومان» 12 muted, and a 42px round `action` "+" button (adds to cart). On mobile it's the same card in a 2-column grid.

**TrustBar:** a panel with 3 equal columns and gold hairline dividers. Each column: a 48px round `card` icon disc (green stroke icon) + title 16/700 + subtitle 13 muted.
Items: «تضمین کیفیت / با بهترین مواد اولیه», «ارسال سریع / به سراسر کشور», «بسته‌بندی لوکس / مناسب هدیه دادن». Mobile: 3 small stacked tiles (icon above an 11px label).

**Buttons:** Primary = `action` bg, `action-ink` text, pill, padding 15–17 / 26–30. Secondary = transparent with a gold `.45` border and a gold arrow. Link = gold text + gold arrow.

**VariantPicker (weight):** pills «۵۰۰ گرم، ۱ کیلوگرم، ۲ کیلوگرم». Active: `action` bg, 700. Inactive: transparent, `ink-2` text, gold `.3` border. Padding 12/20.

**QtyStepper:** a pill track (`card` bg, gold `.22` border, padding 6–8) holding round 30–34px −/+ buttons (bg `canvas`, hover `#183C27`) and a centered bold count. Range 1–20.

**Accordion:** panel items, radius 18, padding 18/22. Header = full-width button, 16/700, gold chevron. Body = 14/2.1 `ink-2`. One item open at a time. "Description" is open by default.

**Footer:** `panel` bg, top gold hairline, padding 48/44/24. Four columns (1.1 / .7 / 1 / 1.1fr):
- Brand: logo, tagline «باقلوا، یک دنیا طعم», 3 social circles (Instagram, Telegram, WhatsApp).
- Quick links.
- Contact: phone, email (LTR), address.
- Newsletter: a pill input with an `action` «ثبت» button.

Then a copyright line at 13px faint: «© ۲۰۲۵ علی‌حان. تمامی حقوق محفوظ است.»

**BottomTabBar (mobile):** fixed, bg `rgba(9,22,14,.96)`, top gold hairline, padding 10/16/26 (safe-area). Four tabs: «خانه، فروشگاه، علاقه‌مندی، حساب من». Icon 21 + label 10. Active = `action` color. Tab targets are ≥48px.

## Screens

### 1. Home (desktop)
1. TopNav (Home active).
2. **HeroCarousel:** 520px high, radius 18, inset 20px. It's a full-bleed photo (1400×520 source) with the RTL overlay. The text block sits on the right, max-width 640, padding 56:
   - eyebrow «باقلواهای لوکس ترکی» (action green) + arrow
   - H1 «طعم اصالت / در هر لقمه»
   - paragraph «سفری به دنیای طعم‌های ناب و اصیل ترکیه، با بهترین مواد اولیه و هنر دست استادکاران ما.» (17/2, max-width 430)
   - CTA «مشاهده محصولات» (`action-deep`, with a round arrow chip)

   Bottom-left: counter `۰۱ / ۰۳` + prev/next 40px round outline buttons. 3 slides. Add autoplay (6s), pause on hover, swipe on touch.
3. TrustBar.
4. **Popular products** panel: header row with «مشاهده همه محصولات» link (right), H2 «محصولات پرطرفدار» (center), and prev/next (left). Below it, a 4-column ProductCard grid. Products:
   - باقلوا پسته‌ای — ۲,۴۰۰,۰۰۰ (badge پرفروش)
   - باقلوا مخلوط — ۲,۲۰۰,۰۰۰
   - باقلوا گردویی — ۱,۹۰۰,۰۰۰
   - شکلات دُبی — ۱,۳۰۰,۰۰۰

   The row is a horizontal carousel when there are more than 4 items.
5. **Brand story** panel, 2 columns:
   - image (1080×760, 340px) with a "ویدیو معرفی برند" play pill at the bottom-right (opens a video modal)
   - text: eyebrow «از سال ۱۳۸۵ تا امروز», H2 «داستان علی‌حان», paragraph, and an outline button «بیشتر بخوانید» → `/about`
6. **Promo banner:** 360px, photo (1400×360) + overlay. Eyebrow «باقلوای ترکی، تجربه‌ای متفاوت», H2 «انتخابی خاص / برای لحظات ویژه», sub «مناسب برای پذیرایی، هدیه و لذت در کنار عزیزان», CTA.
7. Footer.

### 2. Shop (desktop)
- Breadcrumb «صفحه اصلی / فروشگاه», with the current page in gold.
- Title «همه محصولات» + count line. Sort dropdown on the left («پرفروش‌ترین»; options: newest, cheapest, most expensive).
- Grid `270px sidebar | 1fr`.
- **Filter sidebar** (panel, radius 22, padding 24), with sections split by gold hairlines:
  - category checkboxes with counts (checked = 16px `action` square with a dark check)
  - weight pills
  - price range dual slider (4px track, `action` fill, 16px ink thumbs, min/max labels)
  - "in stock only" toggle (44×26, `action` when on)
  - «حذف فیلترها» button
- Products: a 3-column ProductCard grid, then round numbered pagination (active = `action`).
- Filters map to query params (`?category=&weight=&min=&max=&inStock=&sort=&page=`). Fetch server-side.

### 3. Product detail (desktop)
- Breadcrumb to the product name.
- 2 columns (1.05fr / 1fr):
  - **Gallery:** main image 440px (1000×1000 source) with a gold «محبوب» badge at the top-right, and wishlist + share round buttons at the top-left. Below it, 4 thumbnails 92px high; the active one has a 1px `action` border.
  - **Info:** H1, a rating row (gold ★ ×5, «۴.۸ از ۵ · ۱۳۲ نظر», stock status in green), description.
  - **VariantPicker** «وزن بسته را انتخاب کنید».
  - **Price box** (panel): «قیمت {weight}» + unit price (30/800 `action`), QtyStepper, total row «جمع سفارش», full-width primary «افزودن به سبد خرید» with a cart icon.
  - Mini trust tiles (3).
  - Accordion: «توضیحات محصول» (open), «ارسال و نگهداری», «مواد اولیه».
- «محصولات مشابه»: a 4-column ProductCard row with a heading and a gold hairline.
- **Pricing in the prototype:** base price for 1kg = 2,200,000. Multipliers: 500g ×0.523, 2kg ×1.9. **In production, each weight is a real variant with its own price and SKU from the backend. Don't compute it.**

### 4. Cart (desktop)
- The header swaps the nav for a 3-step checkout indicator: «سبد خرید» (active green disc) — «اطلاعات ارسال» — «پرداخت», plus a «ادامه خرید» link.
- Grid `1fr | 370px`.
  - **CartRow** (panel, radius 20, padding 18). Grid `106px image | info | stepper | 160px price`. Info: name 18/700, «وزن: … · کد BK-2201», stock/ETA in green. Price column: line total + a «حذف» trash link.
  - **Discount code** card (dashed gold border): input + gold «اعمال» button.
  - **Order summary** (sticky, top 20): subtotal, discount (gold, negative), shipping, gift wrap «رایگان» (green), divider, «مبلغ قابل پرداخت» (24/800 green), primary «ادامه و ثبت سفارش», secure-payment note.
- Totals update live as quantities change.

### 5. About (desktop)
1. Hero banner 340px: eyebrow «درباره علی‌حان», H1 «هنر باقلواسازی، / نسل به نسل».
2. Story: 2 columns (text + 900×660 image).
3. Stats panel, 4 columns, gold 36/800 numbers: ۱۸ سال تجربه · ۳ شعبه فعال · ۲۴ محصول متنوع · ۹۸٪ رضایت مشتری. **Confirm these figures with the client.**
4. Values: 3 cards (icon disc, title, text).
5. Branches: 3 cards (600×400 image, name, address and phone, hours in green). **Confirm the branch data with the client.**
6. CTA panel «سفارش عمده و مناسبتی» + «تماس با ما».

### 6. Mobile (390×844)
- **Home:**
  - status-bar safe area
  - header: hamburger (left in RTL; the third line is short and gold), centered logo, cart with badge (right)
  - search pill
  - hero card 256px with a bottom overlay; eyebrow, H1, CTA and prev/next inside it
  - 3 trust tiles
  - «محصولات پرطرفدار» + «همه»
  - 2-column ProductCards
  - BottomTabBar
- **Product:**
  - header: back button, title, wishlist
  - image 280px with dot pagination
  - title, stock, rating, description
  - weight pills
  - accordions
  - **sticky bottom action bar:** qty × weight + total (green), a compact stepper, and «افزودن به سبد» filling the rest (48px)
- **Hamburger menu (open):** full-screen overlay (bg `#081A11`) with ornament arcs.
  - logo + close button
  - label «منوی اصلی»
  - 6 links at 22/700, separated by hairlines, each with a chevron; the active one is green
  - at the bottom: «ورود / ثبت‌نام» primary button, social icons, phone

  Open/close with a 250ms slide/fade. Lock body scroll while it's open.
- **Cart:**
  - header: back, «سبد خرید», item count
  - compact CartRows (82px thumb; name + trash; weight; price + stepper)
  - discount pill input
  - sticky summary sheet: subtotal, discount/shipping, payable (21/800 green), primary CTA

## Interactions & Behavior
- Hover: primary buttons lighten (`#2FA84F→#38BD5C`, `#22713A→#2A8546`); outline/icon buttons get a `card` bg or a stronger gold border. Transitions 150–200ms ease.
- Add to cart: increments the header badge. Show a toast «به سبد خرید اضافه شد» and optionally open a mini-cart drawer. Disable the button while the request is pending.
- Hero carousel: loops, has keyboard arrows, and respects `prefers-reduced-motion`.
- Stepper: min 1, max = min(20, stock). At 1, the minus button can become delete (optional).
- Accordion: single-open, animate height 200ms, `aria-expanded`.
- Newsletter: validate the email and show an inline success or error message.
- Discount code: POST to the backend. Show the applied line or an error below the input in red `#E06B5B`.
- Empty states: an empty cart shows a message + «مشاهده محصولات». An empty filter result offers «حذف فیلترها».
- Loading: skeleton cards use the placeholder color.

## State Management
- `cart`: items `{productId, variantId, title, weightLabel, unitPrice, qty, image}`, plus totals from the server. Persist it, via a server session or cookie cart id.
- The header cart count comes from the cart.
- Product page: `selectedVariantId`, `qty`, `openAccordion`.
- Shop: filters and sort in URL search params.
- Hero: `activeSlide`.
- Mobile menu: `isOpen`.

## Suggested Data Shapes
```ts
type Product = { id; slug; title; shortDesc; description; ingredients; badges?: ('bestseller'|'new'|'popular')[];
  images: string[]; rating: number; reviewCount: number; category: string;
  variants: { id; label: string /* "۱ کیلوگرم" */; grams: number; price: number; sku: string; stock: number }[] };
type Branch = { id; name; address; phone; hours; image };
```

## Assets
- **Images:** all placeholders. Recommended sources: hero 1400×520 (desktop) / 750×900 (mobile), product 1000×1000 (card 640×640, thumbnail 400×400), story 1080×760, banner 1400×360, about hero 1400×340, workshop 900×660, branch 600×400. Use WebP or AVIF.
- **Icons:** simple 1.5–1.7px stroke line icons, drawn inline in the prototype. Replace them with a consistent set, for example `lucide-react`: Search, ShoppingCart, User, ShieldCheck, Truck, Gift, Heart, Share2, Phone, Mail, MapPin, Instagram, Send, MessageCircle, Plus, Minus, Trash2, ChevronDown, ChevronLeft/Right, X, Menu, Home, ShoppingBag.
- **Logo:** temporary. The final file is pending from the client.
- **Font:** Vazirmatn (OFL), self-hosted.

## Files
- `screenshots/`: high-resolution PNG captures of each screen. Desktop screens are 2× (2880px wide); mobile screens are 3× (1242px wide).
  `00-design-system`, `01-desktop-home`, `02-desktop-shop`, `03-desktop-product`, `04-desktop-cart`, `05-desktop-about`, `06-mobile-home`, `07-mobile-product`, `08-mobile-menu`, `09-mobile-cart`.
  Use the HTML files for exact values and the screenshots for visual reference.
- `Alihan Website.dc.html`: every screen on one canvas, with the interactive logic in the class at the bottom of the file.
- `ProductCard.dc.html`: the product card component.
- `support.js`: runtime needed only to open the prototype. Don't port it.
