$fileName="Microsoft.TeamsFx.SimpleAuth_0.1.1.zip"
$url=$env:SIMPLE_AUTH_ENDPOINT+'/'+$fileName+'?'+$env:SIMPLE_AUTH_SAS_TOKEN
Invoke-WebRequest $url -OutFile SimpleAuth.zip
Move-Item .\SimpleAuth.zip ../.
