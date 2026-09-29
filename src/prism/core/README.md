# Prism

Prism is a pre-UI product-design skill that finds the simplest defensible UX solution, then expresses it at the level the user requests.

It can clarify a problem, explore directions, shape journeys and content, review flows, and create an explicitly approved interactive Dopamine component-based wireframe. It stops before final UI, production implementation, design-to-code, PRDs, engineering specifications, and post-development design QC.

For a practical explanation of what Prism is, how to invoke it, its branches of work, prompt examples, workflow, and boundaries, read [Prism: What I Am and How to Use Me](PRISM_GUIDE.md).

## What is inside

Prism is organised into three working areas. Keep the complete `Prism` folder together when installing or sharing it.

```text
Prism/
├── SKILL.md
├── README.md
├── prism-core/
│   ├── references/
│   ├── skills/
│   └── scripts/
├── tata-1mg-development-design-system.md
├── tata-1mg-development-design-system/
│   ├── design-system.html
│   ├── assets/
│   └── source-snapshots/
└── visual-research/
    ├── visual-research.html
    ├── index.md
    ├── catalog.json
    └── screenshots/
```

1. **Prism core** — `SKILL.md` is the agent entry point. `prism-core/` contains its focused design references, the Mobbin visual-pattern research skill, and the gallery maintenance script.
2. **Tata 1mg Development Design System** — `tata-1mg-development-design-system.md` is the source-of-truth guide. Its matching folder contains the searchable HTML component reference, approved assets, and source snapshots. Native page references currently include PDP, Cart, and the Labs Homepage; open the HTML and choose the page from Components.
3. **Visual research** — `visual-research/visual-research.html` is the human-readable, searchable screenshot browser. Its neighbouring index, catalogue, and screenshot folder must remain beside it.

The two support folders are deliberately kept with their entry files because the HTML references depend on the bundled assets and screenshots.

## Install Prism

1. Download the complete `Prism` folder. Do not download only `SKILL.md` or either HTML file.
2. Put the folder somewhere permanent on your computer, such as a project’s `skills` folder or your personal agent-skills folder.
3. Open that parent folder in Codex or Claude so the agent can read `Prism/SKILL.md` and its bundled references.
4. Invoke it with `@/prism`, followed by your brief. If your client uses a different skill-invocation syntax, attach or point it to the `Prism` folder and ask it to follow `SKILL.md`.

Example:

```text
@/prism Help me improve the delivery-address selection flow for returning users.
```

Prism will inspect the context, ask at least one focused discovery question, and wait for the answer before recommending a direction or creating an approved wireframe.

## Set up Mobbin MCP

Mobbin setup is advisable because Prism uses it to study relevant and analogous interface patterns before wireframing and during visual refinement.

### Codex

Run this in Terminal:

```bash
codex mcp add mobbin --url https://api.mobbin.com/mcp
```

Complete the browser sign-in when prompted, then restart Codex if Mobbin does not appear immediately.

### Claude Code

Run this in Terminal:

```bash
claude mcp add --transport http mobbin https://api.mobbin.com/mcp
```

Complete the browser sign-in when prompted, then restart Claude Code if Mobbin does not appear immediately.

### Verify access before using Prism

Before solutioning or invoking Prism, ask the host agent:

```text
Can you access Mobbin? Search for mobile delivery-address selection screens and return three relevant results.
```

Proceed only after Codex, Claude, or ChatGPT can actually return Mobbin results. If it cannot, fix the MCP connection first; do not assume setup succeeded because the command completed.

## Default approach

The skill follows one compact loop:

1. Inspect the supplied context, then ask at least one focused discovery question and wait for the answer.
2. Understand the user’s immediate job and where progress breaks.
3. Decide whether the available evidence is enough to move.
4. For an approved wireframe, run bounded local and Mobbin reference passes and turn the selected screens into compact insight packets.
5. Compare two or three structural directions, including one familiar/simple category pattern.
6. Choose the lowest-complexity direction that handles the important conditions and recovery.
7. Produce only the requested artifact.

The first question should clarify a design decision, not act as a generic confirmation. The skill may ask more questions when additional context could materially change the work.

It does not translate business complexity directly into interface complexity.

## Simple-solution rules

- Lead with one answer and one primary action.
- Prefer a familiar list, card, form, or contextual surface before inventing a framework.
- Let the system handle ranking, eligibility, and calculation where possible.
- Show essential conditions before action.
- Keep secondary details behind progressive disclosure.
- Never make an unavailable action look available.
- Add a section, control, state, or overlay only when it prevents or recovers from a named user failure.
- Default to one primary screen and no more than four essential alternate or recovery states.

## Research

Fresh research is not required when the difficulty is observable and the decision is reversible.

The skill uses supplied screens, product knowledge, analytics, prior research, complaints, and familiar interaction patterns when they are sufficient. It recommends learning first only when a missing answer could change the solution class or make the experience unsafe or misleading.

Competitor and adjacent-product references are treated as pattern evidence, not instructions to copy.

For wireframes, Prism first scans the bundled visual-research library, then uses the Mobbin Reference Pass to select only 3–5 screens from a focused search. It decodes their UX and information patterns and feeds those insights into Interface Principles and the wireframe. Mobbin screens and expiring image URLs stay temporary; only source links and distilled insights are retained.

## Dopamine wireframes

Every wireframe created by the skill uses the Dopamine 2.0 reference:

- the locally merged Tata 1mg Dopamine component rules;
- semantic colours;
- Figtree hierarchy;
- 8-point spacing rhythm;
- documented radii and elevation;
- component and state patterns;
- familiar product density and navigation.

The output remains an interactive review artifact, not final or production-ready UI.

The locally merged Tata 1mg Dopamine reference is the source of truth. Its bundled portable HTML provides deeper component detail without relying on an external catalogue.

## Scope boundary

Prism may inspect existing UI as context for UX decisions. It does not claim visual polish, pixel accuracy, design-system conformance, implementation parity, or real-world usability validation.

When the requested deliverable is outside scope, it states the boundary, offers the closest pre-UI alternative, asks permission, and stops.

## References

Detailed guidance remains available in `prism-core/references/` and is loaded only when the current output requires it:

- problem framing and user narrative;
- solution exploration and direction review;
- journeys, flows, content, and hierarchy;
- research planning;
- bounded Mobbin screen-reference research;
- interface principles;
- the canonical Tata 1mg Dopamine visual system, wireframe construction, and preflight.

For every wireframe, start with `tata-1mg-development-design-system.md`. It consolidates the visual construction rules and routes targeted inspection of `tata-1mg-development-design-system/design-system.html` without loading its full contents by default.
