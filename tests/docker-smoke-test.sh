#!/bin/bash
set -e

CONTAINER_NAME="orbit-smoke-test"
IMAGE="${1:-orbit:test}"
TIMEOUT=60
FAILURES=0

echo "=== Orbit Docker Smoke Test ==="
echo "Image: $IMAGE"

# Start container
docker run -d --name "$CONTAINER_NAME" -p 3001:3001 \
  --pid=host \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /etc/hostname:/host/etc/hostname:ro \
  -v /:/hostfs:ro \
  "$IMAGE"

cleanup() { docker rm -f "$CONTAINER_NAME" 2>/dev/null; }
trap cleanup EXIT

# Wait for health check
elapsed=0
echo "Waiting for container to be healthy..."
until curl -sf http://localhost:3001/api/health > /dev/null 2>&1; do
  sleep 2
  elapsed=$((elapsed + 2))
  if [ $elapsed -ge $TIMEOUT ]; then
    echo "FAIL: Health check timed out after ${TIMEOUT}s"
    docker logs "$CONTAINER_NAME"
    exit 1
  fi
done
echo "PASS: Health check responded in ${elapsed}s"

# Test /api/health
if curl -sf http://localhost:3001/api/health | grep -q '"status"'; then
  echo "PASS: /api/health returns status"
else
  echo "FAIL: /api/health"
  FAILURES=$((FAILURES + 1))
fi

# Test /api/system/info
if curl -sf http://localhost:3001/api/system/info | grep -q '"hostname"'; then
  echo "PASS: /api/system/info returns hostname"
else
  echo "FAIL: /api/system/info"
  FAILURES=$((FAILURES + 1))
fi

# Test frontend is served
if curl -sf http://localhost:3001/ | grep -q '<div id="root"'; then
  echo "PASS: Frontend served at /"
else
  echo "FAIL: Frontend not served"
  FAILURES=$((FAILURES + 1))
fi

# Verify node process is running
if docker top "$CONTAINER_NAME" | grep -q node; then
  echo "PASS: Node process running"
else
  echo "FAIL: Node process not found"
  FAILURES=$((FAILURES + 1))
fi

# Report architecture
ARCH=$(docker exec "$CONTAINER_NAME" node -e "process.stdout.write(process.arch)")
echo "Container architecture: $ARCH"

echo ""
if [ $FAILURES -gt 0 ]; then
  echo "=== $FAILURES test(s) FAILED ==="
  exit 1
else
  echo "=== All tests PASSED ==="
  exit 0
fi
