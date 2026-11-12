# RESOLVE-ONE Design System & Architecture

> A calm, human-centric, high-trust design system engineered for stressed consumers navigating corporate dispute bureaucracy in India.

---

## 1. Design Philosophy & Mood

Consumers arriving at RESOLVE-ONE are often agitated, anxious, or exhausted after being passed between customer support bots, broken unboxing forms, and unanswered emails. 

Our core design thesis:
- **Calm over Clutter**: Low visual noise, generous whitespace, structured vertical hierarchy.
- **Competent Companion**: Speaks like a capable, patient friend who organizes paperwork, never like a sterile legal-tech portal or corporate compliance tool.
- **Honesty in Every Pixel**: Visual status tags clearly differentiate corporate promises from verified reality.
- **Mobile-First for Indian Realities**: Optimized for single-handed thumb interactions, low-bandwidth connections, and diverse Android screen dimensions.

---

## 2. Color System & Design Tokens

The palette pairs warm, paper-inspired neutral surfaces with a refined coral-red signature brand color and clear semantic status colors.

### Core Palettes
| Token Name | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `surface-light` | `#FAF8F4` | — | Warm off-white canvas, reducing screen glare |
| `surface-dark` | — | `#121212` | Deep charcoal/ink dark mode (not inverted black) |
| `surface-light-card` | `#FFFFFF` | `#1E1E1E` | Elevated component container |
| `surface-light-subtle` | `#F4F0EA` | `#282828` | Secondary borders, inputs, badge backgrounds |
| `brand-500` | `#C8372D` | `#E04B41` | Signature coral red brand accent |
| `brand-600` | `#AC2B22` | `#C8372D` | Interactive hover & focus state |
| `brand-50` | `#FDF4F3` | `#2D1816` | Tinted alerts and selected state backgrounds |
| `semantic-success` | `#16A34A` | `#22C55E` | Confirmed outcomes, received refunds |
| `semantic-warning` | `#D97706` | `#F59E0B` | Pending actions, expiring return windows |
| `semantic-info` | `#2563EB` | `#3B82F6` | Statutory references, official route guidance |

### Contrast & Legibility
- **Normal Text**: Minimum contrast ratio of **4.8:1** (exceeding WCAG AA 4.5:1).
- **Body & Headings**: Contrast ratio of **11.2:1** on light mode, **14.1:1** on dark mode (achieving WCAG AAA).
- **Interactive Focus Rings**: 2px high-visibility offset rings on all tabbable controls (`focus-visible:ring-2 focus-visible:ring-brand-500`).

---

## 3. Typography & Numerical Scale

### Typefaces
1. **Display Headings**: `Instrument Serif` / `Fraunces` (serif)
   - Evokes legal authority, journalism, and editorial dignity without hostility.
2. **Body & User Interface**: `Inter`, `Noto Sans Devanagari`, `Noto Sans Telugu`
   - High x-height, clear differentiation of characters, and comprehensive Indic Unicode coverage.

### Type Scale (16px Baseline Rule)
*No body text on RESOLVE-ONE is rendered below 14px; primary interactive text is strictly 16px or above.*

- `Display / Hero`: `48px – 72px` (Leading: 1.1)
- `H1 / Page Title`: `28px – 32px` (Leading: 1.2)
- `H2 / Section Title`: `20px – 24px` (Leading: 1.3)
- `H3 / Card Header`: `18px` (Leading: 1.4)
- `Body / Primary`: `16px` (Leading: 1.5)
- `Caption / Microcopy`: `14px` (Leading: 1.4)

### Tabular Numerals
Financial sums, refund reconciliations, and dates use `font-mono tabular-nums` to guarantee vertical column alignment and prevent visual jittering during live state updates.

---

## 4. Spacing, Layout & Touch Targets

### 8px Spatial Grid
All layout margins, paddings, and gaps scale in multiples of 8px (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`). Subtle micro-spacings (`4px` and `12px`) are reserved exclusively for compact badges and icon gaps.

### Touch Targets
Every button, navigation link, tab, and form trigger adheres to a minimum touch target size of **44px × 44px** (with `min-h-[44px]` or `min-h-[48px]` enforced on mobile controls), ensuring effortless tap accuracy on handheld devices.

### Responsive Layout Strategy
- **Mobile (< 768px)**:
  - Single-column flow (`max-w-md mx-auto`).
  - Sticky bottom navigation bar (`<MobileNav />`) with 5 core actions and floating primary action (`+ New Case`).
  - Modal sheets slide up as native bottom drawers (`<BottomSheet />`).
- **Desktop (≥ 768px)**:
  - 12-column responsive grid with a 64px–260px collapsible sidebar navigation.
  - Quick action command palette triggered via `⌘K` or `Ctrl+K`.

---

## 5. Owned Component Primitives

All components are owned in `src/design-system/components/` with zero third-party component lock-in:

1. **`StatusChip`**:
   - Explicitly displays the three-state dispute outcome status:
     - `Company Promised` (Amber outline)
     - `Evidence Found` (Blue filled)
     - `Received in Bank` (Green verified)
2. **`CaseCard`**:
   - Scannable card displaying company, disputed item, ₹ value, days open, and the next priority task.
3. **`Timeline`**:
   - Vertical milestone trail highlighting customer actions, company responses, and statutory escalations with chronological timestamps.
4. **`EvidenceTile`**:
   - Visual file badge displaying thumbnail, file size, SHA-256 cryptographic fingerprint, and live PII redaction warning chips.
5. **`Stepper`**:
   - Multi-step progress indicator with `aria-current="step"`, accessible check-icons, and step-by-step progress tracking.
6. **`MoneyDisplay`**:
   - Formats values into Indian numbering format (e.g., `₹1,24,999.00`) with highlighted discrepancy states in Refund Reality Check.
7. **`EmptyState`**:
   - Bespoke vector illustrations depicting geometric packages, receipts, and verified seals using brand colors, paired with a clear recovery CTA.
8. **`BottomSheet`**:
   - Accessible slide-up drawer for mobile forms with backdrop blur, focus trapping, and swipe dismiss affordance.
9. **`CommandPalette`**:
   - Full keyboard navigation modal (`⌘K`), filtering through cases, navigation routes, and statutory guides with instant jump-to actions.

---

## 6. Motion & Accessibility Standards

### Motion Principles
- **Eased Spring Physics**: Micro-interactions use smooth spring dampers (`stiffness: 300, damping: 25`) avoiding cartoonish bounce.
- **Shared Element Transitions**: Modals open with subtle scale-ins (`scale: 0.98 -> 1.0`) and vertical lifts (`y: 8 -> 0`).
- **Accessibility Respect**: All motion queries `prefers-reduced-motion: reduce`. When active, animated transforms are instantly collapsed to simple, immediate opacity transitions.

### Accessibility Architecture (WCAG 2.2 AA Verified)
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`).
- Screen-reader announcements (`aria-live="polite"` on toast alerts and live extracted chips).
- Complete keyboard operability (`Tab`, `Shift+Tab`, `Escape`, `ArrowUp`, `ArrowDown`, `Enter`).
- Zero reliance on color alone: every status chip combines color, distinct SVG iconography, and explicit text.

