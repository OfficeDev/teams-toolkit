// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  isDebugSucceededAfterSourceCodeChanged,
  isDidNoActionAfterScaffolded,
  isFirstInstalled,
  isHaveReadMe,
  isProjectOpened,
} from "../../../chat/commands/nextstep/condition";
import { NextStep, WholeStatus } from "../../../chat/commands/nextstep/types";
import { CHAT_EXECUTE_COMMAND_ID } from "../../../chat/consts";
import { CommandKey } from "../../../constants";
import { canOfficeAddInPreviewInLocalEnv, isDependenciesInstalled } from "./condition";

// TODO: align the description with PM
export const officeSteps: () => NextStep[] = () => [
  {
    title: "Teams Toolkit",
    description: `Teams Toolkit makes it simple to get started with app development for Microsoft Office Add-ins using Visual Studio Code. Start with a sample or a project template for common custom app built for your org (LOB app) scenarios. Save setup time with automated app registration and configuration. You can run and debug your Office Add-in locally.

    `,
    docLink:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/install-teams-toolkit?tabs=vscode&pivots=visual-studio-code-v5",
    commands: [
      {
        title: "Open Get-Started Page",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.OpenWelcome],
      },
      {
        title: "Open Document",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.openOfficeDevDocument],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) => isFirstInstalled(status),
    priority: 0,
  },
  {
    title: "New Project",
    description:
      "You can start with built-in Office Add-in templates or start with official Office Add-in samples in Teams Toolkit.",
    docLink: "https://learn.microsoft.com/en-us/office/dev/add-ins/overview/learning-path-beginner",
    commands: [
      {
        title: "Open Sample Gallery",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.OpenSamples],
      },
    ],
    followUps: [
      {
        label: "@office /create",
        command: "create",
        prompt: "",
      },
    ],
    condition: (status: WholeStatus) => !isProjectOpened(status),
    priority: 0,
  },
  {
    title: "Summary of README",
    description: (status: WholeStatus) => {
      // readme must exist because the condition has checked it
      const readme = status.projectOpened!.readmeContent!;
      let description = "";
      let findFirstSharp = false;
      for (const line of readme.split("\n")) {
        if (line.trim().startsWith("#")) {
          findFirstSharp = true;
        }
        if (!findFirstSharp) {
          continue;
        }
        if (line.toLocaleLowerCase().includes("prerequisite")) {
          break;
        }
        description += line.trim() + " ";
      }
      return description;
    },
    commands: [
      {
        title: "Open README",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.OpenReadMe],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) =>
      isProjectOpened(status) && isDidNoActionAfterScaffolded(status) && isHaveReadMe(status),
    priority: 1,
  },
  {
    title: "Install Dependencies",
    description: `Install the dependencies for your Office Add-ins project. It runs ''npm install'' command to install all the dependencies in the terminal.`,
    docLink: "",
    commands: [
      {
        title: "Install Dependencies",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.installDependency],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) =>
      isProjectOpened(status) &&
      !isDidNoActionAfterScaffolded(status) &&
      !isDependenciesInstalled(status),
    priority: 1,
  },
  {
    title: "Preview in Local Environment",
    description: `Preview in Local Environment makes debugging Office Add-in effortless. It works like pressing F5 in Visual Studio Code and you can preview your Add-in in the desktop host application.`,
    docLink: "https://learn.microsoft.com/en-us/office/dev/add-ins/testing/debug-add-ins-overview",
    commands: [
      {
        title: "Preview in Local Environment",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.LocalDebug],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) =>
      isProjectOpened(status) &&
      !isDidNoActionAfterScaffolded(status) &&
      isDependenciesInstalled(status) &&
      canOfficeAddInPreviewInLocalEnv(status) &&
      !isDebugSucceededAfterSourceCodeChanged(status),
    priority: 1,
  },
  {
    title: "Publish to App Source",
    description: `Office Add-in can be published to App Source for internal or external users. You can publish your Add-in to App Source and share it with others.`,
    docLink:
      "https://learn.microsoft.com/en-us/partner-center/marketplace/submit-to-appsource-via-partner-center",
    commands: [
      {
        title: "Publish to App Source",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.publishToAppSource],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) =>
      isProjectOpened(status) &&
      !isDidNoActionAfterScaffolded(status) &&
      isDependenciesInstalled(status) &&
      isDebugSucceededAfterSourceCodeChanged(status),
    priority: 2,
  },
  {
    title: "Deploy",
    description: `Office Add-in can be deployed to App Source for internal or external users. You can deploy your Add-in to App Source and share it with others.`,
    docLink:
      "https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish#deployment-options-by-office-application-and-add-in-type",
    commands: [
      {
        title: "Deploy",
        command: CHAT_EXECUTE_COMMAND_ID,
        arguments: [CommandKey.openDeployLink],
      },
    ],
    followUps: [],
    condition: (status: WholeStatus) =>
      isProjectOpened(status) &&
      !isDidNoActionAfterScaffolded(status) &&
      isDependenciesInstalled(status) &&
      isDebugSucceededAfterSourceCodeChanged(status),
    priority: 2,
  },
];
