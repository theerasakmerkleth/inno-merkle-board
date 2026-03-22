# Implementation Log
**Project:** TaskFlow AI
**Version:** 19.1 (Global Projects Menu Hotfix)
**Date:** 2026-03-23
**Engineer:** Senior Full Stack Engineer

## PHASE: BACKEND & FRONTEND HOTFIX
Addressed the critical issue where the "Projects" list in the left sidebar was disappearing on certain pages (like Dashboard or User Management).

### 1. Root Cause Analysis
The `available_projects` array was only being explicitly returned by a few controllers (like `BoardController`). When navigating to a page that didn't pass this specific prop (like `/users` or `/analytics`), the `AppLayout` received `undefined`, causing the Sidebar menu to collapse the projects list.

### 2. Resolution (Inertia Shared Data)
To ensure the sidebar functions globally across all pages without duplicating database queries in every single Controller:
- **Backend:** Modified `app/Http/Middleware/HandleInertiaRequests.php` to globally inject the `available_projects` data into the Inertia shared props. It dynamically checks if the user is an Admin (returning all projects) or a standard user (returning only their assigned projects).
- **Frontend:** Updated `resources/js/Layouts/AppLayout.tsx` to extract `available_projects` directly from `usePage().props` instead of expecting it to be passed manually from child components. 

**Result:** The Project list now persists seamlessly in the sidebar regardless of which page the user navigates to. Recompiled with `npm run build`.