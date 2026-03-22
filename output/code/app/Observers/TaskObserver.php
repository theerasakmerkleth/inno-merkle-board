<?php

namespace App\Observers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskTransition;
use Illuminate\Support\Facades\DB;

class TaskObserver
{
    /**
     * Handle the Task "creating" event.
     */
    public function creating(Task $task): void
    {
        if ($task->project_id && empty($task->project_task_number)) {
            // We lock the project to safely increment task sequence
            // Note: This is inside an eloquent hook, to be truly safe it should be wrapped in a DB::transaction from the caller
            // But since creating could be called anywhere, we can try to lock it here
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
            'user_id' => auth()->id(), // null if via console/seeder/agent api without web auth
            'from_status' => null,
            'to_status' => $task->status,
        ]);
    }

    /**
     * Handle the Task "updated" event.
     */
    public function updated(Task $task): void
    {
        if ($task->isDirty('status')) {
            TaskTransition::create([
                'task_id' => $task->id,
                // Check auth context or explicit assignee (for AI agent token submissions it might be via request()->user())
                'user_id' => request()->user()?->id,
                'from_status' => $task->getOriginal('status'),
                'to_status' => $task->status,
            ]);
        }
    }
}
