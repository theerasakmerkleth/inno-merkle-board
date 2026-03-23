<?php

namespace App\Http\Controllers;

use App\Exports\TasksExport;
use App\Models\Project;
use App\Models\Board;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    public function exportTasks(Request $request, Project $project)
    {
        // Basic authorization - user must be part of the project
        if (! $project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403, 'Unauthorized access to project exports.');
        }

        $boardId = $request->query('board_id');
        
        $filename = "{$project->key}_Tasks_" . now()->format('Y-m-d') . ".xlsx";

        if ($boardId) {
            $board = Board::where('project_id', $project->id)->findOrFail($boardId);
            $filename = "{$project->key}_{$board->name}_Tasks_" . now()->format('Y-m-d') . ".xlsx";
            // Clean filename
            $filename = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $filename);
        }

        return Excel::download(new TasksExport($project->id, $boardId), $filename);
    }
}
