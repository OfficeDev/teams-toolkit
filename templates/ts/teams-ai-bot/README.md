# Overview of Teams AI Bot

This app showcases how to craft an Bot app integrated with Azure OpenAI from OpenAPI description.

## Get started with the template

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
1. Open `./env/.env.{envName}`, input your Azure OpenAI endpoint in the value of `AZURE_OPENAI_ENDPOINT`.
1. Open `./env/.env.{envName}.user`, input your Azure OpenAI key in the value of `SECRET_AZURE_OPENAI_KEY`.
1. Open `./src/prompts/sequence`, input your Azure OpenAI model name in the value of `model` under `completion`.
1. Press `F5` to start debugging which launches your app in Teams using a web browser. You can also run `Provision` and `Deploy` to try this app on Azure.

## Known limitations

1. This app only contains ts version. Template for js is not ready now.
1. Your Azure OpenAI key in `./env/.env.{envName}.user` will not be decrypted. Please NEVER upload or share this file!