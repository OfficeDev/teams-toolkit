# Contributing

Welcome and thank you for your interest in contributing to **Microsoft.TeamsFx**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Setup Develop Environment

Follow the official documents to install the required softwares:
1. [.NET 5.0](https://dotnet.microsoft.com/download/dotnet/5.0)
2. [Visual Studio 2019](https://visualstudio.microsoft.com/vs/) or [Visual Studio Code](https://code.visualstudio.com/)

## Built the Project

Build in Visual Studio directly, or use `dotnet build` command under root folder.

## How to Run Test Cases

### Run test cases

Right click `TeamsFx.Test` project in Visual Studio, and choose `Run Tests`.

### Debug test cases

1. Change solution configuration to `Debug` in Visual Studio.
2. Navigate to the test case source code you want to debug.
3. Right click the test case and choose `Debug Test(s)`.

## Style Guidelines

This project uses editorconfig check code style. You can find style warnings in Visual Studio or build logs.

## Pull Request Process

1. Fork TeamsFx repo to personal repo.
2. Add your features and commit to own repo.
3. Make sure your changes are covered by tests. [How to Run Test Cases](#how-to-run-test-cases)
4. Ensure code style check has no warning or error. [Style Guidelines](#style-guidelines)
5. Create a pull request to merge your changes to "dev" branch.
6. At least one approve from code owners is required.
