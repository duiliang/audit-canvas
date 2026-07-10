# Prior Art Research

AuditCanvas is an independent open-source project. This research records public product and architecture ideas reviewed before implementation. No third-party source code, logos, screenshots, brand assets, or private material were copied into this repository.

## Sources Reviewed

| Project | Source | License observed | Problem solved | Borrowable product ideas | Technical and data model notes | AuditCanvas difference |
| --- | --- | --- | --- | --- | --- | --- |
| StrictDoc | https://github.com/strictdoc-project/strictdoc and https://strictdoc.readthedocs.io/en/stable/ | Apache-2.0 | Technical documentation and requirements management with export and local server workflows. | Requirements as structured artifacts, static HTML export, local preview server, traceability-first mindset. | Python app, SDoc format, exported static HTML, requirements nodes with stable identifiers and fields such as UID, status, title, statement, rationale, and comments. | AuditCanvas accepts arbitrary Markdown, TXT, JSON, and source files first. It focuses on evidence-preserving audit findings, coverage accounting, Git baselines, and review state rather than authoring a requirements format. |
| Doorstop | https://github.com/doorstop-dev/doorstop | LGPLv3 | Requirements stored next to source code in version control, with validation and publishing. | Git-native requirements, one item per file, human-readable item files, CLI validation before publish. | YAML files arranged as document trees; linkable requirements and tests; links can track parent UID and fingerprints to detect reviewed changes. | AuditCanvas will not depend on or embed Doorstop because LGPLv3 is not appropriate for a permissive MIT core. Doorstop import can be a future optional adapter. |
| OpenFastTrace | https://github.com/itsallcode/openfasttrace and https://github.com/itsallcode/openfasttrace/blob/main/doc/user_guide.md | GPL-3.0 | Requirement tracing from specifications to code, including obsolete implementation detection. | Coverage and stale-content checks, trace matrix output, source-to-implementation links. | Java requirement tracing suite; Markdown-readable specification items; requirement IDs shaped like artifact, name, and revision; graph-style needs, covers, and depends relationships. | GPL-3.0 implementation is not used. AuditCanvas will implement its own lightweight local trace checks and keep OpenFastTrace interoperability as a future optional adapter. |
| GitHub Spec Kit | https://github.com/github/spec-kit and https://github.github.com/spec-kit/ | MIT | Spec-driven development workflow for AI coding agents. | Explicit product constitution, specify to plan to tasks workflow, agent skill integration, templates and overrides. | Python CLI using uv; `.specify/memory/constitution.md`; feature specs, plans, data models, contracts, and tasks. | AuditCanvas audits existing artifacts and review evidence. It can complement Spec Kit, but it is not a spec authoring workflow and does not install slash commands as its core product. |
| OpenSpec | https://github.com/Fission-AI/OpenSpec and https://openspec.dev/ | MIT | Spec-driven development for AI assistants, with persistent specs and tasks. | Persistent project context, lightweight change folders, archive lifecycle, explicit opt-out telemetry posture. | TypeScript/Node CLI; `openspec/changes/<id>/proposal.md`, `design.md`, `tasks.md`, and `specs/`. | AuditCanvas stores audit runs and review state, not feature proposal lifecycle state. It defaults to no telemetry and no remote model calls. |
| PR-Agent | https://github.com/The-PR-Agent/pr-agent and https://docs.pr-agent.ai/ | MIT observed in repository metadata | AI-powered pull request review across Git providers. | Provider separation, Git provider integrations, PR compression ideas, structured review categories, configurable commands. | Python service/CLI/action with model-backed review, improve, ask, describe, and multi-provider Git integration workflows. | AuditCanvas is local-first and model-optional. It audits full artifacts and duplicate evidence without compressing away repeated text. |
| Excalidraw | https://github.com/excalidraw/excalidraw | MIT | Local-first canvas and whiteboard UI for diagrams. | Local-first browser persistence, dark mode, i18n, export, keyboardable canvas-like interactions, open JSON file format. | TypeScript/React app with open `.excalidraw` JSON format, offline-capable hosted app, libraries, arrow binding, collaboration, and export formats. | AuditCanvas is not a drawing whiteboard. Its "canvas" is a dense review workbench with source, findings, evidence comparison, and trace matrix panels. No Excalidraw code or visual assets are reused. |

## License Decision

The core repository will be MIT licensed. Dependencies must be MIT, Apache-2.0, BSD, ISC, or similarly permissive for the shipped core. GPL/LGPL tools can be documented as external optional adapters only when integration does not combine code into the distributed MIT packages.

## Product Differentiation

AuditCanvas focuses on invariants that the reviewed projects do not all enforce together:

- Full duplicate evidence is never hidden or summarized in generated reports.
- Every SourceBlock is included in coverage accounting.
- AI conclusions are stored separately from original evidence.
- Git commit SHA and file hash are first-class audit metadata.
- Web, CLI, and Codex Plugin are distribution surfaces over the same local audit model.
