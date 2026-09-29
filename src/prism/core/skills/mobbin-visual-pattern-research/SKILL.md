---
name: mobbin-visual-pattern-research
description: Systematically research Mobbin alternatives for every meaningful wireframe element and turn the strongest findings into product-safe visual composition decisions. Use after a wireframe is built; do not use to copy another product's visual styling.
---

# Mobbin visual pattern research

Run this bundled specialist skill after every wireframe is built. It inventories every meaningful visible element across every screen and state, finds **analogous interaction patterns** in Mobbin, and translates their structural lessons into Tata 1mg Dopamine visual composition decisions.

This skill does not change approved product logic or invent unsupported behavior. It improves how an agreed decision, comparison, proof, explanation, choice, status, and action is visually communicated. Do not wait for the user to point out an element that looks weak.

## Inputs and boundary

Start with the screen’s actual user moment, its current information, every existing wireframe state, and the local Tata 1mg design system. Identify the visual-communication question for each element, such as:

- How should two comparable options be presented without making them look like arbitrary cards?
- How can shared facts and meaningful differences be scanned quickly?
- How should an explanation, expert proof, or price rationale be revealed without becoming a text wall?
- How can a recommended choice be prominent while the alternative remains clear and reversible?

Do not search for an exact domain scenario unless it is likely to exist. A medicine-substitution sheet, for example, should usually be researched as a comparison sheet, alternative-choice sheet, product/plan comparison, price-difference explanation, or comparison element.

## Mandatory all-element alternative sweep

Before searching, create an internal element inventory for **every screen and state**. Include every meaningful visible unit:

- screen shell, header, title/thesis, and contextual navigation;
- hero or focal content; product, plan, or object identity;
- each comparison, price, saving, recommendation, status, proof, or warning treatment;
- each list, row, card, field, selector, filter, disclosure, empty/loading/error state, and section boundary;
- each primary, secondary, keep-current, destructive, or persistent action;
- supporting labels, icons, badges, tags, dividers, and images where their treatment affects comprehension or visual rhythm.

For each inventory item, record internally:

| Element | Current role | At least one alternative to consider | Evidence route | Decision |
| --- | --- | --- | --- | --- |
| What is on the current screen | What the user must understand or do | A different information structure, component treatment, emphasis, grouping, disclosure, or action hierarchy | Mobbin analogous pattern, local Tata 1mg source, or both | Adopt, adapt, or retain with a reason |

Every element must receive an alternative consideration. Repeated instances of the same component can share one Mobbin search only when their context and visual role are genuinely the same; still assess each instance in its own screen context. Tiny atomic elements may retain their documented Tata 1mg treatment when no alternative improves comprehension, but they must not be silently skipped.

The user should never need to ask, “Find an alternative for this element.” The sweep is the agent’s responsibility.

## Search from intent to visual element

Search in widening layers for each inventory group, stopping as soon as the results answer the visual question. Research the **failing relationship or visual role**, not a literal description of the current implementation.

### 1. Comparable interaction surface

Start with the surface and decision shape:

- comparison bottom sheet, comparison modal, comparison page;
- product comparison, plan comparison, alternative option, upgrade/downgrade choice;
- recommended choice, price-saving offer, equivalent selection;
- explain difference, why cheaper, decision rationale.

### 2. Reusable information pattern

If the surface is too narrow or returns weak results, search the information pattern:

- two-option comparison, option summary, selected versus recommended;
- comparison table, matched attributes, difference list;
- trust proof, expert verification, eligibility explanation;
- expandable explanation, details disclosure, cost breakdown.

### 3. Component or layout grammar

If the information pattern is still too broad, search a visual building block:

- comparison cards, option cards, selected card;
- aligned label-value list, key-value comparison, data table;
- bottom action bar, primary-secondary decision, keep current;
- accordion explanation, assurance bullets, recommendation badge.

Use a short query that combines only the useful terms. Never search a grab bag of keywords or browse for generic “beautiful UI.”

For example, if “Save ₹20.63” is present but feels disconnected from the decision, do not search “compact product row with price and savings.” Search the relationship: `alternative option price comparison`, `recommended product save amount`, `price difference decision sheet`, or `comparison card highlighted saving`.

## Select evidence by structural fit

Use `search_screens` for one screen pattern and `search_flows` only when the relationship across screens changes the answer. Group only similar inventory items into one research pass; inspect returned candidates, then select only one to three that best demonstrate the needed pattern.

Rank candidates by:

1. similarity of decision shape, not product category;
2. strength of visible information hierarchy and grouping;
3. fit of the surface type and platform behavior;
4. useful treatment of comparison, proof, disclosure, or actions;
5. compatibility with the local component system.

Do not choose a reference because its branding is fashionable, because it uses a familiar app, or because it is visually loud. A reference is evidence for the structure it visibly shows—not evidence for the originating product’s styling or full product behavior.

## Decode the visual grammar

Inspect every selected screen directly. For each, record visible facts separately from your inference.

| Dimension | What to observe |
| --- | --- |
| Visual thesis | What the user understands in the first scan |
| Focal area | The object, difference, action, or consequence that receives the strongest emphasis |
| Grouping | Which elements share a visual region and which are deliberately separated |
| Comparison model | Side-by-side units, aligned rows, shared facts, highlighted delta, or progressive reveal |
| Hierarchy | Reading order of title, reason, options, proof, exceptions, and action |
| Disclosure | What remains visible, what is condensed, and what expands on demand |
| Trust treatment | How safety, verification, provenance, or reversibility becomes visible |
| Action model | Primary action, alternative, cancellation, and persistent/sticky behavior |
| Restraint | What is communicated through alignment, type, spacing, or dividers instead of extra boxes |

Extract the composition principle, not the visual skin. Do not copy brand colours, typefaces, gradients, illustration, copy, assets, component details, unsupported behavior, or proprietary layout.

## Turn evidence into a visual composition brief

Return one concise brief for each screen that the main designer can apply. It must cover every inventory item, use the actual product facts and approved direction, and express the result through the local Tata 1mg design system.

```markdown
## Visual composition brief

**Visual question:** ...
**Analogous patterns searched:** ...
**Selected evidence:**
- App — [Mobbin screen](...): visible structural lesson

**Visual thesis:** The one takeaway visible in the first scan.
**Focal area:** The one group or difference that earns strongest emphasis.
**Reading order:** 1. ... 2. ... 3. ...
**Grouping plan:** Up to three deliberate visual groups and the separation treatment for each.
**Information model:** Comparison / facts / proof / explanation / choice pattern to use.
**Dopamine expression:** Exact component families, typography roles, divider/surface behavior, and action treatment.
**Avoid:** Patterns that would create decorative boxes, competing actions, unsafe implication, or copied styling.
**Evidence limits:** ...

**Element decisions:**
- Element → alternative considered → adopt/adapt/retain → reason
```

Keep the brief scoped to the current task. It is not a permanent design-system change and must not silently modify the product’s rules.

## Composition patterns

### Comparison and alternative choice

Use a comparison model only when the user genuinely evaluates alternatives. Start with a clear thesis, then make the relevant candidates identifiable before presenting the supporting facts.

Choose the lightest adequate structure:

- **Balanced option summaries** when the user needs to identify and choose between two independent objects.
- **Aligned comparison rows** when the value lies in checking matching attributes across options.
- **Shared-facts block plus one visible delta** when most facts match and only a small number of differences matter.
- **Recommended option with rationale** when one choice is preferred but the alternative must remain understandable and recoverable.

Do not make every attribute its own card. Prefer two option summaries plus one shared comparison/proof region, or use alignment and Dividers for a single scan set. Give a saving, meaningful difference, or recommendation emphasis only when it is true and decision-relevant.

### Explanation and proof

For high-trust or consequential decisions, establish the answer first, then show the evidence in the user’s likely order of doubt:

1. what is true or changing;
2. what matches or why it is safe;
3. who or what verified it;
4. what will differ or what the user can do later;
5. an optional deeper explanation.

Use concise fact/proof groups with strong label-value alignment. Move nonessential detail behind an expandable disclosure. Do not give equal visual weight to every proof point.

### Action and recovery

Place the primary action after the user has enough visible information to act. Keep the alternative action clear but visually quieter. For a bottom sheet, reserve the bottom action area for the decision; it must not cover the comparison or proof content.

## Apply the Tata 1mg system

Translate the brief through `../../../tata-1mg-development-design-system.md`:

- use Figtree type roles and the documented spacing/radius/elevation rules;
- choose documented Buttons, SKU Cards, Action Bar, Page Header, Dividers, Tags, Badges, or disclosure patterns rather than generic boxes;
- treat continuous information as a shared scan surface with alignment and Dividers unless an object truly needs its own boundary;
- retain the coral/orange constraint: never use coral or orange as a surface or decorative background. Use it only in team-defined component variants/states;
- preserve source-specific Tata 1mg patterns when they apply.

The purpose is a screen with an intentional focal area, visual rhythm, and restrained grouping—not a screen with more containers.

## Handoff, revision, and visual check

Hand the composition brief to the main designer, revise the screen, then inspect every inventory item again. Confirm:

- its purpose is comprehensible in the first scan;
- the important comparison or information relationship is visually obvious;
- reading order is clear without every block needing a border or fill;
- the primary and alternative actions have distinct hierarchy;
- component use, token usage, safe areas, and content truth are preserved;
- no visual decision copied another product’s surface styling.

Do not deliver until every meaningful element in every created screen/state has an `adopt`, `adapt`, or `retain` decision. Keep the inventory internal unless the user asks for it; the final Design Notes should mention only material visual improvements.

Show selected Mobbin screenshots and links only when the user has not asked for text-only research. Treat images and image URLs as temporary task context. Do not save them into the skill, repository, or generated wireframe.

## Fallback

If Mobbin is unavailable, unauthenticated, plan-gated, or has no useful analogous evidence, do not invent examples or block the wireframe. Create the composition brief from supplied product screens, the bundled Tata 1mg portable HTML, and the canonical local design-system rules. State the evidence limit only when it materially affects confidence.
