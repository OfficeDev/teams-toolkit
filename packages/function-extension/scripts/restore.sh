#!/bin/bash
set -e

echo "Step set dictionary."
DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step restore."
cd ..
dotnet restore Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln
EXIT_CODE=$?

echo "##[debug] Install npm; node v12"
apt-get update && apt-get -y upgrade
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
apt-get install -y nodejs

echo "##[debug] npm -v"
npm -v

echo "##[debug] node -v"
node -v

echo "Install function core tools"
npm i -g azure-functions-core-tools@3 --unsafe-perm true --force

echo "##[debug] func -v"
func -v

popd
exit $EXIT_CODE
