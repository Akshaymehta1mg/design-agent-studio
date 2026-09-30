# Tata 1mg Dopamine — compact token sheet

Wireframe reference for Prism. Resolve conflicts: user direction → supplied screens → repeated source patterns → this sheet → read_design_system(section).

## Viewport and spacing

Viewport: iPhone 17, 402×874px (content is fluid; the source guide's 412×924 layouts scale down). Grid: 6 columns, 16px page margins, 8px gutters. Spacing scale: 0 2 4 8 12 16 20 24 28 32 36 40px. Base rhythm: 8px. Minimum primary-action height: 48px; compact controls: 40–44px.

## Typography

Figtree for all UI text. Cabinet Grotesk Variable only for Display at 24/36/45px. Weights: 400, 500, 700, 800 only (no 600, no 13px, sentence case except eyebrow).

| Role | Style |
| --- | --- |
| Page title | Figtree 22/800, lh 28 |
| Section heading | Figtree 18/700, lh 28 |
| Card/product title | Figtree 16/800, lh 24 |
| Compact title | Figtree 14/800, lh 20 |
| Body / input / nav label | Figtree 14/400, lh 20 |
| Large body / large control | Figtree 16/400, lh 24 |
| Helper text | Figtree 12/400, lh 16 |
| Field label / compact control | Figtree 12/700, lh 16 |
| Tag / micro-label | Figtree 11/400, lh 16 |
| Eyebrow | Figtree 12/700, uppercase, 3px tracking |

## Colour tokens

Apply by semantic role, never by raw hex. Never use colour as the only state signal.

**Coral/orange constraint: never use coral or orange as background, surface fill, section fill, card fill, or decorative accent. Only inside team-defined components in their documented variant.**

| Role | Semantic | Hex |
| --- | --- | --- |
| Primary content/icon | content primary | #181A1F |
| Supporting content | content secondary | #626A7A |
| Muted/placeholder | content tertiary | #868E9E |
| Disabled | content disabled | #A2A9B8 |
| Primary surface | background primary | white |
| Subtle surface | background subtle | #F7F8FA |
| Moderate surface | background moderate | #EEF1F5 |
| Divider/border | stroke moderate | #DDE2EB |
| Subtle boundary | stroke subtle | #F0F2F5 |
| Primary action | team-defined primary-button token only | #FF6F61 |
| Brand identity | team-defined branding token only | #FF5443 |
| Success | states success | #308956 |
| Error | states error | #C50F1F |
| Warning | states warning | #BF9514 |

## Shape and elevation

| Token | Use |
| --- | --- |
| 2–4px | micro-tags, small chips, inline labels |
| 8px | buttons, inputs, thumbnails, small cards |
| 12px | standard cards, panels, sheets |
| 16px | prominent cards, hero blocks, modals |
| 24px | large cards, bottom sheets, pills |
| max | circular controls, pills, avatars |

One separation treatment per hierarchy level. Border/divider for resting structure; elevation only for genuinely raised/overlay surfaces. Use Hugeicons at 20–24px (official set where available); no emoji or glyph blocks.

## Component families

| Need | Family |
| --- | --- |
| Primary/secondary/compact/commerce action | Buttons (filled/outline/ghost/inverse/disabled/ADD/bottom-bar) |
| Text/OTP/dropdown/validation/inline CTA | Input Fields (floating label + state) |
| Single/multiple choice | Radio Buttons or Checkboxes; Chips for lightweight filters only |
| Filter/category | Chips & Filters (horizontal scroll for selector, wrap for ChipSelect) |
| Product/package result | SKU Cards (compact carousel width, ADD/BOOK, price hierarchy, 1:1 image) |
| Navigation/back | Page Header, Navigation, Tabs, Search Bar |
| Purchase/checkout | Action Bar (bottom slot) |
| Status/metadata | Badges, Tags, Ratings, Steppers, Dividers |
| Feedback/recovery | Snackbars (brief); sheets/dialogs (consequential) |

Continuous list for scan/comparison. Card only for independent selectable/purchasable/actionable objects. One dominant action per decision point.

## RX default image

For RX medicines with no supplied image: `tata-1mg-development-design-system/assets/rx-default-blister-pack.png`. Not for OTC, supplements, labs, or other placeholders.

## Page patterns (source-faithful flows only)

**Product detail**: 72px white header, 12px side padding. Back left; Search/Share/Cart (40px circular, 8px gap) right. Cart badge: 16px, Tata 1mg red. Purchase strip in non-scrolling bottom slot.

**Cart**: 56px white-to-transparent header. Back left, Search right, centre location pill (white, 24px radius, bordered, truncates). Checkout in bottom slot.

**Labs homepage**: 56px location header → pill search → hero banner. Two primary diagnostic entry cards (Blood Tests + X-Ray/Scans). Family-member selector before recommendations. Horizontally scrolling 172px package cards (16:9 image, 2-line name clamp, BOOK not ADD). Category progression: audience selector → subcategory → carousels → concern grid → vaccination → trust signals. Five-item bottom nav (Home/Lab Tests/Family Hub/Insights/My Orders). Use approved images from `tata-1mg-development-design-system/assets/labs-home/`.

**Search/product cards**: 12px horizontal padding, pill field, Figtree 14/20. Homepage carousel cards: 172px wide. Product images: 1:1 contained, 8px radius, 2-line name clamp.

---

Use `read_design_system(section)` for component-level HTML/CSS specs (buttons, input-fields, sku-cards, page-header, etc.) and the portable bundle routes.
