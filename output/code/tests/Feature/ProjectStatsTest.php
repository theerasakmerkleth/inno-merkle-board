<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class ProjectStatsTest extends TestCase
{
    use RefreshDatabase;

    private function setupProjectAndUser($role = 'Manager')
    {
        $user = User::factory()->create();
        
        $project = new Project();
        $project->name = 'Stats Project';
        $project->key = 'STATS';
        $project->save();
        
        DB::table('project_user')->insert([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'project_role' => $role
        ]);
        
        $board = new Board();
        $board->project_id = $project->id;
        $board->name = 'Sprint 1';
        $board->is_default = true;
        $board->save();
        
        $columnTodo = $board->columns()->create(['title' => 'To Do', 'order' => 0]);
        $columnDone = $board->columns()->create(['title' => 'Done', 'order' => 1]);

        return [$user, $project, $board, $columnTodo, $columnDone];
    }

    public function test_authorized_user_can_access_reports_page(): void
    {
        [$user, $project] = $this->setupProjectAndUser();

        $response = $this->actingAs($user)->get("/projects/{$project->key}/reports");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Reports')
            ->has('project')
            ->has('velocity')
            ->has('burndown')
            ->has('activeBoardName')
        );
    }

    public function test_velocity_data_calculation(): void
    {
        [$user, $project, $board, $todo, $done] = $this->setupProjectAndUser();

        // Create 3 tasks in Todo, 2 tasks in Done
        Task::factory()->count(3)->create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $todo->id,
        ]);
        Task::factory()->count(2)->create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $done->id,
        ]);

        $response = $this->actingAs($user)->get("/projects/{$project->key}/reports");

        $response->assertInertia(fn (Assert $page) => $page
            ->where('velocity.0.name', 'Sprint 1')
            ->where('velocity.0.committed', 5)
            ->where('velocity.0.completed', 2)
        );
    }

    public function test_burndown_data_structure(): void
    {
        [$user, $project, $board] = $this->setupProjectAndUser();

        $response = $this->actingAs($user)->get("/projects/{$project->key}/reports");

        $response->assertInertia(fn (Assert $page) => $page
            ->has('burndown.actual')
            ->has('burndown.ideal')
        );
    }

    public function test_guest_cannot_access_reports(): void
    {
        $project = new Project();
        $project->name = 'Private Project';
        $project->key = 'PRIV';
        $project->save();

        $response = $this->get("/projects/{$project->key}/reports");

        $response->assertStatus(302); // Redirect to login
        $response->assertRedirect('/login');
    }
}
