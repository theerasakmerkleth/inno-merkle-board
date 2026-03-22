<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Nullable because tasks might not be on a board yet, though MVP assigns them
            $table->foreignId('board_id')->nullable()->constrained()->onDelete('set null')->after('project_id');
            $table->unsignedInteger('project_task_number')->nullable()->after('board_id');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['board_id']);
            $table->dropColumn(['board_id', 'project_task_number']);
        });
    }
};
