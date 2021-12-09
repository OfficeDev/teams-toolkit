#!/bin/bash
version=$(head ./packages/fx-core/templates/plugins/resource/simpleauth/version.txt)
tag=simpleauth@$version
fileName=Microsoft.TeamsFx.SimpleAuth_$version.zip
url=https://github.com/OfficeDev/TeamsFx/releases/download/$tag/$fileName
curl $url -L -J -o packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip --verbose -skw "time_connect: %{time_connect} s\ntime_namelookup: %{time_namelookup} s\ntime_pretransfer: %{time_pretransfer} s\ntime_starttransfer: %{time_starttransfer} s\ntime_redirect: %{time_redirect} s\nspeed_download: %{speed_download} B/s\ntime_total: %{time_total} s\n\n"