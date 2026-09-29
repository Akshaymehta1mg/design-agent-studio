---
name: mobbin-reference-pass
description: Run a bounded Mobbin screen-reference search before an approved wireframe, decode selected screenshots into reusable UX insight, and keep visual assets temporary.
---

# Mobbin Reference Pass

## Purpose

Use Mobbin to ground an approved wireframe in real interaction patterns for the exact user moment being designed. The purpose is not inspiration volume or visual imitation. It is evidence for a more usable structure, hierarchy, selection model, action placement, and recovery model.

Run this pass after the focused discovery question has been answered and before Interface Principles are applied.

## Search and selection

Write one short task intent and keep it identical across searches for the same design request. Search the exact moment rather than a broad category.

Include, where relevant:

- the user's task and decision;
- platform (`ios` or `web`);
- key objects and their state;
- essential actions, conditions, confirmation, or recovery.

Use `search_screens` for one interaction moment. Use `search_flows` only when the sequence itself could change the design. Keep each pass bounded: inspect the returned candidates, then select at most five.

Rank candidates by:

1. fit to the same user job and decision;
2. a visible state or interaction needed by this problem;
3. platform and interaction-model fit;
4. clarity of information hierarchy and action placement;
5. relevance of constraints, confirmation, or recovery.

Do not rank by visual trendiness, brand familiarity, or decoration. Do not retain all returned screens merely because they exist.

## Decode the actual screenshots

Visually inspect every selected screen. Never infer screen details from metadata, app name, or search labels alone.

For each selected screen, record only:

- **Observed structure:** grouping, order, density, what stays persistent, and what is deferred.
- **Interaction model:** selection, entry point, edit/add/recovery actions, confirmation, and state treatment.
- **UX value:** why this reduces effort, error, ambiguity, or loss of context.
- **Dopamine adaptation:** the component families and hierarchy that can express the useful pattern.
- **Do not copy:** brand styling, assets, copy, proprietary layout, or behavior unsupported by the product.

Separate visible facts from inference. A screen is evidence for the moment it shows, not for every state in the originating product's full flow.

## Insight packet for the main designer

Pass only this compact packet into the Interface Principles and wireframe stages:

```markdown
## Mobbin reference insight

**Moment searched:** ...
**Selected references:**
- App — [Mobbin screen](...): observed pattern

**Reusable interaction and IA insights:**
- ...

**Dopamine implications:**
- ...

**Borrow / adapt / avoid:**
- Borrow:
- Adapt:
- Avoid:

**Evidence limits:**
- ...
```

The main designer uses the packet to challenge or strengthen its own product reasoning. It must still choose the simplest direction that fits the user, product logic, and Interface Principles.

## User-visible references and asset handling

Show the selected screenshots inline with their app name and canonical Mobbin link unless the user requests text-only research. Include no more than five.

Mobbin image URLs may expire. Treat images, downloads, and URLs as temporary task context. Do not save them in the skill, repository, generated wireframe, or permanent project documentation. Keep the canonical Mobbin source link and the decoded insight only when they are useful to the current task.

## Unavailable or weak evidence

If Mobbin is unavailable, unauthenticated, plan-gated, or returns no sufficiently relevant screens:

- state the concrete reason briefly;
- do not substitute imagined examples;
- continue with supplied evidence, product knowledge, and the familiar/simple pattern;
- do not block the Interface Principles or wireframe stages.

## Quality check

- The search described one UX moment rather than a grab bag of keywords.
- No more than five selected screens entered the design context.
- Each selected screen was actually inspected.
- The insight packet explains structure and interaction, not surface styling alone.
- Mobbin evidence informed but did not dictate the design direction.
- Screens remain temporary and source links are clear.
