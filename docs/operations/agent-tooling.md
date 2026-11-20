# Agent tooling

The project MCP configuration connects a coding agent to the disposable local HAPI fixture store. It runs WSO2 FHIR MCP Server 0.11.0 over stdio and uses an isolated Python 3.12 environment through [uv](https://docs.astral.sh/uv/getting-started/installation/). Start and seed HAPI before approving the project server in your agent. [WSO2 package and configuration](https://pypi.org/project/fhir-mcp-server/0.11.0/) · [Claude Code project MCP setup](https://code.claude.com/docs/en/mcp)

```sh
docker compose up -d fhir
make fhir-seed
uvx --python 3.12 fhir-mcp-server==0.11.0 --help
claude mcp list
```

Use search and read to inspect a seeded synthetic DiagnosticReport and its linked Observations, compare a corrected version, and check the resource shape of a sandbox Task. The upstream server also exposes mutating tools. Use the seed script for fixtures and keep the MCP server pointed at the disposable fixture instance. Never enter health reports, chat, consent records, patient identifiers or credentials in MCP input.

Use the `clinvar-database` and `ensembl-database` skills to look up public variation IDs and gene symbols when checking reference sources. To install pinned copies for Claude Code on macOS or Linux, run from the project root. The `mktemp` directory is a local clone for inspecting the reviewed revision. [Skill repository and terms](https://github.com/google-deepmind/science-skills/blob/370f8f33e5bb27dffe8289ea9bdec436686613ce/SKILL_LICENSES.md)

```sh
skills_repo="$(mktemp -d)"
git clone https://github.com/google-deepmind/science-skills.git "$skills_repo"
git -C "$skills_repo" checkout --detach 370f8f33e5bb27dffe8289ea9bdec436686613ce
mkdir -p "$HOME/.claude/skills"
cp -R "$skills_repo/skills/clinvar_database" "$skills_repo/skills/ensembl_database" "$HOME/.claude/skills/"
```

On Windows, clone and check out the same revision, then copy the two skill directories into `%USERPROFILE%\.claude\skills`. Keep only the public identifier in each requested lookup. Record the database, record version, retrieval date and source URL when citing a fact. Agent tools and skills are development-only dependencies. [Licence inventory](licenses.md)
