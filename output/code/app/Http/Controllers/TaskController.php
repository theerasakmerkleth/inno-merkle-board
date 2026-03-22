<?php

namespace App\Http\Controllers;

use App\Events\TaskUpdated;
use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Project $project, Board $board)
    {
        $this->authorize('create', [Task::class, $project]);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high',
            'assignee_id' => 'nullable|exists:users,id',
            'board_column_id' => 'nullable|exists:board_columns,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $validated['project_id'] = $project->id;
        $validated['board_id'] = $board->id;
        
        if (!isset($validated['board_column_id'])) {
            $firstCol = $board->columns()->orderBy('order')->first();
            $validated['board_column_id'] = $firstCol?->id;
        }

        if ($validated['board_column_id']) {
            $col = \App\Models\BoardColumn::find($validated['board_column_id']);
            $validated['status'] = strtolower($col->title);
        } else {
            $validated['status'] = 'todo';
        }

        // Check if assigned to an AI agent
        if ($validated['assignee_id']) {
            $assignee = User::find($validated['assignee_id']);
            if ($assignee && $assignee->hasRole('AI Agent')) {
                $validated['is_ai_assigned'] = true;
            }
        }

        Task::create($validated); // TaskObserver handles the project_task_number sequence and transaction

        return redirect()->back()->with('success', 'Task created successfully.');
    }

    public function update(Request $request, Task $task)
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'sometimes|required|in:low,medium,high',
            'assignee_id' => 'nullable|exists:users,id',
            'board_column_id' => 'sometimes|required|exists:board_columns,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if (isset($validated['board_column_id'])) {
            $newColumn = \App\Models\BoardColumn::findOrFail($validated['board_column_id']);
            $validated['status'] = strtolower($newColumn->title);

            if (str_contains(strtolower($newColumn->title), 'done')) {
                if (! auth()->user()->hasRole(['Admin', 'Project Manager', 'QA'])) {
                    abort(403, 'Unauthorized to move tasks to Done.');
                }
            }
        }

        if (isset($validated['assignee_id']) && $validated['assignee_id'] != $task->assignee_id) {
            $assignee = User::find($validated['assignee_id']);
            $validated['is_ai_assigned'] = $assignee && $assignee->hasRole('AI Agent');
        }

        $task->update($validated);

        broadcast(new TaskUpdated($task))->toOthers();

        return redirect()->back()->with('success', 'Task updated successfully.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'board_column_id' => 'required|exists:board_columns,id',
        ]);

        $taskObj = null;

        \Illuminate\Support\Facades\DB::transaction(function () use ($id, $request, &$taskObj) {
            // Optimistic locking to prevent race condition when moving cards
            $task = Task::lockForUpdate()->findOrFail($id);

            // Backend Authorization check before updating (Jira-style workflow F06)
            $user = auth()->user();
            $newColumnId = $request->board_column_id;
            $newColumn = \App\Models\BoardColumn::findOrFail($newColumnId);

            // Only PM, QA or Admin can move to done (assuming column title contains 'done' case insensitive)
            if (str_contains(strtolower($newColumn->title), 'done') && ! $user->hasRole(['Admin', 'Project Manager', 'QA'])) {
                abort(403, 'Unauthorized to move tasks to Done.');
            }

            $task->update([
                'board_column_id' => $newColumnId,
                'status' => strtolower($newColumn->title), // Keep status enum synced for compatibility
            ]);
            $taskObj = $task;
        });

        if ($taskObj) {
            broadcast(new TaskUpdated($taskObj))->toOthers();
        }

        return redirect()->back();
    }

    public function reorder(Request $request, Board $board)
    {
        $request->validate([
            'column_id' => 'required|exists:board_columns,id',
            'task_ids' => 'required|array',
            'task_ids.*' => 'required|integer|exists:tasks,id',
        ]);

        $columnId = $request->column_id;
        $taskIds = $request->task_ids;

        \Illuminate\Support\Facades\DB::transaction(function () use ($columnId, $taskIds) {
            foreach ($taskIds as $index => $id) {
                Task::where('id', $id)->update([
                    'board_column_id' => $columnId,
                    'order_in_column' => $index
                ]);
            }
        });

        return redirect()->back();
    }

    public function destroy(Task $task)
    {
        $this->authorize('delete', $task);

        $task->delete();

        return redirect()->back()->with('success', 'Task deleted successfully.');
    }
}
