#!/bin/bash
set -x
filePath=packages/cli/src/cmds/m365/serviceConstant.ts
echo "Replace placeholders in $filePath"
echo "$SERVICE_ENDPOINT_PLACEHOLDER"
echo "$SERVICE_ENDPOINT_PLACEHOLDER"
sed -i -e "s@{{SERVICE_ENDPOINT_PLACEHOLDER}}@$SERVICE_ENDPOINT_PLACEHOLDER@g" $filePath
sed -i -e "s@{{SERVICE_SCOPE_PLACEHOLDER}}@$SERVICE_SCOPE_PLACEHOLDER@g" $filePath
echo "Replace Done."