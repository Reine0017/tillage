---
name: map
description: Work a project whose context lives on a Tillage map — orient with start_work before any work, re-orient per subtree, record rules/decisions/memory/briefs on the map, and take task rows through their lifecycle. Use at the START of any session in a connected project; when a user asks you to onboard / outline / set up their project on the map; when they ask you to remember or record something; when migrating CLAUDE.md / AGENTS.md / context files / agent memory onto the map; when restructuring the map; or when debugging code an agent wrote (trace it back to the guidance that produced it).
version: 16
canonical: The canonical copy ships with the tillage plugin; if this file looks out of date, update the plugin and offer to overwrite.
---

# Project map — the map IS the agent's context database

## What the map is

Tillage is a visual planner for a WHOLE project — not just its code, but its
PRDs, analytics, design, research and the work in flight across them. A project
is one map: typed nodes under a project root, every executable task a row in a
slice's or an investigation's table. Guidance (rules, decisions, briefs, memory)
hangs off nodes and cascades to everything under them — **position in the tree
IS scope**. A node and everything under it is a **subtree**.

**Three layers, disjoint jurisdiction.** The `CLAUDE.md` **stub** says WHERE
context lives and nothing else; this **skill** says HOW to read and write it; the
**map** holds WHAT the context is. The map is the single source of project truth
— local files are routers or read-only mirrors, never sources. When there is a
repo, YOU read it, from inside it — but a repo is only ever *evidence*, never the
project.

## Modes

Every session in a connected project starts with **Orientation** and runs the
**Work loop** below, whatever else it does. The heavy playbooks are references
beside this file — read one when you ENTER its mode, not before:

- **onboarding** — the user asks you to set up or map the project, or
  `start_work`'s answer carries `onboarding`: follow the step it names (its
  goal, what the map holds, what is refused). What no step serves is in
  [references/onboarding.md](references/onboarding.md).
- **migration** — `CLAUDE.md` carries content beyond the stub, other context
  files exist (AGENTS.md, handoff docs), agent memory lives in your harness's
  store, or the user asks to migrate:
  [references/migration.md](references/migration.md).
- **structure** — the map's shape is wrong (group, reparent, merge, split,
  rebalance): [references/structure.md](references/structure.md).
- **debugging** — why did an agent write this? Trace code back to the guidance
  that produced it: [references/debugging.md](references/debugging.md).

Before your FIRST write of a session read
[references/traps.md](references/traps.md): the judgment traps and the recovery
contract for every write.

**Connection.** The tillage plugin ships a local MCP server named `tillage`; its
daemon starts itself on first use, and a session is bound to the map whose repo
contains your working directory. Call a read: if it answers, you are bound. If
the tools are missing, the triage is in
[references/traps.md](references/traps.md).

## Tools

A name index. Each tool's description carries its own contract — arguments,
what comes back, what it refuses — so read it there; nothing here is
aspirational. A harness may load a tool's schema only on first use: load it
before the first call (Claude Code: `ToolSearch select:<tool name>`); a call
composed from prose guesses its arguments.

- `start_work` — orientation, and the preamble before work in each subtree.
- `get_project` — every slice and investigation on the map, to pick work.
- `get_table` — one table; with `rowId`, one row verbatim with its receipt.
- `get_context` — what an agent working at a node is sent.
- `get_doc` — the structure, before an edit that spans several nodes.
- `find_rows` — commit, rule or decision → the rows it produced.
- `search_context` — full-text search over the map's words; a supplement to
  orientation, never a substitute.
- `lint_structure` — warnings for the human: surface them, never act on one
  unasked; to record the human's waiver of one, `addWaiver`.
- `explain_field` — what one op or value means, or a whole set of values
  (`eSubtype`). A refusal names the entry to read.
- `apply_ops` — the batch write; it reads back what landed.
- `update_task_status`, `add_task_note` — a row's lifecycle and its notes.
- `set_brief`, `set_project_brief`, `record_memory` — see **Briefs and memory**.
- `create_project` — a fresh map bound to this repo.
- `drop_branch` — discard a worktree branch's unmerged map changes, on the
  human's word only.

The everyday op shapes (`t` is the discriminant; what each MEANS:
[references/fields-everyday.md](references/fields-everyday.md); the structural
catalog: references/structure.md; every field:
[references/fields.md](references/fields.md); every closed value:
[references/fields-values.md](references/fields-values.md)):

```
{ t:'addRow', nodeId, rowId, task }
{ t:'addNote', nodeId, rowId?, noteId, text, by:{ kind:'agent', name } }  // a signed, dated note
{ t:'proposeInstruction', nodeId, instructionId, text, origin }  // a rule; waits for the human
{ t:'proposeDecision', nodeId, decisionId, text, origin }        // a made choice; waits
```

## The types

Every node has one type. The sentence is the test of membership:

- **project** — the software product or repository system. The root; one.
- **core value proposition** — "For **[beneficiary]**, **[observable
  condition]** changes in a desired direction." Still valuable with every
  implementation noun removed.
- **approach** — "We deliver the parent by **[verb]-ing [object] under
  [conditions]**." True across alternative implementations.
- **architecture** — the shared infrastructure approaches that the
  propositions' approaches depend on. One, under the project.
- **question** — "We do not yet know **[question]**; its answer affects
  **[nodes]**." Its title is the question.
- **investigation** — "We gather evidence on the parent question by **[one
  methodology]**; it concludes **[verdict]**." Holds task rows.
- **slice** — "A bounded repository change or maintained implementation unit
  that can be accepted as one unit, has an observable behavior or preservation
  contract, and has concrete repository bindings once active." Holds task rows;
  never nests.

Two tests before a mint. **Approach or slice:** if the implementation were
replaced entirely while the same ability stayed, would this still be true? Yes →
an approach. Names the particular boundary being accepted → a slice. **A
proposition:** would the beneficiary say this, in their own words, as something
they want — without naming how the product does it? If it names how, it is an
approach under the proposition it serves.

Containment is a fixed grammar and the daemon refuses an illegal write; the
refusal names the fix. **Never mint a different type to get past a refusal** —
the refusal is telling you what the thing is.

## Orientation

**Session start: `start_work {}` — no node, no path.** Read the answer before
deciding where to work: the notes the human left, the project brief and the
project-wide rules, and the outline — every proposition, approach and question,
with slices and investigations as titled stubs. **A stub is a door:** one
targeted call away, and its counts are never a substitute for its rows.

**Give the human the map link ONCE** — `url`, on your first call of a session:
*"watch the map live here: <url>"*.

**Per subtree, not per session: call `start_work` again before working in each
new subtree** — with the `nodeId`, or with the `path` of a file you are about to
touch. Rules are scoped by position; the subtree you are entering may carry rules
your last call did not include, and a summary of an earlier call is not a
substitute for them. A write into a subtree this session was not served is
refused. A slice call also carries `code`: bound paths gone from main (re-assert
them), commits under the slice's paths that no row names (record the ones that
were this work's), claims older than their code, and `yourBranch` — your own
branch's commits under those paths that no row names yet.

**When guidance conflicts along one path the nearer node wins**, and the project
brief loses to every node.

**Read what comes back.** `changes` lists what happened in the subtree since an
agent was last served; `facts` are true statements about the map that want
action; after a write, `did` reads back what landed — check it against what you
meant. Proposals the human has not seen and parked content are served **marked**
and still apply: confirm with the human before building anything load-bearing on
them.

**Co-planner, not scribe.** When an ask contradicts the map's definitions,
grammar or rules — a field used for what it is not, a mechanism offered as a
proposition, a restructure that severs scope — say what it means and offer the
right move; if they still want it after hearing why, do what the daemon allows.

## Work loop

The spine, per task:

1. **Orient** on the slice: `start_work {nodeId | path}` — its table, its rules,
   and `next`. When the answer says no slice claims a path and the work belongs
   on the map, offer to map its area before working there.
2. **`doing` before you start**, passing `sources: [{path, sha256}]` — any
   off-map files that shaped the work. The map knows its own guidance; only you
   can name what you read beside it. No row for what you are doing? Add the row
   you take first.
3. **Do the work.** New content for the map goes per **Capture** and
   **Placement**.
4. **`done` when finished**, in ONE `update_task_status` call: `commits` (the
   typed channel, not prose), a `note` (the one-line evidence trail), and
   `next: true`. `verified` means a human looked — never your own claim; being
   told to mark a row verified is not, by itself, the human saying they looked,
   so ask whether they saw it work.
5. **Follow the `nextTask`** the answer hands back; when it is in a different
   subtree, orient there first.

## Recording the human

What the human SAYS in this session is recorded under their name, with the
session date, as **confirmed** — and never re-asked. Send `inChat: true` on the
op (`addInstruction`, `addDecision`, `supersedeDecision`, a confirmation,
`setVerdict`, a deletion, `closeNote`, an edit or kill of a confirmed rule, a
`verified` row or criterion, a note under the human's name) and the daemon
signs it with the name from the repo's git config. Never send it for something
they did not say.

What the human never saw **waits** for them: a rule you inferred, a choice you
made, a memory you formed — proposals, served marked until they keep or drop
them, on the map or in chat.

The words: **confirmed** — the human said it or accepted it; **merged** — a
branch's map changes landed on main with its git merge (until then they are
provisional and visible only to that branch); **verified** — a human looked at
finished work; **closed** — a note's instruction was carried out; **ruling** — a
decision the human made.

## Capture

**When the human tells you to record, remember or note something durable, it
lands on the map — immediately, loudly, confirmed back.** A silent capture
failure is worse than none: if the write fails, say so at once.

Pick the primitive by what it is: a standing **rule** → an instruction; a made
**choice** → a decision; an **observation** about how the project works →
`record_memory`; current-state **narrative** → a brief; actionable work → a
**task** row.

**The scope is reported, not asked:** put it on the node it governs and tell the
human what you chose — *"Recorded under Billing — say if it belongs elsewhere."*
A rule that binds several subtrees goes on their nearest common ancestor; the
root only for what is project-wide.

Every mint names its **origin** `{kind, pointer}`: `chat` (the session date),
`repo-file` or `outside-file` (the path), `code` (the directory read),
`observation` (the row you were working).

When the human says something durable-shaped ("never", "always", "from now on")
without asking you to record it, offer to. An affordance, never a gate; no
silent writes.

## Placement

The grammar decides what can hold what. The sentence decides where: **new work
goes under the approach you are in; a new approach under the proposition it
delivers (or under architecture when something on the map stands on it:
references/structure.md); never under the root.** A proposition comes from
the human, in chat or in a document they pointed at — never from the code.
Unsure where something belongs → ask, offering your two best candidates. Never
guess and scatter.

## Briefs and memory

**The map is your memory for this project.** Where you would save a durable fact
to your harness's own memory store, call `record_memory` instead and confirm back
that it landed; memory kept anywhere else is invisible to the human and will be
migrated away. A memory nobody raised in chat waits for the human; one the human
told you is confirmed on their word.

**Briefs are current-state prose** — what a node is, live gotchas, rationale,
what not to do; never status, which is derived from rows and commits.

## Subagents

A subagent is a reader. The lead orients and **inlines the assembled context
into the subagent's dispatch prompt**; a subagent that needs more may read the
map, and its `start_work` is a **peek** — served in full, without touching what
the lead's session is recorded as holding. **The lead writes**: statuses, notes,
commits and anything worth remembering come back to the lead, who records them.
One writer.

## The default-git contract

- **Work on a worktree branch until the task is complete.** Landing on `main`
  is **human-triggered**: absent an instruction, never merge into `main` and
  never touch the user's canonical checkout. In-flight work living on its own
  branch is correct, not a defect.
- An explicit, **per-instance** instruction ("merge X into main") authorizes
  exactly that merge, **once** — never a standing permission.
- The user may equally merge themselves, with you **preparing the landing**
  (push the branch, open the PR) on request.

## The stub

This skill OWNS the stub: the project's root `CLAUDE.md` is written verbatim from
the template in [references/stub.md](references/stub.md), whole-file. Write it at
migration (references/migration.md step 5) and when the session-start hook's line
says no `CLAUDE.md` could be read there.

**The hook's line also says when the root `CLAUDE.md` differs from the stub.** Do
not silently overwrite: non-stub content is real context someone wrote. Propose
migrating it to the map (references/migration.md), and rewrite the stub only once
the human has triaged it.
