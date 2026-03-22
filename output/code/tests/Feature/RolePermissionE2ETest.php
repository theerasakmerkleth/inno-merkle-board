<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskTransition;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionE2ETest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);

        // Seed roles and permissions
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createUserWithRole($name, $email, $role)
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('password'),
        ]);
        $user->assignRole($role);

        return $user;
    }

    public function test_unauthenticated_user_cannot_access_dashboard()
    {
        $response = $this->get('/');
        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_access_dashboard()
    {
        $dev = $this->createUserWithRole('Dev', 'dev@merkle.com', 'Developer');
        $project = Project::create(['key' => 'TEST', 'name' => 'Test Project', 'status' => 'active']);
        $project->users()->attach($dev->id, ['project_role' => 'Contributor']);
        $board = Board::create(['project_id' => $project->id, 'name' => 'Main', 'is_default' => true]);

        // The root route now returns the My Tasks dashboard
        $response = $this->actingAs($dev)->get('/');
        $response->assertStatus(200);

        $dashboardResponse = $this->actingAs($dev)->get(route('projects.board', ['project_key' => 'TEST']));
        $dashboardResponse->assertStatus(200);
    }

    public function test_developer_cannot_move_task_to_done()
    {
        $dev = $this->createUserWithRole('Dev', 'dev@merkle.com', 'Developer');
        $project = Project::create(['key' => 'TST', 'name' => 'Test Project', 'status' => 'active']);
        $board = Board::create(['project_id' => $project->id, 'name' => 'Main', 'is_default' => true]);
        
        $colInProgress = BoardColumn::create(['board_id' => $board->id, 'title' => 'In Progress', 'order' => 0]);
        $colDone = BoardColumn::create(['board_id' => $board->id, 'title' => 'Done', 'order' => 1]);

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $colInProgress->id,
            'title' => 'Test Task',
            'status' => 'in_progress',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($dev)->patch('/tasks/'.$task->id.'/status', [
            'board_column_id' => $colDone->id,
        ]);

        $response->assertStatus(403);
        $this->assertEquals('in_progress', $task->fresh()->status);
    }

    public function test_pm_can_move_task_to_done_and_telemetry_is_logged()
    {
        $pm = $this->createUserWithRole('PM', 'pm@merkle.com', 'Project Manager');
        $project = Project::create(['key' => 'TST', 'name' => 'Test Project', 'status' => 'active']);
        $board = Board::create(['project_id' => $project->id, 'name' => 'Main', 'is_default' => true]);
        
        $colQA = BoardColumn::create(['board_id' => $board->id, 'title' => 'QA Ready', 'order' => 0]);
        $colDone = BoardColumn::create(['board_id' => $board->id, 'title' => 'Done', 'order' => 1]);

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $colQA->id,
            'title' => 'Test Task',
            'status' => 'qa ready',
            'priority' => 'medium',
        ]);

        // Clear creation transition
        TaskTransition::truncate();

        $response = $this->actingAs($pm)->patch('/tasks/'.$task->id.'/status', [
            'board_column_id' => $colDone->id,
        ]);

        $response->assertRedirect();

        // Assert state changed
        $this->assertEquals('done', $task->fresh()->status);

        // Assert Telemetry
        $transition = TaskTransition::first();
        $this->assertNotNull($transition);
        $this->assertEquals('qa ready', $transition->from_status);
        $this->assertEquals('done', $transition->to_status);
        $this->assertEquals($pm->id, $transition->user_id);
    }

    public function test_developer_can_move_task_to_qa_ready()
    {
        $dev = $this->createUserWithRole('Dev', 'dev@merkle.com', 'Developer');
        $project = Project::create(['key' => 'TST', 'name' => 'Test Project', 'status' => 'active']);
        $board = Board::create(['project_id' => $project->id, 'name' => 'Main', 'is_default' => true]);
        
        $colInProgress = BoardColumn::create(['board_id' => $board->id, 'title' => 'In Progress', 'order' => 0]);
        $colQA = BoardColumn::create(['board_id' => $board->id, 'title' => 'QA Ready', 'order' => 1]);

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'board_column_id' => $colInProgress->id,
            'title' => 'Test Task',
            'status' => 'in_progress',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($dev)->patch('/tasks/'.$task->id.'/status', [
            'board_column_id' => $colQA->id,
        ]);

        $response->assertRedirect();
        $this->assertEquals('qa ready', $task->fresh()->status);
    }

    public function test_disabled_user_cannot_login()
    {
        $dev = User::create([
            'name' => 'Bad Dev',
            'email' => 'bad@merkle.com',
            'password' => bcrypt('password'),
            'is_active' => false,
        ]);

        $response = $this->post('/login', [
            'email' => 'bad@merkle.com',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
