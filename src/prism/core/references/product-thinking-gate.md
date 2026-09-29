---
name: product-thinking-gate
description: Mandatory product-outcome and state-coverage check for Prism recommendations, flows, and wireframes.
---

# Product Thinking Gate

Use this internal gate after discovery and before choosing a direction. Use it again as a critique after a wireframe is constructed and before visual refinement. Its purpose is to prevent Prism from mistaking a screen sequence, questionnaire, editor, or configuration mechanism for a complete product solution.

Do not turn this into a PRD, a product strategy deck, a requirements document, or a user-facing checklist. Surface only the unresolved decision that materially affects the work.

## Before choosing a direction

Answer the prompts that are relevant to the request.

### Outcome and hierarchy

- What is the user trying to achieve beyond completing this immediate screen?
- What product outcome should the experience create?
- What is the current decision, and what is the one primary action that supports it?
- Does the hierarchy promote the real user job, or merely a mechanism such as editing, onboarding, questionnaire completion, or configuration?

### Paths and control

- Who needs the guided or personalised path, and who reasonably needs a direct/default path?
- Which choices must remain available rather than being forced by the flow?
- Can the user defer, skip, start from a known default, revisit, or change their decision when that is appropriate?

Do not create alternate paths by default. Include one only when it serves a distinct valid intent, protects user control, or prevents material friction.

### State, trust, and recovery

- What underlying product state changes after each consequential action?
- What must persist in the interface so the user understands that change?
- What does the user need to know to trust the recommendation, outcome, price, eligibility, or change?
- Which changes need explanation, confirmation, editability, or Undo rather than a transient toast?
- What could go wrong, and what is the smallest honest recovery path?

Treat a change as consequential when it alters what the user receives, pays for, commits to, shares, becomes eligible for, or cannot easily reconstruct. Consequential feedback belongs in the relevant product state; a toast may supplement it but cannot be the only record.

### End-to-end completion

- Where does the user go next when the immediate task is complete?
- What should that next surface show or preserve—for example, a cart, confirmation, account, appointment, or saved state?
- Is the hand-off explicit, with the right information and action available?

Never call a flow complete merely because the user has answered questions or viewed a recommendation.

## Direction test

For a meaningful redesign, compare two or three structurally distinct directions. Include the familiar/simple pattern. Test each direction against:

1. progress toward the real user outcome;
2. user choice and reversibility;
3. clarity of consequential changes;
4. trust and required explanation;
5. ability to continue into the next product surface; and
6. interface and cognitive cost.

Choose the least complex direction that covers the applicable conditions. Do not present cosmetic treatments as different product directions.

## Post-construction Product Critique

Before visual refinement, inspect the actual proposed screens and states. Proactively look for:

- a forced route where a credible direct/default route is needed;
- a missing state after a consequential action;
- an action whose owner or effect is unclear;
- a meaningful, irreversible, or hard-to-reconstruct change with only transient feedback;
- missing explanation, editability, Undo, or recovery;
- a journey that ends before its product outcome or downstream surface;
- an interface whose primary action promotes a mechanism rather than the user’s job; and
- a recommendation, selection, or personalisation whose resulting contents cannot be understood or audited.

Revise the artifact when the critique finds a material failure. If resolving it depends on a product choice that the user has not supplied, name that assumption or ask the smallest focused question before proceeding.

## Relevant example: guided package personalisation

For an approved health-package catalogue, the design problem is not simply “ask questions and add tests.” A sound solution considers:

- a direct way to add the known base package when that is a valid intent;
- a guided route for people who want a more relevant package;
- visible base contents, additions, reasons, price and total;
- persistent feedback for additions or removals, plus appropriate edit/Undo;
- clinical trust explanation without making the user read it all upfront; and
- the resulting package’s add-to-cart action and the cart state it creates.

This illustrates the gate; do not reuse this package model for unrelated problems.
