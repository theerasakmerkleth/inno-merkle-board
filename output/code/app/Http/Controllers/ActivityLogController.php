<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = ActivityLog::with(['user', 'task' => function($q) {
                $q->select('id', 'project_id', 'board_id', 'project_task_number', 'title');
            }, 'task.project'])
            ->whereHas('task.project', function($q) use ($user) {
                if (! $user->hasRole('Admin')) {
                    $q->whereHas('users', function($uq) use ($user) {
                        $uq->where('users.id', $user->id);
                    });
                }
            })
            ->latest();

        if ($request->filled('project_id')) {
            $query->whereHas('task', function($q) use ($request) {
                $q->where('project_id', $request->project_id);
            });
        }

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('description', 'like', '%' . $request->search . '%')
                  ->orWhereHas('task', function($tq) use ($request) {
                      $tq->where('title', 'like', '%' . $request->search . '%')
                         ->orWhere('project_task_number', 'like', '%' . $request->search . '%');
                  });
            });
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('Activity/Index', [
            'logs' => $logs,
            'filters' => $request->only(['project_id', 'search']),
            'available_projects' => $user->hasRole('Admin') 
                ? Project::all(['projects.id', 'name', 'key'])
                : $user->projects()->get(['projects.id', 'name', 'key'])
        ]);
    }
}
