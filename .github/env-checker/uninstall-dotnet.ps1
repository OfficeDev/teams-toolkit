Set-PSDebug -Trace 2

# Install .NET on Windows: https://github.com/actions/virtual-environments/blob/main/images/win/scripts/Installers/Install-DotnetSDK.ps1

Write-Host "PATH=${env:PATH}"
Get-Command dotnet
dotnet --list-sdks

Write-Host "Moving .NET files"
# Move dotnet files to other place. Delete is too slow. Deletion takes about 7 minutes on GitHub Actions
#Remove-Item -Path $(Join-Path -Path $env:ProgramFiles -ChildPath 'dotnet') -Recurse -Force -Confirm:$false
Move-Item -Path $(Join-Path -Path $env:ProgramFiles -ChildPath 'dotnet') -Destination C:\DotnetRecycleBin -Force -Confirm:$false
Write-Host "Cleaning up registry"
Remove-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "DOTNETUSERPATH"

