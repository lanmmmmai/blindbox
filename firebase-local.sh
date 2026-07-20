#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_DIR="$PROJECT_ROOT/.tools/node-v22.23.1-darwin-arm64"
NODE_BIN="$NODE_DIR/bin/node"
FIREBASE_BIN="$PROJECT_ROOT/.tools/firebase-cli/node_modules/firebase-tools/lib/bin/firebase.js"

# Firebase CLI starts child processes through `/usr/bin/env node` and invokes
# npm while discovering Functions. Keep the project-local toolchain visible to
# those child processes as well as to the CLI itself.
PATH="$NODE_DIR/bin:/usr/local/bin:/usr/bin:/bin" \
FIREBASE_CLI_DISABLE_UPDATE_CHECK=true \
exec "$NODE_BIN" "$FIREBASE_BIN" "$@"
