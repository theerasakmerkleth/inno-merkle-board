# Merkle AI Task Management Framework

## Project Overview
This project defines a multi-agent AI workflow for software development lifecycle (SDLC) management. It uses a set of specialized AI roles ("Super Agent Team"), each with defined responsibilities and output artifacts, to build applications on a specific technical stack.

**Core Technologies:**
- **Backend:** Laravel 13
- **Frontend:** React + Inertia.js + Tailwind CSS + shadcn/ui
- **Infrastructure:** Google Cloud Platform (GCP) - Cloud Run, SQL, Redis
- **IaC:** Terraform

## Multi-Agent Workflow
The workflow is driven by elite AI roles defined in the `core/` directory. Each role reads from and writes to the `./runtime/context/` directory to ensure perfect traceability and handovers.

### The "Super Agent Team" Roles & Responsibilities:

1.  **Enterprise PMO Director (`core/product/pmo.md`):**
    -   Oversees strategic OKRs, portfolio management, and SDLC governance.
    -   **Artifact:** `./runtime/context/pmo_strategy_and_governance_{datetime}.md`
2.  **Elite Product Owner (`core/product/po.md`):**
    -   Defines product vision, epics, and detailed BDD user stories.
    -   **Artifact:** `./runtime/context/prd_backlog_{datetime}.md`
3.  **Senior UX/UI Architect (`core/design/designer.md`):**
    -   UX/UI design strictly adhering to Merkle CI and shadcn/ui.
    -   **Artifact:** `./runtime/context/design_spec_{datetime}.md`
4.  **Enterprise Solution Architect (`core/engineering/sa.md`):**
    -   GCP infrastructure design, Database modeling, and API contracts.
    -   **Artifact:** `./runtime/context/infra_arch_{datetime}.md` & `./output/infra/main.tf`
5.  **Principal Backend Engineer (`core/engineering/backend.md`):**
    -   Data layer, business logic, security, and API endpoints (Laravel).
    -   **Artifact:** `./runtime/context/backend_implementation_log_{datetime}.md`
6.  **Principal Frontend Engineer (`core/engineering/frontend.md`):**
    -   Pixel-perfect UI, Optimistic interactions, and React/Inertia.js integration.
    -   **Artifact:** `./runtime/context/frontend_implementation_log_{datetime}.md`
7.  **Principal QA Automation Engineer (`core/operations/qa.md`):**
    -   The Gatekeeper. E2E automated testing, visual regression, and A11y audits.
    -   **Artifact:** `./runtime/context/qa_test_report_{datetime}.md`
8.  **Lead DevOps & SRE (`core/operations/infra.md`):**
    -   CI/CD automation, zero-downtime deployment, and Terraform execution.
    -   **Artifact:** `./runtime/context/qa_deployment_report_{datetime}.md`

## Usage Guidelines
- **Handover Logic:** Every agent **MUST** read the relevant input artifacts from the `./runtime/context/` directory before starting their phase.
- **Technology Policy:** Strictly adhere to the Laravel + Inertia.js + shadcn/ui stack and Terraform for GCP.
- **Artifact Naming:** Use the naming conventions specified in the role definitions, including a `{datetime}` suffix for versioning.

## Development Conventions
- **Source of Truth:** All requirements, design specs, and architectural contracts must be documented in the `./runtime/context/` artifacts.
- **Backend-First:** Backend schemas and logic must be implemented and tested before Frontend UI composition.
- **Testing:** QA must verify all User Stories against the Acceptance Criteria (AC) defined by the PO and Design Specs.
- **Infrastructure:** All GCP resources must be provisioned via Terraform scripts.