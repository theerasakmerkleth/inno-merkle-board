<?php

use App\Http\Controllers\Api\AgentTaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // ---------------------------------------------------------
    // AI Agent Endpoints (F02)
    // ---------------------------------------------------------
    Route::get('/v1/agent/tasks', [AgentTaskController::class, 'index']);
    Route::post('/v1/agent/tasks/{id}/submit', [AgentTaskController::class, 'submit']);

    // Returns current authenticated agent details
    Route::get('/v1/agent/me', function (Request $request) {
        return $request->user();
    });
});

// ---------------------------------------------------------
// Git Integration Webhooks (F03)
// ---------------------------------------------------------
// Requires custom signature verification middleware in production
Route::post('/v1/webhooks/git', function (Request $request) {
    // Controller logic to process webhook and dispatch Redis Queue Job
    // App\Jobs\ProcessGitWebhook::dispatch($request->all());
    return response()->json(['status' => 'queued'], 202);
});
