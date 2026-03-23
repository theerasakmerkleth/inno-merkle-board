# Backend Implementation Log: Notifications & Activity Log

## Date: 2026-03-23 23:44:54

### 1. Architecture & Design Alignment
- **Design Spec:** `/runtime/context/v40_notification_activity_log/design_spec_*.md`
- **Goal:** Build the robust backend infrastructure to capture, store, and serve chronological activity logs (audit trails) and user-specific notifications based on system events, without impacting the core business logic or response times.

### 2. Implementation Details

#### 2.1 Activity Log Subsystem
- **Model & Migration:** Created `ActivityLog` model and `activity_logs` table containing `task_id`, `user_id` (causer), `action`, `description`, `old_values`, and `new_values`.
- **Event Observers:** Refactored `TaskObserver` to automatically capture `creating` and `updated` events.
    - Implemented fine-grained dirty checks (`isDirty()`) for crucial fields like `status`, `assignee_id`, and `board_id` to generate specific semantic actions (e.g., 'status_changed', 'assigned', 'moved').
- **API Endpoint:** Added `GET /tasks/{task}/activity-logs` in `TaskController` returning a paginated history of events for the specified task, protected by Project-level access policies.

#### 2.2 Notification Subsystem
- **Notification Class:** Created `TaskActivityNotification` implementing `ShouldQueue` to dispatch notifications asynchronously via the `database` channel.
- **Observer Trigger:** Built `ActivityLogObserver` to listen for new logs. When an activity like 'assigned', 'status_changed', or 'commented' occurs, the system evaluates the context and fires notifications selectively to involved parties (the assignee and reporter), explicitly excluding the user who triggered the action.
- **API Endpoints (`NotificationController`):**
    - `GET /notifications`: Fetches the latest 50 notifications for the authenticated user and the unread count.
    - `PATCH /notifications/{id}/read`: Marks a single notification as read.
    - `POST /notifications/mark-all-read`: Marks the entire inbox as read.

### 3. Testing & Validation
- **Test Suite:** Authored `tests/Feature/ActivityLogAndNotificationTest.php`.
- **Coverage:** Tested task creation logging, task assignment triggering both logs and asynchronous user notifications, and access control for fetching the logs.
- **Status:** All tests pass successfully (25/25 total system tests passing). No CSRF or Route Binding issues remain in the API layer.