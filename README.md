# Tillage

Tillage is an agent-native project map for [Claude Code](https://claude.com/claude-code):
a visual planner where **the map is your agent's context database**. Plan a
project as a multi-level map, break execution into per-node task tables,
and let your agent orient itself from the map — rules, decisions, briefs, and
memory live on the nodes that own them, scoped by their place in the tree.

Local-only: everything lives on your machine in `~/.tillage`, and this release
makes no network calls — cloud sync returns in a later release. Website:
[tillagemap.com](https://tillagemap.com). More information on
<https://tillagemap.com/guide>.

Readable code: the plugin ships its built files unminified, so you can read
what runs on your machine, under the Functional Source License
([LICENSE](LICENSE)) — free to use, except to build a competing product.

## Install

Requires **Node.js 22.12 or newer** on your `PATH`. In the Claude Code
terminal:

```
/plugin marketplace add Reine0017/tillage
/plugin install tillage@tillage
```

The **desktop app** picks up an install made in the terminal, since plugin
state is user-level. Its plugin browser (the **+** button next to the prompt
box → **Plugins** → **Add plugin**) lists the plugins of marketplaces you have
already added, so add the marketplace from a terminal first, then choose your
user account as the scope when you install from it.

Requirements, what gets installed, and the privacy story:
[tillage/README.md](tillage/README.md).
