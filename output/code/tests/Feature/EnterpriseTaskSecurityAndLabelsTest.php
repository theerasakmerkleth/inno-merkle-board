<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EnterpriseTaskSecurityAndLabelsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Bypass policies for focused testing on sanitization and labels
        \Illuminate\Support\Facades\Gate::before(function () {
            return true;
        });
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
    }

    private function setupProjectAndUser()
    {
        $user = User::factory()->create();
        
        $project = new Project();
        $project->name = 'Security Project';
        $project->key = 'SEC';
        $project->save();
        
        DB::table('project_user')->insert([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => 'Manager'
        ]);
        
        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'Security Board';
        $board->save();
        
        $column = $board->columns()->create(['title' => 'To Do', 'order' => 0]);

        return [$user, $project, $board, $column];
    }

    public function test_description_is_sanitized_against_xss_on_create(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser();

        $maliciousHtml = '<p>Normal text</p><script>alert("XSS")</script><a href="javascript:alert(1)">Click</a><img src="x" onerror="alert(1)">';
        
        $taskData = [
            'title' => 'XSS Test Task',
            'description' => $maliciousHtml,
            'priority' => 'medium',
            'board_column_id' => $column->id,
        ];

        $response = $this->actingAs($user)->postJson("/projects/{$project->id}/boards/{$board->id}/tasks", $taskData);
        $response->assertStatus(302);

        $task = Task::where('title', 'XSS Test Task')->first();
        
        $this->assertStringNotContainsString('<script>', $task->description);
        $this->assertStringNotContainsString('javascript:', $task->description);
        $this->assertStringNotContainsString('onerror', $task->description);
        $this->assertStringContainsString('<p>Normal text</p>', $task->description);
    }

    public function test_labels_are_correctly_saved_and_updated(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser();

        // 1. Create with labels
        $taskData = [
            'title' => 'Label Test Task',
            'description' => 'Testing labels',
            'priority' => 'high',
            'board_column_id' => $column->id,
            'labels' => ['backend', 'bug', 'urgent'],
        ];

        $this->actingAs($user)->postJson("/projects/{$project->id}/boards/{$board->id}/tasks", $taskData);

        $task = Task::where('title', 'Label Test Task')->first();
        $this->assertIsArray($task->labels);
        $this->assertEquals(['backend', 'bug', 'urgent'], $task->labels);

        // 2. Update labels
        $updateData = [
            'labels' => ['frontend', 'feature'],
        ];

        $response = $this->actingAs($user)->patchJson("/tasks/{$task->id}", $updateData);
        if ($response->status() !== 200 && $response->status() !== 302) {
            dump($response->getContent());
        }

        $task->refresh();
        $this->assertEquals(['frontend', 'feature'], $task->labels);
        
        // 3. Clear labels
        $clearData = [
            'labels' => [],
        ];
        
        $this->actingAs($user)->patchJson("/tasks/{$task->id}", $clearData);
        
        $task->refresh();
        $this->assertEmpty($task->labels);
    }
}
