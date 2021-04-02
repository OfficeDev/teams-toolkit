#!/bin/bash
set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

# CDP_FILE_VERSION_NUMERIC: version number, in the format of Major.Minor.nnnnn.rrrr.
# Major, Minor: Defined in pipeline.user.linux.yml
# nnnn: the number of days elapsed since the CDPx epoch date of January 1, 2017
# rrrr: a monotonically increasing unique build number for each day.
echo $CDP_FILE_VERSION_NUMERIC

echo "Step publish."
cd ..

GETLINE="$(grep "<Version>" src/TeamsFxSimpleAuth/TeamsFxSimpleAuth.csproj)"
version_line=$GETLINE
version_suffix=${version_line#*>}
version=${version_suffix%<*}

dotnet publish -c Release -o publish TeamsFxSimpleAuth.sln

# create release folder
mkdir -p release/zip

# zip the publish dir
echo "Step zip."
cd ./publish
zip -r ../release/zip/TeamsFxSimpleAuth-$version.zip ./*

cp -f ../release/zip/TeamsFxSimpleAuth-$version.zip ../release/zip/TeamsFxSimpleAuth-$version-$CDP_PATCH_NUMBER.zip

popd
exit 0
