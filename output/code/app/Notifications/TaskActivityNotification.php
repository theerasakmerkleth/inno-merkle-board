<?php

namespace App\Notifications;

use App\Models\ActivityLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $activityLog;

    /**
     * Create a new notification instance.
     */
    public function __construct(ActivityLog $activityLog)
    {
        $this->activityLog = $activityLog;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database']; // Can add 'broadcast' here if Laravel Echo is fully configured
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $task = $this->activityLog->task;
        $causer = $this->activityLog->user;
        
        $message = "Unknown activity";
        if ($this->activityLog->action === 'assigned') {
            if ($this->activityLog->new_values['assignee_id'] == $notifiable->id) {
                $message = "**{$causer->name}** assigned you to **[{$task->formatted_id}] {$task->title}**";
            } else {
                $message = "**{$causer->name}** updated assignment on **[{$task->formatted_id}] {$task->title}**";
            }
        } elseif ($this->activityLog->action === 'commented') {
            $message = "**{$causer->name}** commented on **[{$task->formatted_id}] {$task->title}**";
        } elseif ($this->activityLog->action === 'status_changed') {
            $message = "**{$causer->name}** changed status of **[{$task->formatted_id}] {$task->title}** to **{$task->status}**";
        }

        return [
            'activity_log_id' => $this->activityLog->id,
            'task_id' => $task->id,
            'project_key' => $task->project->key ?? '',
            'message' => $message,
            'causer_name' => $causer ? $causer->name : 'System',
            'causer_avatar' => $causer ? $causer->avatar_url : null,
        ];
    }
}
