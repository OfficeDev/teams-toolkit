import "highlight.js/styles/github.css";
// import hljs from "highlight.js/lib/core";
import "./github.scss";
import "./document.scss";

import * as React from "react";

import {
  InProductGuideInteraction,
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import CodeSnippet from "./codeSnippet";
import CollapsibleStep from "./collapsibleStep";
import ExternalLink from "./externalLink";
import { useEffect } from "react";

export default function WorkflowBot() {
  const onCreateNewProject = () => {
    vscode.postMessage({
      command: Commands.CreateNewProject,
    });
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.InteractWithInProductDoc,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
          [TelemetryProperty.Interaction]: InProductGuideInteraction.RunCommand,
          [TelemetryProperty.Identifier]: "Create New Project",
        },
      },
    });
  };

  const codeSnippets = [
    `{ 
  "type": "AdaptiveCard", 
  "body": [
    ...
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.Execute",
          "title": "DoSomething",
          "verb": "doSomething" 
        }
      ]
    },
    ...
  ]
}`,
    `{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "A sample response to DoSomething."
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}`,
    `const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");
const { AdaptiveCardResponse, InvokeResponseFactory } = require("@microsoft/teamsfx");
const responseCard = require("../adaptiveCards/doSomethingResponse.json");

class DoSomethingActionHandler { 
    triggerVerb = "doSomething";

    async handleActionInvoked(context, message) { 
        const responseCardJson = AdaptiveCards.declare(responseCard).render(actionData);
        return InvokeResponseFactory.adaptiveCard(responseCardJson);
    } 
} 

module.exports = {

  DoSomethingActionHandler,
}`,
    `const conversationBot = new ConversationBot({ 
  ... 
  cardAction: { 
    enabled: true, 
    actions: [ 
      new DoStuffActionHandler(),
      new DoSomethingActionHandler() 
    ], 
  } 
}); `,
  ];

  let scrollToBottom = false;

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollToBottom && window.scrollY > 2500) {
        scrollToBottom = true;
        vscode.postMessage({
          command: Commands.SendTelemetryEvent,
          data: {
            eventName: TelemetryEvent.InteractWithInProductDoc,
            properties: {
              [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
              [TelemetryProperty.Interaction]: InProductGuideInteraction.ScrollToBottom,
              [TelemetryProperty.TutorialName]: "workflow-bot",
            },
          },
        });
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="markdown-body">
      <h1 id="overview-of-the-workflow-bot-template">Overview of the Workflow bot template</h1>
      <p>
        This template showcases an app that responds to chat commands by displaying UI using an
        Adaptive Card. The card has a button that demonstrates how to receive user input on the
        card, do something like call an API, and update the UI of that card. This can be further
        customized to create richer, more complex sequence of steps which forms a complete workflow.
      </p>
      <p>
        The app template is built using the TeamsFx SDK, which provides a simple set of functions
        over the Microsoft Bot Framework to implement this scenario.
      </p>
      <h2 id="get-started-with-the-workflow-bot">Get Started with the Workflow bot</h2>
      <blockquote>
        <p>
          <strong>Prerequisites</strong>
        </p>
        <p>To run the workflow bot template in your local dev machine, you will need:</p>
        <ul>
          <li>
            <code>Node.js</code> installed locally (recommended version: 14)
          </li>
          <li>
            An{" "}
            <ExternalLink
              title="Microsoft 365 account for development"
              link="https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts"
            />
          </li>
        </ul>
        <p>
          <strong>Note</strong>
        </p>
        <p>
          Your app can be installed into a team, or a group chat, or as personal app. See{" "}
          <ExternalLink
            title="Installation and Uninstallation"
            link="https://aka.ms/teamsfx-command-response#customize-installation"
          />
          .
        </p>
      </blockquote>
      <p>
        If you don't have a workflow bot yet, please{" "}
        <a href="javascript:void(0)" onClick={onCreateNewProject}>
          create a new project
        </a>
        . Teams Toolkit will scaffold.
      </p>
      <ol>
        <li>First, select the Teams Toolkit icon on the left in the VS Code toolbar.</li>
        <li>
          In the Account section, sign in with your{" "}
          <ExternalLink
            title="Microsoft 365 account"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts"
          />{" "}
          if you haven&#39;t already.
        </li>
        <li>
          Press F5 to start debugging which launches your app in Teams using a web browser. Select{" "}
          <code>Debug (Edge)</code> or <code>Debug (Chrome)</code>.
        </li>
        <li>
          When Teams launches in the browser, select the Add button in the dialog to install your
          app to Teams.
        </li>
        <li>
          Type or select <code>helloWorld</code> in the chat to send it to your bot - this is the
          default command provided by the template.
        </li>
        <li>
          In the response from the bot, select the <strong>DoStuff</strong> button.
        </li>
      </ol>
      <p>
        The bot will respond by updating the existing Adaptive Card to show the workflow is now
        complete! Continue reading to learn more about what&#39;s included in the template and how
        to customize it.
      </p>
      <p>Here is a screen shot of the application running:</p>
      <p>
        <img
          src="https://user-images.githubusercontent.com/10163840/192477792-dc447b3a-e304-4cd8-b4df-b1eb9d226292.png"
          alt="Responds to command"
        />
      </p>
      <p>
        When you click the <code>DoStuff</code> button, the above adaptive card will be updated to a
        new card as shown below:
      </p>
      <p>
        <img
          src="https://user-images.githubusercontent.com/10163840/192477148-29d9edfc-085b-4d02-b3de-b47b9a456108.png"
          alt="Responds to card action"
        />
      </p>
      <h2 id="what-s-included-in-the-template">What&#39;s included in the template</h2>
      <table>
        <thead>
          <tr>
            <th>Folder</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>.fx</code>
            </td>
            <td>Project level settings, configurations, and environment information</td>
          </tr>
          <tr>
            <td>
              <code>.vscode</code>
            </td>
            <td>VSCode files for local debug</td>
          </tr>
          <tr>
            <td>
              <code>bot</code>
            </td>
            <td>The source code for the workflow bot Teams application</td>
          </tr>
          <tr>
            <td>
              <code>templates</code>
            </td>
            <td>
              Templates for the Teams application manifest and for provisioning Azure resources
              (optional) used by Teams Toolkit
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The following files can be customized and demonstrate an example implementation to get you
        started.
      </p>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>src/index.js</code>
            </td>
            <td>
              Application entry point and <code>restify</code> handlers for the Workflow bot
            </td>
          </tr>
          <tr>
            <td>
              <code>src/commands/helloworldCommandHandler.js</code>
            </td>
            <td>Implementation that handles responding to a chat command</td>
          </tr>
          <tr>
            <td>
              <code>src/adaptiveCards/helloworldCommandResponse.json</code>
            </td>
            <td>Defines the Adaptive Card (UI) that is displayed in response to a chat command</td>
          </tr>
          <tr>
            <td>
              <code>src/adaptiveCards/doStuffActionResponse.json</code>
            </td>
            <td>
              A generated Adaptive Card that is sent to Teams for the response of
              &quot;doStuff&quot; action
            </td>
          </tr>
          <tr>
            <td>
              <code>src/cardActions/doStuffActionHandler.js</code>
            </td>
            <td>
              Implements the handler for the <code>doStuff</code> button displayed in the Adaptive
              Card
            </td>
          </tr>
        </tbody>
      </table>
      <h2 id="extend-the-workflow-bot-template-with-more-actions-and-responses">
        Extend the workflow bot template with more actions and responses
      </h2>
      <p>Follow steps below to add more actions and responses to extend the workflow bot:</p>
      <div className="collapsibleSteps">
        <CollapsibleStep
          step={1}
          title="Add an action to your Adaptive Card"
          identifier="workflow-bot-step1"
        >
          <p>
            Adding new actions (buttons) to an Adaptive Card is as simple as defining them in the
            JSON file. Add a new <code>DoSomething</code> action to the{" "}
            <code>src/adaptiveCards/helloworldCommandResponse.json</code> file:
          </p>
          <p>
            Here&#39;s a sample action with type <code>Action.Execute</code>:
          </p>
          <CodeSnippet
            language="language-json"
            data={codeSnippets[0]}
            identifier="workflow-bot-step1"
          />
          <p>
            Specifying the <code>type</code> as <code>Action.Execute</code> allows this Adaptive
            Card to respond with another card, which will update the UI by replacing the existing
            card. Learn more about{" "}
            <ExternalLink
              title="Adaptive Card Universal Actions in the documentation"
              link="https://learn.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview?tabs=mobile#universal-actions"
            />
            .
          </p>
          <blockquote>
            <p>
              <strong>
                <em>NOTE:</em>
              </strong>{" "}
              the <code>verb</code> property is required here so that the TeamsFx conversation SDK
              can invoke the corresponding action handler when the action is invoked in Teams. You
              should provide a global unique string for the <code>verb</code> property, otherwise
              you may experience unexpected behavior if you&#39;re using a general string that might
              cause a collision with other bot actions.
            </p>
          </blockquote>
        </CollapsibleStep>
      </div>
      <div className="collapsibleSteps">
        <CollapsibleStep
          step={2}
          title="Respond with a new Adaptive Card"
          identifier="workflow-bot-step2"
        >
          <p>
            For each action, you can display a new Adaptive Card as a response to the user. Create a
            new file, <code>bot/src/adaptiveCards/doSomethingResponse.json</code> to use as a
            response for the <code>DoSomething</code> action created in the previous step:
          </p>
          <CodeSnippet
            language="language-json"
            data={codeSnippets[1]}
            identifier="workflow-bot-step2"
          />
          <p>
            You can use the{" "}
            <ExternalLink
              title="Adaptive Card Designer"
              link="https://adaptivecards.io/designer/"
            />{" "}
            to help visually design your Adaptive Card UI.
          </p>
        </CollapsibleStep>
      </div>
      <div className="collapsibleSteps">
        <CollapsibleStep step={3} title="Handle the new action" identifier="workflow-bot-step3">
          <p>
            The TeamsFx SDK provides a convenient class,{" "}
            <code>TeamsFxAdaptiveCardActionHandler</code>, to handle when an action from an Adaptive
            Card is invoked. Create a new file,{" "}
            <code>bot/src/cardActions/doSomethingActionHandler.js</code>:
          </p>
          <CodeSnippet
            language="language-typescript"
            data={codeSnippets[2]}
            identifier="workflow-bot-step3"
          />
          <blockquote>
            <p>Please note:</p>
            <ul>
              <li>
                <p>
                  The <code>triggerVerb</code> is the <code>verb</code> property of your action.
                </p>
              </li>
              <li>
                <p>
                  The <code>actionData</code> is the data associated with the action, which may
                  include dynamic user input or some contextual data provided in the{" "}
                  <code>data</code> property of your action.
                </p>
              </li>
              <li>
                <p>
                  If an Adaptive Card is returned, then the existing card will be replaced with it
                  by default.
                </p>
              </li>
            </ul>
          </blockquote>
          <p>
            You can customize what the action does here, including calling an API, processing data,
            etc.
          </p>
        </CollapsibleStep>
      </div>
      <div className="collapsibleSteps">
        <CollapsibleStep step={4} title="Register the new handler" identifier="workflow-bot-step4">
          <p>
            Each new card action needs to be configured in the <code>ConversationBot</code>, which
            powers the conversational flow of the workflow bot template. Navigate to the{" "}
            <code>bot/src/internal/initialize.js</code> file and update the <code>actions</code>{" "}
            array of the <code>cardAction</code> property.
          </p>
          <ol>
            <li>
              Go to <code>bot/src/internal/initialize.js</code>;
            </li>
            <li>
              Update your <code>conversationBot</code> initialization to enable cardAction feature
              and add the handler to <code>actions</code> array:
            </li>
          </ol>
          <CodeSnippet
            language="language-typescript"
            data={codeSnippets[3]}
            identifier="workflow-bot-step4"
          />
        </CollapsibleStep>
      </div>
      <p>
        Congratulations, you&#39;ve just created your own workflow! To learn more about extending
        the Workflow bot template,{" "}
        <ExternalLink
          title="visit the documentation on GitHub"
          link="https://aka.ms/teamsfx-card-action-response"
        />
        . You can find more scenarios like:
      </p>
      <ul>
        <li>
          <ExternalLink
            title="Customize the way to respond to an action"
            link="https://aka.ms/teamsfx-card-action-response#customize-the-action-response"
          />
        </li>
        <li>
          <ExternalLink
            title="Customize the Adaptive Card content"
            link="https://aka.ms/teamsfx-card-action-response#customize-the-adaptive-card-content"
          />
        </li>
        <li>
          <ExternalLink
            title="Create a user specific view"
            link="https://aka.ms/teamsfx-card-action-response#auto-refresh-to-user-specific-view"
          />
        </li>
        <li>
          <ExternalLink
            title="Access Microsoft Graph"
            link="https://aka.ms/teamsfx-card-action-response#access-microsoft-graph"
          />
        </li>
        <li>
          <ExternalLink
            title="Connect to existing APIs"
            link="https://aka.ms/teamsfx-card-action-response#connect-to-existing-apis"
          />
        </li>
        <li>
          <ExternalLink
            title="Change the way to initialize the bot"
            link="https://aka.ms/teamsfx-card-action-response#customize-the-initialization"
          />
        </li>
      </ul>
      <h2 id="extend-workflow-bot-with-other-bot-scenarios">
        Extend workflow bot with other bot scenarios
      </h2>
      <p>
        Workflow bot is compatible with other bot scenarios like notification bot and command bot.
      </p>
      <h3 id="add-notifications-to-your-workflow-bot">Add notifications to your workflow bot</h3>
      <p>
        The notification feature adds the ability for your application to send Adaptive Cards in
        response to external events. Follow the{" "}
        <ExternalLink
          title="steps here"
          link="https://aka.ms/teamsfx-card-action-response#how-to-extend-workflow-bot-with-notification-feature"
        />{" "}
        to add the notification feature to your workflow bot. Refer{" "}
        <ExternalLink
          title="the notification document"
          link="https://aka.ms/teamsfx-notification"
        />{" "}
        for more information.
      </p>
      <h3 id="add-command-and-responses-to-your-workflow-bot">
        Add command and responses to your workflow bot
      </h3>
      <p>
        The command and response feature adds the ability for your application to &quot;listen&quot;
        to commands sent to it via a Teams message and respond to commands with Adaptive Cards.
        Follow the{" "}
        <ExternalLink
          title="steps here"
          link="https://aka.ms/teamsfx-command-response#How-to-add-more-command-and-response"
        />{" "}
        to add the command response feature to your workflow bot. Refer{" "}
        <ExternalLink
          title="the command bot document"
          link="https://aka.ms/teamsfx-command-response"
        />{" "}
        for more information.
      </p>
      <h2 id="additional-information-and-references">Additional information and references</h2>
      <ul>
        <li>
          <ExternalLink
            title="Manage multiple environments"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env"
          />
        </li>
        <li>
          <ExternalLink
            title="Collaborate with others"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-collaboration"
          />
        </li>
        <li>
          <ExternalLink
            title="Teams Toolkit Documentations"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals"
          />
        </li>
        <li>
          <ExternalLink
            title="Teams Toolkit CLI"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli"
          />
        </li>
        <li>
          <ExternalLink
            title="TeamsFx SDK"
            link="https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk"
          />
        </li>
        <li>
          <ExternalLink
            title="Teams Toolkit Samples"
            link="https://github.com/OfficeDev/TeamsFx-Samples"
          />
        </li>
      </ul>
    </div>
  );
}
