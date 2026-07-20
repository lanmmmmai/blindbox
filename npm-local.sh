#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_DIR="$PROJECT_ROOT/.tools/node-v20.20.2-darwin-arm64"

PATH="$NODE_DIR/bin:/usr/bin:/bin" exec "$NODE_DIR/bin/node" "$NODE_DIR/lib/node_modules/npm/bin/npm-cli.js" "$@"
