#!/bin/bash
declare -A simpleauthFilesMd5=( ["0.1.0"]="e59ce68a26b74dba473e34c381678910" ["0.1.1"]="01f306767cb689dac8d973deccc1062d" ["0.1.2"]="d329b68923b81217e11230c5700ec5bf")
version=$(head ./packages/fx-core/templates/plugins/resource/simpleauth/version.txt)
tag=simpleauth@$version
fileName=Microsoft.TeamsFx.SimpleAuth_$version.zip
url=https://github.com/OfficeDev/TeamsFx/releases/download/$tag/$fileName
curl $url -L -J -o packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip
filemd5=$(md5sum packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip | cut -d ' ' -f1)
echo "============================================"
echo $filemd5
if [ "$filemd5" != ${simpleauthFilesMd5["$version"]} ]
then
    echo "SimpleAuth not the right file, md5sum not match".
    exit -1
fi