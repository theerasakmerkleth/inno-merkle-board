<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoadmapController extends Controller
{
    public function show(Request $request, $project_key)
    {
        $user = $request->user();
        $project = Project::where('key', $project_key)->firstOrFail();

        // Check Access
        if (! $user->hasRole('Admin') && ! $project->users->contains($user->id)) {
            abort(403);
        }

        $tasks = Task::where('project_id', $project->id)
            ->with(['assignee', 'dependencies'])
            ->get();

        // Format for Gantt
        $formattedTasks = $tasks->map(function ($task) {
            $hasConflict = false;
            foreach ($task->dependencies as $dep) {
                if ($task->start_date && $dep->due_date && $task->start_date < $dep->due_date) {
                    $hasConflict = true;
                    break;
                }
            }

            return [
                'id' => $task->id,
                'formatted_id' => $task->formatted_id,
                'title' => $task->title,
                'start_date' => $task->start_date?->format('Y-m-d'),
                'due_date' => $task->due_date?->format('Y-m-d'),
                'status' => $task->status,
                'priority' => $task->priority,
                'assignee' => $task->assignee,
                'dependencies' => $task->dependencies->pluck('id'),
                'has_conflict' => $hasConflict,
            ];
        });

        return Inertia::render('Projects/Roadmap', [
            'project' => $project,
            'tasks' => $formattedTasks,
        ]);
    }

    public function addDependency(Request $request, Task $task)
    {
        $validated = $request->validate([
            'blocked_by_id' => 'required|exists:tasks,id',
        ]);

        if ($task->id == $validated['blocked_by_id']) {
            return redirect()->back()->withErrors(['dependency' => 'A task cannot block itself.']);
        }

        $task->dependencies()->syncWithoutDetaching([$validated['blocked_by_id']]);

        return redirect()->back();
    }

    public function removeDependency(Request $request, Task $task, Task $blockedBy)
    {
        $task->dependencies()->detach($blockedBy->id);

        return redirect()->back();
    }
}
