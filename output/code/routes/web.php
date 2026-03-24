<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardColumnController;
use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\ChecklistItemController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectStatsController;
use App\Http\Controllers\RoadmapController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ExportController;

// Auth Routes (F08)
Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'authenticate']);
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

Route::middleware('auth')->group(function () {
    
    // Core Navigation (Dashboard & Analytics)
    Route::get('/', [DashboardController::class, 'myTasks'])->name('home');
    Route::get('/analytics', [DashboardController::class, 'analytics'])->name('analytics');
    Route::get('/activity', [\App\Http\Controllers\ActivityLogController::class, 'index'])->name('activity.index');

    // Project Hub & Management (F15)
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::patch('/projects/reorder', [ProjectController::class, 'reorder']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::get('/api/projects/{project:key}/structure', [ProjectController::class, 'structure']);

    // Workspace & Task Views
    Route::get('/projects/{project_key}/boards/{board_id?}', [BoardController::class, 'show'])->name('projects.board');
    Route::get('/projects/{project_key}/roadmap', [RoadmapController::class, 'show'])->name('projects.roadmap');
    Route::get('/projects/{project_key}/reports', [ProjectStatsController::class, 'index'])->name('projects.reports');
    Route::get('/projects/{project_key}/settings', [ProjectController::class, 'edit'])->name('projects.settings');

    // User Management Routes (F07)
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store']);
    Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
    Route::patch('/users/{user}/toggle', [UserController::class, 'toggleActive']);

    // Project Member Routes (F16)
    Route::post('/projects/{project}/members', [ProjectMemberController::class, 'store']);
    Route::patch('/projects/{project}/members/{user}', [ProjectMemberController::class, 'update']);
    Route::delete('/projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy']);

    // Board & Column Management (F17, F19)
    Route::post('/projects/{project}/boards', [BoardController::class, 'store']);
    Route::patch('/projects/{project}/boards/reorder', [BoardController::class, 'reorder']);
    Route::get('/projects/{project_key}/boards/{board}/activity', [BoardController::class, 'activity']);
    Route::delete('/projects/{project}/boards/{board}', [BoardController::class, 'destroy']);

    Route::post('/boards/{board}/columns', [\App\Http\Controllers\BoardColumnController::class, 'store']);
    Route::patch('/columns/{column}', [\App\Http\Controllers\BoardColumnController::class, 'update']);
    Route::delete('/columns/{column}', [\App\Http\Controllers\BoardColumnController::class, 'destroy']);
    Route::patch('/boards/{board}/columns/reorder', [\App\Http\Controllers\BoardColumnController::class, 'reorder']);

    // Task CRUD & Operations (F13)
    Route::post('/projects/{project}/boards/{board}/tasks', [TaskController::class, 'store']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::get('/tasks/{task}/activity-logs', [TaskController::class, 'activityLogs']);
    Route::patch('/boards/{board}/tasks/reorder', [\App\Http\Controllers\TaskController::class, 'reorder']);
    Route::patch('/tasks/{id}/status', [\App\Http\Controllers\TaskController::class, 'updateStatus']);

    // Checklist Management
    Route::post('/tasks/{task}/checklists', [ChecklistController::class, 'store']);
    Route::post('/checklists/{checklist}/items', [ChecklistItemController::class, 'store']);
    Route::patch('/checklist-items/{item}', [ChecklistItemController::class, 'update']);
    Route::delete('/checklist-items/{item}', [ChecklistItemController::class, 'destroy']);

    // Attachments & Comments
    Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index']);
    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);

    // Exports
    Route::get('/projects/{project}/export', [ExportController::class, 'exportTasks']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

});
