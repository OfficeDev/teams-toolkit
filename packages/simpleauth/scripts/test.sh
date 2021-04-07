#!/bin/bash
set -e
DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"
sudo rm /var/lib/dpkg/lock && sudo rm /var/lib/apt/lists/lock

chromium-browser --product-version

# Install chrome driver
sudo apt-get update && sudo apt-get install -y chromium-chromedriver

cd ..
dotnet test TeamsFxSimpleAuth.sln --filter TestCategory="P0"
popd

exit 0
