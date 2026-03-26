<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AIController extends Controller
{
    /**
     * Gathering Requirement Hub
     * Analyzes input and returns a structured backlog draft.
     */
    public function analyze(Request $request, Project $project)
    {
        $user = auth()->user();
        $isManager = $user && ($user->hasRole('Admin') || DB::table('project_user')->where('project_id', $project->id)->where('user_id', auth()->id())->where('project_role', 'Manager')->exists());
        
        if (! $isManager) {
            abort(403);
        }

        $prompt = $request->input('prompt');
        if (empty($prompt)) {
            return response()->json(['error' => 'Prompt is required'], 422);
        }

        $model = $project->ai_model ?? 'gemini-3.1-pro-preview';
        $domain = $project->business_domain ?? 'General';
        $instructions = $project->ai_instructions ?? 'Follow standard PM best practices.';
        
        // Simulating AI Analysis with full context
        $suggestions = [
            [
                'title' => '[' . strtoupper($domain) . '] Integration Prototype',
                'description' => 'A task aligned with project goals: ' . substr($prompt, 0, 50) . '...',
                'priority' => 'high',
                'estimated_days' => 3
            ],
            [
                'title' => 'Security & Compliance Review',
                'description' => 'Mandatory check based on project instructions.',
                'priority' => 'medium',
                'estimated_days' => 2
            ]
        ];

        return response()->json([
            'project_id' => $project->id,
            'model_used' => $model,
            'summary' => "Requirement analysis for {$project->name} ({$domain} domain).",
            'suggested_tasks' => $suggestions,
            'analysis_notes' => "AI configured with custom instructions. Cognitive engine: {$model}."
        ]);
    }

    /**
     * Auto-Planning & Scheduling
     */
    public function autoPlan(Request $request, Project $project)
    {
        $user = auth()->user();
        $isManager = $user && ($user->hasRole('Admin') || DB::table('project_user')->where('project_id', $project->id)->where('user_id', auth()->id())->where('project_role', 'Manager')->exists());

        if (! $isManager) {
            abort(403);
        }

        // 1. Resource Management Analysis
        $members = $project->users()->withCount(['tasks' => function($q) use ($project) {
            $q->where('project_id', $project->id)->where('status', '!=', 'done');
        }])->get();

        $overloaded = $members->filter(fn($m) => $m->tasks_count > 5);
        
        // 2. Risk Management (Deadlines)
        $atRiskTasks = Task::where('project_id', $project->id)
            ->where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->addDays(2))
            ->count();

        // 3. Planning Suggestion Logic
        $suggestions = [];
        if ($overloaded->count() > 0) {
            foreach ($overloaded as $m) {
                $suggestions[] = "Resource Alert: **{$m->name}** has {$m->tasks_count} active tasks. Consider reassigning to balance the load.";
            }
        }

        if ($atRiskTasks > 0) {
            $suggestions[] = "Timeline Risk: **{$atRiskTasks} tasks** are approaching their deadlines within 48 hours.";
        }

        if (empty($suggestions)) {
            $suggestions[] = "Planning is optimal. No immediate resource or timeline risks detected.";
        }

        return response()->json([
            'risk_level' => ($overloaded->count() > 0 || $atRiskTasks > 0) ? 'high' : 'low',
            'analysis' => [
                'active_members' => $members->count(),
                'overloaded_count' => $overloaded->count(),
                'at_risk_tasks' => $atRiskTasks
            ],
            'suggestions' => $suggestions
        ]);
    }

    /**
     * Commit Draft Tasks to Board
     */
    public function commitTasks(Request $request, Project $project)
    {
        $user = auth()->user();
        $isManager = $user && ($user->hasRole('Admin') || DB::table('project_user')->where('project_id', $project->id)->where('user_id', auth()->id())->where('project_role', 'Manager')->exists());

        if (! $isManager) {
            abort(403);
        }

        $tasks = $request->input('tasks', []);
        
        DB::transaction(function() use ($tasks, $project) {
            foreach ($tasks as $taskData) {
                // Find first column of first board
                $board = $project->boards()->first();
                $column = $board ? $board->columns()->orderBy('order')->first() : null;

                if ($board && $column) {
                    Task::create([
                        'project_id' => $project->id,
                        'board_id' => $board->id,
                        'board_column_id' => $column->id,
                        'title' => $taskData['title'],
                        'description' => $taskData['description'],
                        'priority' => $taskData['priority'] ?? 'medium',
                        'status' => strtolower($column->title),
                        'is_ai_assigned' => true,
                    ]);
                }
            }
        });

        return response()->json(['message' => 'AI Tasks committed successfully.']);
    }
}
