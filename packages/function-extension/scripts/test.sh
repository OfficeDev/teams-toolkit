#!/bin/bash
# To run this script locally, Clear src/bin and src/obj folder and run `dotnet build -c Release Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln` under root directory first.

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Start Node Js Function App"
$DIR/start_js_function.sh

# run test
dotnet test $DIR/..
