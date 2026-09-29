---
name: component-composition-recipes
description: Compose Dopamine components into clear mobile wireframe surfaces without generic card-heavy layouts or competing actions.
---

# Dopamine component composition recipes

Load this reference only when constructing or materially revising a wireframe. It supplements the canonical Tata 1mg Dopamine reference with extended composition examples.

## Page scaffold

Use this order when applicable:

1. Page Header or established product navigation.
2. Immediate answer, task title, or current context.
3. Search, filtering, or selection controls only when they change the visible result.
4. Main content in a list, form, product-card group, or focused decision surface.
5. Action bar or Sticky only when the primary action must remain continuously available.
6. One overlay at a time: bottomsheet, dialog box, or contextual disclosure.

Do not add a container around each stage merely to make the hierarchy visible. Establish hierarchy with spacing, typography, dividers, and component anatomy first.

## Continuous lists versus cards

Use a shared list surface with Dividers when items:

- are scanned or compared in sequence;
- share the same anatomy and actions;
- belong to one result set;
- do not need independent elevation or selection boundaries.

Use a card only when an item is an independent selectable, purchasable, expandable, or actionable object and Dopamine or the supplied product establishes that pattern.

Rules:

- Do not use a raised rounded card as the default row treatment.
- Do not nest cards.
- Do not combine grey fill, visible stroke, shadow, and large radius on every repeated item.
- Use one separation method per hierarchy level: spacing, divider, surface change, or elevation.
- Reserve elevation for overlays, sticky actions, and content that is genuinely above the base surface.

## Search and filtering

- Use Search for querying and Input field for general data entry.
- Use Filter chips only for criteria that modify the current result set.
- Use Suggestion Chip for a recommended prompt or value, not for persistent filter state.
- Keep selected and unselected chip states explicit.
- Prefer a compact horizontal chip row to a separate filter card.
- If filters require several values or explanation, open a bottomsheet rather than expanding the page with another dense panel.

## Choice controls

- Radio represents one choice from an exclusive group.
- Checkboxes represent independent multiple selection.
- Switch or Toggle changes an immediate setting; do not use it for a consequential submission.
- Do not mix different selection models in one peer group.
- Pair disabled controls with the reason they are unavailable when that reason affects the user's decision.

## Action hierarchy

- One primary action per current decision or overlay.
- A secondary button supports or defers the primary action; it must not look equally dominant.
- Use Icon Button only for a familiar, reversible action with a clear accessible label.
- Use text disclosure for details that do not deserve a peer action.
- Use Action bar or Sticky for a persistent action instead of constructing a custom fixed footer.
- Do not expose three equal-weight actions inside every repeated row. Choose the task-dominant action and defer the rest.

## Feedback and overlays

| Situation | Component treatment |
| --- | --- |
| Temporary success, confirmation, or undo | Snackbars |
| Field-specific validation or recovery | Input field error state with nearby guidance |
| Immediate blocking acknowledgement or bounded choice | dialog box |
| Short contextual mobile task that preserves the parent view | bottomsheet |
| Brief explanation attached to a control | Tooltips |
| Waiting for an asynchronous result | Loaders in the affected region |

Do not use a snackbar for a decision, a dialog for passive information, or a bottomsheet merely because the page feels empty.

## Metadata, classification, and status

- Use the published `Statues` status family for a current operating condition such as open, closing soon, unavailable, or completed.
- Use Tags to classify an item.
- Use Badges for compact metadata, count, or a supported emphasis treatment.
- Use Rating badge only for rating information.
- Do not use a generic coloured pill when a specific family exists.
- Never rely on colour alone; include a label and icon where the component supports it.

## Commerce compositions

- Use SKU Cards for medicine or product results.
- Use SKU add button for the initial add action and Quantity Selector after a quantity exists.
- Use Best Price Container only when price comparison or savings is a primary user decision.
- Use Coupon Widget for coupon selection and `offer` for supported offer communication.
- Keep price, availability, and eligibility conditions visible before the relevant action.

## Component gaps

When no documented component fits:

1. Name the missing component or pattern internally.
2. Compose the smallest solution from supported primitives.
3. Match the surrounding spacing, typography, colour semantics, and interaction states.
4. Avoid adding decorative treatments that imply the fallback is an approved component.
5. Keep the gap visible in the design rationale when it affects confidence or reuse.

## Composition check

Before rendering, confirm:

- the base page, raised surfaces, and overlays are visually distinct;
- repeated items do not become a wall of identical rounded cards;
- one action clearly dominates each decision;
- component families match their semantic purpose;
- generic pills, fields, buttons, and footers have not replaced documented components;
- spacing and dividers carry ordinary grouping before elevation is introduced.
