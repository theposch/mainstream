#!/bin/bash
# =============================================================================
# Mainstream — Docker Migration Runner
# =============================================================================
# Runs every SQL migration in /migrations in sorted filename order.
# Called by the `migrate` service in docker-compose.yml before the app starts.
#
# Behaviour:
#   - Uses ON_ERROR_STOP=1 so psql exits non-zero on any SQL error.
#   - "already exists" / "duplicate key" errors are treated as successful
#     no-ops (the migration was already applied).
#   - Any other error increments the failure counter; exit code 1 at the end
#     causes Docker Compose to mark the `migrate` service as failed, which
#     prevents the `mainstream` service from starting.
# =============================================================================

MIGRATION_DIR="/migrations"
errors=0

if [ -z "$(ls -A "$MIGRATION_DIR"/*.sql 2>/dev/null)" ]; then
  echo "No migration files found in $MIGRATION_DIR"
  exit 0
fi

for f in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  echo -n "  $name ... "

  output=$(psql -h db -U postgres -d postgres --set ON_ERROR_STOP=1 -f "$f" 2>&1)
  code=$?

  if [ $code -eq 0 ]; then
    echo "OK"
  elif echo "$output" | grep -qiE "(already exists|duplicate key value)"; then
    echo "SKIP (already applied)"
  else
    echo "ERROR"
    echo "$output"
    errors=$((errors + 1))
  fi
done

if [ $errors -gt 0 ]; then
  echo ""
  echo "$errors migration(s) failed — see errors above."
  exit 1
fi

echo ""
echo "All migrations applied successfully."
