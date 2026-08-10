# CI

GitHub Actions workflow file lives at `.github/workflows/ci.yml` (may need to be committed with a token that has the `workflow` scope).

## What it runs

1. **web** — `npm ci` · `npm run lint` · `npm run build`
2. **api** — `pip install -r requirements.txt` · `pytest -q`

## Add the workflow manually

If push of `.github/workflows/ci.yml` is blocked by OAuth scope, create the file in GitHub:

**Repository → Add file → `.github/workflows/ci.yml`** with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  api:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: apps/api/requirements.txt
      - run: pip install -r requirements.txt
      - run: pytest -q
        env:
          ADMIN_PIN: test-admin-pin-strong1
```

Or from a machine with a PAT that includes `workflow`:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push
```
