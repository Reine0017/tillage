<!-- GENERATED from src/sync/fieldGuide.ts by `npm run skill:fields` — do not edit; edit the source and regenerate. -->
# Map skill — field guide: typed-map ops

One line per field: what it MEANS, then **Not:** when not to use it and what fits instead — judgment, not refusals. The daemon refuses a malformed value and names the entry to read; the long form (when to use, shape, an example, and the correction to offer a human who reaches for the wrong field) is `explain_field {field}`. Grammar and containment: references/structure.md.

## Contents
[Structure](#structure) · [Slots](#slots) · [Judgment](#judgment) · [Tags](#tags) · [Attachments](#attachments)

## Structure
- `createTypedNode` — Mints one typed node (B, C, D, E or F) under a parent with the slots its type requires; the app places it. **Not:** Never A or G (the map mints those); never a mechanism as a B, a milestone or a document as a node (attachments attach).
- `reparent` — Moves one parent→child edge atomically: identity, rows, receipts and guidance stay; what the node INHERITS changes. **Not:** Not copy + delete (forges identity), not a same-parent move (moveNode); illegal pair, cycle, duplicate refused.
- `splitSlice` — Splits a fat slice LOSSLESSLY: a new C takes the E’s place, the E moves under it, named rows and UATs move onto sibling slices BY IDENTITY — nothing is copied. **Not:** Not E→E nesting, not copy + delete; parts get no lifecycle stamp.
- `addChildRef` — Adds a second (or nth) parent edge: the SAME node lives under two parents — a DAG link, never a copy. **Not:** Never for "visible in two places" (a lens or a tag); refused on an illegal pair, a cycle or an existing edge.
- `moveNode` — Repositions a node on its parent's canvas — pure layout; changes no scope, no identity, nothing an agent reads. **Not:** x/y on a mint, addChildRef, reparent or split is refused (the app places every arrival); not a scope change (reparent).
- `renameNode` — Sets the title — on a typed map it carries the defining sentence (a D's title IS its question); on the root it renames the project. **Not:** Not for changing what a node IS (mint the right type).
- `setDescription` — The node's "why" — one paragraph on what this is and why it exists; empty clears it. **Not:** Never dissolve rules, decisions or a design doc into it (guidance ops, addAttachment — structure spec §11); never status ("shipped").
- `deleteEverywhere` — Removes a node everywhere, sweeps the unreachable; guidance goes to the graveyard (retire-not-delete). **Not:** Never on your own initiative — destructive, unrecoverable; only on the human's instruction in this session; root refused.

## Slots
- `setTypedSlots` — Edits judgment slots — B beneficiary/desiredChange/segment/evaluationSignal; E target/eSubtype/eLifecycle; F methodology/criterion. **Not:** Not conclusion, bindings or UATs (own ops); never eLifecycle done from a rows rollup alone.
- `assertBindings` — The E's asserted repo paths — wholesale replace, stamped; active/done E bindings route start_work {path} first. **Not:** Not on B/C/D/F/G (refused), not a pattern, not on a planned E (target); a wrong one misroutes paths.
- `addUat` — A plain-English acceptance criterion on an E; agent-written UATs are asserted + unverified (spec §8). **Not:** Never set verified (you have no evidence a human accepted); not a task row — rows are work, UATs are the contract.
- `updateUat` — Edits a UAT's text or its verification: verified {by} records who looked, null clears it. **Not:** Never verified by you — a test that passed goes in the row's note, and the human verifies; an absent key leaves verification untouched.
- `removeUat` — Drops one acceptance criterion from an E; the last one leaves the list absent. **Not:** Not for a criterion that failed (it stays, unverified, and the E is not done); not a way to make an E look accepted.

## Judgment
- `setConclusion` — Stamps the verdict on a question (D) or an investigation (F): supported | rejected | inconclusive | abandoned; null reopens. **Not:** Not before it was investigated (unless abandoned); a resolved D with no answer and no affects is linted.
- `addAffects` — Records that this question’s answer bears on the target (a B, C or E) — settable while the question is open, not only at closure (spec §7). **Not:** Not a parent edge (visibility is not containment); not "related"; self-links refused.
- `removeAffects` — Undoes an affects link; a missing link is a no-op. **Not:** Not for retiring the target (it stays); the link records that the question led there — keep it when the E was merely cut.
- `setNodeState` — Park mark — active | maybe, orthogonal to eLifecycle; maybe hides the node from canvas and lint. **Not:** Not done-ness (eLifecycle, rows), not deletion; a parked node's work still rolls up.
- `setNodeAssignee` — The node's default owner — a human or an agent — inherited by its rows unless a row sets its own. **Not:** Not a status (doing is a row status); not the beneficiary (a B slot); null clears.
- `setDue` — The node’s due date — ONE date per node, on the node (R7): when this proposition, approach, question, investigation or slice is meant to land. **Not:** Not a schedule for rows; not a calendar — flatten/board/alignment are project views.
- `addDependency` — nodeId depends on targetId — one dependency edge (stored as dependsOn); the app derives blocked and workable from it. **Not:** Not an ordering preference, not "related"; never A, B or G on either end; never an ancestor; cycles refused.
- `removeDependency` — Drops one dependency edge; refused when it is not there. **Not:** Not a way to make a node workable by fiat — if the dependency is real, finish what it depends on.
- `addBuiltOn` — Records that this approach or slice STANDS on an approach — structural and permanent; never satisfied, never cleared (spec §7). **Not:** Not a wait (addDependency); not from a B, D, F or G; not to anything but a C; never to an ancestor.
- `removeBuiltOn` — Drops one builtOn edge; refused when it is not there. **Not:** Not for a shipped foundation: builtOn is permanent, and it is what keeps an architecture approach visible after its slices land.
- `setVerdict` — The HUMAN’s judgment on a core value proposition against its signal: validated | invalidated | retired. **Not:** Never for something the human did not say — the record shows it on the node; refused without inChat and a name.

## Tags
- `addTag` — Puts one free-text tag on a node — data for Filter by Tags, never structure. **Not:** Not status or type. Unasked, tag only slices whose repo paths say their app, and propositions whose segment the human named as a product's own users.
- `removeTag` — Removes one tag from a node; a missing tag is a silent no-op. **Not:** Not for retiring the node (setNodeState); not a rename — rename = removeTag + addTag on every node carrying the tag.

## Attachments
- `addAttachment` — Mints a file attachment (an id’d record, not a node — no letter) with its first link (node + role); always shown with its path or URL beside its title. **Not:** Not a brief; not one attachment per node for the same document (link it).
- `linkAttachment` — Adds another link from an existing attachment to a node, with its role — one record, many places. **Not:** Not a second addAttachment for the same document (duplicates the record).
- `retireAttachmentLink` — Retires ONE link of an attachment in place (stamped, immutable) — the record and its other links stay. **Not:** Not deletion (there is none); not the record's lifecycle (setAttachmentLifecycle); re-retiring a link is refused.
- `setAttachmentLifecycle` — Stamps the record: live (default, spelled by absence) | superseded | retired | unavailable. **Not:** Not per-link (retireAttachmentLink); never delete; not for a doc that merely changed content in place.
