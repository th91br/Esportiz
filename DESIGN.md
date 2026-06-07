---
name: Esportiz
description: Premium operational SaaS for sports schools and arenas.
colors:
  background: "#f1f4f8"
  foreground: "#0a1629"
  surface: "#ffffff"
  primary: "#0c8349"
  primary-bright: "#1db976"
  secondary: "#0a1629"
  muted: "#e7eaef"
  muted-foreground: "#5c6e8a"
  border: "#d1d7e0"
  success: "#158454"
  warning: "#f59f0a"
  destructive: "#ef4343"
  dark-background: "#0a1629"
  dark-surface: "#0e1f39"
  dark-muted: "#182639"
  dark-border: "#1f2f47"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  xl: "1rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.75rem"
---

# Design System: Esportiz

## 1. Overview

**Creative North Star: "The Arena Operations Desk"**

Esportiz should feel like the control desk of a well-run sports arena: fast, clear, confident, and quietly premium. The interface serves owners, managers, reception teams, instructors, finance operators, and students who need to move through daily operations without stopping to decode the UI.

The system is product-first. Premium comes from alignment, spacing, contrast, predictable components, and disciplined state language. Visual effects are allowed only when they make priority, status, or feedback easier to understand.

**Key Characteristics:**
- Operational clarity before decoration.
- Restrained green as the action color, deep navy as the trust color.
- Compact, readable cards that preserve speed on desktop and mobile.
- Skeletons, clear empty states, and visible focus states for secure daily use.
- Dark mode that feels calm and usable, never overdecorated.

## 2. Colors

The Esportiz palette is restrained and field-aware: deep navy for trust, green for action and healthy state, amber/red only for attention and risk.

### Primary
- **Operational Green** (`primary`): Use for primary actions, current selections, and high-confidence links. It should be rare enough that the next action is obvious.
- **Bright Field Green** (`primary-bright`): Use in gradients, active dark-mode accents, and small highlights that need extra lift.

### Secondary
- **Trust Navy** (`secondary`): Use for high-contrast structure, dark surfaces, and moments where the product needs authority.

### Tertiary
- **Success Green** (`success`): Use only for confirmed positive status, completion, attendance, and successful payment-adjacent actions.
- **Amber Warning** (`warning`): Use for due-soon, partial, or caution states. Always pair with text that explains the state.
- **Destructive Red** (`destructive`): Use for overdue, delete, cancel, and irreversible risk states.

### Neutral
- **Cool Operational Background** (`background`): Main app canvas. It keeps the product bright without becoming generic white SaaS.
- **Surface White** (`surface`): Cards, dialogs, popovers, and operational panels.
- **Muted Panel** (`muted`): Filter bars, secondary tabs, skeletons, and soft grouping areas.
- **Readable Muted Text** (`muted-foreground`): Secondary text only. Do not use it for important labels or values.
- **Structural Border** (`border`): Thin separators, form outlines, and calm card boundaries.

### Named Rules

**The Action Rarity Rule.** Green is for action, selected state, and meaningful positive status. Do not use it as decoration.

**The Status Requires Language Rule.** Color never carries status alone. Every warning, success, destructive, or payment state needs text, icon, or both.

## 3. Typography

**Display Font:** Montserrat, with sans-serif fallback.
**Body Font:** Inter, with sans-serif fallback.
**Label/Mono Font:** Montserrat for labels; no mono font is part of the current product UI.

**Character:** Montserrat gives the product its business identity; Inter keeps dense operational content readable. The pairing should feel modern and stable, not editorial or experimental.

### Hierarchy
- **Display** (700, `text-2xl` to `text-3xl`, tight tracking): Page titles and dashboard section titles.
- **Headline** (700, `text-xl` to `text-2xl`): Dialog titles, major panel titles, and empty-state headings.
- **Title** (700, `text-base`, compact leading): Card titles, modal section headers, and entity names.
- **Body** (400 to 600, `text-sm` to `text-base`): Operational copy, descriptions, table-adjacent content, and forms. Cap prose blocks at 65 to 75 characters.
- **Label** (700, `text-xs`, controlled uppercase): Short status labels, tabs, and compact metadata. Do not uppercase full sentences.

### Named Rules

**The Product Type Rule.** No display theatrics in task UI. Typography earns trust by making data faster to scan.

## 4. Elevation

Esportiz uses a hybrid elevation model: mostly flat surfaces with crisp borders, then restrained shadows for hover, dialogs, sheets, and cards that need to rise above operational density. Shadows should feel structural, not glossy.

### Shadow Vocabulary
- **Low Structure** (`--shadow-sm`): Small chips, icons, and quiet nested controls.
- **Card Lift** (`--shadow-md`): Default elevated cards and primary CTA resting state.
- **Interactive Lift** (`--shadow-lg`): Hover state for cards and important buttons.
- **Overlay Lift** (`--shadow-xl` / sheet shadows): Dialogs, side sheets, and overlays.
- **Controlled Glow** (`--shadow-glow`): Rare accent feedback only, bounded and subtle.

### Named Rules

**The Flat At Rest Rule.** Surfaces should read as stable at rest. Lift appears for hierarchy, hover, focus, or overlay separation.

## 5. Components

### Buttons
- **Shape:** Gently rounded, compact, and consistent (`rounded-md` to `rounded-lg`).
- **Primary:** Operational Green or the established primary gradient, white text, medium shadow, and direct verb-object labels.
- **Hover / Focus:** Hover may darken, lift slightly, or tighten shadow. Focus must keep the visible ring from the shared button component.
- **Secondary / Ghost / Tertiary:** Use outline or ghost styles for navigation, cancel, and lower-priority actions. Destructive actions must not look like primary actions.

### Chips
- **Style:** Soft tinted background, readable foreground, and light border when the status needs separation.
- **State:** Selected chips use primary text and a tonal background. Warning, success, and destructive chips must include clear text.

### Cards / Containers
- **Corner Style:** `rounded-xl` or `rounded-2xl` on larger operational cards; avoid oversized novelty rounding.
- **Background:** Surface White in light mode, Dark Surface in dark mode.
- **Shadow Strategy:** Card Lift at rest only when the card is interactive or needs hierarchy. Otherwise use borders and tonal background.
- **Border:** Thin, semantic, and full-card. Do not use thick side stripes.
- **Internal Padding:** `p-4` to `p-6`, with denser cards using `p-4` on mobile.

### Inputs / Fields
- **Style:** Surface background, structural border, compact height around 44px, and predictable radius.
- **Focus:** Use the tokenized ring color. Do not remove outline without replacing it.
- **Error / Disabled:** Disabled states use opacity and cursor behavior from shared components. Error states use destructive color plus explanatory copy.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.** Navigation is compact and familiar. Active routes use primary tint, clear text, and a visible icon. Mobile navigation must preserve touch targets and keep operational actions reachable without horizontal overflow.

### Signature Component

**Notification Sheet:** A right-side operational inbox for agenda, payments, birthdays, and portal requests. It should feel like a control queue: sticky header, scannable categories, compact cards, clear action buttons, and no decorative side stripes.

## 6. Do's and Don'ts

### Do:
- **Do** make the next operational action obvious before adding visual effect.
- **Do** use the shared Button, Card, Dialog, Sheet, Input, and token vocabulary before creating one-off visuals.
- **Do** keep primary green rare: primary actions, active tabs, selected state, and positive status.
- **Do** test contrast, touch target size, reduced motion, keyboard focus, and mobile readability for every polished surface.
- **Do** use skeletons for loading state when content shape is known.

### Don't:
- **Don't** make Esportiz look like a generic SaaS dashboard.
- **Don't** create an overdecorated dark interface with excessive glow.
- **Don't** regress into an old bureaucratic admin panel.
- **Don't** build a visual experiment that slows routine work.
- **Don't** use decorative effects, vague marketing polish, or inconsistent component styles when they compete with clarity.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, callouts, or alerts.
- **Don't** use gradient text. Emphasis comes from hierarchy, weight, spacing, and semantic color.
