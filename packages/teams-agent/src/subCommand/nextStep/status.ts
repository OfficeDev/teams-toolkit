import * as fs from "fs-extra";
import { glob } from "glob";
import { executeCommand } from "./command";
import Constants from "./constants";
import {
  CommandRunningStatus,
  MachineStatus,
  ProjectActionStatus,
  WholeStatus,
} from "./types";

function emptyProjectStatus(): ProjectActionStatus {
  return {
    debug: { result: "no run", time: new Date(0) },
    provision: { result: "no run", time: new Date(0) },
    deploy: { result: "no run", time: new Date(0) },
    publish: { result: "no run", time: new Date(0) },
    openReadMe: { result: "no run", time: new Date(0) },
  };
}

export async function getWholeStatus(folder?: string): Promise<WholeStatus> {
  if (!folder) {
    return {
      machineStatus: await getMachineStatus(),
    };
  } else {
    const projectId = await getProjectId(folder);
    const actionStatus =
      (await getProjectStatus(projectId ?? folder)) ?? emptyProjectStatus();
    const codeModifiedTime = {
      source: await getFileModifiedTime(`${folder}/**/*.{ts,tsx,js,jsx}`),
      infra: await getFileModifiedTime(`${folder}/infra/**/*`),
    };

    return {
      machineStatus: await getMachineStatus(),
      projectOpened: {
        path: folder,
        projectId,
        codeModifiedTime,
        readmeContent: await getREADME(folder),
        actionStatus,
        launchJSONContent: await getLaunchJSON(folder),
      },
    };
  }
}

export async function getMachineStatus(): Promise<MachineStatus> {
  const p = resolveEnvInPath(Constants.globalStatePath);
  let firstInstalled = true;
  if (await fs.exists(p)) {
    try {
      const content = await fs.readFile(p, "utf8");
      const json = JSON.parse(content);
      firstInstalled = !(
        json["ms-teams-vscode-extension.welcomePage.shown"] ?? false
      );
    } catch (e) {
      console.error(e);
    }
  }
  const result = await executeCommand(
    "fx-extension.validate-getStarted-prerequisites"
  );
  return {
    firstInstalled,
    resultOfPrerequistes: result instanceof Error ? result.message : undefined,
    m365LoggedIn: fs.existsSync(
      resolveEnvInPath(Constants.account.m365CachePath)
    ),
    azureLoggedIn: fs.existsSync(
      resolveEnvInPath(Constants.account.azureCachePath)
    ),
  };
}

export async function getProjectStatus(
  projectId: string
): Promise<ProjectActionStatus | undefined> {
  const p = resolveEnvInPath(Constants.globalProjectStatePath);
  if (await fs.exists(p)) {
    try {
      const content = await fs.readFile(p, "utf8");
      const json = JSON.parse(content, (_, value) => {
        const date = Date.parse(value);
        if (!isNaN(date)) {
          return new Date(date);
        } else {
          return value;
        }
      });
      return json[projectId] as ProjectActionStatus;
    } catch (e) {
      console.error(e);
    }
  }
  return undefined;
}

export async function setProjectStatus(
  projectId: string,
  command: string,
  status: CommandRunningStatus
) {
  const projectStatus =
    (await getProjectStatus(projectId)) ?? emptyProjectStatus();
  const newStatus = { ...projectStatus, [command]: status };
  await saveProjectStatus(projectId, newStatus);
}

export async function saveProjectStatus(
  projectId: string,
  status: ProjectActionStatus
) {
  const p = resolveEnvInPath(Constants.globalProjectStatePath);
  let content = "{}";
  if (await fs.exists(p)) {
    try {
      content = await fs.readFile(p, "utf8");
    } catch (e) {
      console.error(e);
    }
  }
  try {
    const json = JSON.parse(content);
    json[projectId] = status;
    await fs.writeFile(p, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}

export async function getProjectId(
  folder: string
): Promise<string | undefined> {
  const p = `${folder}/teamsapp.yml`;
  if (await fs.exists(p)) {
    try {
      const content = await fs.readFile(p, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.startsWith("projectId:")) {
          return line.split(":")[1].trim();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  return undefined;
}

export async function getFileModifiedTime(pattern: string): Promise<Date> {
  const files = glob.sync(pattern);
  let lastModifiedTime = new Date(0);
  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.mtime > lastModifiedTime) {
      lastModifiedTime = stat.mtime;
    }
  }
  return lastModifiedTime;
}

export async function getREADME(folder: string): Promise<string | undefined> {
  const readmePath = `${folder}/README.md`;
  if (await fs.exists(readmePath)) {
    return await fs.readFile(readmePath, "utf-8");
  }
  return undefined;
}

export async function getLaunchJSON(
  folder: string
): Promise<string | undefined> {
  const launchJSONPath = `${folder}/.vscode/launch.json`;
  if (await fs.exists(launchJSONPath)) {
    return await fs.readFile(launchJSONPath, "utf-8");
  }
  return undefined;
}

export function resolveEnvInPath(p: string) {
  return p.replace(/%([^%]+)%/g, (_, n) => process.env[n] as string);
}
