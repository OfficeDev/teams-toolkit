#!/bin/bash
filePath=packages/cli/src/cmds/m365/serviceConstant.ts
echo "Replace placeholders in $filePath"
sed -i -e "s@{{SERVICE_ENDPOINT_PLACEHOLDER}}@$SIDELOADING_SERVICE_ENDPOINT@g" $filePath
sed -i -e "s@{{SERVICE_SCOPE_PLACEHOLDER}}@$SIDELOADING_SERVICE_SCOPE@g" $filePath
echo "Replace Done."