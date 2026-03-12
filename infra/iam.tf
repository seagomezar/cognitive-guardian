# Service account for Cloud Run runtime
resource "google_service_account" "cloud_run_sa" {
  project      = var.project_id
  account_id   = "cognitive-guardian-run"
  display_name = "Cognitive Guardian Cloud Run SA"
}

# Service account for GitHub Actions CI/CD
resource "google_service_account" "cicd_sa" {
  project      = var.project_id
  account_id   = "cognitive-guardian-cicd"
  display_name = "Cognitive Guardian CI/CD SA"
}

# Cloud Run SA: read secrets
resource "google_secret_manager_secret_iam_member" "run_sa_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.google_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# CI/CD SA: manage Cloud Run
resource "google_project_iam_member" "cicd_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: push images to Artifact Registry
resource "google_project_iam_member" "cicd_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: act as the Cloud Run service account
resource "google_service_account_iam_member" "cicd_sa_user" {
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: read/write Terraform state in GCS
resource "google_project_iam_member" "cicd_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: enable/read APIs (needed for google_project_service resources)
resource "google_project_iam_member" "cicd_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: manage project IAM bindings (needed for google_project_iam_member)
resource "google_project_iam_member" "cicd_iam_admin" {
  project = var.project_id
  role    = "roles/resourcemanager.projectIamAdmin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: manage service accounts (needed to read/create SAs in Terraform)
resource "google_project_iam_member" "cicd_sa_admin" {
  project = var.project_id
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: manage secrets (needed for google_secret_manager_secret resources)
resource "google_project_iam_member" "cicd_secretmanager_admin" {
  project = var.project_id
  role    = "roles/secretmanager.admin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}

# CI/CD SA: manage Artifact Registry (needed for google_artifact_registry_repository)
resource "google_project_iam_member" "cicd_ar_admin" {
  project = var.project_id
  role    = "roles/artifactregistry.admin"
  member  = "serviceAccount:${google_service_account.cicd_sa.email}"
}
