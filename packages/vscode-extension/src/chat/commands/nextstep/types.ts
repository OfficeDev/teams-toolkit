// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ChatFollowup, Command } from "vscode";
import { CommandKey } from "../../../constants";

export interface CommandRunningStatus {
  result: "success" | "fail" | "no run";
  time: Date;
}

export interface MachineStatus {
  firstInstalled: boolean; // if TTK is first installed
  m365LoggedIn: boolean; // if the user has logged in M365
  azureLoggedIn: boolean; // if the user has logged in Azure
}

export interface ProjectActionStatus {
  [CommandKey.LocalDebug]: CommandRunningStatus; // the status of last debugging
  [CommandKey.Provision]: CommandRunningStatus; // the status of last provisioning
  [CommandKey.Deploy]: CommandRunningStatus; // the status of last deploying
  [CommandKey.Publish]: CommandRunningStatus; // the status of last publishing
  [CommandKey.OpenReadMe]: CommandRunningStatus; // the status of last showing/summarizing readme
}

export interface WholeStatus {
  machineStatus: MachineStatus;
  projectOpened?: {
    path: string; // the path of the opened app
    projectId?: string; // the project id of the opened app, it is from teamsapp.yml
    codeModifiedTime: {
      source: Date; // the time when the source code is modified
      infra: Date; // the time when the infra is modified
    };
    actionStatus: ProjectActionStatus;
    readmeContent?: string; // the content of the readme file
    launchJSONContent?: string; // the content of the .vscode/launch.json
    nodeModulesExist?: boolean; // if the node_modules folder exists
  };
}

export type Condition = (status: WholeStatus) => boolean;
export type DescripitionFunc = (status: WholeStatus) => string;

export interface NextStep {
  title: string;
  description: string | DescripitionFunc;
  docLink?: string;
  commands: Command[];
  followUps: ChatFollowup[];
  condition: Condition;
  priority: 0 | 1 | 2; // 0: high, 1: medium, 2: low
}
