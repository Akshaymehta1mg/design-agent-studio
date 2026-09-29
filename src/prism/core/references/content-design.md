---
name: content-design
description: Design interface language that helps the user understand, decide, act, trust, and recover.
---

# Content Design

## Purpose

Interface language is part of the UX solution. Use content to help the user understand what is happening, what it means, what they can do, what they should expect, and how they can recover. Write only after understanding the user's stage, the job the product must do in that moment, and the consequence of the decision.

## Start with the user's job in this moment

For each state, identify:

- the single job the user is trying to complete here;
- what the user arrives thinking or expecting;
- what they need to understand now;
- what decision or action follows;
- what may create hesitation or mistrust;
- what the product knows, infers, recommends, or has done;
- what happens after the user acts.

If the content spans multiple stages, use `user-understanding.md` before drafting copy.

If you cannot name the user's job at this step, do not draft copy yet. Clarify the moment first.

## Define what the copy must do

Assign each content element one clear job. A line that does not serve the current step should not be there.

Possible jobs:

- orient the user;
- explain what is happening;
- explain what something means;
- support a decision;
- state a consequence;
- set an expectation;
- communicate a limitation;
- request permission or confirmation;
- show progress or feedback;
- help recovery;
- confirm completion and next steps.

Remove content that has no clear job, repeats a lower-value message, or belongs to a later step.

## Set the hierarchy of meaning

Lead with the thing the user most needs in order to make progress. Usually that means:

1. What happened, what is happening, or what this stage is for.
2. What that means for the user right now.
3. The decision, limitation, cost, risk, control, or consequence that affects the next move.
4. The action that moves the user forward.
5. Supporting explanation, optional detail, or the path to full depth.

Do not lead with raw system status, inputs, jargon, reassurance, or supporting evidence when the user first needs meaning.

### Answer first

When the user is looking for an answer, lead with the answer and place the support below it. Do not make the user derive the takeaway from details.

### Progressive disclosure

Show the minimum needed for this step and keep a visible path to more detail. Do not dump everything at once, and do not hide information that could change the user's decision.

## Write the interface language

### Use plain language

- Use the user's vocabulary unless precision, safety, or regulation requires another term.
- Translate internal, clinical, technical, or system language into everyday language on the main surface.
- If a precise term must appear, explain it at the point where it affects understanding.

### Explain meaning, not just status

- Do not stop at naming the status if the user still needs to know what it means.
- Give the honest meaning first, then the supporting explanation.
- Do not lead with comfort while hiding the fact, limitation, or outcome.

### Write with honest trust

- Use reassurance only when the product provides evidence, control, protection, or a realistic path forward.
- Trust copy should answer the user's likely fear directly, such as sharing, misuse, visibility, permanence, or safety, rather than using vague reassurance.
- State uncertainty, incompleteness, and limitations clearly.
- When something is pending, partial, unavailable, or outside product control, say so directly and say what happens next if known.
- Establish trust at the moment concern peaks. Do not repeat trust copy on every later screen.

### Make the next action obvious

- Write action labels that describe the action or outcome.
- Prefer specific verbs over generic flow words when a specific action exists.
- Make it clear what the user can genuinely do next, not what the team wishes they could do next.
- Keep product statements, recommendations, and user choices distinguishable.

### Keep terminology stable

- Use one user-facing term per concept across the full journey.
- Do not switch terms for variety if the meaning has not changed.
- Keep labels, body copy, and action text aligned unless there is a real difference in meaning.

### Match the level of detail to the moment

- Use the shortest form that still carries meaning and next step.
- Give full detail only when the user needs it to decide, confirm, or recover.
- Match explanation depth to prior knowledge, consequence, and emotional load.

## Write for common state types

### Orientation and empty states

- Explain what this place is for or why nothing is here yet.
- Give the user the next useful action when one exists.

### Loading, processing, and pending states

- Say what is happening now.
- Set an expectation if timing or later follow-up matters.
- If the user can safely leave or return later, say so when useful.

### Error and interruption states

- State what happened in plain language.
- State what remains safe, saved, unchanged, or unaffected when that matters.
- Give the clearest recovery path available now.
- If recovery depends on waiting, support, or another system, say that honestly.

### Decision and recommendation states

- Put the recommendation or decision in the foreground.
- Include the reason to believe inside the same unit, not as detached helper text.
- Keep the user's available control visible.

### Confirmation and completion states

- Explain what changed.
- Confirm what happens next.
- Name any follow-up, timing, or return path the user should expect.

## Output structure

```markdown
# Content Design

## User Job In This Moment
...

## What The Copy Must Do
...

## Meaning And Hierarchy
1. ...
2. ...

## Interface Copy
- Orientation or stage label:
- Main message:
- Meaning or implication:
- Consequence, limitation, or reassurance:
- Primary action:
- Secondary action:
- Disclosure or deeper detail:
- Error or interruption:
- Completion or next step:

## Copy Decisions
- ...

## Terminology Decisions
- ...

## Assumptions or Open Questions
- ...
```

## Quality check

- The user's job at this step is explicit.
- The main message serves that job rather than merely describing the system.
- Meaning appears before support, and support appears before optional detail.
- The copy explains what the state means, not only what it is called.
- Action labels make the next step and consequence predictable.
- Reassurance is supported by real evidence, control, or protection.
- Uncertainty, incompleteness, and limitation are stated honestly.
- Recommendation copy includes a visible reason to believe.
- Terminology remains consistent across the flow.
- Error, pending, and completion states explain the next available path.
- No line exists only for tone, polish, or filler.
