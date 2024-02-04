import * as dotenv from "dotenv";
import { existsSync, readFileSync } from "fs-extra";
import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import { verbatimCopilotInteraction } from "../chat/copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "../chat/slashCommands";
import { detectExtensionInstalled, getTeamsApps } from "../util";

const nextStepCommandName = "nextstep";

export function getNextStepCommand(): SlashCommand {
  return [
    nextStepCommandName,
    {
      shortDescription: `Describe what next step you might do in Teams`,
      longDescription: `Describe what next step you might do in Teams`,
      intentDescription: "",
      handler: (request: AgentRequest) => nextStepHandler(request),
    },
  ];
}

async function nextStepHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  // user: @teams /nextstep
  // if no Teams installed, recommend to install Teams
  const installed = detectExtensionInstalled(
    "teamsdevapp.ms-teams-vscode-extension"
  );
  // get all Teams apps under workspace
  const teamsApps = getTeamsApps(vscode.workspace.workspaceFolders);
  // if no Teams app under workspace, recommend to create a Teams app
  let localEnv: dotenv.DotenvParseOutput | undefined = undefined;
  let remoteEnv: dotenv.DotenvParseOutput | undefined = undefined;
  if (teamsApps && teamsApps.length > 0) {
    const teamsApp = teamsApps[0];
    if (existsSync(`${teamsApp}/env/.env.local`)) {
      localEnv = dotenv.parse(readFileSync(`${teamsApp}/env/.env.local`));
    }
    if (existsSync(`${teamsApp}/env/.env.dev`)) {
      remoteEnv = dotenv.parse(readFileSync(`${teamsApp}/env/.env.dev`));
    }
  }
  const status: ProjectStatus = {
    installed,
    hasTeamsApp: !!teamsApps && teamsApps.length > 0,
    localEnv,
    remoteEnv,
  };
  const systemPrompt = getNextStepSystemPrompt(status);
  const { copilotResponded, copilotResponse } =
    await verbatimCopilotInteraction(
      systemPrompt,
      request ?? "Can you give me some recommendations for next?"
    );
  if (!copilotResponded) {
    request.progress.report({
      content: vscode.l10n.t("Sorry, I can't help with that right now.\n"),
    });
    return { chatAgentResult: { slashCommand: "" }, followUp: [] };
  } else {
    const recommandedNextStepFollowUps: vscode.ChatAgentFollowup[] = [];
    for (const nextStep of AllSteps.filter((s) => s.condition(status))) {
      if (
        copilotResponse
          .toLocaleLowerCase()
          .includes(nextStep.title.toLocaleLowerCase())
      ) {
        recommandedNextStepFollowUps.push(nextStep.followUp);
      }
    }
    return {
      chatAgentResult: { slashCommand: "" },
      followUp: recommandedNextStepFollowUps,
    };
  }
}

function getNextStepSystemPrompt(status: ProjectStatus): string {
  const allSteps = AllSteps.filter((s) => s.condition(status));
  return `
  - You are an advisor for Teams App developers.
  - You need to help them during their app development.
  - You should answer questions that are related to Teams App development.
  - Your response should be baesd on the following step list with the format: "{title}: {content}", which {title} is a field of step list and {content} contains the human-like description.
  - You must add the {docLink} to the response if the step has the {docLink}.
  - If there are multiple steps, you should give the recommendations according to the {priority} of the step. 0 is the highest priority.
  - Here are the next step list: ${JSON.stringify(
    allSteps.map((s) => {
      return {
        title: s.title,
        description: s.description,
        docLink: s.docLink,
        priorty: s.priorty,
      };
    })
  )}.
  `;
}

export const EXECUTE_COMMAND_ID = "teamsAgent.executeCommand";
export async function executeCommand(command: string, ...args: any[]) {
  vscode.commands.executeCommand(command, ...args);
}

export interface ProjectStatus {
  installed: boolean;
  hasTeamsApp: boolean;
  localEnv?: dotenv.DotenvParseOutput;
  remoteEnv?: dotenv.DotenvParseOutput;
}

export const DefaultNextStep: vscode.ChatAgentReplyFollowup = {
  message: "@teams /nextstep",
  title: vscode.l10n.t("What's next I could do?"),
};

export const AllSteps: {
  id: string;
  title: string;
  description: string;
  docLink: string;
  followUp: vscode.ChatAgentFollowup;
  priorty: number;
  condition: (status: ProjectStatus) => boolean;
}[] = [
  {
    id: "install",
    title: "Install Teams Toolkit",
    description: `
Teams Toolkit makes it simple to get started with app development for Microsoft Teams using Visual Studio Code.
* Start with a project template for common custom app built for your org (LOB app) scenarios or from a sample.
* Save setup time with automated app registration and configuration.
* Run and debug to Teams directly from familiar tools.
* Smart defaults for hosting in Azure using infrastructure-as-code and Bicep.
* Create unique configurations like dev, test, and prod using the environment features.
`,
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/install-teams-toolkit?tabs=vscode&pivots=visual-studio-code-v5",
    followUp: {
      commandId: "workbench.extensions.installExtension",
      args: ["teamsdevapp.ms-teams-vscode-extension"],
      title: "Install Teams Toolkit",
    },
    priorty: 0,
    condition: (status: ProjectStatus) => !status.installed,
  },
  {
    id: "create",
    title: "Create a new project",
    description:
      "You can build a new Teams project by selecting Create a New App in Teams Toolkit. You can start from built-in Teams app templates or start from official Teams app samples in Teams Toolkit. What's more, Teams Toolkit v5 supports to start with Outlook Add-in templates to build your own Outlook Add-ins.",
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/create-new-project?pivots=visual-studio-code-v5",
    followUp: {
      message: "@teams /create list some samples",
      title: "Create a sample",
    },
    priorty: 1,
    condition: (status: ProjectStatus) => !status.hasTeamsApp,
  },
  {
    id: "local-preview",
    title: "Preview the App",
    description: `Teams Toolkit helps you to debug and preview your Microsoft Teams app. Debug is the process of checking, detecting, and correcting issues or bugs to ensure the program runs successfully in Teams.`,
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-overview?pivots=visual-studio-code-v5",
    followUp: {
      commandId: "workbench.action.debug.start",
      args: [],
      title: "Local preview",
    },
    priorty: 1,
    condition: (status: ProjectStatus) =>
      status.hasTeamsApp && !!status.localEnv && !status.localEnv.TEAMS_APP_ID,
  },
  {
    id: "provision",
    title: "Provision Azure resources",
    description:
      "Teams Toolkit integrates with Azure and the Microsoft 365 cloud, which allows to place your app in Azure with a single command. Teams Toolkit integrates with Azure Resource Manager (ARM), which enables to provision Azure resources that your application needs for code approach.",
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/provision?pivots=visual-studio-code-v5",
    followUp: {
      commandId: "fx-extension.provision",
      args: [],
      title: "Provision Azure resources",
    },
    priorty: 2,
    condition: (status: ProjectStatus) =>
      status.hasTeamsApp &&
      !!status.remoteEnv &&
      !status.remoteEnv.AZURE_SUBSCRIPTION_ID,
  },
  {
    id: "deploy",
    title: "Deploy the App to the cloud",
    description: `
Teams Toolkit helps to deploy or upload the front-end and back-end code in your app to your provisioned cloud resources in Azure.
You can deploy to the following types of cloud resources:
* Azure App Services
* Azure Functions
* Azure Storage (as static website)
* SharePoint`,
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/deploy?pivots=visual-studio-code-v5",
    followUp: {
      commandId: "fx-extension.deploy",
      args: [],
      title: "Deploy the App to the cloud",
    },
    priorty: 2,
    condition: (status: ProjectStatus) =>
      status.hasTeamsApp &&
      !!status.remoteEnv &&
      !!status.remoteEnv.AZURE_SUBSCRIPTION_ID,
  },
  {
    id: "publish",
    title: "Publish the App",
    description:
      "After creating the app, you can distribute your app to different scopes, such as an individual, a team, or an organization. The distribution depends on multiple factors such as needs, business and technical requirements, and your goal for the app. Distribution to different scope may need different review process. In general, the bigger the scope, the more review the app needs to go through for security and compliance concerns.",
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/publish",
    followUp: {
      commandId: "fx-extension.publish",
      args: [],
      title: "Publish the App",
    },
    priorty: 2,
    condition: (status: ProjectStatus) =>
      status.hasTeamsApp &&
      !!status.remoteEnv &&
      !!status.remoteEnv.AZURE_SUBSCRIPTION_ID,
  },
];
