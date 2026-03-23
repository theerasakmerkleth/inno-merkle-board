<?php

namespace App\Providers;

use App\Models\Task;
use App\Models\ActivityLog;
use App\Observers\TaskObserver;
use App\Observers\ActivityLogObserver;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Task::observe(TaskObserver::class);
        ActivityLog::observe(ActivityLogObserver::class);

        if (env('APP_ENV') === 'production') {
            URL::forceScheme('https');
        }
    }
}
