# Changeset Agent Instructions

This folder uses [@changesets/cli](https://github.com/changesets/changesets) to
track version bumps and generate changelogs.

## What is a changeset?

A changeset is a markdown file describing **one logical change**. It captures
two things: which packages are affected (with their semver bump type) and a
human-readable summary that becomes a changelog entry.

## File format

Each changeset is a `.md` file with YAML frontmatter listing affected packages
and their bump type, followed by a markdown body:

```md
---
"@palot/desktop": minor
---

Short, user-facing description of the change. One paragraph is ideal. Use
markdown formatting sparingly (bold for emphasis, backticks for code).
```

### Frontmatter rules

- Keys are **quoted package names** exactly as they appear in `package.json`.
- Values are `patch`, `minor`, or `major` (standard semver).
- A single changeset can list multiple packages if they are part of the same
  logical change:
  ```yaml
  ---
  "@palot/desktop": minor
  "@palot/configconv": minor
  ---
  ```

### Body rules

- Write for end users, not developers. Focus on what changed, not how.
- One concise paragraph (1-3 sentences). No headings, no bullet lists.
- Avoid repeating the package name; the changelog groups entries by package.
- Use backticks for paths, flags, and code references.
- Do NOT use em dashes.

## One changeset per logical change

**Each distinct feature, fix, or improvement gets its own changeset file.** Do
NOT combine unrelated changes into a single changeset. This keeps changelog
entries scannable and makes it easy to see what shipped in a release.

Good (3 separate files):

```
.changeset/
  worktree-api-migration.md    -> "Migrate worktree management to OpenCode API"
  automation-execution.md      -> "Add automation execution engine with SDK"
  streaming-fix.md             -> "Fix non-streaming parts not triggering re-renders"
```

Bad (1 giant file):

```
.changeset/
  big-release.md               -> "### New Features\n- Worktrees\n- Automations\n### Fixes\n- ..."
```

## File naming

Use `kebab-case` names that describe the change. The name does not affect
behavior but helps humans identify what each changeset covers. Examples:

- `worktree-api-migration.md`
- `fix-streaming-rerenders.md`
- `add-context-usage-indicator.md`

## Bump type guidelines

| Type    | When to use                                                        |
|---------|--------------------------------------------------------------------|
| `patch` | Bug fixes, refactors with no user-visible behavior change          |
| `minor` | New features, new UI, new configuration options                    |
| `major` | Breaking changes (removed features, changed defaults, new requirements) |

When in doubt, prefer `minor` for anything user-visible and `patch` for
internal improvements.

## Linked packages

This project links all five workspace packages together (see `config.json`):

```
@palot/desktop, @palot/ui, @palot/server, @palot/configconv, configconv
```

"Linked" means: when multiple linked packages are bumped in the same release,
they all receive the **same final version** (the highest bump wins). Packages
not mentioned in any changeset are left at their current version.

## Workflow

### Adding changesets (during development)

1. After completing a logical change, create a new `.md` file in `.changeset/`.
2. List the affected packages and bump types in the frontmatter.
3. Write the changelog summary in the body.
4. Commit the changeset file alongside your code changes (or in a follow-up
   commit on the same branch).

### Automated release pipeline (GitHub Actions)

Version bumping, changelog generation, and releasing are **fully automated** by
two GitHub workflows. Agents and developers should never run `changeset version`
manually.

**On push to `main` with pending changesets** (`.github/workflows/release.yml`):

1. The `changesets/action` detects pending `.md` files in `.changeset/`.
2. It runs `bun changeset version` automatically, which consumes the changeset
   files, bumps `package.json` versions, and updates `CHANGELOG.md` files.
3. It opens (or updates) a **"chore: version packages"** PR with all the
   version bump changes.
4. A maintainer reviews and merges that PR.

**On merge of the version PR** (same workflow, second run):

1. The `changesets/action` detects no pending changesets and runs
   `bun changeset tag`, which creates git tags for the new versions.
2. The workflow reads the new version from `apps/desktop/package.json`.
3. It triggers cross-platform Electron builds (Linux, macOS, Windows).
4. It creates a GitHub Release with the changelog body and all build artifacts.

**On PRs targeting `main`** (`.github/workflows/changeset-check.yml`):

- A check warns if no changeset file is present, reminding contributors to add
  one for user-facing changes.

### Manual release (escape hatch)

Use `workflow_dispatch` on the Release workflow to force a build and release
from the current `package.json` version. This is for recovery or re-releases
only, not normal operation.

### What NOT to do

- Do NOT run `changeset version` or `changeset tag` locally. The GitHub Action
  handles this, and running it locally causes conflicts with the automated PR.
- Do NOT manually edit `CHANGELOG.md`; let the tool generate it.
- Do NOT use `changeset add` interactively in agent sessions (it requires
  `/dev/tty`). Create the `.md` files directly instead.
- Do NOT create empty changesets (no packages listed). Use `--empty` only for
  documentation-only changes that need no version bump.
- Do NOT push version bump commits manually. Let the "Version Packages" PR
  handle the version/changelog/tag lifecycle.

## Config reference

The `config.json` in this folder controls behavior:

| Key                          | Value               | Meaning                                      |
|------------------------------|---------------------|----------------------------------------------|
| `changelog`                  | `@changesets/changelog-github` | Generates GitHub-linked changelog entries |
| `commit`                     | `false`             | `changeset version` does not auto-commit      |
| `linked`                     | all 5 packages      | Bumped packages share the same version        |
| `baseBranch`                 | `main`              | Changesets are compared against `main`        |
| `updateInternalDependencies` | `patch`             | Internal dep ranges are bumped automatically  |
| `privatePackages`            | version + tag       | Private packages still get versions and tags  |
