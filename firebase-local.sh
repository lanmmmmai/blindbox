#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN="$PROJECT_ROOT/.tools/node-v20.20.2-darwin-arm64/bin/node"
FIREBASE_BIN="$PROJECT_ROOT/.tools/firebase-cli/node_modules/firebase-tools/lib/bin/firebase.js"

FIREBASE_CLI_DISABLE_UPDATE_CHECK=true exec "$NODE_BIN" "$FIREBASE_BIN" "$@"
