resource "google_artifact_registry_repository" "cognitive_guardian" {
  project       = var.project_id
  location      = var.region
  repository_id = "cognitive-guardian"
  description   = "Docker images for Cognitive Guardian backend"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}
