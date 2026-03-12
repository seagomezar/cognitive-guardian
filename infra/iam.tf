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
