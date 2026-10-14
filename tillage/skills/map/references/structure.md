# Map skill — structure playbook

Read when entering **structure** mode (SKILL.md: Modes), and BEFORE your first
structural write (the grammar section below).
Structure edits are context edits — position in the tree IS scope.

## Contents
- The grammar and the structural op catalog
- Mode: structure — reorganize what exists, safely (axioms → protocol →
  verbs and their conservation laws → never)

## The grammar and the structural op catalog

Apply the defining sentence before every mint — these are classifier-grade,
verbatim from the structure spec. `nodeType` is the letter; the prose uses the
word.

- **A · project** — "The software product/repository system." Exactly one;
  the root — never minted by an op.
- **B · core value proposition** — "For **[beneficiary]**, **[observable
  condition]** changes in a desired direction." Remains valuable if every
  implementation noun is removed. `beneficiary` and `desiredChange` are
  REQUIRED at mint. It comes from the human, in chat or in a document they
  pointed at: its `origin` is `chat`, `repo-file` or `outside-file` — `code` and
  `observation` are refused. Never nests.
- **C · approach** — "We deliver the parent by **[verb]-ing [object] under
  [conditions]**." Remains true across alternative implementations; need not
  be accepted or released as one unit. Decomposes freely (C→C).
- **G · architecture** — "The shared infrastructure approaches that the
  propositions' approaches depend on." Exactly one, minted with the map; holds
  approaches only. Others stand on its approaches through `addBuiltOn`.
  An approach goes under Architecture only when something on the map stands on
  it: `addBuiltOn` in the same batch. Otherwise, under its proposition.
- **D · question** — "We do not yet know **[question]**; its answer affects
  **[nodes]**." The QUESTION is the node's title. Its inside is its
  investigations; it holds no rows.
- **F · investigation** — "We gather evidence on the parent question by **[one
  methodology]**; it concludes **[verdict]**." `methodology` REQUIRED at mint (a
  second method is a second F); `criterion` ("we are right if…") freezes once
  concluded. Holds task rows.
- **E · slice** (display word for the `behavior` subtype: **Feature**) — "A
  bounded repository change or maintained implementation unit that can be
  accepted as one unit, has an observable behavior **or preservation**
  contract, and has concrete repository bindings once active." `eSubtype`
  REQUIRED at mint: `behavior` · `defect-repair` · `refactor` · `migration` ·
  `operations` · `removal` · `repository-content` · `unspecified` (the honest
  escape when you cannot tell — never a default, never a guess). Holds task
  rows; never nests — a slice that decomposes is SPLIT.

A document is never a node: it is an **attachment**, an id'd record linked to
nodes with a role, always shown with its path or URL.

**The C-vs-E test** (apply before writing): *"If we replaced the
implementation entirely while retaining the same ability, would this item
still be true?"* Yes → C. Names the particular behavior/contract/change
boundary being accepted → E. ("Support account recovery" C · "iOS
password-reset flow using universal links" E.)

**Legal containment — everything else is refused:**
`A→B A→G · B→C B→D · C→C C→D C→E · G→C · D→F`. **B→E is ILLEGAL** — a slice
implements an approach: a slice serving two propositions shares an approach
under each of them, or takes several approach parents (`addChildRef`). Before
minting a proposition, run the five-check: (1) names a beneficiary; (2) an observable desired change, not a
facility; (3) meaningful with the implementation unknown; (4) causally
contributes to the project's purpose; (5) has a distinct evaluation signal. The
write surface enforces only that both slots are non-empty; the substance is
your judgment — when a candidate names a mechanism, it is an approach.

Every mint is a `createTypedNode`; `reparent` and `addChildRef` obey the same
pair grammar, and the refusal names the redirect. Every mint names its
`origin` or is refused.

**Structural op shapes** (`apply_ops`; you mint the ids; each op's meaning and
when-not: references/fields.md; one op in depth: `explain_field`):

```
{ t:'createTypedNode', parentId, nodeId, title, origin,   // no x/y — refused; the app places every new node
  nodeType,                    // 'B'|'C'|'D'|'E'|'F' — never 'A' or 'G' (the map mints those)
  eSubtype?,                   // E: REQUIRED (enum above)
  beneficiary?, desiredChange?,        // B: REQUIRED, non-empty
  segment?,                            // B: optional beneficiary segment
  evaluationSignal?,                   // B: optional OBJECT { text, target?, by? YYYY-MM-DD }
  methodology? }                       // F: REQUIRED, non-empty
{ t:'setTypedSlots', nodeId, patch:{ beneficiary?, desiredChange?, segment?,  // B
  evaluationSignal?,           // B: the whole object, or null to clear
  target?,                     // E
  methodology?, criterion?,    // F; criterion freezes once concluded
  eSubtype?, eLifecycle? } }   // E; text slots: null clears; eSubtype is only set; eLifecycle: planned|active|done
{ t:'setConclusion', nodeId, conclusion }  // a D or an F: supported|rejected|inconclusive|abandoned; null reopens
{ t:'setVerdict', nodeId, verdict, why?, inChat:true }  // a B: validated|invalidated|retired — the HUMAN's stamp, recorded on their word in chat
{ t:'addAffects', nodeId, targetId }       // a question → a node its answer affects; removeAffects undoes
{ t:'addBuiltOn', nodeId, targetId }       // a C or an E stands on a C; removeBuiltOn undoes
{ t:'addDependency', nodeId, targetId }    // nodeId WAITS on targetId (C, D, E or F both ends); removeDependency undoes
{ t:'setDue', nodeId, due }                // YYYY-MM-DD, or null to clear
{ t:'addUat', nodeId, uatId, text }        // a slice's plain-English acceptance criterion (updateUat, removeUat, addTag: references/fields.md)
{ t:'assertBindings', nodeId, bindings }   // E only; repo-relative posix paths, wholesale replace — refused: absolute, `\`, `.`/`..`/empty segments, `*`/`?`; on an active or done E a path not on disk in your worktree is refused; an active/done E's bindings route `start_work {path}` first
{ t:'splitSlice', nodeId, parentId, newNodeId, title,
  parts:[{ nodeId, title, eSubtype, rowIds, uatIds? }] }  // no positions — refused
{ t:'addAttachment', attachmentId, title, locator,
  link:{ nodeId, role } }                  // role: input|output|reference|render|runbook
{ t:'linkAttachment', attachmentId, link:{ nodeId, role } }
{ t:'addNote', nodeId, rowId?, noteId, text, by:{ kind:'agent', name } }
{ t:'closeNote', nodeId, rowId?, noteId, inChat:true }    // only on the human's word
```

A slice's lifecycle (`eLifecycle`) is a JUDGMENT slot: set `done` only with
acceptance evidence or the human's confirmation — a contradicting task rollup
surfaces as a reconciliation proposal, never an auto-flip.

## Mode: structure — reorganize what exists, safely

**When:** the map exists but its shape is wrong — the user asks you to restructure,
reorganize, group, merge, split, rebalance, or clean up the map.

A structure edit is a context edit: position in the tree IS scope, so moving a node
rewrites what its rows inherit. The composite ops preserve identity by construction —
rows, receipts, commits, dependencies, and attached guidance all ride. Your job is the
judgment layer: **propose → confirm → apply → verify**. Never restructure without a
confirmed proposal.

### Axioms first

Before proposing, read the root's and the affected subtrees' decisions and
instructions — a SCOPED outline (`get_doc {nodeId: <its root>, depth: …}`, or a root
outline for map-wide axioms) rather than the whole doc; `get_context` assembles a single
node's inherited guidance. The map's own axioms ARE the style guide
for restructuring it (e.g. "an approach names how we deliver, never a phase of the work"). If your
proposal conflicts with an axiom, surface the conflict and ask — never silently
override it, and never treat it as unchangeable either.

### Protocol

1. **Propose** — a prose structure diff, nodes named by TITLE (never raw ids). It MUST
   spell out the inherited-context changes ("moving *Payments* under *Platform*: its
   rows will now inherit X and lose Y") — reparenting preserves attachments but
   rewrites inheritance. State any ids you will mint (new approaches) and anything you
   will explicitly retire.
2. **Confirm** — wait for the human's yes. In-app edits to your proposal win.
3. **Apply** — ONE `apply_ops` batch, so it lands as one write. The app stamps a batch
   id; the human sees what landed ("Added to your map: 2 slices").
4. **Verify** — an outline before/after diff SCOPED to the affected subtree (`get_doc
   {nodeId, depth}`): cheap, and id-diffing is exactly what the outline carries.
   - the node-id delta equals EXACTLY the ids you minted — nothing else appeared or vanished;
   - every instruction / decision id survives, or was explicitly retired in the proposal;
   - `dependsOn` endpoints all resolve;
   - row ids are preserved across moves (the row object rides wholesale — receipt and commits with it).
   When the batch DESTROYS nodes or RETIRES guidance (`deleteEverywhere`, merge
   cleanup), verify that subtree with `view:'full'` instead — the outline drops tombstones,
   receipts, and `retiredContext`, so only full lets you confirm what retire-not-delete must
   preserve actually survived. Report the context diffs for affected rows. Then run
   `lint_structure` and report the warning delta (which you cleared, which remain).

### Verbs and their conservation laws

Entity-creating structure ops mint their id IN the op, same as onboarding — you supply
a legible `newNodeId` (`n-platform`, `n-billing-shared`), unique in the doc. You never
run `makeOp`; the op carries the id. Group and Promote are
`createTypedNode` + `reparent` / `moveRow`.

- **Group** — `createTypedNode` the new parent (an approach), then `reparent` each
  child under it; the new parent carries NO guidance unless you proposed some —
  add it as separate ops in the SAME batch.
- **Reparent** — `{ t:'reparent', nodeId, fromParentId, toParentId }`: the app places
  the arrival. Report the inherited-context diff.
- **Split** — a slice that decomposes: ONE `splitSlice` (it mints the approach, moves
  the original slice under it and mints a slice per part; a row or criterion no
  part names stays on the original — ask if any assignment is ambiguous). Anything else:
  `createTypedNode` + `reparent` / `moveRow`.
- **Merge** — `moveRow` every row to the winner, re-attach guidance (on the human's
  word the moved rules land confirmed in chat: `addInstruction` with `inChat: true`;
  otherwise as `proposeInstruction`, waiting for them), redirect incoming
  `dependsOn`, and retire the loser only AFTER everything has moved
  (`deleteEverywhere`) — expand–contract: never destroy in the step that creates. `moveRow` is
  `{ fromNodeId, toNodeId, rowId, toIndex }` and moves the row OBJECT wholesale — id,
  status, receipt, commits, notes all intact.
- **Promote** — a task on a slice that grew into its own slice: a slice never
  nests, so `createTypedNode` the new E under the SAME approach (you mint its id),
  then `moveRow` the task into it.
- **Retiring guidance** is never a side effect of a move: an instruction retires
  only when it is killed (unconfirmed ones are yours; confirmed ones are the
  human's) or its node is destroyed (`deleteEverywhere` moves it to the graveyard)
  — say which in the proposal. There is no park/archive move.
- **Extract-shared** — `{ t:'addChildRef', parentId, nodeId }` (a native DAG
  link — the node lives under two parents). **Rebalance** — `moveNode` only (repositions
  are always safe; they change no scope).

### Never

- **copy+delete to move a node** — it forges identity and severs receipts and dependencies.
- **restructure without a confirmed proposal.**
- **guess placement when confidence is low** — ask, offering your top-2 candidate parents.
