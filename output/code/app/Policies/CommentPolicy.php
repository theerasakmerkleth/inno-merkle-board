<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class CommentPolicy
{
    private function getProjectRole(User $user, Project $project): ?string
    {
        if ($user->hasRole('Admin')) {
            return 'Manager';
        }

        $projectUser = $project->users()->where('user_id', $user->id)->first();

        return $projectUser ? $projectUser->pivot->project_role : null;
    }

    public function create(User $user, Task $task): bool
    {
        $role = $this->getProjectRole($user, $task->project);

        return in_array($role, ['Manager', 'Contributor']);
    }
}
