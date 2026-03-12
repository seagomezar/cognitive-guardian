# Creates the secret resource only — the actual value must be set manually:
# echo -n "YOUR_GOOGLE_API_KEY" | gcloud secrets versions add cognitive-guardian-google-api-key \
#   --data-file=- --project=YOUR_PROJECT_ID
resource "google_secret_manager_secret" "google_api_key" {
  project   = var.project_id
  secret_id = "cognitive-guardian-google-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}
