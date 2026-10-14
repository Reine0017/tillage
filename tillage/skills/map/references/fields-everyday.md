<!-- GENERATED from src/sync/fieldGuide.ts by `npm run skill:fields` — do not edit; edit the source and regenerate. -->
# Map skill — field guide: rows, guidance, briefs and summaries, refused

One line per field: what it MEANS, then **Not:** when not to use it and what fits instead — judgment, not refusals. The daemon refuses a malformed value and names the entry to read; the long form (when to use, shape, an example, and the correction to offer a human who reaches for the wrong field) is `explain_field {field}`. Grammar and containment: references/structure.md.

## Contents
[Rows](#rows) · [Guidance](#guidance) · [Briefs and summaries](#briefs-and-summaries) · [Refused](#refused)

## Rows
- `addRow` — One executable task on a node's table — the unit of work; mints the table on first use. **Not:** Not a rule (proposeInstruction), a choice (proposeDecision), a fact (record_memory) or a criterion (addUat); not a node.
- `updateRow` — Patches a row's own fields — task, url, assignee — nothing else; null clears url, assignee. **Not:** Never status (setRowStatus), commits (addRowCommit) or notes (addNote); a receipt is only ever stamped on the doing transition.
- `deleteRow` — Removes a row outright, receipt and commits with it — no tombstone (a recorded gap). **Not:** Never on your own initiative — destructive, unrecoverable; only on the human's instruction in this session; not for moving (moveRow).
- `setRowStatus` — The one status transition — todo | doing | done | verified; a fresh doing freezes the receipt; verified only from done. **Not:** Not updateRow (refuses status); never verified as your own claim; never done with no commits and no note.
- `addRowCommit` — Appends one commit hash to a row's provenance — the typed channel find_rows walks; append-only, lowercased, idempotent. **Not:** Not notes; not a branch name, PR number or message.
- `moveRow` — Moves the row OBJECT wholesale between tables (or reorders within one) — id, status, receipt, commits, notes intact. **Not:** Not delete + addRow (forges a new identity and drops provenance); the target needs a table, minted by its first row.
- `addNote` — A signed, dated note on a node or a task row (rowId); yours is a remark, a human's an instruction open until closed. **Not:** Not a rule (proposeInstruction), not the node's standing prose (setDescription); never a human's note under your name.
- `closeNote` — Marks a human's open note addressed — after the human confirmed in chat. **Not:** Never on your own initiative — only after the human said it in this session; never an agent's own remark (never open); never a second close.

## Guidance
- `proposeInstruction` — A standing rule on a node, cascading to descendants; lands UNCONFIRMED for the human to confirm. **Not:** Not a task (addRow), a choice (proposeDecision) or an observation (proposeMemory); never confirm it yourself.
- `proposeMemory` — An agent observation about how the project works (an instruction of kind memory); unconfirmed, served marked. **Not:** Not a rule the human stated (proposeInstruction) nor current-state narrative (set_brief); never confirmed by you.
- `flagInstruction` — Records a mismatch: a rule the code contradicts, with a note on what the code does instead and where you saw it. **Not:** Not an edit or a kill; refused on a killed instruction; re-flagging overwrites the note; the human resolves it.
- `editInstruction` — Rewrites an instruction's text (new rev: receipts key on it) and clears any flag. **Not:** A CONFIRMED one only with inChat: true on the human's word; refused on a killed one, or if it changes nothing (to keep it, confirmInstruction).
- `killInstruction` — Tombstones an instruction (killedAt) — retired, never deleted, so receipts still resolve; a second kill is refused. **Not:** On a confirmed one only with inChat: true after the human said so; a killed one cannot be edited or flagged.
- `proposeDecision` — A made choice on a node, landing UNCONFIRMED for the human. Its `rejected` slot is served, so agents stop re-proposing it. **Not:** Not a rule (proposeInstruction) or an open question (a D); confirmed ones change only by supersede.
- `killDecision` — Tombstones a PROPOSED decision (killedAt) — kept for receipts; refused on a confirmed one. **Not:** Confirmed decisions retire only via supersedeDecision (on the human's word in chat, or on the map); a second kill is refused.
- `editDecision` — Rewrites a PROPOSED decision's text (bumps rev); refused on a confirmed one. **Not:** A confirmed decision is immutable except by supersede; refused on a killed one.
- `confirmInstruction` — The human's confirmation of an instruction (stamps confirmedAt and confirmedBy; clears a flag). **Not:** Never for something the human did not say — the record shows it on the node; refused without inChat and a name.
- `confirmDecision` — The human's confirmation of a proposed decision (deletes proposedAt; stamps confirmedAt and confirmedBy). **Not:** Never for something the human did not say — the record shows it on the node; refused without inChat and a name.
- `addInstruction` — Mints a CONFIRMED instruction — a rule the human stated in this session (rev 1, confirmedAt stamped). **Not:** Never for something the human did not say — the record shows it on the node; refused without inChat and a name.
- `addDecision` — Mints a CONFIRMED decision — a choice the human made in this session; carries its own confirmedAt and confirmedBy. **Not:** Never for something the human did not say — the record shows it on the node; refused without inChat and a name.
- `supersedeDecision` — Retires a confirmed decision and mints its replacement in one op — its only lifecycle. **Not:** Never for something the human did not say; never to reword — the retired entry stays as history; refused without inChat and a name.
- `addWaiver` — The human's waiver of one warning: their word, with a reason, that it is wrong; silent until its inputs change. **Not:** Not a fix (use the op the warning's fix names); not your judgment; never send version or pinned, the daemon fills them.
- `withdrawWaiver` — Withdraws a waiver on the human's word; the warning returns if it still holds. The record stays, marked withdrawn. **Not:** Not an edit (a waiver has none); not on your own judgment.

## Briefs and summaries
- `setBrief` — A node's current-state prose — what the node is, live gotchas, rationale, what not to do; 1,500-char cap. **Not:** Never status ("shipped" — derived from rows and commits); not rules or decisions (guidance has ids and receipts).
- `setSummary` — A human-facing digest of this node’s subtree as of now — not served to agents; STALE once anything under it moves. **Not:** Not the brief (agent-facing, status-free); never rules or decisions; never optimistic — say what is unverified.
- `setProjectBrief` — The one project-wide narrative, on the DOC not the root node; every agent receives it; ≤1,500 chars; empty clears. **Not:** Not the root node's brief (a node like any other); not status; loses to every node on the path in a conflict.

## Refused
- `replaceDoc` — Swaps the whole document — the app's own resync, applied in the tab and never sent. **Not:** Refused in every apply_ops batch at its index (never accepted): a bulk agent write must not erase the human's review edits — write ops instead.
