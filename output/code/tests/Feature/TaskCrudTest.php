<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TaskCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutExceptionHandling([
            \Illuminate\Auth\Access\AuthorizationException::class,
        ]);
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
    }

    private function setupProjectAndUser($role = 'Manager')
    {
        $user = User::factory()->create();
        
        $project = new Project();
        $project->name = 'CRUD Project';
        $project->key = 'CRUD';
        $project->save();
        
        DB::table('project_user')->insert([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => $role
        ]);
        
        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'Main Board';
        $board->save();
        
        $column = $board->columns()->create(['title' => 'To Do', 'order' => 0]);

        return [$user, $project, $board, $column];
    }

    public function test_manager_can_create_task(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser('Manager');

        $taskData = [
            'title' => 'Test Task Create',
            'description' => 'A new task',
            'priority' => 'high',
            'board_column_id' => $column->id,
        ];

        $response = $this->actingAs($user)->postJson("/projects/{$project->id}/boards/{$board->id}/tasks", $taskData);

        $response->assertStatus(302);
        $response->assertSessionHasNoErrors();
        
        $this->assertDatabaseHas('tasks', [
            'title' => 'Test Task Create',
            'project_id' => $project->id,
            'board_id' => $board->id,
        ]);
    }

    public function test_viewer_cannot_create_task(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser('Viewer');

        $taskData = [
            'title' => 'Test Task Viewer Create',
            'description' => 'Should fail',
            'priority' => 'low',
        ];

        $response = $this->actingAs($user)->postJson("/projects/{$project->id}/boards/{$board->id}/tasks", $taskData);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('tasks', [
            'title' => 'Test Task Viewer Create',
        ]);
    }

    public function test_manager_can_update_task(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser('Manager');

        $task = new Task();
        $task->project_id = $project->id;
        $task->board_id = $board->id;
        $task->board_column_id = $column->id;
        $task->title = 'Original Title';
        $task->status = 'todo';
        $task->priority = 'medium';
        $task->project_task_number = 1;
        $task->save();

        $updateData = [
            'title' => 'Updated Title',
            'priority' => 'high',
        ];

        $response = $this->actingAs($user)->patchJson("/tasks/{$task->id}", $updateData);

        $response->assertStatus(302);
        $response->assertSessionHasNoErrors();
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Title',
            'priority' => 'high',
        ]);
    }

    public function test_manager_can_delete_task(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser('Manager');

        $task = new Task();
        $task->project_id = $project->id;
        $task->board_id = $board->id;
        $task->board_column_id = $column->id;
        $task->title = 'To Be Deleted';
        $task->status = 'todo';
        $task->priority = 'medium';
        $task->project_task_number = 1;
        $task->save();

        $response = $this->actingAs($user)->deleteJson("/tasks/{$task->id}");

        $response->assertStatus(302);
        $response->assertSessionHasNoErrors();
        
        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    public function test_contributor_cannot_delete_task(): void
    {
        [$user, $project, $board, $column] = $this->setupProjectAndUser('Contributor');

        $task = new Task();
        $task->project_id = $project->id;
        $task->board_id = $board->id;
        $task->board_column_id = $column->id;
        $task->title = 'Safe Task';
        $task->status = 'todo';
        $task->priority = 'medium';
        $task->project_task_number = 1;
        $task->save();

        $response = $this->actingAs($user)->deleteJson("/tasks/{$task->id}");

        $response->assertStatus(403);
        
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Safe Task',
        ]);
    }
}
