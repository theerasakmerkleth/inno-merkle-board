<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BoardController extends Controller
{
    use AuthorizesRequests;

    public function show(Request $request, $project_key, $board_id = null)
    {
        $user = $request->user();

        $project = Project::where('key', $project_key)->firstOrFail();

        // Check Access
        if (! $user->hasRole('Admin') && ! $project->users->contains($user->id)) {
            abort(403, 'Unauthorized access to project.');
        }

        $availableProjects = $user->hasRole('Admin') ? Project::all() : $user->projects;

        $boards = $project->boards()->orderBy('order')->get();

        if ($boards->isEmpty()) {
            abort(404, 'No boards found for this project.');
        }

        $activeBoard = $board_id ? $boards->where('id', $board_id)->first() : $boards->where('is_default', true)->first() ?? $boards->first();

        if (! $activeBoard) {
            abort(404, 'Board not found.');
        }

        // Ensure board has columns, if not seed defaults (Jira style)
        if ($activeBoard->columns()->count() === 0) {
            $defaults = [
                ['title' => 'To Do', 'order' => 0],
                ['title' => 'In Progress', 'order' => 1],
                ['title' => 'Awaiting Review', 'order' => 2],
                ['title' => 'QA Ready', 'order' => 3],
                ['title' => 'Done', 'order' => 4],
            ];
            foreach ($defaults as $d) {
                $activeBoard->columns()->create($d);
            }
        }

        // Data Reconcilliation: Map legacy tasks (null board_column_id) to columns
        $orphanTasks = \App\Models\Task::where('board_id', $activeBoard->id)
            ->whereNull('board_column_id')
            ->get();

        if ($orphanTasks->isNotEmpty()) {
            $boardCols = $activeBoard->columns;
            foreach ($orphanTasks as $task) {
                // Try to find a column title that matches the task status (todo, in_progress, etc)
                $matchedCol = $boardCols->first(function($c) use ($task) {
                    $title = strtolower(str_replace(' ', '_', $c->title));
                    return $title === strtolower($task->status);
                }) ?? $boardCols->first();

                if ($matchedCol) {
                    $task->update(['board_column_id' => $matchedCol->id]);
                }
            }
        }

        $columnsData = $activeBoard->columns()->with(['tasks' => function($q) {
            $q->with(['assignee', 'project', 'checklists.items'])->orderBy('order_in_column');
        }])->get();

        $columns = $columnsData->map(function($col) {
            return [
                'id' => (string)$col->id, // String for dnd-kit compatibility
                'db_id' => $col->id,
                'title' => $col->title,
                'tasks' => $col->tasks,
            ];
        });

        $projectMembers = $project->users()->select('users.id', 'users.name', 'users.email')->get();
        // Also include Global Admins and AI Agents if they are not directly in the project
        $globalUsers = User::role(['Admin', 'AI Agent'])->select('id', 'name', 'email')->get();
        $allAssignees = $projectMembers->merge($globalUsers)->unique('id')->values();

        // Pass user's project role
        $projectUser = $project->users()->where('user_id', $user->id)->first();
        $projectRole = $user->hasRole('Admin') ? 'Manager' : ($projectUser ? $projectUser->pivot->project_role : 'Viewer');

        return Inertia::render('Dashboard/KanbanBoard', [
            'current_project' => $project,
            'available_projects' => $availableProjects,
            'project_boards' => $boards,
            'active_board' => $activeBoard,
            'columns' => $columns,
            'project_members' => $allAssignees,
            'project_role' => $projectRole,
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $this->authorize('create', [Board::class, $project]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $maxOrder = $project->boards()->max('order') ?? -1;

        $board = Board::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'is_default' => false,
            'order' => $maxOrder + 1,
        ]);

        return redirect()->route('projects.board', ['project_key' => $project->key, 'board_id' => $board->id])->with('success', 'Board created successfully.');
    }

    public function reorder(Request $request, Project $project)
    {
        $request->validate([
            'board_ids' => 'required|array',
            'board_ids.*' => 'required|integer|exists:boards,id',
        ]);

        $boardIds = $request->board_ids;

        \Illuminate\Support\Facades\DB::transaction(function () use ($boardIds, $project) {
            foreach ($boardIds as $index => $id) {
                Board::where('id', $id)
                    ->where('project_id', $project->id)
                    ->update(['order' => $index]);
            }
        });

        return redirect()->back();
    }

    public function destroy(Project $project, Board $board)
    {
        $this->authorize('delete', $board);

        if ($board->is_default) {
            return redirect()->back()->withErrors(['board' => 'Cannot delete the default board.']);
        }

        $board->delete();

        return redirect()->route('projects.board', ['project_key' => $project->key])->with('success', 'Board deleted successfully.');
    }

    public function activity(Project $project, Board $board)
    {
        $user = auth()->user();
        if (! $user->hasRole('Admin') && ! $project->users->contains($user->id)) {
            abort(403);
        }

        $logs = \App\Models\ActivityLog::whereHas('task', function($q) use ($board) {
                $q->where('board_id', $board->id);
            })
            ->with(['user', 'task'])
            ->latest()
            ->paginate(30);

        return response()->json($logs);
    }
}
