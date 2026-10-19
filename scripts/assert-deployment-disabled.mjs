// Checkpoints on this branch are source backups, never publishing requests.
// Cloudflare Builds/Pages inject these variables before dependency installation.
if (
  process.env.WORKERS_CI ||
  process.env.WORKERS_CI_BUILD_UUID ||
  process.env.CF_PAGES
) {
  console.error(
    "Deployment disabled: this branch is authorized for development checkpoints only.",
  );
  process.exit(1);
}
