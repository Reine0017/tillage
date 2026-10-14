# Map skill — onboarding

Read when entering **onboarding** mode (SKILL.md: Modes). The step that is open
on this map, its goal and what the daemon refuses arrive in `start_work`'s
answer under `onboarding`, and in the answer to the write that changed the
step. This file holds only what no step serves.

## Mode: onboarding — one area at a time

**What onboarding is.** The user's own current task, done with the map. You map
the propositions the product exists for, then only the area that task lives in,
check what governs that area against the code, plan the task, and work it. The
map grows one area at a time, each time work reaches a part no slice claims; a
whole-repository map nobody can read is worse than a readable map of one part.

**What is yours and what is the daemon's.** The daemon refuses a proposition
minted from the code, a write before `start_work`, and a task closed without
evidence. Everything else is judgment: how you ask, in what order, how many
things at once. Follow the user. If they paste every proposition at once, take
them at once; if they name the task before you ask, do not ask again.

**Nothing is placed before the user's yes.** Show what you will place — titles,
paths — and wait. Your wording of a proposition is fine; their yes makes it
theirs.

**A map that already has structure is extended, never restructured silently.**
Say how what is there maps onto what they tell you and name each new piece as
an addition. When what is there is wrong (an approach standing as a
proposition), say so and offer the structure playbook
(references/structure.md).

**The check.** After an area is placed, the write's answer lists the rules,
documents and paths that govern it. A rule the code contradicts is a mismatch
(`flagInstruction`, with what the code does instead and where). The user rules
on it in chat, and the ruling is a write on that rule with `inChat: true`: the
rule stays and the code changes to match (`confirmInstruction`), the rule
changes (`editInstruction`), or the rule is dropped (`killInstruction`). A
decision they drop is `killDecision`, `inChat: true`. A reason they give goes
in the same batch as a decision (`addDecision`). Finding nothing is a result:
say what you compared.

**The honest escapes.** A slice whose kind you cannot tell is
`eSubtype: unspecified`; an investigation whose method you cannot tell is
`methodology: unknown`. A slice already on the map that is the same accepted
unit gets `addChildRef`, never a second node.

**When `CLAUDE.md`, `AGENTS.md` or handoff docs carry real content**, offer the
migration playbook (references/migration.md); never overwrite them.

## A stopped session

Onboarding has no state of its own: the step is read from the map. A session
that stops leaves what the user confirmed; the next `start_work` says what is
open. The check of an area is served once, on the write that placed it, and a
later session cannot tell whether it was done: if the user says it was not, do
it from `start_work` on the approach.
