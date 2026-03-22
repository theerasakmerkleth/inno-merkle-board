<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    private function getProjectRole(User $user, Project $project): ?string
    {
        if ($user->hasRole('Admin')) {
            return 'Manager'; // Admins have Manager privileges globally
        }

        $projectUser = $project->users()->where('user_id', $user->id)->first();

        return $projectUser ? $projectUser->pivot->project_role : null;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user, Project $project): bool
    {
        $role = $this->getProjectRole($user, $project);

        return in_array($role, ['Manager', 'Contributor']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        $role = $this->getProjectRole($user, $task->project);

        return in_array($role, ['Manager', 'Contributor']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        $role = $this->getProjectRole($user, $task->project);

        return $role === 'Manager';
    }
}
