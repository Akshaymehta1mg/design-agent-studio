---
name: competitive-research
description: Compare a bounded set of competitors or adjacent products to understand category patterns, user expectations, and opportunities, using targeted web research and screenshots when they materially help.
---

# Competitive Research

## Purpose

Use this step when the problem sits inside a known category and outside patterns could materially influence the direction.

This is not a broad market study. It is a focused pattern read for a specific journey, moment, or UX problem.

Start from the design decision, not the competitor list.

Good prompts for this step sound like:

- how do products let users modify an existing order;
- how do they explain a time-bounded opportunity;
- how do they review only the proposed change instead of replaying the whole journey;
- how do they return the user to the updated parent object.

## When to use it

Default to skipping competitive research. Run it only when the user explicitly requests it or a named unknown could realistically change the proposed interaction, hierarchy, recovery, or direction. Healthcare, trust, category familiarity, or the existence of competitors alone is not enough.

Use this reference when one or more of these are true:

- the user likely brings category expectations into the flow;
- trust, explanation, choice architecture, or recovery patterns matter;
- the team needs to understand what is normal versus differentiated;
- adjacent spaces may solve the same user difficulty in a better way.

Skip it when:

- the issue is highly internal or operational;
- the problem is already directly observable and category patterns will not change the direction;
- the team already has enough pattern knowledge and time is better spent elsewhere.

## Scope boundary

Keep the scan small and relevant:

- use one focused search pass;
- inspect no more than 3 relevant primary sources;
- only the journey or moment related to the problem;
- only the patterns relevant to the design decision.

Stop as soon as the evidence can confirm or change the decision. Do not repeat searches to increase confidence in an already-supported direction.

Do not turn this into a complete app teardown. Do not copy screens. Do not let competitor behavior choose the solution automatically.

When helpful, search the internet to find the exact flow or moment being studied. Prefer official product pages, trustworthy pattern libraries, app screenshots, or credible walkthroughs over random commentary.

Prefer dedicated pattern-library tools such as Mobbin MCP when they are available in the active session. If they are installed more broadly but not exposed in the current task, fall back to web research, browser capture, and clearly labeled sources.

For an approved wireframe, use [mobbin-reference-pass.md](mobbin-reference-pass.md) for the required bounded Mobbin pass. This broader competitive-research reference remains optional; do not duplicate the same scan through both workflows.

Bring screenshots only when they materially help the comparison. A screenshot is evidence for a pattern, not the output itself.

If screenshots are used:

- capture only the relevant moment or sequence;
- label the source clearly;
- use screenshots to support the pattern read, not replace it;
- do not present screenshots as permission to copy the UI;
- if the real screens are gated, say that clearly instead of inventing or guessing.

## What to compare

Look at the exact moment in question and compare:

- user goal at that moment;
- the parent object that stays stable, if any;
- what exactly is being modified;
- entry point;
- information hierarchy;
- explanation model;
- trust cues;
- decision support;
- action labels and consequences;
- what is shown versus hidden;
- how constraints or eligibility are explained;
- review model;
- return state after success;
- recovery paths;
- what the user likely understands before acting.

Use competitors as a lens across three levels:

- **IA lens:** how the experience is structured, what the main object is, what stays persistent, what changes, what is grouped together, and what is separated.
- **Information hierarchy lens:** what the user needs to understand first, what is shown immediately versus progressively disclosed, what becomes visually primary, and what must be visible before a decision.
- **UI pattern lens:** how the interaction is delivered, including whether the task happens inline, in a modal, bottom sheet, separate page, stepper, drawer, or other bounded pattern, and how the product handles error, empty, warning, success, confirmation, and recovery states.

Do not study competitors only for visual style. Use them to understand what kind of structure, prioritization, and interaction model this class of problem usually needs.

## What to extract

For each comparison, pull out:

- what seems category-standard;
- what seems helpful;
- what seems weak or risky;
- what mental model the user may already bring;
- what can be borrowed;
- what should be avoided;
- where there is meaningful whitespace;
- what the screenshots actually prove versus what remains inference.

The point is not "who looks best." The point is "what does this teach us about solving the problem."

Prefer pattern extraction over brand narration. The useful output is not "Walmart does this." The useful output is "users stay anchored to the existing order while editing one bounded part of it."

Competitive research is supporting evidence, not the primary source of solution thinking. First form a view from the user, context, constraints, available evidence, and product logic. Then use competitor patterns to validate, challenge, or refine that view. Do not build the recommendation mainly by stacking competitor examples.

The output should help answer:

- what kind of structure this problem usually needs;
- what information should be primary versus secondary;
- what interaction patterns help users move safely and confidently.

## Output structure

Produce a comparison table whenever it helps present the relevant patterns clearly. The exact columns may change based on the design question, but the table should stay focused on the moment being compared.

```markdown
## Competitive Research

**Moment being compared**
...

**Why this scan is relevant**
...

**Products reviewed**
- ...

**Sources and screenshots**
- Product / source link / whether screenshot was captured

**Pattern comparison**
| Product | User goal | Parent context | Modification model | Constraint handling | Review model | Return state | Borrow / avoid |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Screenshot notes**
- What the captured screens show
- What they do not show
- Any important gated or missing parts

**What feels standard**
- ...

**What feels helpful**
- ...

**What feels weak or risky**
- ...

**What users may already expect**
- ...

**What this teaches us about IA**
- ...

**What this teaches us about hierarchy**
- ...

**What this teaches us about UI patterns**
- ...

**Borrow / avoid / differentiate**
- Borrow:
- Avoid:
- Differentiate:

**What is still unresolved**
- ...

**Implication for our direction**
...
```

## Quality check

- The scan stayed bounded to the relevant moment.
- Web search was used only to find the most relevant flows, not to widen the scope.
- Screenshots, if included, supported the reasoning and were source-labeled.
- The comparison looked at patterns, not only visuals.
- The final reasoning did not depend mainly on competitor precedent.
- The output explains what the patterns mean for the design problem.
- The result does not copy competitor UI or treat market behavior as automatic truth.
