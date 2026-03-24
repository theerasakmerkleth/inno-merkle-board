<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_access_activity_log_page()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->get('/activity');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Activity/Index'));
    }

    public function test_activity_log_filters_by_user_involvement()
    {
        // Seed roles first
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $user = User::factory()->create();
        $user->assignRole('Developer');
        
        $project = Project::create(['key' => 'PROJ', 'name' => 'Visible Project', 'status' => 'active']);
        $privateProject = Project::create(['key' => 'PRIV', 'name' => 'Hidden Project', 'status' => 'active']);
        
        // User is only in 'Visible Project'
        $project->users()->attach($user->id, ['project_role' => 'Contributor']);

        $board = $project->boards()->create(['name' => 'Main']);
        $privateBoard = $privateProject->boards()->create(['name' => 'Secret']);

        $task = Task::create([
            'project_id' => $project->id,
            'board_id' => $board->id,
            'title' => 'Visible Task',
            'status' => 'todo',
            'priority' => 'medium'
        ]);

        $hiddenTask = Task::create([
            'project_id' => $privateProject->id,
            'board_id' => $privateBoard->id,
            'title' => 'Hidden Task',
            'status' => 'todo',
            'priority' => 'medium'
        ]);

        // Create Logs
        ActivityLog::create([
            'task_id' => $task->id,
            'user_id' => $admin->id,
            'action' => 'created',
            'description' => 'Admin created **Visible Task**'
        ]);

        ActivityLog::create([
            'task_id' => $hiddenTask->id,
            'user_id' => $admin->id,
            'action' => 'created',
            'description' => 'Admin created **Hidden Task**'
        ]);

        // Test as regular user
        $response = $this->actingAs($user)->get('/activity');
        
        $response->assertStatus(200);
        $response->assertSee('Visible Task');
        $response->assertDontSee('Hidden Task');
    }
}
