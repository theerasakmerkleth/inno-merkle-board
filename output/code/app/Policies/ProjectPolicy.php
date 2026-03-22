<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    private function getProjectRole(User $user, Project $project): ?string
    {
        if ($user->hasRole('Admin')) {
            return 'Manager';
        }
        $projectUser = $project->users()->where('user_id', $user->id)->first();

        return $projectUser ? $projectUser->pivot->project_role : null;
    }

    public function view(User $user, Project $project): bool
    {
        return $this->getProjectRole($user, $project) !== null;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_projects') || $user->hasRole('Admin');
    }

    public function update(User $user, Project $project): bool
    {
        return $this->getProjectRole($user, $project) === 'Manager';
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->getProjectRole($user, $project) === 'Manager';
    }
}
