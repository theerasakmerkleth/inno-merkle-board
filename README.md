# Merkle AI Task Management Framework

## Project Overview
This project defines a multi-agent AI workflow for software development lifecycle (SDLC) management. It uses a set of specialized AI roles, each with defined responsibilities and output artifacts, to build applications on a specific technical stack.

**Core Technologies:**
- **Backend:** Laravel 13
- **Frontend:** React + Inertia.js + shadcn/ui + Material Icons
- **Infrastructure:** Google Cloud Platform (GCP) - Cloud Run, SQL, Redis
- **IaC:** Terraform

## Project Structure (Clean Architecture)

The repository is structured to separate concerns between agent definitions, project inputs, runtime execution, and generated outputs.

```text
/
├── core/                # Agent Role Definitions (Policy Layer)
│   ├── product/         # PO Prompts
│   ├── design/          # Designer Prompts
│   ├── engineering/     # SA & Developer Prompts
│   └── operations/      # DevOps & QA Prompts
├── project/             # Project-Specific Configuration (Data Layer)
│   ├── inputs/          # Requirements, CI Assets, Images
│   └── config/          # Environment/Agent configurations
├── runtime/             # Execution & State (Application Layer)
│   ├── context/         # Current "Source of Truth" artifacts (Backlogs, Specs)
│   └── history/         # Timestamped logs for traceability
├── output/              # Final Generated Assets (Infrastructure Layer)
│   ├── code/            # Backend (Laravel) & Frontend (React)
│   └── infra/           # Terraform & CI/CD
└── scripts/             # Automation scripts for agent execution
```

## Multi-Agent Workflow
The workflow is driven by AI roles defined in the `core/` directory. Each role reads from and writes to the `./runtime/context/` directory to ensure traceability and proper handovers.

### Roles & Responsibilities:
1.  **Product Owner (PO) (`core/product/po.md`):**
    -   Defines product vision, strategy, and user stories based on `project/inputs/`.
    -   **Artifact:** `./runtime/context/prd_backlog_{datetime}.md`
2.  **Service Designer (`core/design/designer.md`):**
    -   UX/UI design using shadcn/ui components.
    -   **Artifact:** `./runtime/context/design_spec_{datetime}.md`
3.  **Solution Architect (`core/engineering/sa.md`):**
    -   GCP infrastructure design and API contracts.
    -   **Artifact:** `./runtime/context/infra_arch_{datetime}.md` & `./output/infra/main.tf`
4.  **Developer (`core/engineering/developer.md`):**
    -   Fullstack development using Laravel, React, and Inertia.js.
    -   **Artifact:** `./runtime/context/implementation_log_{datetime}.md` & Source code in `./output/code/`
5.  **DevOps & QA (`core/operations/qa.md`, `core/operations/infra.md`):**
    -   Automated testing, AC validation, and CI/CD.
    -   **Artifact:** `./runtime/context/qa_test_report_{datetime}.md` & `./runtime/context/qa_deployment_report_{datetime}.md`

## Usage Guidelines
- **Handover Logic:** Every agent **MUST** read the relevant input artifacts from the `./runtime/context/` directory before starting their phase.
- **Technology Policy:** Strictly adhere to the Laravel + Inertia.js + shadcn/ui stack and Terraform for GCP.
- **Artifact Archiving:** Old artifacts in `./runtime/context/` should be moved to `./runtime/history/` when new versions are generated.

## Development Conventions
- **Source of Truth:** All requirements and design specs must be documented in the `./runtime/context/` artifacts.
- **Testing:** QA must verify all User Stories against the Acceptance Criteria (AC) defined by the PO.
- **Infrastructure:** All GCP resources must be provisioned via Terraform scripts located in `./output/infra/`.
