#!/bin/bash
version=$(head ./packages/fx-core/templates/plugins/resource/simpleauth/version.txt -n 1)
targetMd5=$(sed "2q;d" ./packages/fx-core/templates/plugins/resource/simpleauth/version.txt | cut -d ' ' -f 2)
echo "Download SimpleAuth Version: $version with MD5: $targetMd5"
tag=simpleauth@$version
fileName=Microsoft.TeamsFx.SimpleAuth_$version.zip
url=https://github.com/OfficeDev/TeamsFx/releases/download/$tag/$fileName
curl $url -L -J -o packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip
filemd5=$(md5sum packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip | cut -d ' ' -f1)
echo "============================================"
echo "Finish download file with MD5: $filemd5"
if [ "$filemd5" != "$targetMd5" ]
then
    echo "SimpleAuth not the right file, md5sum not match".
    exit -1
fi