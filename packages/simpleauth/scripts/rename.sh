#!/bin/bash
set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step rename."
cd ..

GETLINE="$(grep "<Version>" src/TeamsFxSimpleAuth/TeamsFxSimpleAuth.csproj)"
version_line=$GETLINE
version_suffix=${version_line#*>}
version=${version_suffix%<*}


sed -i "s/__VERSION__/$version/g" ./deploy/Ev2/ServiceGroupRoot/Parameters/StorageUpload.RolloutParameters.json
sed -i "s/__VERSION__/$version/g" ./deploy/Ev2/ServiceGroupRoot/Parameters/StorageUpload_release.RolloutParameters.json
sed -i "s/__VERSION__/$version-$CDP_PATCH_NUMBER/g" ./deploy/Ev2/ServiceGroupRoot/Parameters/StorageUpload_dev.RolloutParameters.json

popd
exit 0