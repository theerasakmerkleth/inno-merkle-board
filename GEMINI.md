# Merkle AI Task Management Framework

## Project Overview
This project defines a multi-agent AI workflow for software development lifecycle (SDLC) management. It uses a set of specialized AI roles, each with defined responsibilities and output artifacts, to build applications on a specific technical stack.

**Core Technologies:**
- **Backend:** Laravel 13
- **Frontend:** React + Inertia.js + shadcn/ui + Material Icons
- **Infrastructure:** Google Cloud Platform (GCP) - Cloud Run, SQL, Redis
- **IaC:** Terraform

## Multi-Agent Workflow
The workflow is driven by AI roles defined in the `prompt/` directory. Each role reads from and writes to a `./workspace/` directory (to be created during execution) to ensure traceability and handovers.

### Roles & Responsibilities:
1.  **Product Owner (PO) (`prompt/po.md`):**
    -   Defines product vision, strategy, and user stories.
    -   **Artifact:** `./workspace/prd_backlog_{datetime}.md`
2.  **Service Designer (`prompt/designer.md`):**
    -   UX/UI design using shadcn/ui components.
    -   **Artifact:** `./workspace/design_spec_{datetime}.md`
3.  **Solution Architect (`prompt/sa.md`):**
    -   GCP infrastructure design and API contracts.
    -   **Artifact:** `./workspace/infra_arch_{datetime}.md` & `./workspace/main.tf`
4.  **Developer (`prompt/developer.md`):**
    -   Fullstack development using Laravel, React, and Inertia.js.
    -   **Artifact:** `./workspace/implementation_log_{datetime}.md`
5.  **DevOps & QA (`prompt/infra.md`):**
    -   Automated testing, AC validation, and CI/CD via GitHub Actions.
    -   **Artifact:** `./workspace/qa_deployment_report_{datetime}.md`

## Usage Guidelines
- **Handover Logic:** Every agent **MUST** read the relevant input artifacts from the `./workspace/` directory before starting their phase.
- **Technology Policy:** Strictly adhere to the Laravel + Inertia.js + shadcn/ui stack and Terraform for GCP.
- **Artifact Naming:** Use the naming conventions specified in the role definitions, including a `{datetime}` suffix for versioning.

## Development Conventions
- **Source of Truth:** All requirements and design specs must be documented in the `./workspace/` artifacts.
- **Testing:** QA must verify all User Stories against the Acceptance Criteria (AC) defined by the PO.
- **Infrastructure:** All GCP resources must be provisioned via Terraform scripts.
