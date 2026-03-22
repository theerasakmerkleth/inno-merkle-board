<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskTransition;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectStatsController extends Controller
{
    public function index(Request $request, $project_key)
    {
        $project = Project::where('key', $project_key)->firstOrFail();
        
        // Velocity Data
        $velocityData = $project->boards()->withCount(['tasks as committed', 'tasks as completed' => function($q) {
            $q->whereHas('column', function($cq) {
                $cq->where('title', 'like', '%Done%');
            });
        }])->orderBy('order')->get()->map(function($board) {
            return [
                'name' => $board->name,
                'committed' => $board->committed,
                'completed' => $board->completed,
            ];
        });

        // Current Active Board Burndown
        $activeBoard = $project->boards()->where('is_default', true)->first() ?? $project->boards()->first();
        $burndownData = $activeBoard ? $this->calculateBurndown($activeBoard) : ['actual' => [], 'ideal' => []];

        return Inertia::render('Projects/Reports', [
            'project' => $project,
            'velocity' => $velocityData,
            'burndown' => $burndownData,
            'activeBoardName' => $activeBoard?->name ?? 'No Active Board',
        ]);
    }

    private function calculateBurndown(Board $board)
    {
        // Define a 2-week period for the burndown if no tasks have dates
        $start = Carbon::parse($board->created_at)->startOfDay();
        $end = Carbon::now()->endOfDay();
        
        // If the board has tasks with dates, use those
        $firstTask = Task::where('board_id', $board->id)->orderBy('created_at')->first();
        if ($firstTask) {
            $start = Carbon::parse($firstTask->created_at)->startOfDay();
        }

        $period = CarbonPeriod::create($start, $end);
        $totalTasks = Task::where('board_id', $board->id)->count();

        $actual = [];
        foreach ($period as $date) {
            $dayStr = $date->format('Y-m-d');
            
            // Remaining = Total ever on board - (Moved to Done before or on this day)
            $completedCount = TaskTransition::whereHas('task', function($q) use ($board) {
                $q->where('board_id', $board->id);
            })
            ->where('to_status', 'like', '%done%')
            ->where('created_at', '<=', $date->endOfDay())
            ->distinct('task_id')
            ->count();

            $actual[] = [
                'day' => $date->format('M d'),
                'remaining' => max(0, $totalTasks - $completedCount),
            ];
        }

        // Ideal Line
        $ideal = [
            ['day' => $actual[0]['day'] ?? 'Start', 'value' => $totalTasks],
            ['day' => end($actual)['day'] ?? 'End', 'value' => 0],
        ];

        return [
            'actual' => $actual,
            'ideal' => $ideal,
        ];
    }
}
