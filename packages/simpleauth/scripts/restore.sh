#!/bin/bash
set -e

echo "Step set dictionary."
DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step restore."
cd ..
dotnet restore TeamsFxSimpleAuth.sln
EXIT_CODE=$?

popd
exit $EXIT_CODE
