#!/bin/bash

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "Step build."
cd ..
dotnet build -c Release -p:WebDriverPlatform=win32 TeamsFxSimpleAuth.sln
