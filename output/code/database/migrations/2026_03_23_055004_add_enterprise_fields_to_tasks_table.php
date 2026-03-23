<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('story_points', 8, 2)->nullable();
            $table->json('labels')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['reporter_id']);
            $table->dropColumn(['reporter_id', 'story_points', 'labels']);
        });
    }
};
