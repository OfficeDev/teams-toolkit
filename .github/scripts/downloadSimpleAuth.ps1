$version=Get-Content packages/fx-core/templates/plugins/resource/simpleauth/version.txt
$tag = "simpleauth@"+$version
$fileName="Microsoft.TeamsFx.SimpleAuth_$version.zip"
$url = "https://github.com/OfficeDev/TeamsFx/releases/download/"+$tag+"/"+$fileName
Invoke-WebRequest $url -OutFile packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip