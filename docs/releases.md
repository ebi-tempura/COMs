# Versions and releases

## Source of truth

GitHub stores the source history. Development and testing happen on the newer Mac.
The older Ubuntu Mac runs a selected deployed revision.

The root VERSION file holds the proposed application version. The frontend package version is currently a separate package value; this first documentation change does not synchronize it or add a version label to the UI.

A version change alone does not deploy anything. A Git tag identifies the exact source commit.
A GitHub Release publishes the notes. A deployment makes that revision live.

The proposed starting version is 0.1.0-beta.1. It is a prerelease candidate until the release checks pass.
Do not describe the current server as running that tag until it has actually been tagged and deployed.

## Version numbers

Use MAJOR.MINOR.PATCH for stable releases:

| Change | Example |
| --- | --- |
| Compatible bug or UI fix | 1.0.0 to 1.0.1 |
| Compatible new feature | 1.0.1 to 1.1.0 |
| Incompatible change requiring customer migration | 1.1.0 to 2.0.0 |

During the initial beta, use 0.1.0-beta.1, 0.1.0-beta.2, and so on for successive candidates.
Use 0.2.0-beta.1 for the next planned feature milestone.
Major version zero communicates that the product is still evolving; notes must still explicitly identify breaking changes.

Git tags use a v prefix, for example v0.1.0-beta.1. Never move an existing release tag to a different commit.
Do not label a release stable merely because login works; validate the workflows in its intended scope.

## Everyday work on the development Mac

1. Start a branch from current main, such as fix/login-loading or feat/work-order-filter.
2. Edit and test the code locally. Use a separate development account/database for tests that change data.
3. Commit explicit paths with a clear message, such as "fix(auth): handle the initial signed-out session".
4. Push the branch and open a pull request. Describe the problem, resulting behavior, and validation.
5. Add user-visible changes to CHANGELOG.md under Unreleased.
6. Merge the reviewed changes when ready.

Do not make routine product edits only on the hosting computer.
For an emergency server fix, bring the exact fix back into Git and the development checkout before the next deployment.

## Prepare a release

1. Reconcile existing host-only changes, especially the AuthContext.jsx session-loading fix from the first deployment. Review git diff; do not discard it to make a pull succeed.
2. Select and test the intended main commit.
3. Update VERSION and finalize the corresponding CHANGELOG.md section with its actual release date.
4. Record required environment changes, dependency updates, and database migrations.
5. Confirm the frontend build, relevant backend checks, roles, and tenant isolation. Review outstanding security findings.
6. For schema changes, take and verify a database backup, review the migration and rollback plan, and apply it in the correct order.
7. Commit the release metadata and merge it into main.
8. Create an annotated tag at that exact commit and push it. Publish matching GitHub Release notes; mark beta versions as prereleases.

Example tag commands, only after those checks pass:

```sh
git tag -a v0.1.0-beta.1 -m "COMs 0.1.0-beta.1"
git push origin v0.1.0-beta.1
```

Publishing a GitHub Release does not automatically update this server. No deployment automation is configured by this process.

## Deploy a tagged version on Ubuntu

First record the currently deployed commit so there is a known source revision to return to:

```sh
cd ~/apps/COMs
git rev-parse HEAD
git status --short
```

If there are changes, review and reconcile them before continuing. Never use a hard reset or force a checkout to discard an unexplained server fix.

Fetch tags and select the approved tag (the example tag must exist first):

```sh
git fetch origin --tags
git switch --detach v0.1.0-beta.1
```

For frontend changes, run each command separately and stop on any error:

```sh
cd ~/apps/COMs/frontend
nvm use 22
npm ci
VITE_API_URL=https://paxaurora.com.mx npm run build
sudo cp -a dist/. /var/www/coms/
```

Only copy after the build succeeds. This publishes frontend/dist; the repository-root dist folder is not the deployed frontend source.
Preserve older hashed assets during this simple copy deployment so already-open browsers can still request them.
For future deployments requiring an all-at-once switch, use versioned build directories and switch a serving symlink.

For backend changes, install updated dependencies into the existing virtual environment when needed.
Apply reviewed migrations before restarting services according to that release's migration plan:

```sh
cd ~/apps/COMs/backend
.venv/bin/python -m pip install -r requirements.txt
sudo systemctl restart coms-api coms-email
```

A frontend-only change does not require restarting the API, worker, Nginx, or tunnel.

## Verify and record the deployment

- Check all services:
  `systemctl is-active coms-api coms-email nginx cloudflared`
- Open the public domain from another device; sign in and load a database-backed page.
- Test the behavior changed by the release. Test email delivery when notification code changed.
- Inspect service errors; active processes alone do not prove the application is healthy.
- Record the deployed version, commit SHA, date/time, and smoke-test result in the GitHub Release deployment notes.
- Refresh the browser when checking a changed UI.

If a release fails, stop the rollout and restore the previously recorded source revision, rebuild the frontend if needed, and restart affected services.
Changing source revisions does not reverse database migrations. Use the reviewed database recovery plan when the schema changed.

## Release notes template

```markdown
## COMs <version> — <actual release date>

### Added
- User-visible new capabilities.

### Changed
- User-visible behavior changes.

### Fixed
- Concrete problems corrected.

### Deployment notes
- Required environment, dependency, or schema changes.
- Rollback considerations.

### Validation
- Checks performed and their results.

### Known issues
- Remaining limitations relevant to this release.
```

Exclude passwords, tokens, private environment values, and customer data from commits and release notes.
