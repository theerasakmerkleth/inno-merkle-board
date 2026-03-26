<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AIAssistantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'DatabaseSeeder']);
    }

    private function setupProjectAndUser(string $globalRole = 'User', string $projectRole = 'Manager')
    {
        $user = User::factory()->create();
        if ($globalRole !== 'User') {
            $user->assignRole($globalRole);
        }

        $project = Project::create([
            'name' => 'AI Test Project',
            'key' => 'AITEST',
            'status' => 'active',
            'business_domain' => 'Engineering',
            'ai_model' => 'gemini-1.5-pro'
        ]);

        $project->users()->attach($user->id, ['project_role' => $projectRole]);

        $board = Board::create([
            'project_id' => $project->id,
            'name' => 'Main Board',
            'is_default' => true
        ]);

        BoardColumn::create([
            'board_id' => $board->id,
            'title' => 'To Do',
            'order' => 1
        ]);

        return [$user, $project, $board];
    }

    public function test_authorized_user_can_analyze_requirements()
    {
        [$user, $project] = $this->setupProjectAndUser();

        $response = $this->actingAs($user)
            ->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class)
            ->postJson("/projects/{$project->id}/ai/analyze", [
                'prompt' => 'We need a new landing page for the AI campaign.'
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_id',
                'model_used',
                'summary',
                'suggested_tasks',
                'analysis_notes'
            ]);
    }

    public function test_unauthorized_user_cannot_analyze_requirements()
    {
        $unauthorizedUser = User::factory()->create();
        [, $project] = $this->setupProjectAndUser();

        $response = $this->actingAs($unauthorizedUser)
            ->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class)
            ->postJson("/projects/{$project->id}/ai/analyze", [
                'prompt' => 'Some prompt'
            ]);

        $response->assertStatus(403);
    }

    public function test_authorized_user_can_get_planning_insights()
    {
        [$user, $project] = $this->setupProjectAndUser();

        $response = $this->actingAs($user)
            ->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class)
            ->postJson("/projects/{$project->id}/ai/auto-plan");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'risk_level',
                'analysis' => [
                    'active_members',
                    'overloaded_count',
                    'at_risk_tasks'
                ],
                'suggestions'
            ]);
    }

    public function test_authorized_user_can_commit_ai_suggestions()
    {
        [$user, $project] = $this->setupProjectAndUser();

        $suggestions = [
            ['title' => 'Task 1', 'description' => 'Desc 1', 'priority' => 'high'],
            ['title' => 'Task 2', 'description' => 'Desc 2', 'priority' => 'medium']
        ];

        $response = $this->actingAs($user)
            ->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class)
            ->postJson("/projects/{$project->id}/ai/commit", [
                'tasks' => $suggestions
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('tasks', ['title' => 'Task 1', 'project_id' => $project->id, 'is_ai_assigned' => true]);
        $this->assertDatabaseHas('tasks', ['title' => 'Task 2', 'project_id' => $project->id, 'is_ai_assigned' => true]);
    }
}
