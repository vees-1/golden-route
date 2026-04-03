#!/bin/bash
# Convenience script to start GoldenRoute dev server
# Run from the frontend directory

NODE_BIN="/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"

if ! command -v node &>/dev/null; then
  mkdir -p /tmp/nodebin
  ln -sf "$NODE_BIN" /tmp/nodebin/node
  export PATH="/tmp/nodebin:$PATH"
fi

if [ ! -f /tmp/package/bin/npm-cli.js ]; then
  echo "Bootstrapping npm..."
  "$NODE_BIN" -e "
const https = require('https');
const fs = require('fs');
https.get('https://registry.npmjs.org/npm/-/npm-10.8.2.tgz', (res) => {
  const file = fs.createWriteStream('/tmp/npm.tgz');
  res.pipe(file);
  file.on('finish', () => { file.close(); require('child_process').execSync('cd /tmp && tar xzf npm.tgz'); console.log('done'); });
});
"
fi

NPM="node /tmp/package/bin/npm-cli.js"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  $NPM install --legacy-peer-deps
fi

echo "Starting GoldenRoute at http://localhost:5173"
$NPM run dev
