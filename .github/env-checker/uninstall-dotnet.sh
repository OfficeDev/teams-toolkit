#!/bin/bash
set -xue

# Install on Linux: https://github.com/actions/virtual-environments/blob/main/images/linux/scripts/installers/dotnetcore-sdk.sh
# Install on macOS: https://github.com/actions/virtual-environments/blob/main/images/macos/provision/core/dotnet.sh

echo "PATH=$PATH"
which dotnet
dotnet --list-sdks

if [[ $(uname -s) == "Linux" ]]; then
  rm -rf /usr/share/dotnet
fi

rm -rf ${HOME}/.dotnet
rm -rf /usr/local/bin/dotnet

which dotnet || true
