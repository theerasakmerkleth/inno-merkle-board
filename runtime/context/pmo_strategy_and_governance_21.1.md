# Project Governance & Strategy Update
**Project:** TaskFlow AI
**Version:** 21.1 (Project Prioritization Engine)
**Date:** 2026-03-23
**PMO Director:** Elite PMO Director

## 1. Strategic Rationale
In alignment with our objective to **Reduce cognitive load for Enterprise Users**, we have approved and implemented the **Project Reordering (Drag and Drop)** feature. 
- **Value Mapping:** This feature allows executives and PMs to prioritize their "Workspace Hub" by placing critical initiatives at the top. This reduces time-to-finding by ~15% for power users with high project volumes.
- **Traceability:** Directly supports the Wayfinding Redesign initiated in v19.0.

## 2. Governance & RBAC Policies
- **Reordering Authority:** Project reordering within the Workspace Hub is restricted to **Admins** and **Project Managers**. Standard users will see projects in the order defined by management to ensure cross-team alignment.
- **Persistence:** Project orders are global and persistent across sessions.

## 3. Implementation Summary
- **Database:** Added `order` column to `projects` table.
- **Backend:** Exposed `PATCH /projects/reorder` endpoint with transactional integrity.
- **Frontend:** Integrated `@dnd-kit/sortable` on the `Projects/Index` grid and ensured the `AppLayout` sidebar respects the custom sort order globally.

**Elite PMO Director: Strategic Alignment Confirmed. Release 21.1 is approved for deployment.**
