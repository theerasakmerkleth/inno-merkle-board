<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AgentTaskController extends Controller
{
    /**
     * Fetch all tasks currently assigned to the authenticated AI Agent.
     */
    public function index(Request $request)
    {
        $agentId = $request->user()->id;

        $tasks = Task::where('assignee_id', $agentId)
            ->whereNotIn('status', ['done', 'awaiting_review'])
            ->get();

        return response()->json([
            'data' => $tasks,
        ], 200);
    }

    /**
     * Submit work for a specific task assigned to the AI Agent.
     */
    public function submit(Request $request, $id)
    {
        $agent = $request->user();

        $validatedData = $request->validate([
            'result_payload' => 'required|array',
            // Example of expected payload structure, would be validated strictly in production
            'result_payload.summary' => 'string',
            'result_payload.code_changes' => 'array',
            'result_payload.confidence_score' => 'numeric|min:0|max:1',
        ]);

        $taskId = DB::transaction(function () use ($id, $agent, $validatedData) {
            $task = Task::where('id', $id)
                ->where('assignee_id', $agent->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($task->status === 'done' || $task->status === 'awaiting_review') {
                throw ValidationException::withMessages([
                    'task' => 'This task is already under review or completed.',
                ]);
            }

            // 1. Log the submission
            $task->aiAgentSubmissions()->create([
                'agent_id' => $agent->id,
                'payload_data' => json_encode($validatedData['result_payload']),
                'review_status' => 'pending',
            ]);

            // 2. Update Task Status to trigger human review
            $task->update([
                'status' => 'awaiting_review',
            ]);

            // 3. (Optional) Broadcast event via Reverb for realtime UI update
            // broadcast(new TaskAwaitingReview($task))->toOthers();

            return $task->id;
        });

        return response()->json([
            'message' => 'Task submission received successfully. Awaiting human review.',
            'task_id' => $taskId,
        ], 201);
    }
}
