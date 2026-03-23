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

class ChecklistCrudTest extends TestCase
{
    use RefreshDatabase;

    private function setupProjectAndUser($role = 'Manager')
    {
        $user = User::factory()->create();
        
        $project = new Project();
        $project->name = 'Checklist Project';
        $project->key = 'CHK';
        $project->save();
        
        DB::table('project_user')->insert([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => $role
        ]);
        
        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'CHK Board';
        $board->save();
        
        $column = $board->columns()->create(['title' => 'To Do', 'order' => 0]);

        $task = new Task();
        $task->project_id = $project->id;
        $task->board_id = $board->id;
        $task->board_column_id = $column->id;
        $task->title = 'Checklist Task';
        $task->status = 'todo';
        $task->priority = 'medium';
        $task->reporter_id = $user->id;
        $task->project_task_number = 1;
        $task->save();

        return [$user, $project, $task];
    }

    public function test_can_create_checklist_and_items(): void
    {
        $this->withoutExceptionHandling();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
        
        [$user, $project, $task] = $this->setupProjectAndUser();

        // Create Checklist
        $response = $this->actingAs($user)->postJson("/tasks/{$task->id}/checklists", [
            'title' => 'My Checklist'
        ]);

        $response->assertStatus(302);
        
        $this->assertDatabaseHas('checklists', [
            'task_id' => $task->id,
            'title' => 'My Checklist',
        ]);

        $checklist = \App\Models\Checklist::first();

        // Create Item
        $response = $this->actingAs($user)->postJson("/checklists/{$checklist->id}/items", [
            'content' => 'First subtask'
        ]);

        $response->assertStatus(302);

        $this->assertDatabaseHas('checklist_items', [
            'checklist_id' => $checklist->id,
            'content' => 'First subtask',
        ]);
    }
}
