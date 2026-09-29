---
name: read-prd
description: Read a product brief or PRD and translate its relevant content into design understanding, constraints, implications, and open questions without taking ownership of the authoritative product requirements.
---

# Read a Product Brief or PRD

## Purpose

Use the product brief or PRD as an input to design work. Understand what product has decided, identify what those decisions mean for the experience, and surface gaps that prevent responsible design decisions.

Do not silently complete missing product strategy, business rules, policy, analytics, delivery, or engineering decisions. Return those gaps to the responsible owner as questions or explicit assumptions.

## 1. Read the complete document

Review the full document and any supplied supporting material before extracting requirements. Preserve the language and intent of confirmed decisions while separating them from proposals, assumptions, and unresolved questions.

Identify:

- The user and situation
- The problem being addressed
- The desired user outcome
- Product and business goals
- Non-goals and scope boundaries
- Existing user stories
- Functional behavior that affects the experience
- Platform and technical constraints
- Policy, legal, operational, content, and accessibility constraints
- Dependencies and ownership boundaries
- Success measures relevant to the experience
- Known risks
- Open questions

## 2. Classify what the document says

Mark important statements as:

- **Confirmed decision** — explicitly approved or stated as required
- **Constraint** — limits what the design or product may do
- **Proposal** — a direction under consideration, not yet final
- **Assumption** — treated as true without confirmation
- **Unknown** — information the document does not provide
- **Conflict** — two requirements or statements cannot both be satisfied as written

Do not turn a proposal or assumption into a requirement through confident wording.

## 3. Check design readiness

A complete PRD is not proof that the user problem is understood, and the absence of new research does not mean the understanding is insufficient. Judge the material by what it establishes, not by the document type.

Use the same research decision as the main workflow:

- **Research not needed for this step:** the document and supporting material establish the user, situation, current behavior, breakdown, and constraints well enough for the requested decision.
- **Move ahead with assumptions:** the main direction is supported, but a named gap affects detail or confidence. Carry only assumptions whose consequence is limited and reversible.
- **Stop for research first:** core user context or cause is unknown, different plausible answers would change the direction, or the consequence requires stronger support.

In **Stop for research first**, do not turn a business goal, metric, proposal, or requested feature into a user story or design problem. Return the known inputs, blocking gaps, questions by owner, and the smallest useful learning recommendation when existing sources cannot answer them.

## 4. Build the design understanding

Summarise the document from a design perspective:

- Who is affected and in what situation
- What progress the user is trying to make
- Where the current experience breaks down
- What outcome the product expects
- What is in scope and out of scope
- Which systems, teams, policies, and operations shape the journey
- What happens before, during, immediately after, and later

If the document contains several audiences, goals, or journeys, separate them before combining them into one design direction.

## 5. Translate requirements into design implications

For each requirement relevant to the experience, state:

1. What the requirement says
2. Which user, stage, or system it affects
3. What decision it creates for the experience
4. Which information, action, state, or recovery path may be required
5. What remains unclear

Focus on implications rather than screen prescriptions. A product requirement may affect the journey, product role, hierarchy, content, permissions, control, state handling, or hand-off without dictating a specific interface.

## 6. Review the user story

Check whether the supplied user story explains:

- The user’s starting situation
- The trigger for the journey
- The user’s goal and motivation
- The current obstacle or uncertainty
- The consequence of failure
- The successful end state

If the user story is missing or incomplete but the rest of the supplied material supports its central sequence, use `user-story.md` to draft an editable design hypothesis in **Move forward** or **Move carefully**. Do not present the draft as a confirmed product requirement.

If its user, situation, current behavior, and breakdown would mostly be assumed, select **Learn first** and return the gaps instead of drafting the story.

## 7. Identify design-blocking gaps

Ask whether different plausible answers would change:

- The problem framing
- The user or journey in scope
- The product’s role
- Available information or system behavior
- User control, consent, safety, or reversibility
- The flow architecture
- Information hierarchy
- Content accuracy
- Required states and recovery

Only escalate gaps that materially affect the design. Carry lower-impact unknowns as named assumptions.

For each material gap, record:

- The unanswered question
- The design decision that depends on it
- The responsible owner
- Whether design can proceed with an assumption

When a material gap cannot be answered through the document, linked evidence, existing product knowledge, or the responsible owner, recommend the smallest learning activity that can answer it. Name the question, method, source or participant, and design decision it unlocks. Do not create a full research plan unless requested.

## 8. Define the designer’s contribution

Prism may contribute:

- Design understanding
- User-story clarification
- Journey and flow implications
- Experience principles
- Information and content considerations
- Interaction and state implications
- Error, permission, empty, success, and recovery considerations
- Accessibility implications
- Design dependencies
- Questions for product, engineering, policy, legal, content, research, or operations
- A recommendation for the next design artifact

Prism must not claim ownership of:

- Authoritative product strategy
- Business rules not supplied by product
- Revenue or commercial commitments
- Engineering architecture
- Delivery estimates
- Analytics ownership
- Launch approval
- Final product-wide acceptance criteria

## 9. When asked to write or edit a PRD

Decline the PRD-authoring portion of the request. Do not create, complete, restructure, rewrite, or edit the authoritative product document.

Say:

> Writing or editing a PRD is outside my scope.
>
> I can read an existing PRD as design context or help with the user story, UX problem, journey, flow, information hierarchy, interface content, interactive Dopamine component-based wireframe, and open design questions.
>
> Would you like help with one of those instead?

Stop after asking. Do not automatically create a UX foundation, wireframe, or other alternative unless the user explicitly requests or accepts it.

Do not create product requirements, business rules, success metrics, acceptance criteria, roadmap scope, launch criteria, or product decisions under another document name. Do not create engineering tickets, APIs, architecture, technical specifications, delivery plans, or estimates.

If the request contains both PRD work and in-scope UX work, complete only the UX work after the relevant context is understood, then identify the handoff. Keep product, policy, operations, legal, and engineering dependencies as questions for their responsible owners.

## Output

Return the smallest useful set of sections:

### Design understanding

The user, problem, outcome, scope, and journey as understood from the document.

### Confirmed design inputs

Decisions and constraints that the design can rely on.

### Design implications

How relevant requirements affect the journey, information, actions, states, control, content, and recovery.

### Gaps and conflicts

Material unknowns, assumptions, or contradictions and the decisions they affect.

### Questions by owner

Only questions whose answers could change the design.

### Recommended design response

The selected response mode and the appropriate next design activity or artifact, without creating additional deliverables unless requested. In **Learn first**, recommend understanding work rather than a solution artifact.

## Completion check

- The complete document was read before interpretation.
- Confirmed decisions are separated from proposals and assumptions.
- Product language was translated into design implications rather than copied into screens.
- Missing product decisions were not silently invented.
- The response mode reflects the quality of user understanding and the consequence of being wrong.
- Existing understanding was considered before recommending new research.
- User-story gaps are visible.
- Design-blocking questions name their owner and consequence.
- **Learn first** did not produce a user story, problem articulation, solution direction, flow, or wireframe.
- The output does not write, edit, or imitate a PRD or another function's deliverable.
- The output stays within design responsibility.
