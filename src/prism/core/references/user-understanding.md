---
name: user-understanding
description: Map what the user thinks, sees, understands, decides, and still worries about at each stage of an experience.
---

# User Understanding

## Purpose

An experience is not only a sequence of screens. It is a sequence of changes in the user's understanding. Map those changes before finalizing the flow or wireframe so that every decision is supported by the right information at the right moment.

## Define the stages

Use meaningful stages in the user's journey rather than component or screen names. Include the entry, important decisions, commitment moments, completion, recovery, and ongoing moments when relevant.

For each stage, capture:

1. **Arrives thinking:** the expectation, question, or mental state carried into the stage.
2. **Sees:** the information and choices presented.
3. **Should understand:** the single most important takeaway needed to progress.
4. **Decides or does:** the action or decision requested.
5. **Decision support:** the information, comparison, reassurance, or control that makes the decision reasonable.
6. **Remaining concern:** what may still create hesitation or mistrust.
7. **Expects next:** the consequence the user believes will follow.
8. **Product response:** what the system does and how it makes the result visible.

## Build the information hierarchy

Within each stage, classify information by its job:

- **Primary:** required to understand the stage or make the current decision.
- **Supporting:** reduces uncertainty or explains the recommendation.
- **Conditional:** needed only for a specific choice, state, or concern.
- **Reference:** useful for review but not for the current decision.
- **Deferred:** belongs at a later stage.
- **Removed:** does not support the journey.

Visual prominence should follow the user's decision priority, not the product's internal importance or the amount of data available.

## Check the sequence

Flag when:

- the design requests a decision before the user understands its meaning or consequence;
- an explanation appears after the point where it was needed;
- multiple concepts compete for attention in one stage;
- the primary information does not support the primary action;
- optional details interrupt the main path;
- a transition changes terminology or mental model without explanation;
- the user cannot predict what will happen next;
- a concern remains unresolved at the point of commitment;
- the product acts without making control, consent, or reversibility clear;
- completion does not explain status, next steps, or later control.

## Output structure

```markdown
## User Understanding Map

| Stage | Arrives thinking | Sees | Should understand | Decides or does | Decision support | Remaining concern | Expects next | Product response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Information Priority by Stage

### [Stage]
- Primary:
- Supporting:
- Conditional:
- Deferred:
- Removed:

## Breaks in Understanding
- ...

## Implications for the Flow or Wireframe
- ...
```

## Quality check

- Every important decision has enough information before it.
- Each stage has one dominant takeaway.
- The user can distinguish product statements, recommendations, and actions.
- The user can predict consequences before committing.
- Remaining concerns are addressed at the right time or intentionally deferred.
- The end of the journey explains what changed and what control remains.
