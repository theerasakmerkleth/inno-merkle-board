<?php

namespace Database\Factories;

use App\Models\Board;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Board>
 */
class BoardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => \App\Models\Project::factory(),
            'name' => $this->faker->sentence(2),
            'is_default' => false,
            'order' => 0,
        ];
    }
}
