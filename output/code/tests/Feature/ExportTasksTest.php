<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExportTasksTest extends TestCase
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
        $project->name = 'Export Project';
        $project->key = 'EXP';
        $project->save();
        
        DB::table('project_user')->insert([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => $role
        ]);
        
        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'EXP Board';
        $board->save();
        
        $column = $board->columns()->create(['title' => 'To Do', 'order' => 0]);

        $task = new Task();
        $task->project_id = $project->id;
        $task->board_id = $board->id;
        $task->board_column_id = $column->id;
        $task->title = 'Exportable Task';
        $task->status = 'todo';
        $task->priority = 'medium';
        $task->reporter_id = $user->id;
        $task->project_task_number = 1;
        $task->save();

        return [$user, $project, $board];
    }

    public function test_authorized_user_can_export_project_tasks_to_excel(): void
    {
        [$user, $project, $board] = $this->setupProjectAndUser('Viewer');

        $response = $this->actingAs($user)->get("/projects/{$project->id}/export");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->assertHeader('Content-Disposition', 'attachment; filename=' . $project->key . '_Tasks_' . now()->format('Y-m-d') . '.xlsx');
    }

    public function test_authorized_user_can_export_specific_board_tasks_to_excel(): void
    {
        [$user, $project, $board] = $this->setupProjectAndUser('Manager');

        $response = $this->actingAs($user)->get("/projects/{$project->id}/export?board_id={$board->id}");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_unauthorized_user_cannot_export_tasks(): void
    {
        $this->withExceptionHandling();
        $unauthorizedUser = User::factory()->create();
        [$user, $project, $board] = $this->setupProjectAndUser('Manager');

        $response = $this->actingAs($unauthorizedUser)->get("/projects/{$project->id}/export");

        $response->assertStatus(403);
    }
}
