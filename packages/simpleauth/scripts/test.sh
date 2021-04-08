#!/bin/bash
set -e
DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

# Get secret from system environment
export TEAMS_SIMPLE_AUTH_IntegrationTestSettings__AdminClientSecret=$SimpleAuthAdminClientSecret
export TEAMS_SIMPLE_AUTH_IntegrationTestSettings__TestPassword=$SimpleAuthPassword

# Install chrome driver
sudo rm /var/lib/dpkg/lock && sudo rm /var/lib/apt/lists/lock
sudo apt-get update && sudo apt-get install -y chromium-chromedriver

cd ..
dotnet test TeamsFxSimpleAuth.sln
popd

exit 0
