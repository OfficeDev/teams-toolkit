#!/bin/bash
set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

cd ..
sed -i "s/__ADMIN_CLIENT_SECRET__/$CDP_TEST_ADMIN_CLIENT_SECRET/g" ./src/TeamsFxSimpleAuth.Tests/appsettings.IntegrationTests.json
sed -i "s/__TEST_PASSWORD__/$CDP_TEST_PASSWORD/g" ./src/TeamsFxSimpleAuth.Tests/appsettings.IntegrationTests.json

popd
exit 0
