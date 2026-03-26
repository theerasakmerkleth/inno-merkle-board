<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskTransition;
use App\Models\User;
use Carbon\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function myTasks()
    {
        $tasks = Task::where('assignee_id', auth()->id())
            ->whereNotIn('status', ['Done'])
            ->with(['project', 'board'])
            ->orderByRaw("CASE WHEN priority = 'High' THEN 1 WHEN priority = 'Medium' THEN 2 WHEN priority = 'Low' THEN 3 ELSE 4 END")
            ->get();

        return Inertia::render('Dashboard/MyTasks', [
            'tasks' => $tasks,
            'users' => User::all(['id', 'name', 'email']),
        ]);
    }

    public function analytics()
    {
        $resourceLoad = User::withCount(['tasks as active_tasks_count' => function ($query) {
            $query->whereNotIn('status', ['Done']);
        }])
            ->has('tasks', '>', 0)
            ->get(['id', 'name']);

        // Calculate Cycle Time
        $transitions = TaskTransition::where('to_status', 'Done')->get();
        $totalCycleTimeHours = 0;
        $count = 0;

        foreach ($transitions as $transition) {
            $startTransition = TaskTransition::where('task_id', $transition->task_id)
                ->where('to_status', 'In Progress')
                ->orderBy('created_at', 'asc')
                ->first();

            if ($startTransition) {
                $startTime = Carbon::parse($startTransition->created_at);
                $endTime = Carbon::parse($transition->created_at);
                $totalCycleTimeHours += $startTime->diffInHours($endTime);
                $count++;
            }
        }

        $avgCycleTimeHours = $count > 0 ? round($totalCycleTimeHours / $count, 2) : 0;
        $avgCycleTimeDays = $count > 0 ? round($avgCycleTimeHours / 24, 2) : 0;

        return Inertia::render('Dashboard/Analytics', [
            'resourceLoad' => $resourceLoad,
            'avgCycleTimeHours' => $avgCycleTimeHours,
            'avgCycleTimeDays' => $avgCycleTimeDays,
            'users' => User::all(['id', 'name', 'email']),
        ]);
    }
}
