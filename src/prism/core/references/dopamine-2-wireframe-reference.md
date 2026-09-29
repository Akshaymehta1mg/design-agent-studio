# Dopamine 2.0 wireframe reference

Use this reference for every component-based wireframe created by Prism, including Tata 1mg, 1mg Labs, Quick Commerce, Care Plan, and Corporate work.

This is a wireframe construction guide distilled from `Dopamine 2.0 — 1mg Design System.zip`. It records reusable layout, hierarchy, component, token, content, icon, and asset patterns. It does not replace a supplied product screen, an agreed UX direction, or the production design system.

## Source and confidence

- Source archive: `Dopamine 2.0 — 1mg Design System.zip`
- Foundation source in archive: `uploads/Dopamine 2.0 design system - base tokens.md`
- Supporting sources: `README.md`, `colors_and_type.css`, component previews, the 1mg JSX UI kit, official logo SVGs, product images, and the design-system manifest
- Foundation tokens are described by the archive as 1:1 with the exported foundation specification.
- The primitive and semantic colour board is recorded in `dopamine-colour-tokens.md`; load it whenever colour is applied or annotated.
- The archive states that its UI-kit component visuals are modeled on known 1mg screens and foundation tokens, but are not guaranteed to be pixel-perfect without the original Figma component library or product codebase.
- Hugeicons is the required substitute when the official product icon set is unavailable.
- Category illustrations are not included; placeholders should not be mistaken for official illustrations.

## Source priority for a wireframe

Use evidence in this order:

1. Product screenshots, flows, or boards supplied for the task.
2. Repeated visual and interaction patterns visible in those sources.
3. The Dopamine 2.0 patterns in this reference.
4. Familiar mobile-platform conventions.

Do not force a design-system pattern when it conflicts with the supplied journey, reduces clarity, or hides a material consequence. Preserve product-family resemblance without claiming pixel accuracy.

## Wireframe fidelity boundary

The wireframe should use Dopamine 2.0 rules and component treatments rather than a grayscale translation.

- Use the documented semantic colours, Figtree typography, spacing scale, radii, borders, elevation and component states.
- Reuse Dopamine component patterns for buttons, fields, alerts, chips, cards, navigation, sheets and sticky actions.
- Preserve proportions, grouping, hierarchy, action placement and interaction behavior from supplied product sources.
- Use real product copy and realistic values when they help reviewers understand the flow.
- Keep the artifact reviewable and assumption-led: it is not a claim of pixel accuracy, production readiness, technical feasibility or final visual sign-off.
- Do not invent missing official components, illustrations, icons or tokens. Label a documented substitution when necessary.

### Semantic component application

| Dopamine role | Wireframe treatment |
| --- | --- |
| 1mg primary action | `token.semantic.color.branding.1mg` with `token.semantic.color.content.inverse-primary` using the documented primary-button pattern |
| Saving or success | `token.semantic.color.states.offer` or `token.semantic.color.states.success` plus a check or explicit label |
| Information | Use a documented component token; otherwise use neutral content/icon semantics because the board has no general information-state token |
| Error | `token.semantic.color.states.error` with inline recovery |
| Warning | `token.semantic.color.states.warning` plus icon, consequence, and next action |
| Selected chip or tab | `token.semantic.color.stroke.selected` with an explicit selected state |
| Disabled control | `token.semantic.color.background.disabled` plus the relevant disabled content, icon, and stroke semantics |
| Card boundary | `token.semantic.color.stroke.subtle` or `token.semantic.color.stroke.moderate` according to surface emphasis |

Never rely on colour alone to communicate state. Pair it with a label, icon, shape or action change.

## Product character

Dopamine 2.0 is:

- mobile-first;
- practical and shopping-native;
- friendly without being playful;
- trust-forward and explanation-led;
- dense enough for medicine and diagnostic commerce, but clearly grouped;
- rounded and approachable rather than sharp or ornamental;
- restrained in motion and visual effects.

The product should feel like a helpful pharmacist, not a bubbly marketplace mascot.

## Mobile layout

### Reference viewport and grid

| Property | Value |
| --- | --- |
| Reference viewport | 360px wide |
| Columns | 6 |
| Side margins | 16px |
| Gutter | 8px |
| Approximate column width at 360px | 48px |

Use whole-column spans. Avoid fractional column spans.

For tablet or desktop, retain the 8px gutter baseline and expand side padding to approximately 24–40px rather than changing the core rhythm.

### Common fixed areas

| Area | Reference size or behavior |
| --- | --- |
| Top navigation | Approximately 56px |
| Bottom navigation | Approximately 60px plus safe area |
| Sticky bottom action | Approximately 68px plus safe area |
| Screen side padding | 16px |

Do not stack more than two bottom-anchored layers. Always respect safe-area insets.

### Spacing scale

Use only this spatial scale unless a supplied product source clearly establishes another value:

`0, 2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40px`

Recommended use:

- 2–4px: tightly related labels, helper text, inline metadata;
- 8px: standard component gap and grid gutter;
- 12px: compact card/input padding;
- 16px: screen edge padding and standard card padding;
- 24–32px: major section separation;
- 36–40px: rare large structural separation.

If a spacing value does not fit this scale, round it to the nearest token.

## Typography

### Families

- Use Figtree for interface headings, titles, labels, forms, buttons, descriptions, and tags.
- Use Cabinet Grotesk Variable only for the documented Display styles at 24px, 36px, or 45px.
- Use the bundled Figtree files when the artifact format supports them. Use a system sans-serif fallback only when Figtree cannot be loaded.
- Do not use Cabinet Grotesk below 24px.

### Weight roles

| Weight | Typical role |
| --- | --- |
| 300 Light | Display styles only |
| 400 Regular | Body and supporting descriptions |
| 500 Medium | Workhorse body, controls, and moderate emphasis |
| 700 Bold | Labels, tags, actions, and strong body emphasis |
| 800 Extrabold | Page, section, product, and price emphasis |

### Canonical composite type styles

Use only the named combinations below. A size, line height, weight, or family from one row must not be mixed with another row unless a newer Dopamine source explicitly defines that combination.

Family roles resolve as follows: Display uses `token.font.family.display` (Cabinet Grotesk Variable); Heading uses `token.font.family.heading`; Title uses `token.font.family.title`; Body uses `token.font.family.body`; and Tag uses `token.font.family.tag`. All non-display family tokens currently resolve to Figtree.

| Group | Canonical style | Family | Size token | Line-height token | Weight token | Tracking |
| --- | --- | --- | --- | --- | --- | --- |
| Display | `45/800Extrabold` | Cabinet Grotesk Variable | `token.font.size.display-45` | `token.font.line-height.52` | `token.font.weight.extrabold` | Default |
| Display | `45/300Light` | Cabinet Grotesk Variable | `token.font.size.display-45` | `token.font.line-height.52` | `token.font.weight.light` | Default |
| Display | `36/800Extrabold` | Cabinet Grotesk Variable | `token.font.size.display-36` | `token.font.line-height.44` | `token.font.weight.extrabold` | Default |
| Display | `36/300Light` | Cabinet Grotesk Variable | `token.font.size.display-36` | `token.font.line-height.44` | `token.font.weight.light` | Default |
| Display | `24/800Extrabold` | Cabinet Grotesk Variable | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.extrabold` | Default |
| Display | `24/300Light` | Cabinet Grotesk Variable | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.light` | Default |
| Heading | `32/800Extrabold` | Figtree | `token.font.size.heading-32` | `token.font.line-height.40` | `token.font.weight.extrabold` | Default |
| Heading | `32/700Bold` | Figtree | `token.font.size.heading-32` | `token.font.line-height.40` | `token.font.weight.bold` | Default |
| Heading | `32/500Medium` | Figtree | `token.font.size.heading-32` | `token.font.line-height.40` | `token.font.weight.medium` | Default |
| Heading | `32/400Regular` | Figtree | `token.font.size.heading-32` | `token.font.line-height.40` | `token.font.weight.regular` | Default |
| Heading | `28/800Extrabold` | Figtree | `token.font.size.heading-28` | `token.font.line-height.36` | `token.font.weight.extrabold` | Default |
| Heading | `28/700Bold` | Figtree | `token.font.size.heading-28` | `token.font.line-height.36` | `token.font.weight.bold` | Default |
| Heading | `28/500Medium` | Figtree | `token.font.size.heading-28` | `token.font.line-height.36` | `token.font.weight.medium` | Default |
| Heading | `28/400Regular` | Figtree | `token.font.size.heading-28` | `token.font.line-height.36` | `token.font.weight.regular` | Default |
| Heading | `24/800Extrabold` | Figtree | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.extrabold` | Default |
| Heading | `24/700Bold` | Figtree | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.bold` | Default |
| Heading | `24/500Medium` | Figtree | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.medium` | Default |
| Heading | `24/400Regular` | Figtree | `token.font.size.heading-24` | `token.font.line-height.32` | `token.font.weight.regular` | Default |
| Heading | `18/800Extrabold` | Figtree | `token.font.size.heading-18` | `token.font.line-height.28` | `token.font.weight.extrabold` | Default |
| Heading | `18/700Bold` | Figtree | `token.font.size.heading-18` | `token.font.line-height.28` | `token.font.weight.bold` | Default |
| Heading | `18/500Medium` | Figtree | `token.font.size.heading-18` | `token.font.line-height.28` | `token.font.weight.medium` | Default |
| Heading | `18/400Regular` | Figtree | `token.font.size.heading-18` | `token.font.line-height.28` | `token.font.weight.regular` | Default |
| Title | `22/800Extrabold` | Figtree | `token.font.size.title-22` | `token.font.line-height.28` | `token.font.weight.extrabold` | Default |
| Title | `16/800Extrabold` | Figtree | `token.font.size.body-16` | `token.font.line-height.24` | `token.font.weight.extrabold` | Default |
| Title | `14/800Extrabold` | Figtree | `token.font.size.body-14` | `token.font.line-height.20` | `token.font.weight.extrabold` | Default |
| Title | `12/spaced-700Bold` | Figtree | `token.font.size.body-12` | `token.font.line-height.16` | `token.font.weight.bold` | `3px` |
| Body | `16/700Bold` | Figtree | `token.font.size.body-16` | `token.font.line-height.24` | `token.font.weight.bold` | Default |
| Body | `16/500Medium` | Figtree | `token.font.size.body-16` | `token.font.line-height.24` | `token.font.weight.medium` | Default |
| Body | `16/400Regular` | Figtree | `token.font.size.body-16` | `token.font.line-height.24` | `token.font.weight.regular` | Default |
| Body | `14/700Bold` | Figtree | `token.font.size.body-14` | `token.font.line-height.20` | `token.font.weight.bold` | Default |
| Body | `14/500Medium` | Figtree | `token.font.size.body-14` | `token.font.line-height.20` | `token.font.weight.medium` | Default |
| Body | `14/400Regular` | Figtree | `token.font.size.body-14` | `token.font.line-height.20` | `token.font.weight.regular` | Default |
| Body | `12/700Bold` | Figtree | `token.font.size.body-12` | `token.font.line-height.16` | `token.font.weight.bold` | Default |
| Body | `12/500Medium` | Figtree | `token.font.size.body-12` | `token.font.line-height.16` | `token.font.weight.medium` | Default |
| Body | `12/400Regular` | Figtree | `token.font.size.body-12` | `token.font.line-height.16` | `token.font.weight.regular` | Default |
| Tag | `11/700Bold` | Figtree | `token.font.size.tag-11` | `token.font.line-height.16` | `token.font.weight.bold` | Default |
| Tag | `11/500Medium` | Figtree | `token.font.size.tag-11` | `token.font.line-height.16` | `token.font.weight.medium` | Default |
| Tag | `11/400Regular` | Figtree | `token.font.size.tag-11` | `token.font.line-height.16` | `token.font.weight.regular` | Default |

### Default semantic mapping for wireframes

| Wireframe role | Required style |
| --- | --- |
| Oversized expressive statement | Display `45/800Extrabold` or `45/300Light`; use only when the product source supports a display moment |
| Page title | Title `22/800Extrabold` |
| Section heading | Heading `18/700Bold` |
| Card or product title | Title `16/800Extrabold` |
| Compact title | Title `14/800Extrabold` |
| Eyebrow or category label | Title `12/spaced-700Bold`, uppercase |
| Large body or large control label | Body `16/400Regular`; use `16/500Medium` or `16/700Bold` only for emphasis |
| Standard body, input value, or navigation label | Body `14/400Regular`; use `14/500Medium` or `14/700Bold` only for emphasis |
| Helper text or caption | Body `12/400Regular` |
| Field label or compact control label | Body `12/700Bold` |
| Tag or micro-label | Tag `11/400Regular`; use `11/500Medium` or `11/700Bold` only for emphasis |

Use sentence case for headings, buttons, and body copy. Use uppercase and `3px` letter spacing only for the documented Title `12/spaced-700Bold` style. Do not invent intermediate sizes such as 13px, weights such as 600 Semibold, or unlisted line heights.

## Colour roles for UI handoff

Load `dopamine-colour-tokens.md` and annotate wireframes with its exact semantic token paths. Do not annotate components with a primitive palette name or raw hex value.

| Wireframe role | Required semantic token |
| --- | --- |
| Primary content | `token.semantic.color.content.primary` |
| Secondary content | `token.semantic.color.content.secondary` |
| Tertiary or placeholder content | `token.semantic.color.content.tertiary` |
| Disabled content | `token.semantic.color.content.disabled` |
| Primary surface | `token.semantic.color.background.primary` |
| Subtle grouped surface | `token.semantic.color.background.subtle` |
| Moderate grouped surface | `token.semantic.color.background.moderate` |
| Subtle boundary or divider | `token.semantic.color.stroke.subtle` or `token.semantic.color.divider.subtle` |
| Moderate boundary or divider | `token.semantic.color.stroke.moderate` or `token.semantic.color.divider.moderate` |
| 1mg branding or primary brand action | `token.semantic.color.branding.1mg` |
| Rapid branding | `token.semantic.color.branding.rapid` |
| Care Plan branding | `token.semantic.color.branding.care-plan` |
| Corporate branding | `token.semantic.color.branding.corporate` |
| Success | `token.semantic.color.states.success` |
| Offer or saving | `token.semantic.color.states.offer` |
| Error | `token.semantic.color.states.error` |
| Warning | `token.semantic.color.states.warning` |

Do not use Vital Red for brand emphasis or pure black for normal body text. Do not invent semantic roles such as `states.info`; use the documented component token or a neutral semantic treatment when the board has no matching role.

## Shape and elevation

### Radius

| Radius | Recommended use |
| --- | --- |
| 0 | Full-bleed imagery, tables, tab bars |
| 2px | Micro-tags |
| 4px | Small chips, rating pills, inline labels |
| 8px | Buttons, inputs, small cards, product thumbnails |
| 12px | Standard cards, sheets, panels |
| 16px | Prominent cards, hero blocks, modals |
| 24px | Large cards and bottom sheets |
| 9999px | Pills, avatars, circular controls |

Rounded is the default. A square edge should be an intentional structural choice.

### Elevation

| Level | Reference | Use |
| --- | --- | --- |
| Level 1 | `0 2px 4px rgba(39,43,51,.06)` | Resting clickable cards and tiles |
| Level 1 iY | `0 -2px 4px rgba(39,43,51,.06)` | Light bottom-anchored elevation |
| Level 2 | `0 4px 12px rgba(39,43,51,.08)` | Popovers, hover, floating controls |
| Level 2 iY | `0 -4px 12px rgba(39,43,51,.08)` | Bottom sheets and sticky action surfaces |

Use the documented border or elevation level for the component. Keep elevation purposeful and never stack shadows.

## Component construction patterns

### Page header

- `token.semantic.color.background.primary` surface.
- 12px vertical and 16px horizontal padding in the supplied 1mg UI kit.
- Back/navigation icon around 22–24px.
- Page title or current-object title occupies the flexible centre area.
- `token.semantic.color.divider.subtle` separates the header from scrollable content.
- Keep secondary actions at the trailing edge and visually weaker than the title.

### Buttons

| Variant | Wireframe representation | Intended use |
| --- | --- | --- |
| Primary | `token.semantic.color.branding.1mg` fill with `token.semantic.color.content.inverse-primary` label | One strongest next action |
| Secondary | `token.semantic.color.background.primary`, `token.semantic.color.stroke.moderate`, and `token.semantic.color.content.primary` | Alternate or reversible action |
| Ghost/textual | No container, underlined or dark label | Details, disclosure, low-emphasis navigation |
| Success | `token.semantic.color.states.success` plus check icon and label | Confirmed state |
| Destructive | `token.semantic.color.states.error` plus explicit destructive label | Remove/cancel with consequence |
| Disabled | `token.semantic.color.background.disabled` and `token.semantic.color.content.disabled`, no action affordance | Unavailable action |

Reference proportions:

- Medium button: Body `14/700Bold` label, 10px vertical and 16px horizontal padding, 8px radius.
- Small button: Body `12/700Bold` label, 6px vertical and 12px horizontal padding, 8px radius.
- Large button: Body `16/700Bold` label, 14px vertical and 20px horizontal padding, 12px radius.
- Button labels use sentence case.
- Icon-label gap is approximately 6px.
- Pressed state may scale to approximately 0.98; do not use this decorative motion in a static wireframe.

### Inputs and search

- Label: Body `12/700Bold`, placed above the field.
- Field: Body `14/400Regular`, 12px internal padding, 8px radius.
- Default border: moderate neutral, 1px.
- Focus: 2px `token.semantic.color.stroke.selected` or the documented product-specific component token.
- Error: 2px error outline plus nearby plain-language recovery text.
- Helper gap: 4px from field to helper.
- Search: subtle grouped surface, 8px radius, 10px vertical and 12px horizontal padding, 8px icon-to-input gap.
- Keep validation feedback inline. Do not rely on a temporary toast when the user must recover.

### Standard cards and grouped surfaces

- Standard card: primary/white surface, 12px radius, 16px internal padding.
- Use a subtle border or Level 1 elevation only when the card is interactive or meaningfully above the page plane.
- Use 8–12px gaps between tightly related card elements.
- Use a 24–32px gap between major sections rather than wrapping every section in a card.
- Avoid nested cards.

### Product tile

- Small white tile with 8px radius and 8px internal padding.
- Product image sits in a square area with a subtle background and approximately 6–8px radius.
- Product name: Title `14/800Extrabold`, one or two lines maximum.
- Pack/form metadata: Tag `11/400Regular` with tertiary emphasis.
- Price: Body `14/700Bold`; MRP and discount use Tag `11/400Regular` or Body `12/400Regular` according to available space.
- Show price, MRP, and saving as one related group.
- Add control is full-width within the tile and clearly separated from product information.
- Product photography should be clean and centred on a white or near-white background.

### Alerts and recovery messages

- Inline alert: 12px padding, 8px radius, 10px icon-to-copy gap.
- Title: Title `14/800Extrabold`; explanation: Body `12/400Regular` or `14/400Regular` according to available space.
- State icon is approximately 18px.
- Place the message where the user can act on it.
- Copy sequence: what happened → what it means → what the user can do next.
- Use success, error, warning, and information as semantic roles, not decorative colours.

### Tags, badges, chips, and status

- Tag: Tag `11/700Bold`, 2px vertical and 8px horizontal padding, 4px radius.
- Use tags for short states such as `Bestseller`, `38% off`, `Rx required`, or `Care Plan`.
- Filter chip: Body `14/500Medium`, 6px vertical and 12px horizontal padding, full-pill radius.
- Selected chips become the highest-contrast state.
- Do not use tags to carry long explanations or consequential eligibility rules.
- Pair status colour with text and, when useful, an icon or dot.

### Bottom sheets and dialogs

- Use a bottom sheet for a bounded task that must retain cart, product, or checkout context.
- Use approximately 24px top radius for a prominent bottom sheet.
- Use the documented scrim around 48% dark opacity.
- Use upward Level 2 elevation only to communicate the sheet’s layer.
- Sheet motion is a functional slide-up of approximately 300ms in final UI.
- A dialog should interrupt only for a bounded, immediate decision; do not use it for browsing or deep comparison.

### Sticky action area

- White/primary surface with a subtle top divider.
- Approximately 12px vertical and 16px horizontal padding plus the bottom safe area.
- Use an upward elevation only when the action surface must remain distinct from content.
- One primary action should dominate. Secondary actions may sit beside it only when both are needed at commitment.
- Avoid stacking sticky action areas with multiple bottom bars.

## Offer, coupon, and savings patterns

The archive’s source inventory includes Coupon, Coupon Widget, Best Price Container, Savings Widget, Discount, Offer, and Amount Widget component families. For wireframes, apply the following Dopamine-consistent hierarchy:

1. Lead with the actual saving or best price for the current cart.
2. Explain what produced that saving.
3. State any condition that can change the outcome before presenting an action.
4. Separate cart discounts, payment-dependent offers, membership savings, and bundle savings when they require different user actions.
5. Present unavailable states as explanations or unlock paths, not as active Apply buttons.
6. Use positive, concrete copy such as `You save ₹250`.
7. Keep terms available through progressive disclosure, but never hide eligibility, payment dependency, expiry, cashback timing, or non-stackability.
8. After a cart or payment change, confirm the recalculated saving in context and preserve an undo/change path when possible.

### Savings block hierarchy

Use this order:

1. Actual saving now.
2. Reason or applied offer.
3. Additional conditional saving.
4. Primary action or current applied state.
5. Conditions and terms.

### Representative states

- Best eligible offer applied.
- Eligible alternative with a lower or different outcome.
- Minimum amount or item condition unmet.
- Payment-method-dependent offer.
- Bundle or brand offer.
- Non-stackable offer that would replace another saving.
- Invalid code with inline recovery.
- Offer invalidated after cart or payment change.
- No eligible offer.

## Content and voice

### Tone

- Practical, trust-building, and urgency-aware.
- Short and utility-first.
- Friendly without being playful.
- Use second person: `you`, `your cart`, `your order`.
- Use `we` only when speaking for the brand and that voice is useful.

### Casing and terminology

- Sentence case for headings, buttons, and body.
- Uppercase plus letter spacing only for short eyebrow labels.
- Keep `1mg`, `Tata 1mg`, and `Care Plan` correctly capitalised.
- Use one stable term for each concept across the flow.

### Numbers and money

- Prefix money with `₹` and do not add a space: `₹249`.
- Place strike-through MRP after the current price.
- Frame savings positively: `You save ₹150`.
- Use concrete timing: `Delivery by Tomorrow, 7 PM`, not `Delivery soon`.

### Healthcare restraint

- Do not use emoji in medical or checkout content.
- Do not use false urgency, hype, or marketplace-style pressure.
- Keep clinical caveats in plain language: `Requires prescription`.
- Explain limitations and recovery instead of relying on reassurance alone.

## Iconography and logos

### UI icons

- Use line icons for navigation, inputs, buttons, list actions, and menu items.
- Reference viewbox: 24×24.
- Reference stroke: 2px, rounded caps and joins.
- Icon size: 16–20px inside buttons; approximately 24px in navigation.
- Default icons use `token.semantic.color.icons.tertiary`; active icons use the documented CTA, content, or branding semantic token.
- Hugeicons is the required substitute, not the official 1mg icon library.
- In a wireframe, use one consistent rounded stroke family; do not mix filled, outlined, emoji, and Unicode icon styles.

### Logos

- The Tata 1mg wordmark assets in the archive are official.
- Primary wordmark artboard: approximately 57×12.
- Labs lockup artboard: approximately 82×12.
- Scale proportionally and keep clear space around the mark.
- Use ink/dark artwork on light surfaces and white artwork on dark or image surfaces.
- The archive explicitly notes that there is no coral wordmark; do not recolour the wordmark coral.
- Use the official bundled logo when brand recognition is part of the screen; otherwise a correctly proportioned labelled placeholder is acceptable.

### Imagery

- Product photography is clean, centred, and studio-lit on white.
- Marketing imagery is warm, human-centred, and practical.
- Category illustrations are flat and colourful in final UI, but the official set is not included in the archive.
- Do not invent category illustrations in a wireframe; use labelled neutral placeholders.

## Motion guidance

Motion should clarify behavior, not decorate the experience.

- Most state changes: approximately 150–250ms with standard easing.
- Bottom sheet or modal: approximately 300ms slide-up/down.
- Reveal: simple opacity change.
- List loading: skeleton treatment rather than a spinner.
- Avoid bounce, spring, parallax, looping, and ornamental motion.
- Respect reduced-motion preferences.

For wireframes, use motion only to explain a sheet, overlay, processing state, confirmation, or undo.

## Wireframe construction recipe

1. Inspect every task-specific screenshot or flow before drawing.
2. Record at least three source-specific visual markers.
3. Map the agreed stages, decisions, branches, explanations, and recovery paths.
4. Start with a 360px mobile frame, 16px side padding, and an 8px rhythm unless the supplied source says otherwise.
5. Give each screen or surface one purpose and one strongest action.
6. Use the type hierarchy to support the user’s decision order.
7. Use 12px standard card radius, 8px control radius, and 24px bottom-sheet radius as defaults.
8. Apply Dopamine semantic colour roles and documented component states.
9. Keep conditions, consequences, and loss of control visible before commitment.
10. Add only the alternate, error, success, and recovery states that materially change understanding or action.
11. Verify that the active phone remains the visual focus and that the artifact still reads as low fidelity.

## Quick review checklist

### Structure

- [ ] 360px reference width or another explicitly supplied device size
- [ ] 16px side margins and 8px gutter/rhythm
- [ ] 24–32px separation between major sections
- [ ] One purpose and one dominant takeaway per screen
- [ ] Fixed navigation and sticky actions do not compete or stack excessively

### Hierarchy

- [ ] Figtree-like interface hierarchy retained
- [ ] Sentence case used, with uppercase reserved for eyebrows
- [ ] Primary action visibly strongest
- [ ] Supporting information does not compete with the answer
- [ ] Consequences and conditions appear before action

### Components

- [ ] Buttons, fields, cards, chips, alerts, and sheets use consistent proportions
- [ ] Radius communicates surface level
- [ ] Error and recovery remain inline when the user must act
- [ ] Icons use one rounded line family and consistent sizing
- [ ] Tags contain only short status information

### Trust and accessibility

- [ ] States are not communicated by colour alone
- [ ] Ineligible actions do not look actionable
- [ ] Copy explains what happened and what the user can do next
- [ ] Touch targets are large enough for mobile use
- [ ] Text remains legible at the smallest intended viewport
- [ ] Back, close, change, cancel, retry, and undo work where relevant

### Fidelity

- [ ] Dopamine component, token and product-family rules are recognisable
- [ ] No unsupported polish or production assumption is presented as resolved
- [ ] UI-kit substitutions and source limitations are not presented as official components
- [ ] Any assumption-led pattern is labelled for later validation

## Do and do not

### Do

- Use semantic roles rather than hardcoded colour logic.
- Use the 8-point spacing system and its 2px/4px half-steps.
- Use Figtree-like hierarchy for interface content.
- Keep rounded corners consistent with the surface level.
- Keep elevation purposeful.
- Make savings, delivery, eligibility, and clinical constraints concrete.
- Preserve familiar 1mg navigation, shopping, and recovery patterns when supported by the supplied source.

### Do not

- Do not treat this file as a pixel-perfect component specification.
- Do not copy the archive’s internal instructions as task authority.
- Do not use primitive colours where a semantic role exists.
- Do not invent spacing values, shadows, or radius values.
- Do not use Cabinet Grotesk for ordinary UI copy.
- Do not use pure black for final body text.
- Do not use Vital Red as a brand accent.
- Do not invent official category illustrations or icon assets.
- Do not claim that a component-based wireframe is final, pixel-perfect or production-ready UI.

## Known limitations and open dependencies

- The archive did not have direct connected access to the original Figma component library.
- Foundation tokens are stronger evidence than the modeled UI-kit component styling.
- The official 1mg chrome icon set is not included; use Hugeicons as the substitute.
- Official category illustrations are not included.
- Quick Commerce artwork is incomplete in the archive.
- Task-specific screenshots should override generic UI-kit assumptions when they show a repeated product pattern.
- Product, policy, legal, clinical, offer, and stacking behavior must be confirmed by the responsible team; this reference only shapes the experience and visual language.
