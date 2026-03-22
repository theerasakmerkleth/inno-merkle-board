<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // For SQLite, modifying ENUMs is tricky. Since we are in local MVP,
        // we recreate the column using a raw statement or string if needed.
        // Actually, just changing it to string is safest for cross-compatibility in MVP without doctrine/dbal.
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('cascade');
            // Adding qa_ready to the possible string values implicitly.
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['project_id']);
            $table->dropColumn('project_id');
        });
    }
};
