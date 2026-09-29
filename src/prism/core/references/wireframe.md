---
name: wireframe
description: Turn an agreed flow and comprehension sequence into a precise, interactive Dopamine component-based wireframe without claiming final or production-ready UI.
---

# Interactive Dopamine Wireframe

## Purpose

A wireframe communicates how the UX solution works before finished UI production. It makes content, hierarchy, actions, states, transitions and surface choices reviewable while using Dopamine rules and components.

The fidelity boundary is not static versus interactive. A wireframe may be branded, component-based, precise and clickable. It becomes out of scope when it is presented as final sign-off, production implementation, design-to-code output or proven technical behavior.

## Entry permission

Create a wireframe only when the user explicitly asks for one or explicitly accepts it after it is offered as an alternative. A request for final UI, an already agreed solution, or the availability of enough context does not grant permission to substitute a wireframe.

Check this before calling a visualization tool, writing HTML, or creating any artifact. If permission is missing, return to the orchestrator, offer the interactive Dopamine component-based wireframe, ask whether the user wants it, and stop.

## Before drawing

Confirm:

- the user story and entry context;
- the purpose and completion condition of the flow;
- the product role and degree of user control;
- the main path, important branches, and recovery paths;
- what the user should understand at each stage;
- the product information, capabilities, and constraints that affect the experience.

If any of these are still assumptions, keep them visible in the wireframe notes.

If the wireframe depends on provisional assumptions, separate:

- what is stable enough to show as the working direction;
- what is assumption-led;
- what must be revisited when more is learned.

## Lock solution coverage

Before translating the solution into screens, create a coverage map of the agreed experience:

- entry and parent context;
- agreed stages and outcome categories;
- decisions and information moments;
- alternate and recovery paths;
- explanations, support, and post-completion behavior;
- assumptions and unresolved branches.

Map every agreed item to a screen, surface, state, or interaction. Preserve its intent and terminology unless a change is necessary for comprehension.

Do not silently add, remove, merge, rename, or replace agreed parts of the solution. Mark a change as a proposal and explain its effect. Ask for confirmation only when the proposed wireframe would materially change the agreed solution; otherwise continue without adding another approval step.

## Plan each stage

For every screen or surface, define:

1. **Purpose:** the single job of the stage.
2. **Arrives thinking:** the expectation or concern carried into it.
3. **Primary understanding:** what must become clear before the user continues.
4. **Primary information:** what deserves the strongest focus.
5. **Supporting information:** what helps the current decision without competing with it.
6. **Conditional information:** what appears only when relevant.
7. **Primary action:** the main action and its consequence.
8. **Secondary actions:** alternate, defer, back, change, cancel, or recovery actions.
9. **What is deferred:** information or choices intentionally moved elsewhere.
10. **Next state:** what the user and system expect after the action.

## Build the information hierarchy

Order content according to the user's decision process:

- orientation and current state;
- the primary takeaway;
- information required for the current decision;
- reassurance or explanation;
- primary action;
- secondary or reference details.

Change this order when the user context requires it, and explain why. Do not give prominence to information only because it matters internally to the product.

Use progressive disclosure when details are useful but not required for the current decision. Do not hide consequences, limitations, cost, risk, or loss of control behind disclosure.

Before adding a section or surface, name the user failure it prevents or recovers from. Remove it when it exists only to represent an internal product, offer, or service category. Prefer one familiar category pattern with clear states over a dashboard of explanatory modules.

## Choose the surface

Classify each interaction intentionally:

| Surface | Use when | Avoid when |
| --- | --- | --- |
| Page | The user enters a distinct destination, sustained task, or deep information space | The action is temporary and depends on the parent context |
| Bottom sheet | The user completes a bounded contextual task while retaining the parent context | The content is deep, high consequence, or needs substantial navigation |
| Inline disclosure | The information or lightweight choice belongs directly beside its trigger | Expansion would make the primary content difficult to scan |
| Dialog | An immediate acknowledgement or bounded decision must interrupt the current action | The content requires exploration, comparison, or multiple steps |
| System feedback | The product needs to show status or consequence without creating a new task | The user must make a considered decision or enter substantial information |

Base the choice on context continuity, task depth, decision weight, information volume, reversibility, interruption, navigation expectation, and accessibility.

## Wireframe craft

Load `../../tata-1mg-development-design-system.md` before constructing the artifact. Consult its deep supporting sources only when a needed rule is absent.

Use the canonical Tata 1mg Dopamine reference to map the components required by the agreed screen, surface, and states. Confirm the family, variant, size, and state before recreating it in the wireframe. Inspect a route in its bundled portable design-system HTML only when it resolves a material detail; do not browse it wholesale.

Before construction, keep a concise internal component map from each user need and interaction to the exact Dopamine family, required variant and state, or a named component gap. Preserve documented anatomy instead of drawing generic lookalikes. When no family fits, compose supported primitives and keep the gap visible in the rationale when it affects confidence or reuse.

For every RX medicine SKU, add an image-source decision to that map. Prefer a supplied product-specific image. When none exists, use `../../tata-1mg-development-design-system/assets/rx-default-blister-pack.png`. Generated HTML must either copy the PNG into the artifact and use a valid relative path or inline it as a data URI. A path that only works inside the skill folder is not a valid delivered asset. Do not substitute an empty thumbnail, CSS illustration, generic icon, or `Rx` text badge for the required image.

When screenshots, product screens, or flows are supplied, this is a mandatory gate: open and visually inspect every relevant frame with the available image or board viewing tool; do not infer style from filenames or prompt descriptions. Before constructing the artifact, show a source-language extraction covering source paths, layout rhythm, density, navigation, component proportions and shapes, grouping, hierarchy, action placement, icon treatment, interaction patterns, Dopamine component/token application, and at least three source-specific markers. Confirm the same evidence through `wireframe-preflight.md`. Preserve product-family resemblance without copying pixel for pixel or claiming final accuracy.

Do not construct or deliver the wireframe when supplied visual references were ignored, described generically, or represented only by pass/fail booleans. If a reference is unreadable or insufficient, say so and ask for a usable source instead of silently falling back to the neutral system.

When no product screen is supplied, use the default construction system in `../../tata-1mg-development-design-system.md`.

## Interaction and states

Build the minimum critical path first. Default to one primary screen and no more than four essential alternate, error, or recovery states. Do not model every business-rule variation, create a design-notes board, or build a large custom application unless the user explicitly requests that depth.

An interactive HTML wireframe is allowed when interaction is necessary to understand the solution. Prefer a smaller wireframe when it communicates the decision. Connect only interactions that help reviewers understand the solution:

- primary and secondary actions;
- forward and back navigation;
- meaningful decisions and branches;
- bottom sheets, dialogs, and inline disclosures;
- change, cancel, retry, undo, and recovery;
- loading, processing, empty, unavailable, validation, error, success, and return states when they affect understanding;
- important entry and completion transitions.

Clickable behavior should demonstrate the UX logic. The artifact must be described as an **interactive Dopamine component-based wireframe**, never as final or production-ready UI.

## Motion

Use motion only when it explains behavior that would otherwise be unclear, such as:

- how a contextual surface enters or exits;
- how the user moves between important states;
- how progress or processing changes;
- how the system acknowledges an action;
- how a reversible action is restored.

Keep motion simple, functional, and secondary to comprehension. Do not add decorative animation, brand expression, cinematic transitions, or production motion specifications.

## Delivery

Match the output to the request while staying within the fidelity ceiling:

- **Small wireframe:** the minimum frames and content blocks needed to review the central idea.
- **Flow wireframe:** connected frames, decisions, alternate paths, and recovery.
- **Interactive HTML wireframe:** clickable states, overlays, branches, back behavior, recovery, and necessary explanatory motion.
- **Annotated wireframe:** the wireframe plus concise rationale for hierarchy, content, actions, and surface choices.

Do not present the artifact as a final approved screen, official design-system specification, responsive production specification or design-to-code output.

Keep the interactive wireframe and its design reasoning distinct. The default artifact view should prioritise the active phone screen and its state switcher. Do not add a separate notes view unless the user requests it. The delivery response must still include the required Design Notes after the artifact link or preview.

Before rendered visual verification, run `visual-language-improvement-pass.md` across every created screen and state. Load `../skills/mobbin-visual-pattern-research/SKILL.md` to inventory every meaningful visual element, consider an alternative for each, and research analogous patterns rather than requiring an exact domain match. Revise any material issue it identifies in information structure, hierarchy, comparison, proof, or action clarity.

Attempt rendered visual verification once after the Visual Language Improvement Pass. If the required renderer or browser is unavailable, perform the remaining available checks, disclose the limitation briefly, and stop instead of chaining fallback environments.

Do not deliver the wireframe as screens alone. Include concise design notes that explain:

- why the main states exist;
- what the user should understand in each important state;
- why the hierarchy is arranged this way;
- which Dopamine components were chosen and which gaps remain;
- which interface principles and laws shaped the design;
- what trade-off the flow accepts;
- what depends on ops, policy, or unresolved assumptions.
- visual-language improvements, when the post-wireframe pass materially changed the artifact.

This is the compulsory post-wireframe gate. A rendered artifact without Design Notes is incomplete. Keep the notes decision-focused; do not turn them into a process transcript, engineering specification, or separate board unless requested.

## Output structure

```markdown
# Interactive Dopamine Wireframe

## Journey Context
...

## Solution Coverage
- Agreed item → screen, surface, state, or interaction
- Proposed changes requiring confirmation:

## Screen and Surface Map
- ...

## Stage Specifications

### [Stage]
- Purpose:
- Arrives thinking:
- Primary understanding:
- Primary information:
- Supporting information:
- Conditional or deferred information:
- Primary action and consequence:
- Secondary actions:
- Surface and rationale:
- Next state:

## States and Recovery
- ...

## Interaction and Motion Notes
- ...

## Design Notes
- Main state purpose:
- Intended user understanding:
- Key hierarchy choices:
- Component choices and gaps:
- Principles and laws applied:
- Trade-offs accepted:
- Dependencies or unresolved assumptions:

## Assumptions and Open Decisions
- ...

## UI Handoff Boundary
- Decisions intentionally left for UI design:
```

## Wireframe check

- Every screen or surface has one clear purpose.
- The screen uses the simplest familiar pattern that can carry the agreed states.
- Business taxonomy has not been translated into unnecessary interface sections.
- The strongest focus matches the user's immediate need.
- The right information appears before the relevant decision.
- Primary and secondary actions are distinguishable.
- Spacing, alignment, grouping, and sizing are precise and consistent.
- Hugeicons are used consistently where icons are necessary.
- Progressive disclosure does not hide material consequences.
- Surface choices preserve context and match decision weight.
- The user can understand what happens next.
- Back, change, cancel, exit, and recovery behavior work where needed.
- Motion is used only to clarify behavior.
- The artifact remains a reviewable wireframe and makes no claim of being final or production-ready UI.
- The user explicitly requested or accepted the wireframe before artifact creation began.
- Every agreed solution element is represented, or its omission or change was explicitly confirmed.
- Supplied screenshots, product screens, flows and Dopamine rules informed the component and token treatment without being copied pixel for pixel.
- The artifact was not constructed until the mandatory source-language extraction was complete.
- The phone or active screen remains the visual focus and design reasoning is kept secondary.
- The artifact includes concise design notes strong enough to explain and defend the main choices.
- The Interface Principles gate passed before construction and any failure was resolved.
- The Design Notes appear after the wireframe artifact in the delivery response.
- The rendered artifact passed the craft check in `wireframe-visual-language.md` before delivery.
