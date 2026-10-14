# Map skill — debugging walk

Read when tracing a bug in agent-written code back to the guidance that
produced it (SKILL.md: Modes).

## Debugging — trace a bug to the guidance that caused it

When a bug surfaces in code an agent wrote, the map is the reverse index from the
broken line back to the context that produced it. The loop:

1. `git blame` the broken line → commit → `find_rows {commit}` to find the row (and
   node) that shipped it. No row names the commit? The answer says so: call
   `start_work {path: <the file>}` — it resolves the slice that governs the path,
   or answers `planned` or `root` with a note saying what that means.
2. Read the row's `receipt` (`get_table {nodeId, rowId}` — the one read that
   carries it) + `get_context` for its node; compare what the implementer was told
   against what the code actually does.
3. Classify the failure:
   - **guidance-wrong** — pollution: the instruction/decision itself misleads.
   - **guidance-violated** — agent error: the context was fine, the agent didn't follow it.
   - **guidance-silent** — decomposition gap: nothing covered this case.
4. Record the classification as a row note (`add_task_note`), and propose the guidance
   fix as a `proposeInstruction` (or a `proposeDecision` whose text names the decision
   it replaces) at the right scope, origin `observation` with the row. On the human's
   word, supersede with `inChat: true` (`supersedeDecision`).
5. Co-infected COMPLETED work is the app's job: when the poisoned guidance is then
   dropped or changed (by the human, or by you on their word), the app's alert offers
   one action, *Flag them for a look*, which puts the human's open note on each
   `done`/`verified` row whose receipt pinned the old version — the note names the rule
   or decision and its text before and after — and clears the alert; the card holding
   those rows reads "N flagged for a look" until the notes are closed, and your next
   work there reads them. (*Show them*, which marks such rows on the map before any
   flag, is in a parked card's panel only.) Rows still in flight (`todo`/`doing`) are not in that
   radius, and if only those are affected no alert appears at all — chase them yourself
   (`get_table` on the affected nodes) and name them in the row note.
