# Prism: What I Am and How to Use Me

## The short version

I am **Prism**, a reusable pre-UI product-design skill for an AI agent. I help turn an unclear product or UX problem into the simplest defensible experience, then express that experience at the level you request: a problem frame, user story, direction, journey, flow, content hierarchy, critique, research plan, or an explicitly approved interactive wireframe.

I am not a separate model, a design tool, or a substitute for product and engineering teams. The host agent—such as Codex or ChatGPT—does the work. My [`SKILL.md`](SKILL.md) supplies the process, constraints, quality gates, and routes to the references in this folder.

My core bias is:

> Solve the real user difficulty with the least interface machinery possible.

That means I prefer one clear answer, one primary action, familiar interaction patterns, progressive disclosure, and visible recovery over unnecessary dashboards, wizards, frameworks, or ornamental complexity.

## What I can do

| Work branch | Use me when you need | Typical output |
| --- | --- | --- |
| Context understanding | A board, brief, PRD, screenshots, notes, or an existing flow needs to be understood before design work begins | Context summary, evidence/assumption split, gaps that matter |
| Problem framing | The team is discussing symptoms, features, or business rules without a crisp user difficulty | Problem articulation, target user, consequence, success definition |
| User situation | You need a shared, testable account of who is acting, in what situation, and what progress they need | Working user story with confidence levels and open questions |
| Solution exploration | You know the problem but not the right interaction structure | Two or three structurally different directions and one recommendation |
| Journey and flow design | The main path, decisions, system states, alternate routes, or recovery are unclear | Journey boundary, main path, decision points, states, alternate and recovery paths |
| Content and hierarchy | A screen or flow is hard to understand, too dense, or does not make the next action obvious | Information hierarchy, interface copy, terminology, disclosure plan |
| Direction review | An existing proposal feels wrong or stakeholders disagree about it | Diagnosis of the disagreement, retained principles, revised direction |
| Research planning | A material unknown could change the solution or make it unsafe or misleading | Smallest useful learning activity, research plan, or moderator script |
| Pattern research | You need evidence for an interaction, information structure, component, or visual grammar | Bounded reference set and a distilled pattern-insight packet |
| UX critique | You want a product-level review of a proposed experience | Findings on outcome, control, trust, state, recovery, and completion |
| Interactive wireframing | A direction has been chosen and you explicitly want a reviewable pre-UI artifact | Interactive Dopamine component-based wireframe plus Design Notes |
| Feedback-to-direction | A wireframe area feels weak, cluttered, cheap, or unclear, but the fix is not prescribed | Diagnosis and three materially different in-context directions before revision |

These branches are not a mandatory sequence. Ask for the smallest one that resolves the current decision. For example, a clear content problem may need only content hierarchy, while a consequential end-to-end redesign may need framing, direction, flow, and wireframing.

## What I do not do

My boundary is deliberate. I stop before:

- final UI sign-off or claims of pixel-perfect visual quality;
- production-ready prototypes or production implementation;
- design-to-code output;
- official changes to the design system;
- post-development visual QA or implementation-parity certification;
- PRDs, engineering requirements, architecture, tickets, or delivery estimates;
- real-world usability validation without actual research evidence.

I may inspect those materials as context, but I do not silently turn a pre-UI design request into a different discipline. If you ask for an out-of-scope deliverable, I should state the boundary, propose the nearest useful pre-UI alternative, and wait for permission.

## How to invoke me

### From this folder

Attach or reference the complete `Prism` folder and tell the host agent to follow [`Prism/SKILL.md`](SKILL.md):

```text
Use the Prism skill in this folder. Help me simplify the delivery-address
selection experience for returning users.
```

Keep the full folder together. The skill depends on its references, design-system bundle, approved assets, and visual-research library.

### When installed as a skill

Invocation syntax depends on the host:

- In Codex, explicitly select the skill with `$prism`.
- In ChatGPT surfaces that support skills, select or mention Prism with `@`.
- Some clients accept a path-style mention such as `@/prism`.

You can also describe a matching pre-UI product-design task directly. A host that supports automatic skill selection may load Prism from its name and description, but explicit selection is useful when you want its exact process and boundaries.

Official OpenAI documentation describes a skill as a folder containing a `SKILL.md` plus optional references, scripts, templates, and assets. The model sees the skill metadata first and loads the full instructions when the request matches or the user invokes it directly. See [Skills](https://developers.openai.com/plugins/concepts/skills) and [Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins).

## What to give me

You do not need a polished brief. Give me whatever is real and available. The most useful inputs are:

- **User:** who is acting, including any important context or capability differences.
- **Moment:** what triggered the interaction and what the person came to do.
- **Breakdown:** where progress currently fails, slows, or becomes uncertain.
- **Consequence:** what happens if the person misunderstands or chooses poorly.
- **Evidence:** screens, flow diagrams, analytics, complaints, research, business rules, or known constraints.
- **Outcome:** what should be easier, safer, clearer, or more successful.
- **Requested artifact:** critique, problem frame, options, flow, content, research plan, or wireframe.
- **Scope:** platform, journey boundary, deadline, and decisions that are already fixed.

If some of this is missing, send the request anyway. For every new in-scope design request, I ask at least one focused discovery question and wait for your answer before recommending a direction or producing an artifact. The question should clarify a decision that could change the work—not merely ask for generic confirmation.

## How a typical engagement works

1. **I inspect the supplied context.** I separate facts, observations, assumptions, and unknowns.
2. **I ask a focused discovery question.** Your answer must be allowed to influence the direction.
3. **I define the user’s immediate job and breakdown.** I consider consequence, constraints, trust, and recovery.
4. **I decide whether more learning is needed.** I move forward when the issue is observable and reversible, move provisionally when only a detail is uncertain, and recommend learning first when the missing answer could change the solution class or create harm.
5. **I apply the Product Thinking Gate.** I check outcome, valid entry routes, consequential state changes, user control, trust, recovery, and where the journey truly finishes.
6. **I diverge once.** For a meaningful redesign, I compare two or three structural directions. One must be the familiar/simple category pattern.
7. **I choose by subtraction.** I recommend the lowest-complexity option that handles the important states and recovery.
8. **I produce only the artifact requested.** I do not automatically add boards, matrices, research plans, extra screens, or handoff documents.
9. **I run the relevant quality checks.** Final recommendations, flows, hierarchies, content structures, and wireframes are checked against the interface principles. Wireframes receive additional research, component, state, product-critique, visual-language, and preflight checks.

## How the branches connect

```text
Supplied context
    |
    v
Understand the moment ----> Material unknown? ---- yes ----> Research plan/script
    |                                                   |
    |                                                   v
    +------------------------- no / evidence returns ---+
    |
    v
Problem frame or working user story
    |
    v
Product Thinking Gate
    |
    v
2-3 structural directions -> choose by subtraction -> recommended direction
    |                                                    |
    |                                                    +--> critique / content / hierarchy
    |                                                    +--> journey or flow
    |                                                    +--> stop at recommendation
    v
Explicit wireframe approval?
    |
    +-- no --> stop at the requested pre-UI artifact
    |
    +-- yes -> local + Mobbin reference passes -> Dopamine wireframe
                                                   |
                                                   v
                            product critique + visual pass + preflight
                                                   |
                                                   v
                                        artifact + Design Notes
```

## Working with wireframes

Wireframing is the most constrained branch because it creates the highest-fidelity Prism output.

I create a wireframe only after explicit permission and confirmation of the chosen direction. I then:

- begin with the canonical [Tata 1mg Dopamine design-system guide](tata-1mg-development-design-system.md);
- scan the bundled [visual-research library](visual-research/index.md) by user job, information shape, and state;
- inspect no more than five local candidates and retain no more than three useful references;
- run a bounded Mobbin reference pass when Mobbin is available and authenticated;
- compare patterns without copying another product’s brand, assets, copy, or proprietary layout;
- map interactions to documented Dopamine components and states, recording any component gap;
- cover the main state plus only essential alternate, error, and recovery states;
- test the result for control, trust, reversibility, downstream completion, visual hierarchy, and basic accessibility;
- deliver concise Design Notes with the artifact.

Mobbin is useful but not a hard dependency. If it is unavailable, unauthenticated, gated, or yields weak evidence, I record the limitation and continue from supplied evidence, local references, familiar patterns, and product reasoning.

### Default complexity budget

Unless the problem genuinely requires more, I use:

- one primary problem per surface;
- one dominant takeaway;
- one primary action per decision;
- no more than three peer choices shown together;
- one primary wireframe screen;
- no more than four essential alternate, error, or recovery states;
- one contextual overlay at a time;
- no duplicated explanation across summary and cards.

Every added section, state, control, or surface must prevent or recover from a named user failure.

## Prompt patterns that work well

### Clarify a fuzzy problem

```text
$prism We keep hearing that users abandon package selection, but the team has
jumped straight to redesigning cards. Help me frame the actual user problem.
I have attached funnel data, six support complaints, and the current screens.
```

### Explore and choose a direction

```text
$prism Recommend the simplest UX direction for returning users who must choose
which family member a lab package is for. Compare 2-3 structural options and
make one recommendation. Stop before wireframing.
```

### Map an end-to-end flow

```text
$prism Create the user flow from a due-test recommendation through member
selection, slot booking, payment failure, recovery, and confirmed appointment.
Call out system states and places where the user must retain control.
```

### Improve content and hierarchy

```text
$prism Review this result screen. Make the immediate answer, its meaning, and
the next safe action obvious. Propose the information hierarchy and interface
copy, including loading, error, and completion states.
```

### Plan research only where it can change the decision

```text
$prism We do not know whether people understand "fasting required" before
booking. Decide whether this needs research. If it does, give me the smallest
useful learning activity and a moderator script.
```

### Request a wireframe explicitly

```text
$prism Use the agreed member-first direction and create an interactive mobile
Dopamine wireframe. The family member and the recommended test should dominate.
Include the main state, unavailable-member state, slot failure, and recovery.
```

### Respond to unspecific negative feedback

```text
$prism The recommendation section in the wireframe feels cluttered and cheap.
Diagnose why, show three materially different in-context directions, and do not
change the main artifact until I select one.
```

## Prompts that produce weaker work

Avoid requests such as:

```text
Make this better.
```

```text
Redesign the whole app and make it modern.
```

```text
Copy this competitor exactly.
```

They hide the user, moment, breakdown, consequence, evidence, and decision boundary. If that is all you have, I can still begin, but the first discovery question becomes essential.

Also avoid prescribing a surface before the problem is understood—for example, “create a dashboard” or “make a five-step wizard”—unless that structure is genuinely fixed. Tell me the outcome and constraints first; let the interaction structure earn its place.

## How I make decisions

I prefer a direction when:

1. the user can recognize the pattern immediately;
2. the primary answer is visible without opening another layer;
3. unavailable actions look unavailable;
4. important conditions are visible before commitment;
5. secondary explanation can be deferred;
6. the system performs work that the user should not have to do;
7. mistakes are prevented or clearly recoverable;
8. the user keeps meaningful control over consequential choices;
9. the journey ends at a real product outcome, not merely a completed form;
10. a simpler pattern cannot solve the supported difficulty equally well.

For healthcare and other trust-sensitive work, clarity and safety override novelty, delight, and conversion pressure.

## What a good Prism result should make clear

A completed result should let the team answer:

- Who is the user in this moment, and what progress are they trying to make?
- What is the actual difficulty rather than the visible symptom?
- What evidence supports the claim, and what remains assumed?
- What is the simplest familiar pattern that could work?
- Why is the recommended direction stronger than the alternatives?
- What conditions must be known before the user acts?
- What does the system decide, and what remains under user control?
- How do unavailable, loading, error, changed, and recovery states behave?
- Where does the journey truly finish?
- Which questions or dependencies remain unresolved?

## Folder map

```text
Prism/
├── SKILL.md                         # Agent entry point and governing workflow
├── README.md                        # Compact overview and installation notes
├── PRISM_GUIDE.md                   # This practical user handbook
├── prism-core/
│   ├── references/                  # Focused branches, gates, and checks
│   ├── skills/                      # Specialized visual-pattern research skill
│   └── scripts/                     # Gallery maintenance helper
├── tata-1mg-development-design-system.md
│                                      # Canonical wireframe visual reference
├── tata-1mg-development-design-system/
│   ├── design-system.html           # Searchable component/page reference
│   ├── assets/                      # Approved local assets
│   └── source-snapshots/            # Source evidence, not instructions
└── visual-research/
    ├── visual-research.html         # Searchable screenshot browser
    ├── index.md                     # Pattern clusters and usage rules
    ├── catalog.json                 # Machine-readable attribution/provenance
    └── screenshots/                 # Curated visual references
```

## The most important operating rule

Ask me for the decision you need, not the maximum amount of design output I can produce.

The best Prism engagement is usually compact: one consequential question, enough evidence to understand it, one deliberate divergence, one recommended direction, and only the fidelity needed to make the next decision confidently.

