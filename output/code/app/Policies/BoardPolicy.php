<?php

namespace App\Policies;

use App\Models\Board;
use App\Models\Project;
use App\Models\User;

class BoardPolicy
{
    private function getProjectRole(User $user, Board $board): ?string
    {
        if ($user->hasRole('Admin')) {
            return 'Manager';
        }
        $projectUser = $board->project->users()->where('user_id', $user->id)->first();

        return $projectUser ? $projectUser->pivot->project_role : null;
    }

    public function create(User $user, Project $project): bool
    {
        if ($user->hasRole('Admin')) {
            return true;
        }
        $projectUser = $project->users()->where('user_id', $user->id)->first();

        return ($projectUser ? $projectUser->pivot->project_role : null) === 'Manager';
    }

    public function delete(User $user, Board $board): bool
    {
        return $this->getProjectRole($user, $board) === 'Manager';
    }
}
