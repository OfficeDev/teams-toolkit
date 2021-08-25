#!/bin/bash
countNum=1
restUrl="https://dev.azure.com/mseng/VSIoT/_apis/build/latest/$2?api-version=6.0-preview.1"
rsp=$(curl -u :$1 $restUrl | jq -r '.value| .[0]')
status=$(echo $rsp | jq -r '.state')
buildId=$(echo $rsp | jq -r '.id')
echo "===== build id is: " $buildId
echo "===== build pipeline status: " $status
while [[ $countNum -le 50 && "$status" != "completed" ]]
do 
    sleep 1m
    rsp=$(curl -u :$1 $restUrl | jq -r '.value| .[0]')
    status=$(echo $rsp | jq -r '.state')
    echo "loop status" $status
    countNum=$(( $countNum + 1 ))
done
if [[ "$status" != "completed" ]]
then
exit 1
fi

restUrl="https://dev.azure.com/mseng/VSIoT/_apis/build/builds/$buildId/artifacts?api-version=6.0"
asset_rsp=$(curl -u :$1 $restUrl)
echo "====== asset url response:" $asset_rsp
asset_id=$(echo $asset_rsp | jq '.value |.[] | .resource' |jq '.data' | tr -d -c 0-9)
echo "====== asset id is: " $asset_id