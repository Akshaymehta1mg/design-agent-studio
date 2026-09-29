# Interface principles — Dopamine 2.0

The design-conviction layer of the system. It defines the intent a surface
must be built *toward*, with clarity and safety as the non-negotiable floor.

The framework has three layers, and they run top-down:

| Layer | Answers | Where it lives |
| --- | --- | --- |
| **Principles** | What is the right *kind* of experience? | The interface beliefs |
| **Laws** | How should the experience be *designed*? | The UX on the surface |
| **Visual** | How do we actually *build* the UI? | Tokens, type, layout |

Principles set the intent. Laws translate the intent into design rules. The
visual layer is where the laws become the UI for a screen. Read them in that
order — a visual decision that can't trace back up to a law and a principle
is decoration, not design.

## The overriding bias

1mg is not a marketplace. A confused user in a healthcare space doesn't just
add the wrong product to the cart or abandon a flow. They can take the wrong
medicine, misread a result, miss a medication warning, or skip a critical
preparation step. Those outcomes carry weight in a user's life.

So the framework carries one bias that overrides everything else:

> **Clarity and safety always beat delight.**

When a principle, a law, and a visual instinct disagree, this is the
tiebreaker. Stage 3 (polish) is where delight may push back, but it must never
reduce clarity, safety, legibility, or user control.

## The six principles

Ordered by rank. Higher-ranked principles win ties.

### 1. Trust through explainability

Trust in a health product is earned by never asking the user to take anything
on faith. Why is this medicine recommended? Why this price (MRP vs. discount
vs. best price)? Why was this substitute offered? Why is this value flagged?
Every time, the product gives a clear, honest answer — and is honest about
what it *cannot* do ("This is information, not a diagnosis. Please talk to a
doctor."). A user who understands can catch a mistake the system misses.

**Evaluation question:** Can the user understand *why*, in plain words — and
does it also say what it cannot do?

| We do | We don't |
| --- | --- |
| Label *why* a product is recommended (same salt, strength, form, use case) | Offer an unexplained "recommended for you" medicine |
| Name the source or credential behind advice | Treat the user's trust in the system as unshakeable |

### 2. Calm over alarm

People are already worried about health. The product's job is to help them
feel calmer — plain words, soft colours, no fake pressure. When there is
serious news (a flagged result), share it with care: explain what it means
and give a clear next step immediately. Staying calm is never hiding things;
it is *how* hard truths are shared, not *whether* they are shared.

**Evaluation question:** Does this help the user feel calm and know what to
do? Or does it create worry just to make them act?

| We do | We don't |
| --- | --- |
| Frame a flagged result neutrally with a clear next step | Paint minor deviations in alarming language and colour |
| Reassure while still surfacing warnings | Fabricate stock or time scarcity to drive conversion |
| Use urgency only when it is clinically real | |

### 3. Context aware

Meet users where they are — their role, where they are in the journey, and
how they feel. Picture four people, sometimes on the very same screen: a
first-timer comparing multivitamins; a diabetic reordering a regular medicine;
a worried caregiver booking a parent's test; someone reading a lab result
outside the normal range. Context can change what you show first and what you
highlight. It must never change the facts themselves.

**Evaluation question:** Does this notice who the user is and how they feel?
Or does it treat everyone like the same generic user?

| We do | We don't |
| --- | --- |
| Adjust emphasis and ordering to the user's role and state | Show a returning chronic patient the same generic homepage as a first-time visitor |
| | Ask again for information the user already gave us |

### 4. Answer first

Start with what the user came for; put extra details *after* it, not before.
Is this in stock, and when will it arrive? What does my result say? Is this
safe with my other medicine? Answer that first, in plain words — *then* show
proof, choices, and extras. This is the opposite of the link-first layout
where the answer is buried under a link, button, banner, and ad.

**Evaluation question:** Does the screen answer what the user came for, in
language they understand? Or is the answer buried under an interaction?

### 5. Progressively disclose

Show what matters right now; let users ask for more depth instead of forcing
it. Health information goes deep — showing all of it at once suppresses the
part that matters. Hiding extra detail is fine; hiding a *key fact* is not.
Anything the user needs to act safely counts as essential and stays in view.

**Evaluation question:** Have we shown just what the user needs for this step,
with an honest path to full detail — and checked that nothing safety- or
clarity-critical is hidden?

| We do | We don't |
| --- | --- |
| Let the user expand details and references on demand | Use disclosure to bury something essential the user needs before deciding |
| | Force every unessential detail on every user at every step |

### 6. Participation creates ownership

Let users make and confirm the choices that matter — picking a delivery time,
saying yes to an alternate, setting a refill reminder, accepting a coupon,
sharing the context of their needs. People follow through on choices they
helped make. The choice must be *real*: honest, with real consequences, and
never a sneaky trick like guilt-tripping or confirm-shaming.

**Evaluation question:** Does the user really make and confirm the choices
that matter to them? Are those choices honest?

## The five laws

Laws translate the principles into concrete design rules. Each law serves
specific principles and is a summation of established usability heuristics.

The design system remains a non-negotiable implementation constraint when it
is available. The five laws below govern the design judgment layered on top.

### Law 1 — Make the next action obvious
*Serves: Context aware · Answer first · Calm over alarm*

At every step, rank the actions by usefulness. Make the single most useful
next action impossible to miss — easy to reach and the strongest thing on the
screen. Show the others, ranked below it, so the user can tell at a glance
which one matters most. When the next step is clear there are fewer mistakes;
in a health flow, pausing to ask "what now?" can make a user abandon care.

*Summation of:* Fitts's Law (target size and distance), Hick's Law (choice
count and decision time), Von Restorff (the different one is remembered),
Nielsen — visibility of system status.

### Law 2 — Assume the user will make mistakes
*Serves: Calm over alarm · Trust through explainability · Participation creates ownership*

Some mistakes are costly and hard to fix, so prevent them before they can
happen — the best time to catch a mistake is before the user makes it. For
smaller ones that slip through, make them easy to spot and easy to undo. Never
punish the user for an error; the goal is to keep them safe and calm, not to
make them feel at fault.

*Summation of:* Postel's Law (liberal in what you accept), Nielsen — error
prevention, and help users recognise, diagnose, and recover from errors;
confirmation before committing to consequential actions.

### Law 3 — Consistency over creativity
*Serves: Calm over alarm · Trust through explainability*

Use the same UX patterns across the whole app; knowledge learned in one place
should transfer everywhere. Choose the familiar, predictable way over a clever
new one. A fresh idea may look nice, but if it surprises the user or makes
them stop and learn, it slows them down and causes mistakes. (Creative
departures are Stage 3's job, and only with user approval.)

*Summation of:* Jakob's Law (users transfer expectations from familiar
products), Mental Model, Nielsen — consistency and standards.

### Law 4 — Don't burden the user cognitively
*Serves: Progressively disclose · Answer first · Context aware*

Break information into small, clear chunks the user can take one at a time. A
wall of detail is easy to get wrong; a few simple parts are easy to follow.
Choose smart defaults so the sensible option is already set. Wherever the hard
work can sit with the system instead of the user, let it — and never make the
user hold a fact in their head. If a fact is needed later in a flow, carry it
forward and show it again.

*Summation of:* Cognitive load, Miller's Law (7 ± 2 items in working memory),
Tesler's Law (irreducible complexity must sit with the system, not the user).

### Law 5 — Aesthetically pleasing designs work better
*Serves: Calm over alarm · Participation creates ownership*

Make the design calm, clean, responsive, and easy to read — but never let
good looks get in the way of being clear. A polished look signals the product
is good at what it does, and a responsive, "snappy" feel induces satisfaction.
Balance aesthetics so the surface never becomes overwhelming.

*Summation of:* Aesthetic-usability effect, the 60-30-10 colour-balance rule,
the Doherty threshold (interaction under ~400ms so neither side waits), Flow.

## The visual layer

Where the laws become UI. These are the system parts a composed surface is
built from; use the available Dopamine 2.0 tokens and product constraints.

| # | System part | Sub-parts |
| --- | --- | --- |
| 1 | Visual assets | Illustrations · Micro-illustrations · Iconography |
| 2 | UI (Layout) | Whitespace · Boundary · Container |
| 3 | Colour | Brand colour · Gray colours · System colours · Expressive colours |
| 4 | Type | Functional (Figtree) · Expressive (Figtree) |

Type role hierarchy (largest to smallest): **Page titles → Heading → Title →
Body → Sub text.** Functional type carries information; expressive type
carries personality. Both must preserve legibility and clear hierarchy.

## How to use this file in this skill

Use this as a compulsory evaluation layer when the task reaches a final
solution recommendation, flow, IA/hierarchy recommendation, content structure,
or Dopamine component-based wireframe.

Do not use the principles to replace problem understanding or force a
pre-decided answer. Use them to stress-test the proposed solution after the
core design reasoning is already formed.

When applied, explicitly check:

1. Which principle(s) the solution is serving most directly.
2. Which principle(s) are in tension.
3. Which law is shaping the most important action, hierarchy, or recovery.
4. Whether anything violates the overriding bias: **clarity and safety beat delight.**
5. What should change before the solution is considered strong enough to share.

## Compulsory wireframe gate

Before any wireframe construction, complete the five checks above against the agreed direction, hierarchy, states, actions, and recovery. Resolve every failure before construction. If a violation of clarity, safety, explainability, honest choice, or error recovery remains unresolved, stop: the direction is not ready to wireframe.

Record only the decision-critical result in the post-wireframe Design Notes: principles served, meaningful tension, governing law, and any deliberate trade-off. Do not expose the entire internal checklist when it passes.
