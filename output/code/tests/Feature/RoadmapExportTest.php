<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Board;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoadmapExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_export_project_tasks_to_excel()
    {
        $user = User::factory()->create();
        $project = Project::create(['key' => 'EXP', 'name' => 'Export Project', 'status' => 'active']);
        $project->users()->attach($user->id, ['project_role' => 'Manager']);

        $response = $this->actingAs($user)->get("/projects/{$project->id}/export");

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('Content-Disposition'), 'EXP_Tasks_'));
    }

    public function test_unauthorized_user_cannot_export_tasks()
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = Project::create(['key' => 'EXP', 'name' => 'Export Project', 'status' => 'active']);
        $project->users()->attach($user->id, ['project_role' => 'Manager']);

        // Try to export as unauthorized user
        $response = $this->actingAs($otherUser)->get("/projects/{$project->id}/export");

        $response->assertStatus(403);
    }
}
