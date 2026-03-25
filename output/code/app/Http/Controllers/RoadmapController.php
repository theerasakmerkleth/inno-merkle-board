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
        $project = Project::where('key', $project_key)->with('boards')->firstOrFail();

        // Check Access
        if (! $user->hasRole('Admin') && ! $project->users->contains($user->id)) {
            abort(403);
        }

        $tasks = Task::where('project_id', $project->id)
            ->with(['assignee', 'dependencies', 'checklists.items', 'comments.user'])
            ->get();

        // Get default board columns for the status mapping
        $defaultBoard = $project->boards->where('is_default', true)->first() ?? $project->boards->first();
        $columns = $defaultBoard ? $defaultBoard->columns()->orderBy('order')->get()->map(function($c) {
            return [
                'id' => (string)$c->id,
                'db_id' => $c->id,
                'title' => $c->title
            ];
        }) : [];

        // Project Members for assignee dropdown
        $projectMembers = $project->users()->select('users.id', 'users.name', 'users.email')->get();

        // Permissions
        $projectUser = $project->users()->where('user_id', $user->id)->first();
        $projectRole = $user->hasRole('Admin') ? 'Manager' : ($projectUser ? $projectUser->pivot->project_role : 'Viewer');

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
                'project_id' => $task->project_id,
                'board_id' => $task->board_id,
                'formatted_id' => $task->formatted_id,
                'title' => $task->title,
                'description' => $task->description,
                'start_date' => $task->start_date?->format('Y-m-d'),
                'due_date' => $task->due_date?->format('Y-m-d'),
                'status' => $task->status,
                'board_column_id' => $task->board_column_id,
                'priority' => $task->priority,
                'assignee_id' => $task->assignee_id,
                'assignee' => $task->assignee,
                'story_points' => $task->story_points,
                'labels' => $task->labels,
                'checklists' => $task->checklists,
                'comments' => $task->comments,
                'dependencies' => $task->dependencies->pluck('id'),
                'has_conflict' => $hasConflict,
            ];
        });

        return Inertia::render('Projects/Roadmap', [
            'project' => $project,
            'tasks' => $formattedTasks,
            'columns' => $columns,
            'project_members' => $projectMembers,
            'project_role' => $projectRole,
            'active_board' => $defaultBoard,
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
