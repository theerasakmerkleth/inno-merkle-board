# PMO Strategy & Governance Update
**Project:** TaskFlow AI
**Version:** 21.2 (User Onboarding & Governance)
**Date:** 2026-03-23
**PMO Director:** Elite PMO Director

## 1. Strategic Objective: Streamlined Onboarding
To accelerate project mobilization, we have authorized the activation of the **User Invitation** feature. 
- **Business Goal:** Reduce the time required to add new resources to the workspace from hours (manual DB/Admin entry) to seconds (In-app delegation).
- **Efficiency KPI:** Aim for zero administrative latency during team expansion.

## 2. Access Control & Security Governance
- **Provisioning Authority:** Only users with the **Global Admin** role are authorized to create/invite new users. This ensures central oversight of license seats and resource costs.
- **Default Security Policy:**
    - New users are created with a temporary password (`password`).
    - Standard RBAC applies: New users must be manually added to specific projects by PMs after onboarding.
    - Active status is enabled by default upon invitation.

## 3. Implementation Details
- **Backend:** `UserController@store` now handles secure user creation and role synchronization using Spatie's permission library.
- **UI:** A Slide-over (`<Sheet>`) interface has been added to the User Management hub for a cohesive, context-preserving experience.
- **Aesthetic:** Adheres to Merkle CI (Clean White, Cobalt primary actions).

**Elite PMO Director: Governance Policy Enforced. Feature activation is approved.**
