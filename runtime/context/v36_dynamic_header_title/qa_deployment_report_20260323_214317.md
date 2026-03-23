# Role: Senior Cloud DevOps Engineer & Terraform Expert

## 🚀 Deployment Report: Cloud SQL Unix Socket Fix (Port 3306 vs 5432)
**Date:** 2026-03-23 21:43:17

### Overview
This report logs the systematic diagnosis and resolution of a critical deployment blocker where the Cloud Run container repeatedly crashed with an Error 500. The underlying issue prevented the containerized Laravel application from connecting to the managed Cloud SQL PostgreSQL instance to execute necessary database migrations during boot.

### 1. Issue Triage & Root Cause Analysis
*   **Error Reported:** `Cloud SQL instance "merkle-lab-agentic:asia-southeast1:taskflow-db-primary/.s.PGSQL.3306" is not reachable.`
*   **Symptom:** Cloud Run instances failed to start within the allocated timeout (Error Code 9) because `entrypoint.sh` runs `php artisan migrate --force` synchronously before booting Nginx/PHP-FPM. If the DB connection fails, the script exits or hangs.
*   **Investigation:** 
    *   The error string indicated that PostgreSQL was trying to connect to a Unix socket ending in `.3306`.
    *   Since PostgreSQL defaults to port `5432`, the presence of port `3306` (the MySQL default) indicated a configuration leak.
    *   Although the `.env` file was excluded from the build context via `.gitignore`, cloud-native environments (like Cloud Run or linked containers) can sometimes inject generic `DB_PORT` TCP values or Laravel might fall back to `3306` if it incorrectly resolves the driver config fallback.
    *   Because the Cloud SQL volume mount injects the Unix socket as `/cloudsql/{connection_name}/.s.PGSQL.5432`, the mismatched port configuration forced the PDO driver to look for a non-existent socket.

### 2. Resolution Execution (Terraform) 🟢
*   **Action Taken:** Modified `output/infra/main.tf` to explicitly inject the correct PostgreSQL port into the Cloud Run container environment.
    ```hcl
      env {
        name  = "DB_PORT"
        value = "5432"
      }
    ```
*   **Result:** By strictly enforcing `DB_PORT=5432` alongside `DB_CONNECTION=pgsql` and the `DB_HOST` Unix socket path, the PHP PDO driver successfully constructed the correct DSN connection string.

### 3. Pipeline Automation (deploy.sh) 🟢
The automated `./deploy.sh` script successfully applied the updated Terraform plan:
1.  Analyzed the infrastructure drift.
2.  Applied the single change (updating the container environment variables) to the active `taskflow-web-api` Cloud Run service.
3.  The new revision started immediately. `entrypoint.sh` executed the database migrations flawlessly, and the `/up` health check verified the service is fully operational.

### Final Status
**✅ DEPLOYMENT SUCCESSFUL.** The Cloud Run service is now actively serving traffic and communicating securely with the Cloud SQL PostgreSQL instance via native Unix Sockets. 

*Live URL:* `https://taskflow-web-api-7p5hcuo7ua-as.a.run.app`