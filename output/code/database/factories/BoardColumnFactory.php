<?php

namespace Database\Factories;

use App\Models\BoardColumn;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BoardColumn>
 */
class BoardColumnFactory extends Factory
{
    public function definition(): array
    {
        return [
            'board_id' => \App\Models\Board::factory(),
            'title' => $this->faker->word(),
            'order' => 0,
        ];
    }
}
