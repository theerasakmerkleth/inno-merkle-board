<?php

namespace Database\Factories;

use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => \App\Models\Project::factory(),
            'board_id' => \App\Models\Board::factory(),
            'board_column_id' => \App\Models\BoardColumn::factory(),
            'title' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high']),
            'status' => 'todo',
            'project_task_number' => $this->faker->unique()->numberBetween(1, 1000),
        ];
    }
}
