function Retry-Command {
    [CmdletBinding()]
    Param(
        [Parameter(Position=0, Mandatory=$true)]
        [scriptblock]$ScriptBlock,

        [Parameter(Position=1, Mandatory=$false)]
        [int]$Maximum = 5,

        [Parameter(Position=2, Mandatory=$false)]
        [int]$Delay = 100
    )

    Begin {
        $cnt = 0
    }

    Process {
        do {
            $cnt++
            try {
                $ScriptBlock.Invoke()
                return
            } catch {
                Write-Error $_.Exception.InnerException.Message -ErrorAction Continue
                Start-Sleep -Milliseconds $Delay
            }
        } while ($cnt -lt $Maximum)

        # Throw an error after $Maximum unsuccessful invocations. Doesn't need
        # a condition, since the function returns upon successful invocation.
        throw 'Execution failed.'
    }
}

Retry-Command -ScriptBlock {
    $version=Get-Content packages/fx-core/templates/plugins/resource/simpleauth/version.txt
    $tag = "simpleauth@"+$version
    $fileName="Microsoft.TeamsFx.SimpleAuth_$version.zip"
    $url = "https://github.com/OfficeDev/TeamsFx/releases/download/"+$tag+"/"+$fileName
    Invoke-WebRequest $url -OutFile packages/fx-core/templates/plugins/resource/simpleauth/SimpleAuth.zip
} -Maximum 10