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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            // $table->foreignId('project_id')->constrained(); // Simplified for MVP
            $table->string('title');
            $table->text('description')->nullable();

            // F01: Core Kanban Engine Statuses
            $table->string('status')->default('todo');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');

            // F02: AI Agent & Human Assignment
            $table->foreignId('assignee_id')->nullable(); // Foreign key to users/agents table
            $table->boolean('is_ai_assigned')->default(false);

            // F02: Human-in-the-loop Toggle
            $table->boolean('requires_human_review')->default(true);

            $table->timestamps();
        });

        Schema::create('ai_agent_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->onDelete('cascade');
            $table->foreignId('agent_id'); // Foreign key to users/agents table

            // Complex Logic: Storing unstructured AI output
            $table->jsonb('payload_data');

            $table->enum('review_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable(); // Human who reviewed the AI's work

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_agent_submissions');
        Schema::dropIfExists('tasks');
    }
};
