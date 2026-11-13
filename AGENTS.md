# Working on cocoar-ui-vue

How changes get into this repository and out to npm — for people and coding agents alike. Every agent session
of this project reads this file; follow it without being asked, and warn the user when a request would break it
(see [Warn the user](#warn-the-user)). The conventions of the code are in [NAMING.md](NAMING.md) and
[CONTRIBUTING.md](CONTRIBUTING.md); how a release works underneath is in [RELEASING.md](RELEASING.md).

## How work flows here

```
branch feat/… ──PR (Conventional Commit title, CI green)──> develop ──beta on request──> tag vX.Y.Z ──> npm, docs, GitHub release
```

- `develop` is the main branch. Changes come as pull requests, from branches of this repository or from forks.
- A change is one branch and one pull request with one purpose. Pull requests are **squash-merged**: the pull
  request title becomes the one commit on `develop`, and the release notes are generated from the pull request
  titles. **The title is what counts** — the commits inside the branch disappear with the squash.
- A **beta** (`X.Y.Z-beta.N` on npm) is started only on request, for the internal applications to test.
- A **release** is a tag `vX.Y.Z`, set by the release skill on a commit whose beta was tested.

| Task | How |
| --- | --- |
| Change code or docs, merge a pull request (also from a fork) | skill `cocoar-pr` (`.alta/skills/cocoar-pr`) |
| Start a beta, release a version | skill `cocoar-release` (`.alta/skills/cocoar-release`), maintainer only |
| Check a title | `node scripts/check-conventional.mjs --title "…"` |
| Compare or update the visual baselines | `node apps/playground/scripts/visual.mjs [--update] [story…]` (Docker) |

## Conventional Commits

```
<type>(<scope>): <subject>        feat(calendar): selected day in the month grid
<type>(<scope>)!: <subject>       feat(ui)!: CoarSelect emits `changed` instead of `change`
```

- **Types** ([`scripts/commit-types.mjs`](scripts/commit-types.mjs)): `feat` a feature users of the packages see ·
  `fix` a bug they notice · `perf` · `refactor` · `docs` (docs, demos, the Agent Skill) · `test` · `ci` (workflows,
  release scripts, skills of this repository) · `build` · `chore` (`chore(deps)` for dependencies) · `revert` · `style`.
- **Pick the type for the user of the packages, not for the diff.** A change of the release tooling is `ci`, never
  `feat`; a fix in a demo is `docs`; a test-only change is `test`. `feat` and `fix` make the headlines of the notes
  and decide whether a release is a minor or a patch.
- **Scope**: the package folder (`ui`, `calendar`, `data-grid`, `markdown-editor`, `page-builder`, …) or `docs`,
  `skill`, `playground`, `release`, `deps`. Optional; several as `ui,calendar`.
- **Subject**: imperative or a short statement of what users get, lower case after the colon, no period, under 120
  characters. Issue at the end: `(#123)`.
- **Breaking change**: `!` after the type, a `BREAKING CHANGE:` paragraph in the body saying what to do instead,
  and a migration note in the docs (`apps/docs/guide/migration*.md`).
- Commits inside a branch should follow the same form (it keeps the history readable while the pull request is
  open), but only the pull request title reaches `develop` and the notes.

## What an agent does by itself

- **Before the first commit** on `develop`: create a branch `<type>/<short-name>` from an up-to-date
  `origin/develop` (`feat/`, `fix/`, `docs/`, `refactor/`, `perf/`, `test/`, `ci/`, `build/`, `chore/`).
- **Writes commit subjects and the pull request title as Conventional Commits itself**, choosing type and scope from
  what the change does for users, and checks the title. When the user dictates a message, it keeps the user's words
  and puts them into this form (`"fixed the picker"` → `fix(ui): the date picker keeps typed edits on blur`), and
  says so.
- **One logical change per commit**, and one purpose per pull request: a refactor and a feature are two.
- **Docs changed** (`apps/docs`): runs `pnpm skill:sync` and commits `skills/cocoar-vue-ui` in the same pull request.
- **A user-visible change**: updates its docs page and demo; a new API that may still change gets the Preview badge.
- **A component page** (`apps/docs/components/**`): states in its frontmatter what it supports on which device,
  `devices: { desktop: ready, tablet: ready, phone: partial }` (`ready | partial | planned | no`, with a `devicesNote`
  for `partial` and `no`); `pnpm skill:check` fails without it. A change that alters what a device can do updates it.
- **Before a pull request**: `pnpm lint && pnpm typecheck && pnpm build`, and `pnpm test` as a background job (it
  runs the Playwright tests of the playground and takes minutes). A change that can alter how a component looks:
  `node apps/playground/scripts/visual.mjs` too (see [Visual baselines](#visual-baselines)).
- **Respects the user's commit preference**: with review before commit, it asks for the review and does not commit.
- **Merges a pull request only when the user asks**, only with green checks, and always as a squash: it first
  corrects the **pull request title** when it is not a fitting Conventional Commit (the notes read the pull request
  title, not the commit), then squash-merges with the same title and `(#N)` as the commit subject. Pull requests
  from forks the same way (skill `cocoar-pr`, "Merge a pull request").

## Warn the user

Say it plainly and propose the right way before acting, when a request would:

- commit or push to `develop`, `release/*` or `support/*` directly instead of through a pull request;
- merge a pull request without a squash, with red or pending checks, or with a title that is not a fitting
  Conventional Commit;
- create a `v*` tag, a GitHub release or an npm publish by hand, outside the release skill;
- release a version whose commit no beta carried (the release skill shows the commits; only the maintainer decides);
- use a type that does not match the change (`feat` for tooling, `fix` for a new behaviour), or hide a breaking
  change without `!`;
- mix unrelated changes in one pull request;
- change docs without the regenerated Agent Skill, or edit `skills/` by hand;
- put a skill of this repository's own work into `skills/` — that folder ships inside `@cocoar/vue-ui`; internal
  skills live in `.alta/skills/`;
- change a version in a `package.json` (versions come from the git tags; the files keep `0.0.1`);
- change an existing default-presentation baseline (`apps/playground/visual/__screenshots__/*--default-*.png`), or
  merge a pull request that does, without the maintainer's explicit OK: web apps without `.coar-mobile` would look
  different;
- change the visual comparison itself (the files in `VISUAL_HARNESS` of `.alta/skills/cocoar-pr/scripts/pr.mjs`:
  the visual Playwright config, spec and warm-up, `visual.mjs`, the visual page (`visual.html`, `src/visual/main.ts`)
  and its server configuration `vite.visual.config.ts`, the story view, `manifest.ts` and `story.css`, `ci.yml`,
  `pr.mjs`), an existing story or another existing file under `src/visual/stories/` (shared data such as
  `calendar-events.ts` counts too), or an existing entry of `src/visual/stories.json` (its viewport, actions, capture …),
  or merge a pull request that does, without the maintainer's explicit OK: a weakened comparison, a story that undoes
  a component change, or a recipe that no longer exercises the regression, passes changed components unseen.

## Checks

CI (`.github/workflows/ci.yml`) builds and tests every pull request ("Build, test & pack") and compares the visual
baselines ("Visual"); `pr.mjs merge` requires both to have passed. Titles are not checked
by CI, as in CodeAlta: the agent that merges judges the title and corrects it (skill `cocoar-pr`, `pr.mjs merge`).
A title that does not fit, merged as it is — or a commit that reaches `develop` without a pull request — lands
under "Misc" in the release notes: nothing breaks, it is only filed in the wrong place. The repository
squash-merges with the pull request title as the commit subject.

## Visual baselines

The playground has screenshots of components, default and `.coar-mobile`, light and dark
(`apps/playground/visual/__screenshots__/<story>--<mode>-<scheme>.png`), compared pixel for pixel by the CI job
"Visual" on every pull request. They prove the promise of the library: **what runs without `.coar-mobile` looks
exactly as before.** How to add a story, run and read a failure: [apps/playground/visual/README.md](apps/playground/visual/README.md).

- **The command:** `node apps/playground/scripts/visual.mjs [--update] [story…]`. It needs Docker: the images are
  made only in the Playwright image of the lockfile's version, as `linux/amd64` like CI, never on the host.
- **A `--default-` baseline changes only with the maintainer's explicit OK.** An agent never updates one to make
  the check green: a red default image is a regression until the maintainer says the new look is intended.
  `pr.mjs merge` refuses a pull request that modifies, removes or renames one unless it is given
  `--accept-default-visual-change`, which an agent passes only when the maintainer said so for this pull request.
- New baselines and changed `--mobile-` baselines need no such OK; say in the pull request which images changed
  and why.
- **The comparison itself changes only with the maintainer's explicit OK.** `pr.mjs merge` refuses a pull request
  that modifies, removes or renames a file the comparison depends on (`VISUAL_HARNESS` in `pr.mjs`, including
  `vite.visual.config.ts`), an existing story or another existing file under `src/visual/stories/` (it could hide a
  component change; files the stories share count too), or that changes or removes an
  existing entry of `stories.json` (compared entry by entry between base and head; a new story with a new entry
  passes) unless it is
  given `--accept-visual-harness-change`, again only when the maintainer said so for this pull request after
  reviewing those files. Keep such changes in a pull request of their own, without component changes.
- The gate is the `pr.mjs` of the maintainer's up-to-date `develop`, not the pull request's copy.

## Release notes

There is no CHANGELOG to maintain, as in CodeAlta: the GitHub release of a version is its record — notes generated
from the pull request titles, and for a feature release a short tour above them written by the release skill.
`CHANGELOG.md` is frozen history; never add to it. The docs page "Changelog" links to the releases.
