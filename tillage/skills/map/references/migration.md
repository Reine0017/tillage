# Migration — move a repo's context files onto the map

## Contents

[Migration](#migration) · [When to run](#when-to-run) ·
[The seven steps](#the-seven-steps) ·
[Step 1 — inventory](#step-1--inventory) · [Step 2 — propose](#step-2--propose) ·
[Step 3 — confirm](#step-3--confirm) · [Step 4 — write](#step-4--write) ·
[Step 5 — stub](#step-5--stub) · [Step 6 — the gate](#step-6--the-gate) ·
[Step 7 — retire the originals](#step-7--retire-the-originals) ·
[Re-runs](#re-runs) · [Failure rules](#failure-rules)

## Migration

A repeatable product flow, not a one-off — every user with an existing repo
faces the same move. The order matters more than the steps: **verify before
removing**, so a failed migration costs a re-run, not a recovery.

## When to run

- The user asks to migrate, or connects a repo whose `CLAUDE.md` carries real
  project content (the session-start hook's line says the root `CLAUDE.md`
  differs from the stub).
- Other standing context files exist: `AGENTS.md`, handoff/context docs the
  user names, nested `CLAUDE.md` files in subdirectories.
- Agent memory for this project lives in the harness's own store.

If the map has no proposition yet, place its propositions first: call
`start_work` and follow the `onboarding` step it serves until they are on the
map — rules need nodes to land on — then return here.

## The seven steps

1. Inventory  2. Propose  3. Confirm  4. Write  5. Stub  6. **Gate**
7. Retire the originals

**Nothing is removed until step 6 passes.** Never reorder.

## Step 1 — inventory

Enumerate every channel present, and show the list to the human:

- Root instruction files: `CLAUDE.md`, `AGENTS.md` (and equivalents the user
  names — `.cursorrules`, handoff docs like `CONTEXT.md`).
- **Nested `CLAUDE.md`** in subdirectories: `find . -name CLAUDE.md -not -path
  './node_modules/*'` from the repo root — every hit below the root is nested.
- The harness's own memory store for this project (for Claude Code:
  `~/.claude/projects/<munged-project-path>/memory/` — the directory whose name
  is the project path with `/` replaced by `-`).
- Read-only channels that are mirrored, never migrated: project-local skills,
  hooks. Name them; do not propose moving them.

## Step 2 — propose

Read every inventoried file and propose a fate for each piece, line-level —
never file-level:

- a standing rule → an instruction on a node
- a made choice → a decision on a node
- an open item / actionable → `addRow` on the owning slice's table
- current-state narrative → the project brief (`set_project_brief`) or a node
  brief (`set_brief`)
- an observation / learned fact (incl. each live memory entry) → `record_memory`
- dead, stale, or derivable-from-git → **drop** (say why)

Every rule, choice and memory carries its **origin**: `repo-file` with the path
it was read from (`outside-file` for a file outside the repo, such as your
harness's memory store).

What each guidance/brief op means and when not to use it:
references/fields-everyday.md.

**Placement:** project-wide rules → the root; a narrower rule → the node it
governs; a rule that binds several subtrees → their nearest common ancestor. For a
**nested `CLAUDE.md`**, the governing node is suggested by the path→node binding
(an active/done E's asserted bindings first, else derived from recorded commits): call
`start_work {path: "<that directory>/<any file it governs>"}` and
read `resolved.nodeId` (`resolved.via` says which source answered) — override
when wrong.

Present the whole mapping in one reviewable block, grouped by source file, each
line with its proposed fate and target node BY TITLE.

## Step 3 — confirm

The human triages the proposal. This is where accreted history gets cut. Write
what the human confirmed AS confirmed — `addInstruction` / `addDecision` with
`inChat: true` and the file path as the origin — and nothing they have not seen;
do not argue a drop the human wants kept.

## Step 4 — write

Apply the confirmed mapping:

- Structure first (any new nodes per Placement), then guidance and rows via
  `apply_ops` batches (≤200 ops, fresh `idempotencyKey` each), then briefs via
  `set_brief` / `set_project_brief`, then memory via `record_memory`.
- Report every write's result. A failed write stops the flow (see Failure
  rules).

## Step 5 — stub

Write `CLAUDE.md` as EXACTLY the template in references/stub.md — the
whole file, verbatim, nothing else. If the repo also carries `AGENTS.md` for
other harnesses, leave it for step 7's triage; do not stub it.

## Step 6 — the gate

**A fresh agent, given only the stub, must orient and reproduce the project's
rules. Nothing is removed until this passes.** The checklist — every item a
command or a ≤5-minute human step:

1. *(command)* The stub matches the template byte-for-byte (diff it).
2. *(probe run)* Dispatch a FRESH agent whose entire project context is the
   stub (no other files, no prior conversation), with the tillage tools
   available, in the repo. Ask it a fixed probe list written at step 2 time:
   ~10 questions whose answers now live only on the map (the load-bearing
   rules: verification commands, hard constraints, policies). Pass = every
   answer reproduces the map's rule. A miss is triaged before proceeding:
   mapping gap → fix the map and re-run; agent failure → re-run.
3. *(human, ≤5 min)* The human opens the Context page and confirms the
   migrated rules, decisions, briefs and memory are visible and judgeable.

## Step 7 — retire the originals

Only after the gate passes, and each deletion confirmed with the human:

- `git rm` the migrated root files (`AGENTS.md`, handoff docs).
- `git rm` any **nested `CLAUDE.md` whose live content fully moved or was
  dropped**; a file the human kept any content in STAYS, and stays mirrored
  read-only on the Context page.
- **A partially-kept nested `CLAUDE.md` sheds what moved**: edit the file to
  REMOVE the lines whose content is now on the map, leaving only what the human
  chose to keep file-bound. Migrated content leaves the file — the harness
  auto-loads it, so a line left behind is a second, drifting copy of a
  map-owned rule. The trimmed file stays, mirrored read-only.
- **Archive, do not delete, the harness memory directory**: rename it
  `memory.pre-tillage-<date>` beside itself. It sits outside git — archiving is
  the only undo it has, and an empty live `memory/` is what makes the Context
  page's health indicator honest (any later entry is unambiguously new).

## Re-runs

The flow re-runs on request, per file — e.g. "migrate `daemon/CLAUDE.md` onto
the map" for a nested file added after cutover, or when the session-start stub
check finds new non-stub content in `CLAUDE.md`. Same steps, scoped to that
file; the gate scales down to re-probing the affected rules.

## Failure rules

- Every write is confirmed back; a failure is reported at once — never papered
  over, never silently retried past dedupe (`idempotencyKey` retry is the one
  sanctioned retry).
- If the daemon is unreachable mid-flow, stop and tell the human what failed
  and what remains unwritten. The inventory + proposal are your resume state.
- Never delete anything in the same turn it was migrated — deletion lives
  behind the gate, always.
