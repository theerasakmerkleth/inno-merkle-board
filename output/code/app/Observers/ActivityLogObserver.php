<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Notifications\TaskActivityNotification;

class ActivityLogObserver
{
    /**
     * Handle the ActivityLog "created" event.
     */
    public function created(ActivityLog $activityLog): void
    {
        $task = $activityLog->task;
        
        // Don't notify the person who made the change
        $causerId = $activityLog->user_id;

        $usersToNotify = collect();

        // If assigned, notify the new assignee
        if ($activityLog->action === 'assigned') {
            $newAssigneeId = $activityLog->new_values['assignee_id'] ?? null;
            
            if ($newAssigneeId && $newAssigneeId != $causerId) {
                $user = \App\Models\User::find($newAssigneeId);
                if ($user) {
                    $usersToNotify->push($user);
                }
            }
        }

        // If status changed or commented, notify assignee and reporter
        if (in_array($activityLog->action, ['status_changed', 'commented'])) {
            if ($task->assignee_id && $task->assignee_id !== $causerId) {
                $usersToNotify->push($task->assignee);
            }
            if ($task->reporter_id && $task->reporter_id !== $causerId) {
                $usersToNotify->push($task->reporter);
            }
        }

        $usersToNotify = $usersToNotify->unique('id');

        foreach ($usersToNotify as $user) {
            $user->notify(new TaskActivityNotification($activityLog));
        }
    }
}
