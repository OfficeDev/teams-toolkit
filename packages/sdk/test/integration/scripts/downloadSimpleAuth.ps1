$simpleAuthPath = Join-Path $PSScriptRoot  ../../../../fx-core/templates/plugins/resource/simpleauth
echo $simpleAuthPath
$version=Get-Content $simpleAuthPath/version.txt
$fileName="Microsoft.TeamsFx.SimpleAuth_$version.zip"
$url=$env:SIMPLE_AUTH_ENDPOINT+'/'+$fileName+'?'+$env:SIMPLE_AUTH_SAS_TOKEN
Invoke-WebRequest $url -OutFile $simpleAuthPath/SimpleAuth.zip
