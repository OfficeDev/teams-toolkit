#!/bin/bash

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step build."
cd ..
dotnet build -c Release -p:WebDriverPlatform=linux64 TeamsFxSimpleAuth.sln
EXIT_CODE=$?

popd
exit $EXIT_CODE

