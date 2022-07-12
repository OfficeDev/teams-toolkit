import { appInitialization } from "@microsoft/teams-js";

appInitialization.notifySuccess();

microsoftTeams.initialize();

msft.initialize();

const x1: microsoftTeams.TaskInfo | undefined = undefined;
const x2: msft.TaskInfo | undefined = undefined;

async function f2(x: microsoftTeams.TaskInfo): Promise<microsoftTeams.TaskInfo> {
  return x;
}

async function f1(x: msft.TaskInfo): Promise<msft.TaskInfo> {
  return x;
}

microsoftTeams.TaskModuleDimension.Medium;
msft.TaskModuleDimension.Medium;
