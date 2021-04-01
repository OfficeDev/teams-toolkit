#!/bin/bash
# To run this script locally, Clear src/bin and src/obj folder and run `dotnet build -c Release Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln` under root directory first.

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Start Node Js Function App"
$DIR/start_js_function.sh

# get secrets from environment
export TeamsFx_BINDING_IntegrationTestSettings__ClientSecret=$ClientSecret
export TeamsFx_BINDING_IntegrationTestSettings__UnauthorizedAadAppClientSecret=$UnauthorizedAadAppClientSecret
export TeamsFx_BINDING_IntegrationTestSettings__AllowedAppClientSecret=$AllowedAppClientSecret
export TeamsFx_BINDING_IntegrationTestSettings__AllowedApp2ClientSecret=$AllowedApp2Secret

# run test
dotnet test $DIR/..
