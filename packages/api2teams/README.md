# Welcome to `api2teams`

> Deprecation Notice: this library has been deprecated and is no longer maintained or updated. 
For continued support and enhanced features, we recommend [using the TTK to build a RAG bot in Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/build-a-rag-bot-in-teams). This will assist you in converting your Open API specification file into an AI chatbot.

`api2teams` is a command line tool to generate a complete conversational style command and response [Teams application](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/conversations/command-bot-in-teams) based on your Open API specification file and represent the API response in the form of [Adaptive Cards](https://learn.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#adaptive-card).

`api2teams` is the best way to start integrating your APIs with Teams conversational experience.

## Prerequisite
Before running this CLI and deploying your generated Teams App to Azure or your local development machine, please ensure that you have the following prerequisites in place:

- [Node.js](https://nodejs.org/), supported versions: 14, 16, 18
- An [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [TeamsFx CLI](https://aka.ms/teamsfx-cli)
- [Option] If you want to deploy this APP to Azure, you also need an Azure subscription. If you don't have an Azure subscription, [create a free account](https://azure.microsoft.com/en-us/free/) before you begin

## Quick start
- Install `api2teams` with npm: `npm install @microsoft/api2teams@latest -g`
- Prepare the Open API specification. If you don't currently have one, start with a sample we provided by saving a copy of the [sample-open-api-spec.yml](https://raw.githubusercontent.com/OfficeDev/TeamsFx/api2teams/packages/api2teams/sample-spec/sample-open-api-spec.yml) to your local disk.
- Convert the Open API spec to a Teams app, assuming you are using the `sample-open-api-spec.yml`: `api2teams sample-open-api-spec.yml`

## Available commands and options
The CLI name is `api2teams`. Usage is as below:

```
Usage: api2teams [options] <yaml>

Convert open api spec file to Teams APP project, only for GET operation

Arguments:
  yaml                   yaml file path to convert

Options:
  -o, --output [string]  output folder for teams app (default: "./generated-teams-app")
  -f, --force            force overwrite the output folder
  -v, --version          output the current version
  -h, --help             display help for command
```

You can input below command to generate Teams App to default or specific folder:

```bash
api2teams sample-open-api-spec.yml # generate teams app to default folder ./generated-teams-app
api2teams sample-open-api-spec.yml -o ./my-app # generate teams app to ./my-app folder
api2teams sample-open-api-spec.yml -o ./my-app -f # generate teams app to ./my-app folder, and force overwrite output folder
api2teams -h # show help message
api2teams -v # show version information
```

## Getting started with the generated Teams app

- Open the generated project in [Visual Studio Code](https://code.visualstudio.com/) and make sure you have the latest [Teams Toolkit](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) (version 5.0.0 or higher) installed.

- Follow the instruction provided in the `README.md` for the generated project to get started. After installing the Teams app generated from the provided OpenAPI spec, you will receive a welcome message. 
    
    ![welcome](https://github.com/OfficeDev/TeamsFx/wiki/api2teams/welcome.png)

- You can then run a `GET /pets/1` command in Teams to receive an Adaptive Card response from the bot. 

    ![response](https://github.com/OfficeDev/TeamsFx/wiki/api2teams/workflow1.png)
    
## Current limitations
1. The `api2teams` doesn't support Open API schema version < 3.0.0.
1. The `api2teams` doesn't support Authorization property in Open API specification.
1. The `api2teams` doesn't support `webhooks` property and it would be ignored during convert.
1. The `api2teams` doesn't support `oneOf`, `anyOf`, `not`keyword (It only support `allOf` keyword currently).
1. The `api2teams` doesn't support `POST`, `PUT`, `PATCH` or `DELETE` operations (It only supports `GET` operation currently).
1. The generated Adaptive Card doesn't support array type. 
1. The generated Adaptive Card doesn't support file upload.
1. The generated Teams app can only contain up to 10 items in the command menu.

## Further reading
- [Teams Toolkit](https://learn.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Platform Developer Documentation](https://learn.microsoft.com/microsoftteams/platform/mstdd-landing)
- [Adaptive Card Designer](https://adaptivecards.io/designer)
- [Swagger Parser](https://github.com/APIDevTools/swagger-parser)
- [Swagger Samples](https://github.com/OAI/OpenAPI-Specification)