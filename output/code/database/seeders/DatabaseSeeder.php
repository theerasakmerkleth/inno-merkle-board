<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        // Create Admin
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@merkle.com',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $admin->assignRole('Admin');

        // Create PM
        $pm = User::create([
            'name' => 'Project Manager',
            'email' => 'pm@merkle.com',
            'password' => bcrypt('password'),
        ]);
        $pm->assignRole('Project Manager');

        // Create Developer
        $dev = User::create([
            'name' => 'Senior Dev',
            'email' => 'dev@merkle.com',
            'password' => bcrypt('password'),
        ]);
        $dev->assignRole('Developer');

        // Create QA
        $qa = User::create([
            'name' => 'QA Engineer',
            'email' => 'qa@merkle.com',
            'password' => bcrypt('password'),
        ]);
        $qa->assignRole('QA');

        // Create Agent
        $agent = User::create([
            'name' => 'AI Worker Bot',
            'email' => 'agent@merkle.com',
            'password' => bcrypt('password'),
        ]);
        $agent->assignRole('AI Agent');

        // Create Project 1
        $project1 = Project::create([
            'key' => 'CORE',
            'name' => 'TaskFlow Core',
            'status' => 'active',
        ]);

        $board1 = Board::create([
            'project_id' => $project1->id,
            'name' => 'Sprint 1',
            'is_default' => true,
            'order' => 0,
        ]);

        $board2 = Board::create([
            'project_id' => $project1->id,
            'name' => 'Backlog',
            'is_default' => false,
            'order' => 1,
        ]);

        // Assign Project Roles
        $project1->users()->attach($pm->id, ['project_role' => 'Manager']);
        $project1->users()->attach($dev->id, ['project_role' => 'Contributor']);
        $project1->users()->attach($qa->id, ['project_role' => 'Contributor']);
        $project1->users()->attach($agent->id, ['project_role' => 'Contributor']);

        // Create Tasks for Project 1
        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board1->id,
            'title' => 'Design API Spec',
            'status' => 'todo',
            'priority' => 'high',
            'assignee_id' => $dev->id,
            'start_date' => now()->format('Y-m-d'),
            'due_date' => now()->addDays(2)->format('Y-m-d'),
        ]);

        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board1->id,
            'title' => 'Implement Auth',
            'status' => 'in_progress',
            'priority' => 'medium',
            'assignee_id' => $dev->id,
            'start_date' => now()->addDays(3)->format('Y-m-d'),
            'due_date' => now()->addDays(5)->format('Y-m-d'),
        ]);

        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board1->id,
            'title' => 'Code Review (Agent)',
            'status' => 'awaiting_review',
            'priority' => 'low',
            'assignee_id' => $agent->id,
            'is_ai_assigned' => true,
            'start_date' => now()->addDays(6)->format('Y-m-d'),
            'due_date' => now()->addDays(7)->format('Y-m-d'),
        ]);

        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board1->id,
            'title' => 'QA Testing',
            'status' => 'qa_ready',
            'priority' => 'high',
            'assignee_id' => $qa->id,
            'start_date' => now()->addDays(8)->format('Y-m-d'),
            'due_date' => now()->addDays(10)->format('Y-m-d'),
        ]);

        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board1->id,
            'title' => 'Initial Setup',
            'status' => 'done',
            'priority' => 'medium',
            'assignee_id' => $pm->id,
            'start_date' => now()->subDays(5)->format('Y-m-d'),
            'due_date' => now()->subDays(3)->format('Y-m-d'),
        ]);

        Task::create([
            'project_id' => $project1->id,
            'board_id' => $board2->id,
            'title' => 'Future UI Redesign',
            'status' => 'todo',
            'priority' => 'low',
            'assignee_id' => null,
        ]);

        // Create Project 2
        $project2 = Project::create([
            'key' => 'MKT',
            'name' => 'Marketing Campaign',
            'status' => 'active',
        ]);

        $project2->users()->attach($pm->id, ['project_role' => 'Manager']);

        $mktBoard = Board::create([
            'project_id' => $project2->id,
            'name' => 'Campaign Q3',
            'is_default' => true,
        ]);

        Task::create([
            'project_id' => $project2->id,
            'board_id' => $mktBoard->id,
            'title' => 'Draft Blog Post',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => $pm->id,
        ]);
    }
}
