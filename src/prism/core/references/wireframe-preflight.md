---
name: wireframe-preflight
description: Lightweight mandatory readiness check before Prism creates or materially revises a component-based interactive wireframe.
---

# Wireframe preflight

Use this checklist immediately before creating or materially revising a wireframe. This is an internal design-readiness check, not a technical workflow.

Do not create a manifest, ledger, JSON file, task transcript, or separate user-facing artifact. Do not show the checklist when it passes unless the user asks. If an item fails, explain only the design issue that blocks progress and the smallest next action needed.

## Required checks

Confirm all applicable statements:

- The user, goal, journey moment, product context, constraints, evidence, assumptions, and important unknowns are sufficiently understood for this decision.
- The research decision is explicit: move forward, learn first, or proceed provisionally. Do not wireframe while `learn first` remains unresolved.
- The competitive-research decision is explicit: run it because it can change the solution, or skip it with a clear design reason.
- The Local Inspiration Reference Pass retrieved candidates by user job, information shape, state, and unresolved element; no more than five actual images were inspected and no more than three entered working context, or the pass recorded “no local fit.”
- The Mobbin Reference Pass was completed after discovery and before Interface Principles, or it was explicitly skipped because Mobbin was unavailable, unauthenticated, gated, or produced no relevant evidence. Only the selected-source links and decoded insight packet remain in working context.
- The solution direction is agreed with the user.
- The Product Thinking Gate in `product-thinking-gate.md` passed: the relevant user job and product outcome are explicit; valid entry routes were considered; consequential state changes, trust explanation, user control, recovery, and the completion hand-off to the next product surface are represented where applicable.
- The primary hierarchy promotes the user’s real job rather than a means to it, such as form completion, package editing, or configuration.
- The expected wireframe fidelity and the information or action that should visually dominate are understood.
- The user explicitly permitted wireframe creation.
- The canonical Tata 1mg Dopamine design-system reference is loaded and the relevant component, token, source-pattern, and composition rules are identified.
- The proposed page, list or card, action, feedback, and overlay composition follows the canonical design-system reference.
- The relevant bundled portable design-system HTML route was inspected when additional component or source-pattern detail was needed; otherwise the canonical reference was sufficient.
- Every required interaction maps to a documented component family, variant and state or a clearly named component gap.
- Every RX medicine SKU has an image source: a supplied product-specific image, or the required bundled fallback at `../../tata-1mg-development-design-system/assets/rx-default-blister-pack.png`.
- The RX fallback is copied beside the artifact with a valid relative URL or embedded as a data URI; pointing the generated artifact back to the skill folder does not satisfy this check.
- Duplicate component-family names were resolved by platform, product context, and current catalogue support rather than by name alone.
- Existing components retain their documented anatomy and are not replaced by generic visual approximations.
- Agreed requirements, stages, screens, states, branches, overlays, recovery paths, and deferred items are mapped in the solution-coverage matrix.
- The compulsory Interface Principles gate passed: the principles served, principle tensions, governing law, and any clarity-or-safety violation were checked.
- Every Interface Principles failure was resolved before construction; a known unresolved violation blocks the wireframe.
- No unresolved issue makes the proposed interaction unsafe, misleading, or structurally unsound.

## Visual-source check

When screenshots, product screens, or flows were supplied, also confirm:

- Every relevant source was opened and visually inspected.
- The source-language extraction identifies layout rhythm, density, navigation, proportions and shapes, grouping, hierarchy, action placement, icon treatment, interaction patterns, and Dopamine component/token application.
- At least three source-specific visual markers are recorded.
- The wireframe uses documented Dopamine semantic colours, typography, spacing, radius, elevation and component states.
- Rendered inspection confirms that each RX SKU image has a non-zero natural size and is not an empty box, CSS-drawn pack, generic glyph, or `Rx` label alone.
- Every applied colour uses a documented semantic or component token from the canonical Tata 1mg Dopamine design-system reference; no component binds directly to a primitive palette or raw hex value, except when exactly reproducing supplied source CSS and the exception is recorded.
- Continuous result sets use list rhythm and Dividers unless each item genuinely needs an independent card boundary.
- The proposed hierarchy does not depend on repeating grey fill, border, shadow, and large radius across every item.
- Each current decision has one dominant action; secondary actions do not compete with it.
- The proposal resembles the source product family without claiming pixel-perfect or production-ready accuracy.

When no visual source was supplied, use `../../tata-1mg-development-design-system.md`; inspect only a relevant route in its bundled portable design-system HTML and do not invent unsupported product patterns.

## Outcome

- If every applicable check passes, construct the wireframe.
- If a check fails, stop before construction and resolve that specific gap.
- After a material revision, rerun only the checks affected by the change.
