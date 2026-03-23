# Terraform Configuration for TaskFlow AI
# Adheres to Clean Architecture - Infrastructure Layer

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

variable "gcp_project_id" {
  type        = string
  description = "The GCP Project ID"
  default     = "merkle-taskflow-ai-prod"
}

variable "gcp_region" {
  type        = string
  description = "The GCP Region"
  default     = "asia-southeast1" # Singapore
}

variable "db_password" {
  type        = string
  description = "The database password"
  sensitive   = true
}

# ------------------------------------------------------------------------------
# 1. Cloud SQL for PostgreSQL (Primary Datastore)
# ------------------------------------------------------------------------------
resource "google_sql_database_instance" "postgres_primary" {
  name             = "taskflow-db-primary"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  settings {
    tier              = "db-f1-micro"      # Smallest shared-core instance for Dev/Test
    availability_type = "ZONAL"            # Single zone deployment to reduce costs
    
    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }
    
    ip_configuration {
      ipv4_enabled = true # In a strict prod environment, prefer private IP only
      require_ssl  = true
    }
  }
}

resource "google_sql_database" "taskflow_db" {
  name     = "taskflow_production"
  instance = google_sql_database_instance.postgres_primary.name
}

resource "google_sql_user" "db_app_user" {
  name     = "taskflow_laravel"
  instance = google_sql_database_instance.postgres_primary.name
  password = var.db_password
}

# ------------------------------------------------------------------------------
# 2. Cloud Memorystore for Redis (Cache & Queues)
# ------------------------------------------------------------------------------
resource "google_redis_instance" "taskflow_redis" {
  name           = "taskflow-redis-ha"
  memory_size_gb = 2
  region         = var.gcp_region
  redis_version  = "REDIS_7_0"
  tier           = "STANDARD_HA"
  
  display_name = "TaskFlow AI Redis Cluster"
}

# ------------------------------------------------------------------------------
# 3. Cloud Run (Serverless Application Hosting)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "taskflow_app" {
  name     = "taskflow-web-api"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 1  # Mitigate cold starts for PMs and Agents
      max_instance_count = 10 # Cap costs while handling traffic spikes
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres_primary.connection_name]
      }
    }

    containers {
      image = "gcr.io/${var.gcp_project_id}/taskflow-app:latest" # Deployed via CI

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      # Environment Variables mapped from managed infrastructure
      env {
        name  = "APP_ENV"
        value = "production"
      }
      env {
        name  = "APP_NAME"
        value = "MerkleBoard"
      }
      env {
        name  = "DB_CONNECTION"
        value = "pgsql"
      }
      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.postgres_primary.connection_name}"
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_DATABASE"
        value = google_sql_database.taskflow_db.name
      }
      env {
        name  = "DB_USERNAME"
        value = google_sql_user.db_app_user.name
      }
      env {
        name  = "DB_PASSWORD"
        value = var.db_password
      }
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.taskflow_redis.host
      }
      env {
        name  = "QUEUE_CONNECTION"
        value = "redis"
      }
      env {
        name  = "APP_KEY"
        value = "base64:v1V/q6w48+0i3FvB+4qYc5KqP0+P+K/xYv9XkE/7c7k="
      }
      env {
        name  = "DEPLOYMENT_TRIGGER"
        value = "force_update_for_route_binding_404_fix"
      }
    }
  }
}

# Expose the Cloud Run service to the public internet
resource "google_cloud_run_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.taskflow_app.location
  project  = google_cloud_run_v2_service.taskflow_app.project
  service  = google_cloud_run_v2_service.taskflow_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------
output "application_url" {
  value       = google_cloud_run_v2_service.taskflow_app.uri
  description = "The public URL of the TaskFlow AI application."
}