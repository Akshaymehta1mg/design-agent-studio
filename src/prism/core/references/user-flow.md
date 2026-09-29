---
name: user-flow
description: Turn an agreed user story and solution direction into a clear journey, task flow, state model, or sitemap.
---

# User Flow

## Purpose

Map how the user moves from their entry situation to meaningful completion. A flow should communicate intent, decisions, system responses, alternate paths, and recovery. It should not be only a chain of screen names.

The system behavior in this flow is conceptual UX behavior: what the user experiences and what the product needs to communicate. It is not an API flow, engineering state machine, technical architecture, implementation specification, or acceptance criteria.

## Before mapping

Confirm:

- the working user story;
- entry situation and trigger;
- user goal and completion condition;
- product role and journey scope;
- assumptions and constraints that affect the path;
- what the user should understand at important stages.

If the user story is uncertain, use `user-story.md`. If the sequence depends on comprehension or decision support, use `user-understanding.md`.

## Build the flow

1. Define what happens before the visible flow and why the user enters.
2. Mark the first product state the user encounters.
3. Use atomic steps that pair user intent with system behavior.
4. Mark decisions where paths meaningfully diverge.
5. Show what information supports each consequential decision.
6. Include processing, waiting, permission, and feedback states when they affect understanding or behavior.
7. Add alternate, error, cancellation, and recovery paths that materially change the experience.
8. Define immediate completion and the next expected state.
9. Extend the flow into return or ongoing behavior when the user outcome continues.

## Node language

Name nodes with clear actions or states. Distinguish:

- **User action**
- **User decision**
- **System response**
- **System state**
- **Information moment**
- **Recovery path**
- **Completion state**

Keep each node atomic. If a node contains multiple user decisions or system outcomes, split it.

## Flow checks

- Does the flow begin in a believable user context?
- Is every step necessary for the user's progress or a product constraint?
- Is the system requesting information it already has?
- Does each decision have enough information before it?
- Can the user go back or change a choice without losing unrelated progress?
- Are irreversible or high-consequence actions clear before commitment?
- Does the system make waiting and processing visible?
- Can the user recover from failure, interruption, or abandonment?
- Does completion explain what changed, what happens next, and what control remains?
- Does the flow cover the appropriate one-time, repeated, or ongoing journey?

## Output structure

```markdown
# User Flow

## Journey Boundary
- Before:
- Entry:
- Completion:
- After:
- Ongoing:

## Main Path
1. ...
2. ...

## Decision Points
- ...

## Information Moments
- ...

## System States
- ...

## Alternate Paths
- ...

## Recovery Paths
- ...

## Surface Classification
- ...

## Open Assumptions
- ...

## Diagram Structure
- Start node:
- Action nodes:
- Decision nodes:
- System nodes:
- Recovery nodes:
- Completion node:
```

## Ground rules

- Include the user's intent, not only the system operation.
- Show alternate paths only when they matter to the design decision.
- Keep navigation structure separate from temporary interface states.
- Do not hide uncertainty inside a neat diagram; label assumptions and unresolved branches.
- Describe dependencies on product rules, policy, operations, or technology as open decisions for the responsible owner; do not resolve them as requirements or engineering tasks.
- Stop at experience behavior. Do not add APIs, data models, services, technical events, implementation logic, or delivery estimates.
- The flow is complete when reviewers can explain what the user understands, decides, and experiences from entry through the relevant aftermath.
