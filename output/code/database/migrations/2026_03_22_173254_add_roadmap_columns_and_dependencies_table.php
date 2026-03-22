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
            $table->date('start_date')->nullable()->after('description');
            $table->date('due_date')->nullable()->after('start_date');
            $table->index(['project_id', 'start_date', 'due_date']);
        });

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('blocked_by_id')->constrained('tasks')->onDelete('cascade');
            $table->enum('dependency_type', ['finish_to_start'])->default('finish_to_start');
            $table->timestamps();
            
            $table->unique(['task_id', 'blocked_by_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_dependencies');
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'start_date', 'due_date']);
            $table->dropColumn(['start_date', 'due_date']);
        });
    }
};