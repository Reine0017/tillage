# Map skill — traps

Read BEFORE your first write of a session (SKILL.md points here). These are the
judgment traps — the mistakes no refusal catches — and the recovery contract for
every write. The last entry is the triage for when the tools themselves are
missing.

## Traps (hard-won; they generalize beyond any one project)

- **Read before you write.** The user's edits in the app always win, and ids you
  minted earlier may have been edited, re-parented, or deleted by the user or a
  teammate since. Re-read; never assume your last write is still there. `get_doc`'s
  default outline carries every node, row and live guidance id — but over the size
  cap it shows slices as bare stubs, so scope it (`nodeId`) when you need their
  rows. It omits killed and superseded guidance, the `retiredContext` graveyard and
  the attachment records, and id uniqueness is checked against those too — so
  before you mint a guidance or attachment id, read `view:'full'` (the only read
  that shows them).
- **Prefer additive edits, and never create probe nodes or test rows.** The app
  has no undo, so a user cannot `Cmd+Z` away ops you land — and you cannot clean
  up after yourself: deleting a node or a row takes the human's word
  (`inChat: true`). To learn what an op does, read `explain_field`.
- **Address the human by TITLE, never by raw id.** Row and node ids (`r-…`,
  `n-…`) are wire identifiers for tool-call arguments ONLY. When you talk to the
  user refer to a task by its title, qualified by its node's title where it helps
  ("*Write hero copy* under *Landing page*").
- **Confirm only what the human said.** A rule, a decision or a memory you formed
  waits for them as a proposal. What they said in this session is recorded on
  their word — the confirming ops take `inChat: true`, and the daemon signs them
  with the human's name. Never send it for something they did not say.
- **Never mint a different type to get past a refusal.** A grammar refusal
  (`{ error, index }`) names the fix and carries `hint: "explain_field <op>"` —
  read that entry, fix the op, resend the batch. The type is a claim about what
  the thing IS, not a door past the gate.
- **`apply_ops` recovery — resend, never tail-patch.** `{ error, index }` is a
  refusal: nothing landed; fix the op at `index` and resend the whole batch. (A
  duplicate id is one of these — every id you mint is unique doc-wide among its
  kind, graveyard included; uat ids are unique per node.) An `{ error }` with no
  `index` is an insert failure: the batch is one atomic insert, so nothing landed
  there either — resend the SAME batch with the SAME `idempotencyKey`.
  `{ ok, deduped: true }` means that key already landed: do NOT resend; re-read
  state if you need the result.
- **Idempotency keys.** The write tools take an optional `idempotencyKey` (1–128
  chars of `[A-Za-z0-9_-]`; anything else is refused). Mint ONE fresh key per
  logical batch. On a network failure, retry the SAME call with the SAME key: the
  duplicate answers `{ ok, deduped: true }`. NEVER reuse a key across batches or
  tools.
- **The tools are missing.** Triage in order and report which check failed:
  (1) is the tillage plugin installed? (2) `node --version` ≥ 22.12? (3) does
  `/mcp` list `tillage`?
