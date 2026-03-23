<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ActivityLogAndNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
        config(['queue.default' => 'sync']);
        config(['broadcasting.default' => 'log']);
    }

    protected function setupProjectAndUsers()
    {
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Project Manager']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Contributor']);

        $manager = User::factory()->create();
        $manager->assignRole('Project Manager');

        $assignee = User::factory()->create();
        $assignee->assignRole('Contributor');

        $project = new Project();
        $project->name = 'Test Project';
        $project->key = 'TP';
        $project->save();

        DB::table('project_user')->insert([
            ['project_id' => $project->id, 'user_id' => $manager->id, 'project_role' => 'Manager'],
            ['project_id' => $project->id, 'user_id' => $assignee->id, 'project_role' => 'Contributor'],
        ]);

        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'Board 1';
        $board->save();

        $column = $board->columns()->create(['title' => 'To Do', 'order' => 0]);
        $column2 = $board->columns()->create(['title' => 'In Progress', 'order' => 1]);

        return [$manager, $assignee, $project, $board, $column, $column2];
    }

    public function test_task_creation_logs_activity()
    {
        [$manager, $assignee, $project, $board, $column] = $this->setupProjectAndUsers();

        $response = $this->actingAs($manager)->postJson("/projects/{$project->id}/boards/{$board->id}/tasks", [
            'title' => 'New Task',
            'board_column_id' => $column->id,
            'priority' => 'medium',
        ]);

        $response->assertStatus(302);

        $task = Task::first();
        $this->assertNotNull($task);

        $this->assertDatabaseHas('activity_logs', [
            'task_id' => $task->id,
            'user_id' => $manager->id,
            'action' => 'created',
        ]);
    }

    public function test_task_assignment_logs_activity_and_notifies_user()
    {
        [$manager, $assignee, $project, $board, $column] = $this->setupProjectAndUsers();

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $column->id,
            'title' => 'Task 1',
            'status' => 'todo',
            'priority' => 'medium',
            'project_task_number' => 1
        ]);

        $response = $this->actingAs($manager)->patchJson("/tasks/{$task->id}", [
            'assignee_id' => $assignee->id,
        ]);

        $response->assertStatus(302);

        $this->assertDatabaseHas('activity_logs', [
            'task_id' => $task->id,
            'action' => 'assigned',
        ]);

        $this->assertEquals(1, $assignee->unreadNotifications()->count());
        $notification = $assignee->unreadNotifications()->first();
        $this->assertStringContainsString('assigned you', $notification->data['message']);
    }

    public function test_can_fetch_task_activity_logs()
    {
        [$manager, $assignee, $project, $board, $column] = $this->setupProjectAndUsers();

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $column->id,
            'title' => 'Task 1',
            'status' => 'todo',
            'priority' => 'medium',
            'project_task_number' => 1
        ]);

        \App\Models\ActivityLog::create([
            'task_id' => $task->id,
            'user_id' => $manager->id,
            'action' => 'created',
            'description' => 'Test',
        ]);

        $response = $this->actingAs($assignee)->getJson("/tasks/{$task->id}/activity-logs");
        
        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => [['action', 'description']]]);
    }
}
