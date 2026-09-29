---
name: feedback-to-direction-mode
description: Required controlled exploration workflow for unclear or qualitative feedback on an existing Prism wireframe.
---

# Feedback-to-Direction Mode

Use this mode when the user points to a Prism wireframe section, component, or page and says that it is unclear, visually weak, cluttered, text-heavy, cheap, difficult to understand, or otherwise unsatisfactory without specifying the replacement. The purpose is to make qualitative feedback actionable without silently overwriting approved work.

This is a focused review artifact, not a new product strategy exercise, a broad visual refresh, or a reason to change unrelated screens.

## Triage the feedback

Classify the feedback before editing.

- **Explicit target and explicit result:** revise directly. Example: “Change this button label to Add package.”
- **Known target, unknown solution:** enter this mode and present three directions. Example: “This comparison box is confusing” or “this section looks cheap.”
- **Page-level quality concern:** enter this mode with three full-page hierarchy or interaction directions. Example: “This page is too text-heavy.”
- **No credible target:** do not alter the main artifact. Ask one focused question, or identify the one or two most likely problem areas and ask the user to select one. Example: “The whole flow feels off.”

If feedback names a target indirectly—by a pointer, a screenshot annotation, a nearby phrase, or the current screen context—treat that as a known target. Do not ask a question merely because the critique does not name a visual treatment.

## Diagnose the failure

Form a short, testable hypothesis before generating directions. Inspect the target and the immediate surrounding state for issues such as:

- weak information or action hierarchy;
- unclear user outcome, ownership, or consequence;
- dense, undifferentiated information;
- poor recognisability of meaningful entities;
- weak trust, comparison, recommendation, or feedback treatment;
- an interaction pattern that does not fit the user job; or
- generic visual treatment where the decision needs stronger comprehension.

State the hypothesis concisely. It is an informed diagnosis, not a claim of certainty. For example: “The issue appears to be that the user cannot distinguish base contents from additions, rather than that there is simply too much content.”

## Create three structural directions

Make exactly three alternatives unless the user asks for a different number. They must be materially different responses to the diagnosed problem, not styling variations of the same component.

For each direction, provide:

- a short descriptive name;
- the core information or interaction model;
- the user benefit it prioritises;
- the meaningful trade-off; and
- an in-context wireframe treatment.

The directions should change the model when relevant: for example, structured comparison versus guided recommendation versus browsable entity collection. For page feedback, alter the page hierarchy, sequence, or interaction—not merely colours, borders, typography, or spacing. Include the familiar/simple pattern when it is credible.

Use the minimum research that can improve the direction. Search the local inspiration library and Mobbin only when analogous patterns could change the treatment. Search by user job, information shape, and decision state rather than by an exact screen name. Adapt selected evidence to Tata 1mg Dopamine; never copy its styling, assets, or layout.

## Present without overwriting

Preserve the current wireframe as the baseline. Create a temporary exploration view located beside, adjacent to, or directly following the affected wireframe page, according to what the artifact can express cleanly.

- **Component target:** show the current screen context and three focused variants of the component within enough surrounding UI to judge hierarchy, placement, and connected actions.
- **Page target:** show three complete page directions with the same necessary product context and states.

Do not add the variants to the main user flow, claim that they are final, or alter unrelated approved sections. Clearly offer: **Apply A**, **Apply B**, **Apply C**, **Keep current**, and **Explore again**.

## Apply the selected direction

Wait for the user to choose before changing the main artifact. On selection:

1. incorporate only the selected direction into the affected component or page;
2. preserve unrelated approved work;
3. update only connected states, actions, overlays, summaries, or downstream surfaces affected by the change;
4. remove or hide the temporary exploration view unless the user asks to retain it; and
5. rerun the affected Product Thinking Gate, preflight checks, Dopamine component/state checks, and Visual Language Improvement Pass.

If none of the directions is chosen, keep the baseline intact. Ask the smallest useful follow-up or create another bounded set only when the user asks to continue exploration.

## Boundaries

- Do not use this mode to bypass a user’s explicit request for a specific change.
- Do not turn vague criticism into a broad redesign without a selected target.
- Do not improve the whole screen merely because one component was criticised.
- Do not make three cosmetic variants.
- Do not apply a direction by default; user selection is the approval to replace the existing treatment.
