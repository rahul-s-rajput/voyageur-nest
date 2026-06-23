# Guest Check‑In Page — Redesign Brief

> Hand this whole file to Claude (or any design tool). It is self‑contained: it
> describes the product, the audience, every field and screen state, the brand,
> the constraints, and the exact deliverable. A ready‑to‑paste prompt is at the
> bottom.

---

## 1. What this is

**Voyageur Nest** is a small, characterful **guesthouse in Manali, Himachal
Pradesh, India** (Himalayan hill town; mix of domestic Indian travellers and
international backpackers/tourists). This page is the **digital check‑in form** a
guest opens on their **phone** after booking — they reach it by scanning a QR
code at the property or via a link (`/checkin/<bookingId>`). They fill in their
details, upload a photo of their ID, accept terms, and submit. Staff then review
and approve.

It is the **only consumer‑facing screen** in an otherwise admin product, so it
should feel polished, trustworthy, warm, and effortless — on a **phone or a
desktop/laptop browser** — not like an internal tool.

## 2. Goals (in priority order)

1. **Fully responsive — phone AND desktop are both first‑class.** Guests open the
   link on a phone (QR at the property) or on a laptop/desktop browser; neither is
   an afterthought. Design real layouts for **both** ends: a comfortable
   single‑column flow on mobile, and a deliberate desktop layout that uses the
   wider canvas well (e.g. two‑column field groups, a side hero/summary, or a
   centered max‑width form) rather than a stretched phone screen. Fast and light
   (often patchy hill‑town data); large tap targets (min 44px) on touch.
2. **Trustworthy.** Guests submit ID and personal data. The page must look
   legitimate and secure, with the **property name prominent** at the top.
3. **Effortless & quick.** Minimize perceived length. The form is long (8
   sections) — use progressive disclosure, clear grouping, good defaults, inline
   validation, and a visible sense of progress.
4. **Welcoming & on‑brand.** A boutique Himalayan guesthouse — calm, scenic,
   premium‑but‑approachable. Not corporate, not generic SaaS.
5. **Bilingual.** Must work in **English and Hindi (हिन्दी)** — including longer
   Hindi strings and the Devanagari script. A language switcher is required.
6. **Accessible.** WCAG AA contrast, labelled inputs, keyboard friendly, visible
   focus, error messages tied to fields.

## 3. Audience & devices

Both of these are primary — design intentionally for each, not one scaled to the
other:
- **Smartphone** (iOS Safari + Android Chrome), portrait, ~360–430px wide —
  one‑handed, often on slow data, in a hurry at arrival.
- **Desktop/laptop browser**, ~1280px+ — guests filling it in ahead of time at
  home, and staff. Use the extra width purposefully.
- Tablet in between should also look intentional.
- Conditions: variable connectivity; touch and mouse/keyboard both in play.

## 4. Screen states to design

The page is a single route that moves through these states — **please design all
of them**, they're part of the experience:

1. **Loading** — fetching the booking. (Currently a spinner + "Loading…".)
2. **Form** — the main multi‑section check‑in form (the bulk of the work).
3. **Submitting** — button busy state.
4. **Success** — "Check‑in Complete!" confirmation; guest can close the page.
5. **Already completed** — guest reopened the link; show a banner that it's done
   and the form is pre‑filled and editable ("You have already completed the
   check‑in form. You can update it below.").
6. **Error** — booking not found / link invalid; friendly message, no dead‑end.

## 5. Content inventory (exact fields & copy)

Header / hero
- **Title: the property name** (e.g. "Voyageur Nest"). ← important change from
  today, where it generically says "Digital Check‑in".
- Subtitle: "Digital Check‑in".
- A small reassurance line: "We'll automatically link your information to any
  existing guest profile."
- **Language switcher: English / हिन्दी (Hindi) only.**

The form has these sections (in order):

**A. Personal Details**
- First Name* (placeholder "Enter your first name")
- Last Name* ("Enter your last name")
- Email Address* ("Enter your email address")
- Phone Number* ("Enter your phone number")
- Date of Birth (date)
- Nationality

**B. ID Verification**
- ID Type* (select): Passport, Aadhaar Card, PAN Card, Driving License, Voter ID
  Card, Ration Card, Other
- ID Number
- **Upload ID Photos** — drag‑and‑drop or tap to select; supports JPG, PNG, PDF,
  max 5MB; can upload multiple (e.g. front/back). Show thumbnails of uploaded
  files with the ability to remove. Copy: "Drag and drop your ID photo here, or
  click to select", "Supports: JPG, PNG, PDF (Max 5MB)".

**C. Address**
- Address* ("Enter your address")
- City, State, Country, Zip Code

**D. Emergency Contact**
- Emergency Contact Name ("Enter emergency contact name")
- Emergency Contact Phone ("Enter emergency contact phone")
- Relationship (free text or select: Spouse, Parent, Child, Sibling, Friend,
  Colleague, Other)

**E. Purpose of Visit / Visit Details**
- Purpose of Visit (select): Tourism / Vacation, Business, Family Visit, Medical,
  Other
- Arrival Date, Departure Date (dates, often pre‑filled from booking)
- Room Number (often pre‑filled)
- Number of Guests
- Special Requests (textarea)

**F. Additional Guests** (dynamic list)
- Repeatable rows: Name, Age, Relation. "Add Guest" / "Remove" buttons.

**G. Service Preferences** (toggles / checkboxes)
- Wake‑up Call, Newspaper, Extra Towels, Extra Pillows, Room Service,
  Do Not Disturb.

**H. Agreement**
- ☑ "I accept the terms and conditions"* (required)
- ☑ "I consent to receive marketing communications" (optional)

Primary action
- **Submit Check‑In** button (busy text: "Submitting…").

Validation copy
- "This field is required", "Please enter a valid email address", "Please enter a
  valid phone number", "You must accept the terms and conditions".

(* = required)

## 6. Functional constraints (so the design stays buildable)

- This will be rebuilt in the existing stack: **React 18 + TypeScript + Tailwind
  CSS + shadcn/Radix UI primitives + lucide‑react icons**. Favour patterns that
  map to Tailwind utility classes and shadcn components (inputs, selects,
  checkboxes, dialogs, accordions, tabs).
- Dates/times are **IST (Asia/Kolkata)**. Date pickers should be simple native or
  shadcn date inputs.
- The form is backed by `react-hook-form`; inline, per‑field validation on blur is
  the model.
- No external auth — it's a public page keyed by booking id.
- Keep it **light**: avoid heavy images/animation that hurt first paint on slow
  mobile data. Decorative SVG/CSS is fine; large hero photos should be optional /
  lazy.
- Bilingual: don't bake text into images; leave room for Hindi which can be ~30%
  longer and uses Devanagari.

## 7. Brand & aesthetic direction

Today's look is an **"ethereal" pastel‑glassmorphism** theme: soft blue→purple
gradient hero, drifting clouds / snowflakes / pine‑tree SVGs, a `Dancing Script`
cursive display font, frosted‑glass cards. It's pretty but a bit generic/"wedding
template" and the cursive can read as less trustworthy for an ID/data form.

For the redesign, **explore distinct directions** — don't just refine the current
one. Some starting points (pick/blend, or propose your own):

- **Himalayan Boutique** — warm, earthy, premium hospitality: deep pine green +
  warm stone/sand neutrals, a crisp serif for headings, generous whitespace,
  subtle mountain line‑art. Calm and grounded.
- **Modern Minimal** — clean, Linear/Stripe‑like: neutral surfaces, one confident
  accent colour, strong type hierarchy, crisp cards, micro‑interactions. Reads as
  fast and trustworthy.
- **Warm Hospitality** — inviting and friendly: warm off‑white background, soft
  terracotta/saffron accents (a nod to India), rounded shapes, large imagery
  optional. Feels personal.

Guidance:
- Prioritise **legibility and trust** over decoration for an ID/data form.
- A real, readable UI font for body and inputs; a display font only for the hero
  if it stays legible. (If you keep a script font, use it sparingly.)
- Make the **property name** the hero, not the word "Check‑in".
- Show **progress** through the long form (stepper, section progress, or sticky
  section nav) so it doesn't feel endless.
- Avoid pure blue/indigo defaults and obvious Bootstrap looks.

## 8. Deliverable

- Produce **2–3 distinct, self‑contained single‑file HTML mockups**. Each must
  show the **Form** state at **both mobile and desktop widths** (show the two
  side by side, or provide a clear desktop layout plus a mobile frame), plus the
  **hero/header**, an **ID‑upload** treatment, and the **Success** state. Ideally
  also sketch the **Already‑completed** banner and **Error** state. (Tailwind via
  CDN is fine for the mockups.)
- Make them genuinely **responsive both ways** — a real desktop layout that uses
  the width, not a centered phone column on a big screen.
- Each variant should be a clearly different aesthetic direction (see §7) so we
  can compare and pick a winner.
- Use placeholder imagery only from public sources (e.g. unsplash) or CSS/SVG.
- After the variants, briefly note the trade‑offs of each so we can choose.

## 9. Reference: current implementation (for context, not to copy)

- Page/route: `src/pages/CheckInPage.tsx` (`/checkin/:bookingId`, `+ /hi`).
- Hero: `src/components/EtherealHero.tsx` (current pastel/glass hero).
- Form: `src/components/CheckInForm.tsx` (all fields, validation, sections).
- ID upload: `src/components/IDPhotoUpload.tsx` (magic‑number validation,
  client‑side compression, uploads to a private bucket).
- Language switcher: `src/components/LanguageSelector.tsx` (English + Hindi).
- Data shape: `src/types/checkin.ts` (`CheckInFormData`).
- Microcopy: `src/lib/translations.json` (`en-US` → `form`, `placeholders`,
  `options`, `terms`, `idUpload`, `checkInPage`).

---

## 10. Ready‑to‑paste prompt

> You are a senior product/UI designer. Design a **fully responsive digital
> check‑in page** for **Voyageur Nest**, a boutique guesthouse in **Manali,
> India**. This is the only consumer‑facing screen of the product. Guests open it
> **on a phone (QR at the property) or on a desktop/laptop browser** after
> booking, to enter personal details, upload a photo of their ID, accept terms,
> and submit; staff later review and approve. **Both phone and desktop are
> first‑class — design real layouts for each, not one scaled to the other.**
>
> Read the brief below in full, then produce **3 distinct, self‑contained
> single‑file HTML mockups** (Tailwind via CDN, Google Fonts allowed,
> lucide/heroicons via CDN, placeholder images from unsplash/placehold.co). Each
> must be a **different aesthetic direction** (e.g. "Himalayan Boutique", "Modern
> Minimal", "Warm Hospitality") and must show the **Form** state at **both mobile
> and desktop widths**, plus the **hero/header with the property name** prominent,
> an **ID‑photo upload** treatment, and the **Success** confirmation state. Also
> sketch the **Already‑completed** banner and the **Error** state. The desktop
> layout must use the wider canvas deliberately (two‑column field groups, a side
> hero/summary, or a centered max‑width form) — not a centered phone column on a
> big screen. Prioritise legibility, trust, large tap targets (≥44px on touch),
> WCAG AA contrast, and room for **Hindi (Devanagari)** text. Avoid generic
> blue/indigo and Bootstrap‑looking defaults. After the three variants, give a
> short comparison of their trade‑offs.
>
> [Paste the full brief — sections 1–9 above.]

---

### Notes for follow‑up rounds
- Once a direction is chosen, ask for: the remaining states, a dark‑mode pass (if
  wanted), the Hindi layout with real Devanagari strings, and a component‑level
  spec (spacing scale, type scale, colour tokens) so it maps cleanly to Tailwind +
  shadcn during build.
