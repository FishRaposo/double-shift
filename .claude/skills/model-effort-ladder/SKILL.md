---
name: "model-effort-ladder"
description: "Route work with Opus 5.5 as the planning orchestrator: delegate aggressively to Sonnet 5.5 and Haiku 5.5 sub-agents, consult Fable 5.2 on set triggers once available, pick effort, handle refusals, apply the verify-before-done rule. Includes drop-in CLAUDE.md block and scout, builder and consultant sub-agent files. Use when choosing a model or effort, setting up sub-agents, writing CLAUDE.md or AGENTS.md, or migrating a prompt."
---

# Model and effort ladder

Use this to decide which Claude model and effort level a task, step or sub-agent gets, and when writing system prompts, CLAUDE.md, AGENTS.md or sub-agent definitions. Drop-in files are under "Templates".

## The operating model

**Opus 5.5 orchestrates; sub-agents do the work.**

| Role | Model | Does |
|---|---|---|
| Orchestrator | Opus 5.5 (main session) | Plans, splits work, writes sub-agent briefs, integrates results, makes judgment calls, final review |
| Implementer (`builder`) | Sonnet 5.5 sub-agents | Executes plan steps with a clear spec: code changes, bug fixes, docs, analysis, drafting |
| Worker (`scout`) | Haiku 5.5 sub-agents | Bounded steps: search, triage, reading and summarising, extraction, classification, fan-out |
| Consultant (`consultant`) | Fable 5.2 (not active yet) | Second opinion on set triggers only (see "Consultant: Fable") |

This follows Anthropic's own ladder: start most workloads on Opus 5.5, and move to Fable 5.2 only for demanding reasoning or long-horizon work where Opus at `xhigh` still falls short. Fable is not the orchestrator: in Anthropic's defect-search test, Opus 5.5 with Sonnet 5.5 sub-agents matched Opus alone for about a third less, while swapping in Fable 5.2 as orchestrator cost 19% more for about the same score.

The orchestrator's job is to think, not to type. **Aggressive delegation is the default:** if a step has a clear spec and a checkable output, it goes to a sub-agent.

## Core policy

- **Opus plans, sub-agents execute.** Opus keeps only what needs the big picture: planning, integration, decisions, review.
- **Lowest capable worker.** Haiku for anything bounded; Sonnet when the step needs real reasoning or code judgment; Opus itself only when the step can't be specified well enough to hand off.
- **Effort before model.** When a sub-agent falls short, re-delegate at one effort step higher before moving it up a model.
- **Default to `high` effort or below.** `xhigh` and `max` only for wall-breaking cases with a measured gain. On large models, max reasoning is nearly always a waste.
- **Judge by cost per solved task, not price per token.** On a subscription, also by rate-limit burn: long Opus stretches of routine work are what hit the cap.
- **To get less thinking, lower effort.** Asking in the prompt to think less does not reliably work.
- **Benchmarks are hypotheses.** Validate first-hand. Re-run effort sweeps after any model change; settings do not carry over.

## The models

| Model | API ID / Claude Code alias | In / out per MTok | Default effort (API / Claude Code) | Latency |
|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` / `haiku` | $0.10 / $0.50 up to 100K-token prompts; $0.50 / $2.50 above | `medium` / `medium` | Fastest |
| Sonnet 5.5 | `claude-sonnet-5-5` / `sonnet` | $2 / $10 | `high` / `medium` | Fast |
| **Opus 5.5 (orchestrator)** | `claude-opus-5-5` / `opus` | $4 / $20 | `medium` / `medium` | Moderate |
| Fable 5.2 (not active) | `claude-fable-5-2` / `fable` | $8 / $40 | `high` / `medium` | Moderate |

All: 1M-token context, 128K max output, adaptive thinking, effort levels `low` to `max`. Batch API is 50% off. Cache reads cost 10% of input on Haiku 5.5, 5% on Opus 5.5 and Sonnet 5.5, 2.5% on Fable 5.2. Fable 5.1 (`claude-fable-5-1`, $10 / $50) is still served but superseded; the `fable` alias now resolves to 5.2.

## The orchestrator (Opus)

Opus keeps:
- **Planning:** understanding the task, breaking it into steps, choosing who does each one.
- **Briefs:** writing each sub-agent's prompt.
- **Integration:** combining results, resolving conflicts between them.
- **Judgment:** architecture, trade-offs, anything hard to reverse, anything ambiguous.
- **Review:** checking sub-agent output before it is used or reported.

Opus does a step itself only when writing the brief would take longer than doing it, or the step can't be specified without the whole picture.

Effort: `medium` (its default) for normal orchestration, `high` for large or long-horizon builds. `xhigh` only with a measured gain.

## Delegation rules

**To Haiku (`scout`, effort `medium`):**
- Search, file triage, reading and summarising many files or documents.
- Classification, extraction, tagging, routing, simple transforms, high-volume checkable work.
- Parallel fan-out across independent files, documents or cases.
- Mechanical plan steps with an exact spec.
- Not code changes. In Anthropic's test, Haiku sub-agents on coding tasks cut cost per attempt by 32% but dropped the pass rate about 4 points; code goes to `builder`.
- Use `low` only for trivial steps (at `low` it may skip searches, stop early or skip checks); `high` for strict instruction-following. Haiku holds big-picture context poorly, so give it bounded steps, never open-ended goals.

**To Sonnet (`builder`, effort `medium`, `high` for harder steps):**
- Code changes and bug fixes against a written spec.
- Docs, analysis, drafting, investigation, first-pass review.
- Any step that needs reasoning but not the whole plan.

**Writing a brief.** Sub-agents start cold. Every brief stands alone: the goal, the exact inputs (files, paths, data), constraints, the output format, how to verify, and when to stop.

**Parallelise** independent steps; run dependent steps in order. Don't fan out a single dependent chain: there, one sub-agent (or Opus) at lower effort wins. Anthropic found delegation paid off in two cases only: routine work with a long cost tail, and work larger than one context window.

**Checking results.** Opus reviews sub-agent output before using it. On failure:
1. Re-delegate once with a sharper brief.
2. Then re-delegate at one effort step higher.
3. Then move it up a model (Haiku → Sonnet → Opus does it itself).

Validate Haiku on a small sample before trusting it with anything user-facing.

## Setting it up in Claude Code

- Opus 5.5 is the default on every plan (Pro, Max, Ultra, Team, Enterprise, API); set `"model": "opus"` in settings to make it explicit. An admin-set organisation default overrides it.
- If the main session is on another model (e.g. started with `/model fable`), the roles don't change: that session orchestrates, and the pinned sub-agents still run on their own models.
- **Pin every sub-agent's model** in frontmatter. Unpinned sub-agents inherit the session's model, so with an Opus session every unpinned sub-agent runs on Opus and the delegation saves nothing.
- Sub-agent files go in `.claude/agents/` (one project) or `~/.claude/agents/` (every project). Paste the CLAUDE.md block into the project's `CLAUDE.md` (or `~/.claude/CLAUDE.md` for all projects).
- Set effort with `/effort <level>` or `--effort`; `effortLevel` in settings accepts up to `xhigh`, not `max`. Skills and sub-agents can pin `effort` in frontmatter.
- `fallbackModel` in settings (or `--fallback-model`) takes a chain of up to three models, tried for one turn when the primary is overloaded or unavailable.
- Thinking cannot be turned off on any 5.x model.

## Templates

When setting up a project, write these files as they are, adjusting only project-specific lines (test commands, paths). Check the frontmatter fields against current Claude Code docs if a file fails to load.

### CLAUDE.md block

````markdown
## Model routing and delegation

This session is the orchestrator (Opus by default). Plan, delegate, integrate and review.
Do a step yourself only when writing the brief would take longer than doing
it, or the step can't be specified without the whole picture.

Delegate by default:
- `scout` (Haiku): search, file triage, reading and summarising, extraction,
  classification, fan-out across independent files or cases, mechanical steps
  with an exact spec.
- `builder` (Sonnet): code changes and bug fixes against a written spec, docs,
  analysis, drafting, first-pass review.
- `consultant` (Fable): not active yet. Do not use until this line is removed.

Every brief stands alone: goal, exact inputs (files, paths, data), constraints,
output format, how to verify, when to stop. Run independent steps in parallel
and dependent steps in order.

Review every sub-agent result before using it. On failure: re-delegate with a
sharper brief, then at one effort level higher, then move it up a model
(scout -> builder -> do it yourself).

Never spawn an agent without a pinned model; an unpinned agent inherits the
session's model.
Stay at `high` effort or below unless a measured test shows a gain.

When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip
install -r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.
````

### `.claude/agents/scout.md`

````markdown
---
name: scout
description: Read-only worker for bounded steps. Use for search, file triage, reading and summarising files or documents, extraction, classification, and parallel fan-out across independent items. Give it an exact brief, not an open-ended goal.
model: haiku
effort: medium
tools: Read, Grep, Glob, WebSearch, WebFetch
---

You are a scout working for an orchestrator. You do one bounded step and
report back. You never edit files.

1. Do exactly what the brief asks, on exactly the inputs it names. If the brief
   is ambiguous or an input is missing, stop and say what is missing instead
   of guessing.
2. Search before concluding something doesn't exist. Read the actual files;
   don't infer contents from names.
3. Report in the format the brief asks for. If none is given:
   - Findings: short bullets, each with a file path and line or a URL.
   - Not found: what you looked for and where.
   - Unsure: anything you could not confirm.
4. Keep it compact. Quote only the lines that matter, never whole files.
5. Stop when the brief's question is answered. Don't widen the scope.
````

### `.claude/agents/builder.md`

````markdown
---
name: builder
description: Implementer for one plan step with a written spec. Use for code changes, bug fixes, docs, analysis and drafting where the plan already exists. Verifies its own changes before reporting.
model: sonnet
effort: medium
---

You are a builder working for an orchestrator. You implement one plan step
against the spec in your brief and report back.

1. Read the brief and the files it names before changing anything. If the spec
   is ambiguous, contradicts the code, or needs a decision outside its scope,
   stop and report the question instead of choosing for the orchestrator.
2. Change only what the step requires. No unrelated refactors, renames or
   formatting changes.
3. Follow the project's existing conventions and its CLAUDE.md.
4. When you change code that can be run, built, or type-checked, run a real
   check that exercises the change before reporting it done: the project's
   tests, type-checker, or build, or the changed command itself. A syntax-only
   check, or a check command that failed to start, does not count; if all
   that is missing is the project's declared dependencies, install them with
   its own package manager and lockfile (e.g. npm install, pip
   install -r requirements.txt), never via sudo or the system package manager,
   unless told not to. Only if no real check can run here, say which one you
   did not run and why instead of reporting the change as done.
5. Report compactly:
   - Done: what changed, with file paths.
   - Verified: the exact check you ran and its result.
   - Open: anything left, assumed or worth the orchestrator's attention.
````

### `.claude/agents/consultant.md` (inactive until Fable is available)

Don't install this until the user says Fable is available. Then add it and remove the "not active" line from the CLAUDE.md block.

````markdown
---
name: consultant
description: Senior second opinion. Use only when the orchestrator is stuck after two real attempts, before a hard-to-reverse decision (architecture, data migration, public commitment), or for final review of high-stakes work. Never for routine checks.
model: fable
effort: high
tools: Read, Grep, Glob
---

You are a consultant to an orchestrator. You advise; the orchestrator decides.
You never edit files.

The brief gives you the question, the relevant files, what was tried and why it
failed, and the decision needed. Read the files yourself before answering.

Answer with:
- Recommendation: one clear choice, in a sentence or two.
- Why: the reasoning that decides it, tied to specifics in the files.
- Risks: what could go wrong with your recommendation and how to check early.
- If the question itself is wrong, say so and state the better question.

Keep it short. Do not rewrite the work.
````

## Consultant: Fable 5.2 (not active)

Not switched on; planned for when the user moves to the Max plan. Until the user says Fable is available, Opus handles these cases alone. A session that happens to be running on Fable is not that go-ahead.

Once active, Opus consults Fable **only on these triggers**, never as a routine check:
- Opus is stuck after two real attempts at the same problem.
- A decision that is hard to reverse: architecture, data migrations, public commitments.
- Final review of high-stakes work.

Why the short leash, from Anthropic's measurements:
- On 463 SWE-bench Pro problems, Opus 5.5 at `xhigh` solved 96.5% for $0.75 per solved task; Fable 5.2 at `high` solved 96.3% for $1.39. Raising Opus's effort gets there for about half the cost.
- Opus 5.5 at `high` with a Fable 5.1 advisor scored 90.1% for $2.92 per attempt: 1.7 points over the executor alone, at the edge of run-to-run noise, for about 2.1 times the cost. (The published figure uses a 5.1 advisor.)
- On two other benchmarks the advisor gave no gain or a loss, and on one it was never consulted.

So the order is: raise Opus's effort first (`high`, then `xhigh`), and consult Fable only when that still falls short. Where Fable is used, `low` effort is worth testing first: Fable 5.2 at `low` solved 94.6% for $0.39.

How:
- Use the `consultant` template. It starts cold: brief it with the question, the relevant files, what was tried and why it failed, and the decision needed. Ask for a recommendation, not a rewrite.
- Opus keeps the decision; Fable advises.
- In Claude Code, Fable is never the default, needs v2.1.321 or later for 5.2, and depending on plan it may bill **usage credits** rather than plan limits. Interactive sessions ask before billing; `claude -p` bills without asking. Check the `/model` picker before scripting it.
- Claude Code falls back automatically when a classifier flags a request on Fable, Opus 5.5 or Sonnet 5.5: bio flags re-run on Opus 5, cyber flags on Opus 4.8.
- On the API, the advisor tool (beta) wires this in directly; measure the consult rate first, since lowering executor effort can stop consults entirely. A Fable 5.2 executor accepts only Fable 5.2 or Mythos 5.2 as its advisor.

## Refusals and fallback

All 5.x models run safety classifiers that can decline benign work. Categories: `cyber`, `bio`, `frontier_llm` (helping build competing AI models, which can catch LLM-building and training work), `reasoning_extraction`, `general_harms`.

- A refusal is HTTP 200 with `stop_reason: "refusal"`. Branch on that, discard partial output, and log refusals separately, since they don't count as errors.
- Never ask the model to write its reasoning into the response (`<thinking>` sections, reasoning fields in JSON). That triggers `reasoning_extraction`, which has no fallback. Use `thinking.display: "summarized"` instead.
- API: `fallbacks="default"` with beta `server-side-fallback-2026-07-01` retries on the recommended model. Haiku 5.5 has no server-side fallback (use SDK middleware or a manual retry), and batch requests don't support `fallbacks`.

## Which effort

- `low`: trivial sub-agent steps, simple high-volume tasks, quick exchanges.
- `medium`: orchestration, most scout and builder runs, well-specified agentic coding.
- `high`: verification-heavy work, bug fixing, large builds, retries after a failure.
- `xhigh`: agentic runs of 30+ minutes with large budgets, only with a measured gain.
- `max`: only where `xhigh` showed measurable headroom.

Defaults differ by model and surface, so set effort explicitly. Higher effort means more tool calls and more explanation; lower effort means fewer, combined calls and terser output.

What effort buys on Opus 5.5 (SWE-bench Pro subset, score and cost per task): `low` 87.4% / $0.11, `medium` 92.8% / $0.21, `high` 95.3% / $0.29, `xhigh` 96.7% / $0.74 (one run). Sonnet 5.5 at `high` scored 87.6%, level with Opus at `low` at about the same cost.

Cheap pattern for checkable batches: run everything at `low`, re-run only the failures at `high`. Anthropic measured about 97% solved at about $0.17 per task, against 95.3% at $0.29 for everything at `high`. It needs a real pass/fail signal (tests, validator, schema).

## Verify-before-done rule

At lower effort a model sometimes reports a change as done without running a real check. The CLAUDE.md block and the `builder` template already carry it. When writing any other agent instructions, system prompt, AGENTS.md, sub-agent definition or sub-agent brief for coding work, include this paragraph verbatim:

```
When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip
install -r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.
```

## Raw API code

Confirm against current docs before relying on these; quirks are model-specific.

- Set effort with `output_config.effort`. Read content blocks by type, never `content[0].text`; responses may start with a `thinking` block.
- Turning thinking off: Opus 5.5 returns 400 at every effort. Sonnet 5.5 uses `{"type": "between_tools"}` (low/medium/high only). Haiku 5.5 accepts `disabled` at `high` or below.
- Forced `tool_choice` (`any`/`tool`) breaks on Opus 5.5, Sonnet 5.5 and Fable 5.2. Use `auto` with `strict: true` tools and say in the prompt when to use them.
- Haiku 5.5: don't send `temperature`, `top_p` or `top_k`. Its tokenizer counts about 30% more tokens than Haiku 4.5, and prompts over 100K tokens jump to the higher price tier.
- `max_tokens` includes thinking. About 64K for agentic work; 128K and streaming for Sonnet 5.5 agentic coding.
- Changing top-level effort between requests invalidates the cache. Per-message effort (beta `mid-conversation-output-config-2026-07-01`) keeps it. Minimum cacheable prompt is 512 tokens.
- For a custom orchestrator, Claude Managed Agents supports an orchestrator agent with worker agents on their own models.
- Check the Models API `capabilities` object at runtime instead of hard-coding what a model supports.

## Cost levers, in order

Anthropic's order, free wins first:

1. Prompt caching and a stable prefix: put per-request text in the newest user turn, not the system prompt. Usually the largest lever.
2. Trim tokens: defer unused tool definitions, keep data files out of the prompt, remove instructions written for an older model. Ask for shorter outputs, from the orchestrator and from sub-agents: output costs 5x input.
3. Batch API for anything that can wait up to 24 hours.
4. Move to the current model if a generation behind: Opus 5 to 5.5 scored about the same for 78% less per solved task.
5. Effort sweep on each role, then re-run failures at a higher setting.
6. Budgets and output caps. Don't lowball `max_tokens`: a cut-off response is still billed and rarely recovers on retry.
7. A second model (sub-agents, advisor) last, and only where it beats the single model's own score-for-spend curve. Push more steps down a rung once a role passes comfortably.

## Migrating a prompt to a newer model

Remove workarounds written for the older model (refusal steering, tool-call retry shims, "do not be lazy", "verify twice", retired thinking settings), then re-run evals before tuning anything else.

## Refresh

Checked 2026-11-14 against Anthropic docs: platform.claude.com/docs/en/models/overview, /about-claude/models/choosing-a-model, /about-claude/models/optimizing-for-cost-and-intelligence, /build-with-claude/effort, /build-with-claude/refusals-and-fallback, and code.claude.com/docs/en/model-config. When a model ships, a price changes, or the plan changes (e.g. Fable becomes available), update the tables, the templates and this date. Anthropic's docs or the product-self-knowledge skill win over this file when they disagree.