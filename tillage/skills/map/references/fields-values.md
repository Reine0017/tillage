<!-- GENERATED from src/sync/fieldGuide.ts by `npm run skill:fields` — do not edit; edit the source and regenerate. -->
# Map skill — field guide: every closed value

One line per field: what it MEANS, then **Not:** when not to use it and what fits instead — judgment, not refusals. The daemon refuses a malformed value and names the entry to read; the long form (when to use, shape, an example, and the correction to offer a human who reaches for the wrong field) is `explain_field {field}`. Grammar and containment: references/structure.md.

## Contents
[eSubtype](#esubtype) · [eLifecycle](#elifecycle) · [conclusion (D)](#conclusion-d) · [attachment role](#attachment-role) · [attachment lifecycle](#attachment-lifecycle) · [node state](#node-state) · [task status](#task-status) · [origin kind](#origin-kind)

## eSubtype
- `behavior` — New or changed user-observable behavior — the ordinary feature slice (display word: Feature). **Not:** Not restoring behavior already promised (defect-repair); not a change that preserves behavior (refactor).
- `defect-repair` — Restores behavior the system already promised; the E carries the defect's provenance (receipts, commits). **Not:** A one-line fix is a task row under the E it touches; a redesign is behavior.
- `refactor` — Changes structure while PRESERVING behavior — its contract is a preservation contract, stated as a UAT. **Not:** Never nested above the features it touches, never copied under each; a rename-only chore is a task row.
- `migration` — Moves data, schema, dependency or platform versions from one state to another, with a before/after contract. **Not:** A single small upgrade is a task row under a maintenance E; a recurring policy is guidance, never an E.
- `operations` — Maintained operational machinery — deploy pipelines, monitoring, backups, runbooks-as-code. **Not:** Not a "Platform" stratum or a separate map; an incident investigation is a D, not an operations E.
- `removal` — Deletes a feature, dependency, flag or screen as an accepted unit; the contract is what must still hold afterwards. **Not:** Not parking the old node (setNodeState maybe on the OLD E); the removal is a NEW E under the same C.
- `repository-content` — Content maintained in the repo as a deliverable — docs pages, landing page, marketing copy, sample data. **Not:** External campaign work is not an E — attach it (addAttachment) or leave it in its own system (structure spec §11).
- `unspecified` — The honest escape value when no subtype fits or you cannot tell — better than a plausible guess. **Not:** Not a default; a mapping that never emits it on an ambiguous repo is a reason to re-read, not a clean result.

## eLifecycle
- `planned` — Not yet realized in the repo: bounded UATs plus an asserted target, no file bindings — the default when the slot is absent. **Not:** Not for a slice with code on disk (active); a planned E routes nothing for start_work {path}.
- `active` — Work is under way: at least one concrete repository binding, or a marked external implementation (structure spec §4). **Not:** Not a wish (planned) nor a claim of acceptance (done); rows in doing do not make an E active by themselves.
- `done` — Accepted: acceptance evidence or the human's explicit confirmation — an agent-written UAT is NOT evidence (spec §4, §8). **Not:** Not "all rows done": an unstamped E with every row done is judgment-pending, a real state — never auto-flipped.

## conclusion (D)
- `supported` — The question was investigated and the evidence supports the hypothesis. **Not:** Not "we decided to do it anyway" without evidence: that is a decision (proposeDecision); the D stays open or goes abandoned.
- `rejected` — The question was investigated and the evidence contradicts the hypothesis. **Not:** Not "we stopped looking" (abandoned); not "nothing came out either way" (inconclusive).
- `inconclusive` — The question was investigated to its end and the evidence decided nothing either way. **Not:** Not for a question that was never investigated (abandoned).
- `abandoned` — The investigation stopped before its criterion was met — priorities changed or the question dissolved. **Not:** Not a negative result (rejected) and not "ran, no answer" (inconclusive).

## attachment role
- `input` — A source the work CONSUMES — the PRD, design or dataset the node is built from. **Not:** Not the result (output) and not background merely cited (reference).
- `output` — What the node PRODUCED — a D's evidence, a report, a generated result; a resolved D's output is its evidence (spec §5). **Not:** Not the spec the work started from (input); a resolved D that names nothing it affects is the lint's flag.
- `reference` — Background the reader consults — an architecture doc spanning a C's E's, an ADR, external docs — cited, not consumed or produced. **Not:** Not a doc to WRITE (that is an E repository-content or a row); not the node's own description.
- `render` — A visual of the thing — a screenshot, Figma export or Storybook render of an E or the approach it belongs to (spec §6, §4). **Not:** Not an a11y audit or spec (reference).
- `runbook` — An operating procedure for what the node realizes — how to deploy, recover or run it. **Not:** Not runbooks-as-code the repo maintains (an operations E with bindings); not a design doc (reference).

## attachment lifecycle
- `live` — The default — the attachment is current; spelled by absence on the record, so setting it clears any other lifecycle. **Not:** Not a way to un-retire a LINK (links retire immutably); the record and its links have separate lifecycles.
- `superseded` — A newer attachment replaced this one; the record stays for the history that cites it (structure spec §6). **Not:** Not a doc that went stale with no replacement (retired), nor one whose link is dead (unavailable).
- `retired` — No longer relevant and not replaced; kept, never deleted, so whatever cited it still resolves (structure spec §6). **Not:** Not deletion — there is none; not superseded (that needs a replacement attachment).
- `unavailable` — Still matters, but its locator no longer resolves — a moved file, a dead link, a revoked share. **Not:** Not a doc deliberately withdrawn (retired); not a substitute for adding the new location once known.

## node state
- `active` — The default: the node is live — it counts in rollups, its rows are work, lint looks at it. **Not:** Not a progress signal — done-ness is the E lifecycle and row statuses; never set active to "mark it started".
- `maybe` — The park mark: the typed canvas and panel hide the node, lint skips it, and its work still counts in rollups. **Not:** Not a lifecycle (planned is the E slot) and not deletion.

## task status
- `todo` — Not started — the default for every new row. **Not:** Not "blocked" (a blocker edge on the node) and not "someday" (leave it out, or note it).
- `doing` — In progress — entering it freezes the dispatch receipt (the guidance in context) and takes the agent's `sources` self-report. **Not:** Not a way to claim a row (that is assignee); do not re-enter doing to refresh — it stamps a NEW receipt.
- `done` — Finished by whoever did it — record commits (the typed channel) and a one-line note in the same call. **Not:** Not a human's acceptance (verified, their word in chat); never bare: update_task_status refuses done with no commits and no note.
- `verified` — Done PLUS a human looked — the second completion notch, reachable only from done (any other starting status is refused). **Not:** Not a tests-passed signal (that is the note); never set by an agent on its own work.

## origin kind
- `chat` — The human said it in this session; the pointer is the session date, YYYY-MM-DD. **Not:** Not for anything you read — a file names the file (repo-file, outside-file), the code names the directory.
- `repo-file` — A file INSIDE the repository states it; the pointer is its repo-relative path. **Not:** Not a file outside the checkout (outside-file); not code you read to see how it behaves (code).
- `outside-file` — A file OUTSIDE the repository states it; the pointer is its absolute path. **Not:** Not a tracked file (repo-file); the path is recorded, never the file's contents.
- `code` — You read the code and concluded it; the pointer is the directory or file you read. **Not:** Not a document that STATES it (repo-file); not something you noticed working a row (observation).
- `observation` — You noticed it while working a task; the pointer is that row's id. **Not:** Not something you read (a file, or the code); a row since removed reads "a task since removed".
