#!/bin/bash
version=$(head ./packages/fx-core/templates/plugins/resource/simpleauth/version.txt)
tag=simpleauth@$version
fileName=Microsoft.TeamsFx.SimpleAuth_$version.zip
url=https://github.com/OfficeDev/TeamsFx/releases/download/$tag/$fileName
curl $url -L -J -o packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip