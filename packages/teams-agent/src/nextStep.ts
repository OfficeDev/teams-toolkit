import { DotenvParseOutput } from "dotenv";
import * as vscode from "vscode";

export interface ProjectStatus {
  installed: boolean;
  hasTeamsApp: boolean;
  localEnv?: DotenvParseOutput;
  remoteEnv?: DotenvParseOutput;
}

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
      description:
        "If the project has not installed Teams Toolkit, recommended to install Teams Toolkit",
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
      description: "If the workspace has not a Teams app, create a new project",
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
      description:
        "If '.env.local' file exists in the project and it does not has Teams app id, recommend to preview the App",
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
        "If '.env.dev' file exists in the project and it does not have azure subscription id, provision Azure resources",
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
      description:
        "If '.env.dev' file exists in the project and it has azure subscription id, deploy the App to the cloud",
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
        "If '.env.dev' file exists in the project and it has azure subscription id, users might want to publish the App",
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

export const DefaultNextStep: vscode.ChatAgentReplyFollowup = {
  message: "@teams /nextstep",
  title: vscode.l10n.t("What's next I could do?"),
};

export const DefaultNextStepMessage: vscode.ChatMessage = {
  role: vscode.ChatMessageRole.System,
  content: `
- You are an advisor for Teams App developers.
- You need to help them during their app development.
- You should answer questions that are related to Teams App development.
- You should give some recommendations for next according to the following rules.
1. If the project has not installed Teams Toolkit, recommended to install Teams Toolkit.
2. If the workspace has not a Teams app, create a new project.
3. If '.env.local' file exists in the project and it does not has TEAMS_APP_ID, recommend to preview the App.
4. If '.env.dev' file exists in the project and it does not have AZURE_SUBSCRIPTION_ID, recommend to provision Azure resources.
5. If '.env.dev' file exists in the project and it has AZURE_SUBSCRIPTION_ID, recommend to deploy the App to the cloud.
- Your response should be baesd on the following step list with the format: "{title}: {content}", which {title} is a field of step list and {content} contains the human-like description.
- You must add the {docLink} to the response if the step has the {docLink}.
- If there are multiple steps, you should give the recommendations according to the {priority} of the step. 0 is the highest priority.
`,
};

export function getNextStepMessages(
  status: ProjectStatus,
  prompt?: string
): vscode.ChatMessage[] {
  const allSteps = AllSteps.filter((s) => s.condition(status));
  return [
    DefaultNextStepMessage,
    {
      role: vscode.ChatMessageRole.System,
      content: `- Here are the next step list: ${JSON.stringify(
        allSteps.map((s) => {
          return {
            title: s.title,
            description: s.description,
            docLink: s.docLink,
            priorty: s.priorty,
          };
        })
      )}`,
    },
    {
      role: vscode.ChatMessageRole.System,
      content: `- Here is the project status: ${JSON.stringify(status)}`,
    },
    {
      role: vscode.ChatMessageRole.User,
      content: prompt || "Can you give me some recommendations for next?",
    },
  ];
}
