#!/bin/bash

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step build."
cd ..

GETLINE="$(grep "<Version>" src/Microsoft.Azure.WebJobs.Extensions.TeamsFx.csproj)"
version_line=$GETLINE
version_suffix=${version_line#*>}
version=${version_suffix%<*}

version_update=$version-${CDP_PATCH_NUMBER:1:8}
echo $version
echo $version_update

dotnet pack -c Release Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln -p:PackageVersion=$version_update --output src/bin/Release
EXIT_CODE=$?

popd
exit $EXIT_CODE

