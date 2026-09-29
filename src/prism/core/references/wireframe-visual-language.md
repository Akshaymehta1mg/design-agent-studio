---
name: wireframe-visual-language
description: Give interactive component-based wireframes a disciplined Dopamine 2.0 visual language derived from the design-system reference and supplied product screens without claiming final or production-ready UI.
---

# Wireframe Visual Language

## Purpose

A component-based wireframe should look deliberate, coherent, and recognisably related to the product without being presented as final or production-ready UI. Use this reference after solution coverage, content hierarchy, and interaction surfaces are agreed.

This is a wireframe construction contract, not a design-system specification or post-development design QC process.

## Source priority

Source inspection is mandatory whenever the user supplies screenshots, product screens, or a flow. Open every relevant frame with the available image or board viewing tool. Do not begin construction until a concrete source-language extraction is visible in the response and confirmed through `wireframe-preflight.md`; generic statements such as “preserve the product style” do not satisfy this gate.

Use visual sources in this order:

1. screenshots, product screens, or flows supplied by the user;
2. patterns repeated across their relevant frames;
3. `../../tata-1mg-development-design-system.md` for components, variants, states, tokens, and construction rules;
4. familiar platform conventions.

Always load `../../tata-1mg-development-design-system.md`. Consult its deep supporting sources only when a material detail is missing. Do not infer missing official components from a single screen or claim pixel-perfect accuracy.

## Apply Dopamine rules and components

When screenshots, product screens, or flows are supplied, inspect every relevant frame and carry forward the repeated visual language:

- information density;
- layout rhythm and screen padding;
- navigation placement;
- component proportions;
- card and container shapes;
- corner-radius character;
- content grouping;
- typography hierarchy;
- placement of primary and secondary actions;
- icon style and sizing;
- bottom-sheet, dialog, and disclosure behavior;
- familiar interaction patterns.

Express those qualities with Dopamine semantic colours, Figtree typography, the 8-point spacing system, documented radii, borders, elevation levels, icons and component states. Treat a flow as evidence of both visual language and cross-screen continuity; do not copy its board layout as interface structure.

Use documented Dopamine treatments for:

- product-brand and semantic colours;
- Figtree interface typography and Cabinet Grotesk display typography where appropriate;
- buttons, inputs, alerts, badges, chips, product cards, navigation, sheets and sticky actions;
- official bundled logos and product imagery when relevant;
- the two documented elevation levels and the established radius scale.

Do not invent missing official illustrations, icons, components, tokens or production behavior. Use Hugeicons when the official product icon set is unavailable.

## Component composition and surface hierarchy

Use `component-composition-recipes.md` to choose the right component family and arrange it with other components. Token compliance does not compensate for weak anatomy or hierarchy.

- Preserve documented component anatomy, slots, proportions, and states; do not draw a generic lookalike.
- Use a continuous list with spacing and Dividers when items belong to one scan or comparison set.
- Use cards only for independent selectable, purchasable, expandable, or actionable objects.
- Do not nest cards or apply grey fill, border, shadow, and large radius to every repeated item.
- Use one separation treatment per hierarchy level and reserve elevation for genuinely raised surfaces.
- Give each current decision one visually dominant action; defer supporting actions through secondary, icon, or disclosure treatments.
- Use the published `Statues` status family, Tags, Badges, and chips for their documented semantic roles rather than as interchangeable coloured pills.
- Record a component gap when no family fits; compose supported primitives without implying the fallback is official.

If a supplied pattern would reduce clarity, accessibility, or comprehension in the wireframe, preserve the familiar behavior where possible and note the structural deviation. Do not silently reproduce a weak pattern.

## Semantic token application

| Product treatment | Wireframe treatment |
| --- | --- |
| 1mg primary action | `token.semantic.color.branding.1mg` with `token.semantic.color.content.inverse-primary` |
| Saving or success | `token.semantic.color.states.offer` or `token.semantic.color.states.success` plus explicit label/icon |
| Information | Use a documented component token; otherwise use neutral content/icon semantics because no general information-state semantic exists |
| Error or destructive action | `token.semantic.color.states.error` plus recovery or consequence |
| Warning | `token.semantic.color.states.warning` plus consequence and next action |
| Selected state | `token.semantic.color.stroke.selected` with an explicit selected treatment |
| Disabled state | Disabled background, content, icon, and stroke semantic tokens with no action affordance |
| Decorative illustration | Use only official supplied assets; otherwise use a labelled placeholder |

Apply colour semantically, not decoratively, and never rely on colour alone. Do not bind primitive palettes or raw hex values directly to wireframe components.

Use neutral surfaces as the base while preserving intentional contrast for the primary action, selection, and meaningful status. If every section uses the same grey fill, border, and emphasis, revise the hierarchy instead of adding decorative colour.

## Default construction system

Use the product reference to adjust character while keeping these defaults disciplined:

- mobile viewport: `360 × 800px` unless another device is explicitly in scope;
- spacing: an `8px` base rhythm, with `4px` only for tightly related details;
- screen padding: `16px` by default;
- primary action height: `48px`;
- compact controls: at least `40–44px` where interaction is required;
- page title: Dopamine Title `22/800Extrabold`;
- section heading: Dopamine Heading `18/700Bold`;
- card or product title: Dopamine Title `16/800Extrabold`, or `14/800Extrabold` in compact contexts;
- standard body: Dopamine Body `14/400Regular`;
- large body: Dopamine Body `16/400Regular`;
- helper or caption: Dopamine Body `12/400Regular`;
- tag or micro-label: Dopamine Tag `11/400Regular`;
- emphasized body, labels, and actions: use only the documented 500 Medium or 700 Bold variant at the same size and line height; never use 600 Semibold;
- card and container radius: use the documented component radius; for a genuine custom container, use `12–16px` only when its independent object boundary requires it;
- icons: the official icon set when available, otherwise Hugeicons, normally `20–24px`;
- primary action: `token.semantic.color.branding.1mg` fill with `token.semantic.color.content.inverse-primary` label;
- secondary action: `token.semantic.color.background.primary` with `token.semantic.color.stroke.moderate` and `token.semantic.color.content.primary`.

Precise spacing and alignment are required. Pixel-perfect reproduction of the supplied screen is not.

## Artifact presentation

Keep the wireframe itself as the visual focus:

- place the screen-state switcher outside the device frame;
- show one active phone screen at a time unless side-by-side comparison is the explicit purpose;
- center the device frame on the canvas;
- keep the device fully visible at the intended review size;
- use clear selected and unselected switcher states;
- preserve the product's relevant entry or parent context instead of presenting only isolated screens;
- keep design reasoning in a separate notes view, collapsible panel, or secondary tab.

Do not place a permanent explanation panel beside the phone when it competes with the wireframe. Notes may explain the user moment, hierarchy, assumptions, and open decisions, but the product experience remains primary.

## Interaction and motion

Wire the actions necessary to explain the flow. Use simple motion only when it clarifies a state change, overlay, progress change, system response, or recovery. Keep timing restrained and avoid decorative or brand-expressive animation.

## Wireframe craft check

Before delivery, inspect the rendered artifact itself and revise it when needed:

- Is the phone or active screen the main visual focus?
- Is the complete device visible without accidental cropping?
- At the target viewport, is scrolling intentional and is no row, card, action, or overlay accidentally clipped?
- Are spacing, alignment, grouping, and proportions consistent?
- Is hierarchy clear while brand and semantic colour remain purposeful?
- Does every applied colour use a documented semantic or component token rather than a primitive or raw hex value?
- Are primary and secondary actions visually distinct?
- Is there one dominant action per current decision rather than several equal-weight controls?
- Do repeated results use list rhythm and Dividers unless they genuinely require independent cards?
- Has the wireframe avoided nested cards and repeated combinations of grey fill, stroke, shadow, and large radius?
- Does every generic fallback record a component gap instead of imitating an official component?
- Are icons consistent in family, size, and stroke?
- Are official icons or Hugeicons used instead of placeholder glyph blocks?
- For standalone HTML, is UTF-8 declared and are punctuation, currency, separators, and apostrophes rendered correctly?
- Are selected and unselected states immediately understandable?
- Does supporting explanation compete with the product experience?
- Does the wireframe reflect the supplied sources and Dopamine component language?
- Was the mandatory source-language extraction completed before construction began?
- Does the extraction name the inspected sources and at least three details that could only have come from them?
- Does it remain a review artifact and avoid claims of final, pixel-perfect or production-ready accuracy?

This is a self-check of the artifact being created, not design QC of developed software.
