#!/bin/bash
set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step Publish."
cd ../src/bin/Release
files=$(ls $path)
for filename in $files
do
  if [ "${filename##*.}"x = "nupkg"x ];then
    name=${filename%.*}
    sed -i "s/__NUPKG_NAME__/$name/g" ../../../Ev2/ServiceGroupRoot/Parameters/StorageUpload.RolloutParameters.json
    sed -i "s/__NUPKG_NAME__/$name/g" ../../../Ev2/ServiceGroupRoot/Parameters/StorageUpload_release.RolloutParameters.json
    sed -i "s/__NUPKG_NAME__/$name-${CDP_PATCH_NUMBER:1:8}/g" ../../../Ev2/ServiceGroupRoot/Parameters/StorageUpload_dev.RolloutParameters.json
    break
  fi
done

popd
exit 0