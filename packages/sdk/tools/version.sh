#!/bin/bash
if [ -z "$(git diff -- ../../templates)" ]; then
echo "need bump up templates version since templates don not bump up by self"
node ./tools/sync-up-version.js yes;
else 
echo "no need to bump up templates version"
node ./tools/sync-up-version.js 
fi
git add ../../templates