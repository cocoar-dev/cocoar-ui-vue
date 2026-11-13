---
name: cocoar-pr
description: Bring a change of cocoar-ui-vue into develop the way the repository wants it - a branch named for its type, a Conventional Commit title checked before pushing, local checks, a pull request with the template filled in, CI watched to the end. Also merges a pull request, its own or one from a fork, when the maintainer asks - title corrected first, then a squash with that title.
---

# A pull request for cocoar-ui-vue

`develop` takes changes through pull requests, squash-merged, and the release notes are generated from their
**titles** (see `AGENTS.md`). This skill is the way for an agent to get a change in, and to merge one.

## Steps

1. **Branch.** On `develop`, create `<type>/<short-name>` from an up-to-date `origin/develop`
   (`feat/`, `fix/`, `docs/`, `refactor/`, `perf/`, `test/`, `ci/`, `build/`, `chore/`). On another branch,
   stay on it.
2. **Title.** Write the Conventional Commit title for the user of the packages (AGENTS.md: the type is chosen for
   the user, not for the diff; tooling is `ci`, never `feat`), then check it:
   `node scripts/check-conventional.mjs --title "<title>"`. Write the commit subjects of the branch in the same
   form; only the title reaches `develop`.
3. **Local checks.** `pnpm lint && pnpm typecheck && pnpm build`, then `pnpm test` as a background job
   (`alta job start`). Docs changed: `pnpm skill:sync` and commit `skills/cocoar-vue-ui`. A change that can alter
   how a component looks: `node apps/playground/scripts/visual.mjs` (Docker, about a minute). A red `--default-`
   image is a regression: fix the code, do not `--update` it unless the maintainer said the new look is intended
   (AGENTS.md, "Visual baselines"). New stories and changed `--mobile-` images: `--update` and commit them.
4. **Commit** only as the user's commit preference allows (review before commit when asked).
5. **Push** the branch: `git push -u origin <branch>`.
6. **Pull request.** `gh pr create --base develop --title "<title>" --body-file <file>` with the template of
   `.github/PULL_REQUEST_TEMPLATE.md` filled in (summary, changes, the checklist ticked honestly). End the body
   with `_This pull request was opened by [CodeAlta](https://codealta.io)._`
7. **CI.** `gh pr checks <number> --watch --fail-fast` as a background job. Red: read the failing job
   (`gh run view <id> --log-failed`), fix, push again.
8. **Merge** only when the maintainer asks, as described below.
9. **Report** the pull request, its checks and, once merged, the commit on `develop`. A beta of it exists only
   when the maintainer asks for one (`cocoar-release` skill, `release.mjs beta`).

## Merge a pull request (also from a fork)

When the maintainer asks to merge pull request `N`:

1. **Read it:** `gh pr view N --json title,author,isCrossRepository,headRefName,body,files` and its checks
   (`gh pr checks N`). A red check: report it and stop.
2. **Judge the title** against `AGENTS.md`: the type is chosen for the users of the packages, the scope is the
   package, a breaking change has `!`. Look at the diff when the title does not say enough.
3. **Merge with the script**, which does the rest and refuses what AGENTS.md forbids:
   `node .alta/skills/cocoar-pr/scripts/pr.mjs merge N --title "<type>(<scope>): <subject>"`
   (leave out `--title` when the title fits). CI does not check titles, as in CodeAlta: you do it here. A title
   that does not fit, merged as it is, lands under "Misc" in the release notes; so propose a fitting title, and
   keep the old one only when the maintainer says so (`--keep-title`). It corrects the **pull request title** first and says the old and
   the new one — the release notes read the pull request title (dotnet-releaser `pr.title`), so correcting only the
   squash commit would keep the wrong line in the notes. Run it from an up-to-date `develop`: the gate is
   that copy of the script, not the pull request's. It refuses, and lists the files:
   - a pull request that modifies, removes or renames an existing default-presentation baseline
     (`apps/playground/visual/__screenshots__/*--default-*.png`): web apps would look different. Ask the maintainer;
     only when they say yes for this pull request, run again with `--accept-default-visual-change`. New baselines
     and changed `--mobile-` baselines pass;
   - a pull request that modifies, removes or renames a file the visual comparison depends on (`VISUAL_HARNESS` in
     the script: the visual Playwright config, spec and warm-up, `visual.mjs`, the visual page (`visual.html`, its
     `main.ts`) and its server configuration `vite.visual.config.ts`, the story view, `manifest.ts`, `story.css`,
     `ci.yml`, `pr.mjs`), or an existing story or another existing file under `apps/playground/src/visual/stories/`
     (files the stories share, such as `calendar-events.ts`, count too): a weakened comparison would pass changed
     components unseen;
   - a pull request that changes or removes an existing entry of `apps/playground/src/visual/stories.json` (read at
     the base and at the head commit and compared entry by entry; the message names the stories): a changed
     viewport, action or capture can stop an image from proving what it proves. New entries pass.
     For both: ask the maintainer to review those files or entries; only on their yes,
     `--accept-visual-harness-change`;
   - a file list the API cut short (more than 3000 files).
   It then waits for the checks and decides for the head commit they belong to: the jobs "Build, test & pack" and
   "Visual" of the `ci.yml` run of that commit must have succeeded (a check of the same name in another workflow
   does not count), and nothing else may be red. It squash-merges exactly that commit
   (`--match-head-commit`) with `<title> (#N)` as the commit subject (the branch of a fork is left alone); when a
   push moved the head meanwhile, it waits and decides again. Run it as a background job when checks are still
   running.
4. Never merge by hand with `gh pr merge` while a check is pending: without branch protection GitHub allows it.
5. **Report** the commit on `develop`, and the contributor to thank in the next release when it is not the
   maintainer.
