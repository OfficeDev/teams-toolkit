# Contributing

Welcome and thank you for your interest in contributing to **Microsoft.Azure.WebJobs.Extensions.TeamsFx**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Setup Development Environment

1. Install .NET core SDK 3.1. [[REF](https://dotnet.microsoft.com/download/dotnet-core/3.1)]

1. Install Function Core Tools v3 [[REF](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=linux%2Ccsharp%2Cbash#install-the-azure-functions-core-tools)]

1. Install Node v12

## How to Build

```shell
dotnet build Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln
```

## How to Run Test Cases on Linux

1. Build nuget release package
    ```shell
    dotnet build -c Release Microsoft.Azure.WebJobs.Extensions.TeamsFx.sln
    ```
1. Run test cases
    ```shell
    ./script/test.sh
    ```

## How to Run Test Cases on Windows
You can use [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/) to execute the test scripts.
<!-- TODO: Replace start_js_function.sh and start_js_function.cmd to powershell core script so we can enable test running in Windows. -->
