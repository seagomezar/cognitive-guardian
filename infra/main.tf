terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    # bucket is passed via -backend-config="bucket=..." at init time
    prefix = "terraform/cognitive-guardian"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
