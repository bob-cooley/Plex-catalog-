# CLAUDE.md — Plex Catalog

This file provides context and conventions for AI assistants (e.g., Claude Code) working in this repository.

---

## Project Overview

**Plex Catalog** is a tool for cataloging, browsing, and managing media libraries hosted on a [Plex Media Server](https://www.plex.tv/). The goal is to provide a structured, queryable catalog of Plex content — movies, TV shows, music, photos — beyond what the native Plex UI exposes.

Typical use cases include:
- Exporting a Plex library to a portable format (CSV, JSON, SQLite)
- Searching/filtering media by metadata (genre, year, rating, watched status)
- Comparing libraries across multiple Plex servers
- Generating reports or statistics about a media collection

---

## Repository Status

> **This repository is in early/initial setup.** No source code has been committed yet. This CLAUDE.md is the founding document and should be updated as the project evolves.

---

## Technology Stack (Intended)

Since no stack has been committed yet, the following is the expected/planned direction. Update this section once a language and framework are chosen.

| Layer | Technology |
|-------|-----------|
| Language | Python 3.11+ (preferred) or Node.js |
| Plex API | [python-plexapi](https://python-plexapi.readthedocs.io/) or Plex REST API directly |
| Storage | SQLite (local), optionally PostgreSQL |
| CLI | `click` or `argparse` |
| Config | `.env` / `config.yaml` |
| Tests | `pytest` (Python) or `jest` (Node) |
| Packaging | `pyproject.toml` / `setup.cfg` (Python) or `package.json` (Node) |

---

## Directory Structure (Planned)

```
Plex-catalog-/
├── CLAUDE.md               # This file
├── README.md               # User-facing documentation
├── .env.example            # Example environment variables (never commit .env)
├── pyproject.toml          # Project metadata and dependencies
├── src/
│   └── plex_catalog/
│       ├── __init__.py
│       ├── cli.py          # Entry point / CLI commands
│       ├── client.py       # Plex API client/connection logic
│       ├── catalog.py      # Core cataloging logic
│       ├── models.py       # Data models (Movie, Show, Episode, etc.)
│       ├── export.py       # Export to CSV/JSON/SQLite
│       └── config.py       # Configuration loading
├── tests/
│   ├── conftest.py
│   ├── test_client.py
│   ├── test_catalog.py
│   └── test_export.py
└── docs/
    └── usage.md
```

---

## Development Workflow

### Setting Up

```bash
# Clone and enter the repo
git clone <repo-url>
cd Plex-catalog-

# Create a virtual environment (Python)
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Plex server URL and token
```

### Running the App

```bash
# Once CLI is implemented:
plex-catalog --help
plex-catalog export --format json --output catalog.json
```

### Running Tests

```bash
pytest
pytest --cov=src/plex_catalog
```

### Linting / Formatting

```bash
ruff check .
ruff format .
mypy src/
```

---

## Key Conventions

### Code Style
- Follow [PEP 8](https://peps.python.org/pep-0008/) for Python.
- Use `ruff` for linting and formatting (replaces `flake8`, `black`, `isort`).
- Type annotations are required for all public functions and methods.
- Docstrings on public APIs only; inline comments for non-obvious logic only.

### Configuration & Secrets
- **Never commit `.env` files or Plex tokens.** Use `.env.example` with placeholder values.
- Plex token (`PLEX_TOKEN`) and server URL (`PLEX_BASE_URL`) must come from environment variables or a config file outside the repo.
- All config should be loadable via `src/plex_catalog/config.py`.

### Git Conventions
- Branch naming: `feature/<short-description>`, `fix/<issue-or-description>`, `chore/<task>`
- Commit messages: imperative mood, present tense (e.g., `Add export to CSV`, `Fix auth token refresh`)
- Do not commit generated files (exports, logs, `.pyc`, `__pycache__`, `.venv`)

### Error Handling
- Raise specific exceptions rather than bare `Exception`.
- All Plex API calls should handle connection errors and auth failures gracefully.
- CLI commands should print user-friendly messages on failure and exit with non-zero codes.

### Testing
- Unit tests mock all Plex API calls (no real server required for tests).
- Integration tests (if any) go in `tests/integration/` and require a real Plex server; skip by default.
- Aim for >80% coverage on core logic (`catalog.py`, `models.py`, `export.py`).

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLEX_BASE_URL` | Base URL of your Plex server (e.g., `http://localhost:32400`) | Yes |
| `PLEX_TOKEN` | Plex authentication token | Yes |
| `CATALOG_DB_PATH` | Path to SQLite database (default: `./catalog.db`) | No |
| `LOG_LEVEL` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`) | No |

---

## Plex API Notes

- The Plex REST API is documented at `{PLEX_BASE_URL}` — append `/library/sections` to list libraries.
- Authentication uses an `X-Plex-Token` header on every request.
- `python-plexapi` is the recommended client library; it handles auth, pagination, and object mapping.
- Media types in Plex: `movie` (1), `show` (2), `season` (3), `episode` (4), `artist` (8), `album` (9), `track` (10), `photo` (13).

---

## What AI Assistants Should Know

- This repo is currently **empty** — no assumptions about existing code patterns.
- When adding the first code, establish the structure described above.
- Always check if `.env` or sensitive config is being accidentally included in diffs/commits.
- Do not invent Plex API endpoints — verify against `python-plexapi` docs or the official Plex API reference.
- Keep the CLI simple and composable; avoid monolithic commands.
- Update this CLAUDE.md whenever the stack, structure, or conventions change significantly.
