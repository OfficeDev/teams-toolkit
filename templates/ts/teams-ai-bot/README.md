# AI in Microsoft Teams: Light Bot
LightBot: Your Enlightened Assistant. This example showcases how the LightBot understands user intent, accurately interpreting commands to effortlessly control light bot.

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

-   [AI in Microsoft Teams: Light Bot](#ai-in-microsoft-teams-light-bot)
    -   [Setting up the sample](#setting-up-the-sample)
    -   [Interacting with the bot](#interacting-with-the-bot)
    -   [Multiple ways to test](#multiple-ways-to-test)
        -   [Using Teams Toolkit for Visual Studio Code](#using-teams-toolkit-for-visual-studio-code)
        -   [Using Teams Toolkit CLI](#using-teams-toolkit-cli)
        -   [Manually upload the app to a Teams desktop client](#manually-upload-the-app-to-a-teams-desktop-client)
    -   [Testing in BotFramework Emulator](#testing-in-botframework-emulator)
        -   [Directions](#directions)
    -   [Testing in BotFramework Emulator](#testing-in-botframework-emulator-1)
    -   [Deploy the bot to Azure](#deploy-the-bot-to-azure)
    -   [Further reading](#further-reading)

<!-- /code_chunk_output -->

Explore how the LightBot understands, allowing precise control over turning lights on and off, while demonstrating the power and potential of the Language Model in understanding and executing user intent accurately mapped with app actions.

It shows Teams AI SDK capabilities like:

<details open>
    <summary><h3>Bot scaffolding</h3></summary>
    Throughout the 'index.ts' file you'll see the scaffolding created to run a Bot, like storage, authentication, task modules, and action submits.
</details>
<details open>
    <summary><h3>Prompt engineering</h3></summary>
The prompt files have descriptive prompt engineering that, in plain language, instructs GPT how the message extension should conduct itself at submit time. For example:

#### skprompt.txt

```text
This is a Microsoft Teams extension that assists the user with creating posts.
Using the prompt below, create a post that appropriate for a business environment.
Prompt: {{data.prompt}}
Post:
```

</details>
<details open>
    <summary><h3>Action mapping</h3></summary>
Since a message extension is a UI-based component, user actions are explicitly defined (as opposed to a conversational bot). This sample shows how ME actions can leverage LLM logic:

```javascript
// Add a prompt function for getting the current status of the lights
app.ai.prompts.addFunction('getLightStatus', async (context: TurnContext, state: ApplicationTurnState) => {
    return state.conversation.value.lightsOn ? 'on' : 'off';
});

// Register action handlers
app.ai.action('LightsOn', async (context: TurnContext, state: ApplicationTurnState) => {
    state.conversation.value.lightsOn = true;
    await context.sendActivity(`[lights on]`);
    return true;
});

app.ai.action('LightsOff', async (context: TurnContext, state: ApplicationTurnState) => {
    state.conversation.value.lightsOn = false;
    await context.sendActivity(`[lights off]`);
    return true;
});

app.ai.action('Pause', async (context: TurnContext, state: ApplicationTurnState, data: TData) => {
    const time = data.time ? parseInt(data.time) : 1000;
    await context.sendActivity(`[pausing for ${time / 1000} seconds]`);
    await new Promise((resolve) => setTimeout(resolve, time));
    return true;
});
```

</details>

This sample shows how to incorporate basic conversational flow into a Teams application. It also illustrates a few of the Teams specific calls you can make from your bot.

## Setting up the sample

1. Clone the repository

    ```bash
    git clone https://github.com/Microsoft/teams-ai.git
    ```

2. In the root JavaScript folder, install and build all dependencies

    ```bash
    cd teams-ai/js
    yarn install
    yarn build
    ```

3. In a terminal, navigate to the sample root.

    ```bash
    cd teams-ai/js/samples/04.ai.c.actionMapping.lightBot/
    ```
4. Duplicate the `sample.env` in the `teams-ai/js/samples/04.ai.c.actionMapping.lightBot` folder. Rename the file to `.env`. 

5. If you are using OpenAI then only keep the `OPENAI_KEY` and add in your key. Otherwise if you are using AzureOpenAI then only keep the `AZURE_OPENAI_KEY`, `AZURE_OPENAI_ENDPOINT` variables and fill them in appropriately.

6. Update `config.json` and `index.ts` with your model deployment name.

## Interacting with the bot

You can tell the bot to do actions like turning lights on, off, or dimming them. You can also ask about the status of the lights.

## Multiple ways to test

The easiest and fastest way to get up and running is with Teams Toolkit as your development guide. To use Teams Toolkit to automate setup and debugging, please [continue below](#using-teams-toolkit-for-visual-studio-code).

Otherwise, if you only want to run the bot locally and build manually, please jump to the [BotFramework Emulator](#testing-in-BotFramework-emulator) section.

### Using Teams Toolkit for Visual Studio Code

The simplest way to run this sample in Teams is to use Teams Toolkit for Visual Studio Code.

1. Ensure you have downloaded and installed [Visual Studio Code](https://code.visualstudio.com/docs/setup/setup-overview)
1. Install the [Teams Toolkit extension](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
1. Select **File > Open Folder** in VS Code and choose this sample's directory from the repo
1. Using the extension, sign in with your Microsoft 365 account where you have permissions to upload custom apps
1. Update the `.env` file and provide your [OpenAI Key](https://openai.com/api/) key for leveraging GPT
1. Select **Debug > Start Debugging** or **F5** to run the app in a Teams web client.
1. In the browser that launches, select the **Add** button to install the app to Teams.

> If you do not have permission to upload custom apps (sideloading), Teams Toolkit will recommend creating and using a Microsoft 365 Developer Program account - a free program to get your own dev environment sandbox that includes Teams.

### Using Teams Toolkit CLI

You can also use the Teams Toolkit CLI to run this sample.

1. Install the CLI

    ```bash
    npm install -g @microsoft/teamsfx-cli
    ```

1. Open a second shell instance and run ngrok tunneling service - point to port 3978

    ```bash
    ngrok http --host-header=rewrite 3978
    ```

1. Copy the ngrok URL and put the URL and domain in the `/env/env.local` file

    ```bash
    BOT_ENDPOINT=https://{ngrok-url}.ngrok.io
    BOT_DOMAIN={ngrok-url}.ngrok.io
    ```

1. Update the `.env` file and provide your [OpenAI Key](https://openai.com/api/) key for leveraging GPT

1. In the repository directory, run the Teams Toolkit CLI commands to automate the setup needed for the app

    ```bash
    cd teams-ai/js/samples/04.ai.c.actionMapping.lightbot
    teamsfx provision --env local

    ```

1. Next, use the CLI to validate and create an app package

    ```bash
    teamsfx deploy --env local
    ```

1. Finally, use the CLI to preview the app in Teams

    ```bash
    teamsfx preview --env local
    ```

### Manually upload the app to a Teams desktop client

> If you used Teams Toolkit in the above steps, you can [upload a custom app](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) to a desktop client using the `/appPackage/appPackage.local.zip` file created by the tools and skip to step 6.

1. In a terminal, navigate to `teams-ai/js/samples/04.ai.c.actionmapping.lightbot/`

    ```bash
    cd teams-ai/js/samples/04.ai.c.actionmapping.lightbot
    ```

1. Run ngrok tunneling service - point to port 3978

    ```bash
    ngrok http --host-header=rewrite 3978
    ```

1. Create [Bot Framework registration resource](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) in Azure

    - Use the current `https` URL you were given by running ngrok. Append with the path `/api/messages` used by this sample.
    - Ensure that you've [enabled the Teams Channel](https://docs.microsoft.com/en-us/azure/bot-service/channel-connect-teams?view=azure-bot-service-4.0)

1. Update the `.env` configuration for the bot to use the Microsoft App Id and App Password from the Bot Framework registration. (Note the App Password is referred to as the "client secret" in the Azure Portal and you can always create a new client secret anytime.)
1. Update the `.env` file and provide your [OpenAI Key](https://openai.com/api/) key for leveraging GPT
1. **_This step is specific to Teams._**

    - **Edit** the `manifest.json` contained in the `appPackage` folder to replace your Microsoft App Id (that was created when you registered your bot earlier) _everywhere_ you see the place holder string `${{TEAMS_APP_ID}}` (depending on the scenario the Microsoft App Id may occur multiple times in the `manifest.json`). If you haven't created an Azure app service yet, you can use your bot id for the above. You're bot id should be pasted in where you see `${{BOT_ID}}`. Replace everywhere you see `${{BOT_DOMAIN}}` with the domain part of the URL created by your tunneling solution.
    - **Zip** up the contents of the `appPackage` folder to create a `manifest.zip`

1. Run your app from the command line:

    ```bash
    yarn start
    ```

1. [Upload the app](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) file (manifest.zip created in the previous step) in Teams.

## Testing in BotFramework Emulator

[Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator) Allows testing bots independently from Channels when developing your bot. If you do not wish to use Teams Toolkit, please follow the steps below to test your bot in Emulator.

### Directions

1. Download and install [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator)
2. Launch Bot Framework Emulator
3. Run the app you are in the directory for.

```bash
yarn start
```

4. Add your app's messaging endpoint to the "Open a Bot" dialog. The endpoint your localhost endpoint with the path `/api/messages` appended. It should look something like this: `http://localhost:3978/api/messages`.

![Bot Framework setup menu with a localhost url endpoint added under Bot URL](https://github.com/microsoft/teams-ai/assets/14900841/6c4f29bc-3e5c-4df1-b618-2b5a590e420e)

-   In order to test remote apps, you will need to use a tunneling service like ngrok along with an Microsoft App Id and password pasted into the dialog shown above.
-   Channel-specific features (For example, Teams Message Extensions) are not supported in Emulator and therefore not fully-testable.
-   If you are building, testing and publishing your app manually to Azure, you will need to put your credentials in the `.env` file.

## Testing in BotFramework Emulator

[Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator) Allows testing bots independently from Channels when developing your bot. To use, simply download the app and enter your local endpoint.

In order to test remote apps, you will need to use a tunneling service like ngrok.

Please note:

-   Channel-specific features (For example, Teams Message Extensions) are not supported in Emulator and therefore not fully-testable.
-   If you are building, testing and publishing your app manually to Azure, you will need to put your credentials in the `.env` file. If you are using Teams Toolkit, the `.env` folder will be automatically generated for you.

## Deploy the bot to Azure

You can use Teams Toolkit for VS Code or CLI to host the bot in Azure. The sample includes Bicep templates in the `/infra` directory which are used by the tools to create resources in Azure.

To configure the Azure resources to have an environment variable for the OpenAI Key:

1. Add a `./env/.env.staging.user` file with a new variable, `SECRET_OPENAI_KEY=` and paste your [OpenAI Key](https://openai.com/api/).

The `SECRET_` prefix is a convention used by Teams Toolkit to mask the value in any logging output and is optional.

Use the **Provision**, **Deploy**, and **Publish** buttons of the Teams Toolkit extension or from the CLI with `teamsfx provision` and `teamsfx deploy`. [Visit the documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/provision) for more info on hosting your app in Azure with Teams Toolkit.

Alternatively, you can learn more about deploying a bot to Azure manually in the [Deploy your bot to Azure](https://aka.ms/azuredeployment) documentation.

## Further reading

-   [Teams Toolkit overview](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
-   [How Microsoft Teams bots work](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-basics-teams?view=azure-bot-service-4.0&tabs=javascript)
