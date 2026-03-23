#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables (you can override these via environment variables)
GCP_PROJECT_ID=${GCP_PROJECT_ID:-"merkle-lab-agentic"}
GCP_REGION=${GCP_REGION:-"asia-southeast1"}
IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/taskflow-app:latest"

echo "========================================================"
echo "🚀 TaskFlow AI Deployment Script (Lead DevOps & SRE)"
echo "========================================================"
echo "Target Project: $GCP_PROJECT_ID"
echo "Target Region:  $GCP_REGION"
echo "Target Image:   $IMAGE_NAME"
echo "--------------------------------------------------------"

# 1. Authenticate Docker with GCP
echo -e "\n[1/4] 🔑 Configuring Docker authentication for GCP..."
gcloud auth configure-docker --quiet

# 2. Build the Docker Image
echo -e "\n[2/4] 🐳 Building the Docker image (Multi-stage: Node.js & PHP)..."
cd output/code
# Ensure the docker directory exists and has the necessary config files
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found in output/code/"
    exit 1
fi
docker build -t $IMAGE_NAME .
cd ../..

# 3. Push the Docker Image to GCR
echo -e "\n[3/4] ☁️ Pushing the Docker image to Google Container Registry..."
docker push $IMAGE_NAME

# 4. Provision Infrastructure with Terraform
echo -e "\n[4/4] 🏗️ Applying Infrastructure as Code via Terraform..."
cd output/infra

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "❌ Error: terraform.tfvars not found in output/infra/"
    echo "Please create one based on terraform.tfvars.example before deploying."
    exit 1
fi

echo "Initializing Terraform..."
terraform init

echo "Planning infrastructure changes..."
terraform plan -out=tfplan

echo "Applying infrastructure changes..."
terraform apply -auto-approve "tfplan"

echo -e "\n========================================================"
echo "✅ DEPLOYMENT PIPELINE COMPLETE!"
echo "If Terraform succeeded, your Cloud Run service is now live."
echo "Check the 'application_url' output above for the live link."
echo "========================================================"
