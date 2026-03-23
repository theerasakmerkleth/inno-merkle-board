<?php

namespace App\Observers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskTransition;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;

class TaskObserver
{
    /**
     * Handle the Task "creating" event.
     */
    public function creating(Task $task): void
    {
        if ($task->project_id && empty($task->project_task_number)) {
            DB::transaction(function () use ($task) {
                $lockedProject = Project::where('id', $task->project_id)->lockForUpdate()->first();
                if ($lockedProject) {
                    $lockedProject->increment('task_sequence');
                    $task->project_task_number = $lockedProject->task_sequence;
                }
            });
        }
    }

    /**
     * Handle the Task "created" event.
     */
    public function created(Task $task): void
    {
        TaskTransition::create([
            'task_id' => $task->id,
            'user_id' => request()->user()?->id,
            'from_status' => null,
            'to_status' => $task->status,
        ]);

        ActivityLog::create([
            'task_id' => $task->id,
            'user_id' => request()->user()?->id,
            'action' => 'created',
            'description' => 'Task created',
            'new_values' => $task->toArray(),
        ]);
    }

    /**
     * Handle the Task "updated" event.
     */
    public function updated(Task $task): void
    {
        $dirty = $task->getDirty();
        $original = [];
        foreach ($dirty as $key => $value) {
            $original[$key] = $task->getOriginal($key);
        }

        if ($task->isDirty('status')) {
            TaskTransition::create([
                'task_id' => $task->id,
                'user_id' => request()->user()?->id,
                'from_status' => $task->getOriginal('status'),
                'to_status' => $task->status,
            ]);

            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => request()->user()?->id,
                'action' => 'status_changed',
                'description' => 'Changed status from ' . $task->getOriginal('status') . ' to ' . $task->status,
                'old_values' => ['status' => $task->getOriginal('status')],
                'new_values' => ['status' => $task->status],
            ]);
            unset($dirty['status']);
            unset($original['status']);
        }

        if ($task->isDirty('assignee_id')) {
            $oldAssignee = \App\Models\User::find($task->getOriginal('assignee_id'));
            $newAssignee = \App\Models\User::find($task->assignee_id);
            
            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => request()->user()?->id,
                'action' => 'assigned',
                'description' => $newAssignee ? 'Assigned to ' . $newAssignee->name : 'Unassigned',
                'old_values' => ['assignee_id' => $task->getOriginal('assignee_id')],
                'new_values' => ['assignee_id' => $task->assignee_id],
            ]);
            unset($dirty['assignee_id']);
            unset($original['assignee_id']);
        }

        if ($task->isDirty('board_id')) {
            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => request()->user()?->id,
                'action' => 'moved',
                'description' => 'Moved to another board/project',
                'old_values' => ['board_id' => $task->getOriginal('board_id'), 'project_id' => $task->getOriginal('project_id')],
                'new_values' => ['board_id' => $task->board_id, 'project_id' => $task->project_id],
            ]);
            unset($dirty['board_id']);
            unset($dirty['project_id']);
            unset($original['board_id']);
            unset($original['project_id']);
        }

        if (!empty($dirty)) {
            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => request()->user()?->id,
                'action' => 'updated',
                'description' => 'Updated task details',
                'old_values' => $original,
                'new_values' => $dirty,
            ]);
        }
    }
}
