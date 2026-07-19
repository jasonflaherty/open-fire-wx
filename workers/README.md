# Workers (future)

Placeholder for scheduled ingest, caching, and transform jobs.

MVP data refresh runs as a GitHub Action (`refresh-data.yml`, daily) instead of a long-running worker.
Historical versions of the large JSON dumps are pruned every ~3 days (`prune-data-history.yml`) so the repo stays small.
