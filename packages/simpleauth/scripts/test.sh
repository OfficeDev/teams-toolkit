#!/bin/bash
set -e
DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"
# Get secret from system environment
export TEAMS_SIMPLE_AUTH_IntegrationTestSettings__AdminClientSecret=$SimpleAuthAdminClientSecret
export TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestPassword=$SimpleAuthPassword

# Install chrome driver
apt-get update && apt-get install -y chromium-chromedriver

cd ..
dotnet test TeamsFxSimpleAuth.sln --filter TestCategory="P0"
popd

exit 0
