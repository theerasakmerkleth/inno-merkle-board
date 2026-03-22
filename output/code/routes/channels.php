<?php

use App\Models\Project;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('project.{projectId}', function ($user, $projectId) {
    if ($user->hasRole('Admin')) {
        return true;
    }

    $project = Project::find($projectId);

    return $project && $project->users->contains($user->id);
});
