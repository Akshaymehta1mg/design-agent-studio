---
name: dopamine-component-catalog
description: Archived local Dopamine family index for disambiguating components when the canonical Tata 1mg design-system reference needs supporting detail.
---

# Dopamine component family index

Use this reference only when creating or materially revising a wireframe.

This is an archived local index, not a live source of truth. Start with `../../tata-1mg-development-design-system.md`; use this file only to disambiguate a listed family or identify a component gap.

## Published family index

Use this as a local index, not as proof that a particular variant or platform version is current. Resolve the required family from the canonical Tata 1mg Dopamine reference and supplied product evidence.

| Need | Published Dopamine families to inspect |
| --- | --- |
| Actions | Buttons, Icon Button, SKU add button, Action bar, Sticky |
| Text entry and search | Input field, Search |
| Choice and filtering | Checkboxes, Radio, Switch, Toggle, Standard chips, Small chips, Suggestion Chip, Filter chips |
| Navigation | Page Header, navigation, Horizontal Tabs, Vertical Tabs |
| Feedback and overlays | Snackbars, dialog box, bottomsheet, Tooltips, Loaders |
| Metadata and state | `Statues` (the current published status-family name), Badges, Info badge, Notification badges, Rating badge, Tags |
| Structure | Dividers |
| Commerce | SKU Cards, Quantity Selector, Best Price Container, offer, Coupon Widget, Ratings |

Some families have duplicate published names. Resolve the intended platform and product context from supplied evidence and the canonical Tata 1mg Dopamine reference; never choose between same-name sets by name alone.

## Semantic selection guide

| User need | Prefer | Avoid substituting |
| --- | --- | --- |
| Search or query | Search | A general Input field with a decorative search icon |
| General data entry | Input field | A custom bordered field |
| Filter a result set | Filter chips | Buttons or generic pills |
| Offer a suggested prompt or value | Suggestion Chip | A filter chip |
| One exclusive choice | Radio | Checkboxes or independent buttons |
| Multiple choices | Checkboxes | Radio or unrelated chips |
| Immediate settings change | Switch or Toggle | A confirmation button unless the change is consequential |
| Main action | Buttons | A custom filled rectangle |
| Familiar icon-only action | Icon Button | An unlabeled icon with no interactive treatment |
| Persistent bottom action | Action bar or Sticky | An absolutely positioned custom footer |
| Temporary acknowledgement | Snackbars | A dialog or permanent inline panel |
| Blocking bounded decision | dialog box | A snackbar |
| Contained mobile task | bottomsheet | A new page when parent context remains important |
| Current condition | The published `Statues` status family | A generic coloured pill |
| Classification | Tags | A status treatment |
| Compact metadata or count | Badges | A tag or action chip |
| Continuous list separation | Dividers and spacing | A raised card around every row |
| Product or medicine result | SKU Cards | A custom product card |
| Add or change product quantity | SKU add button or Quantity Selector | A generic plus button or stepper |
| Coupon choice | Coupon Widget | A custom ticket treatment when the widget supports the need |

## Component mapping

Before construction, keep a concise internal map for the agreed surface:

| User need | Dopamine family | Variant and state | Gap or fallback |
| --- | --- | --- | --- |
| What the user must do or understand | Exact published family | Only the states needed for the flow | `None`, or a named gap and supported primitive composition |

Do not construct the wireframe until every required interaction is mapped. Keep the map internal unless the user asks to review component choices.

## Selection rules

- Prefer a ready documented component over a custom recreation when it supports the required behavior.
- Use the documented variant, size, and state instead of restyling the component into a new one.
- Preserve the component's documented anatomy, slots, proportions, and action hierarchy when recreating it in HTML.
- Compose approved components and primitives before proposing a new component.
- Do not use a component merely because it exists; it must fit the user decision and surface.
- When no documented component fits, compose the simplest supported primitives, label the component gap, and avoid making the fallback look like an approved component.
- Use only states supported by the chosen component. Do not invent a state for visual variety.

## Source priority

1. Supplied product screens and flows define context, density, navigation, and repeated product behavior.
2. `../../tata-1mg-development-design-system.md` defines approved component families, variants, states, token roles, and construction rules.
3. This local index provides supporting family names only.
4. Familiar platform conventions fill only gaps that the product and Dopamine sources do not cover.

## Availability fallback

When this archived index or an optional portable bundle does not resolve a required component, use the canonical Tata 1mg Dopamine reference, supplied product sources, and familiar platform conventions. State a component gap only when the uncertainty materially reduces confidence in the wireframe.
