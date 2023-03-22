// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { performance } from "perf_hooks";

import { FxError, TeamsAppManifest } from "@microsoft/teamsfx-api";
import {
  LocalEnvManager,
  LocalTelemetryReporter,
  TaskCommand,
  TaskLabel,
  TaskOverallLabel,
} from "@microsoft/teamsfx-core/build/common/local";
import { metadataUtil } from "@microsoft/teamsfx-core/build/component/utils/metadataUtil";
import { pathUtils } from "@microsoft/teamsfx-core/build/component/utils/pathUtils";

import * as globalVariables from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryMeasurements,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { getLocalDebugSession, getProjectComponents } from "./commonUtils";
import { TeamsfxTaskProvider } from "./teamsfxTaskProvider";
import { actionName as createAppPackageActionName } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/createAppPackage";
import { actionName as updateAppPackageActionName } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/configure";
import * as fs from "fs-extra";
import * as path from "path";
import { CreateAppPackageArgs } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import { ConfigureTeamsAppArgs } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/interfaces/ConfigureTeamsAppArgs";
import { ProjectModel } from "@microsoft/teamsfx-core/build/component/configManager/interface";
import { Constants as ManifestConstants } from "@microsoft/teamsfx-core/build/component/resource/appManifest/constants";
import AdmZip = require("adm-zip");
import { environmentManager } from "@microsoft/teamsfx-core";

function saveEventTime(eventName: string, time: number) {
  const session = getLocalDebugSession();
  // Assuming the event is only sent once in one local debug session,
  // because we only use the "high-level" events like debug-prerequisites, debug-precheck, etc..
  // And these events are indeed sent once.
  session.eventTimes[eventName] = time;
}

export const localTelemetryReporter = new LocalTelemetryReporter(
  {
    // Cannot directly refer to a global function because of import dependency cycle in ../telemetry/extTelemetry.ts.
    sendTelemetryEvent: (
      eventName: string,
      properties?: { [p: string]: string },
      measurements?: { [p: string]: number }
    ) => ExtTelemetry.sendTelemetryEvent(eventName, properties, measurements),

    sendTelemetryErrorEvent: (
      eventName: string,
      error: FxError,
      properties?: { [p: string]: string },
      measurements?: { [p: string]: number },
      errorProps?: string[]
    ) =>
      ExtTelemetry.sendTelemetryErrorEvent(eventName, error, properties, measurements, errorProps),
  },
  saveEventTime
);

export async function sendDebugInitialEvents(
  projectPath: string | undefined,
  debugAllStartAdditionalProperties: {
    [key: string]: string;
  }
): Promise<void> {
  sendDebugAllStartEvent(debugAllStartAdditionalProperties);
  if (projectPath) {
    sendDebugMetadataEvent(projectPath);
  }
}

export async function sendDebugAllStartEvent(additionalProperties: {
  [key: string]: string;
}): Promise<void> {
  const session = getLocalDebugSession();
  const components = await getProjectComponents();
  session.properties[TelemetryProperty.DebugProjectComponents] = components + "";
  Object.assign(session.properties, additionalProperties);

  const properties = Object.assign(
    { [TelemetryProperty.CorrelationId]: session.id },
    session.properties
  );
  localTelemetryReporter.sendTelemetryEvent(TelemetryEvent.DebugAllStart, properties);
}

async function readManifestFromAppPackage(
  appPackagePath: string
): Promise<TeamsAppManifest | undefined> {
  const appPackageBuffer = await fs.readFile(appPackagePath);
  const admzip = new AdmZip(appPackageBuffer);
  const zipEntries = admzip.getEntries();
  const manifestFile = zipEntries.find((x) => x.entryName === ManifestConstants.MANIFEST_FILE);
  if (manifestFile) {
    const manifestString = manifestFile.getData().toString("utf-8");
    return JSON.parse(manifestString);
  } else {
    return undefined;
  }
}

async function readManifest(projectPath: string, manifestPath: string): Promise<TeamsAppManifest> {
  if (!path.isAbsolute(manifestPath)) {
    manifestPath = path.join(projectPath, manifestPath);
  }
  return await fs.readJson(manifestPath, { encoding: "utf-8" });
}

const defaultManifestPathsV3 = ["appPackage/manifest.json"];

export const ManifestSources = Object.freeze({
  PublishAppPackageManifestPath: "PublishAppPackageManifestPath",
  PublishAppPackageAppPackagePath: "PublishAppPackageAppPackagePath",
  DefaultManifestPath: "DefaultManifestPath",
  DefaultAppPackagePath: "DefaultAppPackagePath",
});
export type ManifestSource = typeof ManifestSources[keyof typeof ManifestSources];

// Find manifest by search in the yaml file with best effort.
async function tryGetManifestFromYml(
  projectPath: string,
  yml: ProjectModel
): Promise<{ source: ManifestSource; manifest: TeamsAppManifest } | undefined> {
  const configureTeamsApp = yml.provision?.driverDefs?.find(
    (item) => item.uses === updateAppPackageActionName
  );
  const configureTeamsAppArgs = configureTeamsApp?.with as
    | Partial<ConfigureTeamsAppArgs>
    | undefined;
  const configureTeamsAppPath = configureTeamsAppArgs?.appPackagePath;

  if (configureTeamsAppPath) {
    // Case 1: Happy path
    // Start from "teamsApp/update".appPackagePath
    // => "teamsApp/zipAppPackage".outputZipPath
    // => "teamsApp/zipAppPackage".manifestPath
    try {
      let manifestPath: string | undefined;
      yml.provision?.driverDefs?.forEach((item) => {
        if (item.uses !== createAppPackageActionName) {
          return;
        }
        const createAppPackageArgs = item.with as Partial<CreateAppPackageArgs> | undefined;
        if (!createAppPackageArgs?.outputZipPath) {
          return;
        }

        if (createAppPackageArgs.outputZipPath === createAppPackageActionName) {
          manifestPath = createAppPackageArgs.manifestPath;
        }
      });
      if (manifestPath) {
        return {
          source: ManifestSources.PublishAppPackageManifestPath,
          manifest: await readManifest(projectPath, manifestPath),
        };
      }
    } catch (e) {
      // fall through next case
    }

    // Case 2: Assume user uploads app package manually
    // Start from "teamsApp/zipAppPackage".appPackagePath
    // => Unzip appPackage (in memory) to get manifest
    try {
      const manifest = await readManifestFromAppPackage(configureTeamsAppPath);
      if (manifest) {
        return {
          source: ManifestSources.PublishAppPackageAppPackagePath,
          manifest,
        };
      }
    } catch (e) {
      // fall through next case
    }
  }

  // Case 3: Assume user zips & uploads app package manually
  // Try default location of manifest: appPackage/manifest.json
  try {
    for (const defaultPath of defaultManifestPathsV3) {
      const manifest = await readManifest(projectPath, defaultPath);
      if (manifest) {
        return {
          source: ManifestSources.DefaultManifestPath,
          manifest,
        };
      }
    }
  } catch (e) {
    // fall through next case
  }

  return undefined;
}

export async function sendDebugMetadataEvent(projectPath: string) {
  // send metadata events before debug
  // - yaml file
  // - manifest template => determine project capabilities (tab, bot, me, spfx)
  // - tasks.json (TODO) => determine project scenario (restify-notification/func-notification, sso/non-sso tab)

  try {
    const localEnv = environmentManager.getLocalEnvName();
    const yamlFilePath = pathUtils.getYmlFilePath(projectPath, localEnv);

    // send yaml metadata
    const yamlResult = await metadataUtil.parse(yamlFilePath, localEnv);
    if (yamlResult.isErr()) {
      return;
    }

    const manifestData = await tryGetManifestFromYml(projectPath, yamlResult.value);
    if (manifestData === undefined) {
      return;
    }

    // TODO: add source to properties of metadataUtil.parseManifest (currently not exposed)
    const { source, manifest } = manifestData;
    // send manifest metadata
    metadataUtil.parseManifest(manifest);
  } catch (e) {
    // ignore telemetry errors
  }
}

export async function sendDebugAllEvent(
  error?: FxError,
  additionalProperties?: { [key: string]: string }
): Promise<void> {
  const session = getLocalDebugSession();
  const now = performance.now();

  let duration = -1;
  const startTime = session.eventTimes[TelemetryEvent.DebugAllStart];
  if (startTime !== undefined) {
    duration = (now - startTime) / 1000;
  }

  // Calculate the time between two events
  // Event must be only once in one debug session.
  function durationBetween(eventStart: string, eventEnd: string): number {
    const t0 = session.eventTimes[eventStart];
    const t1 = session.eventTimes[eventEnd];
    if (t0 !== undefined && t1 !== undefined) {
      return t1 - t0;
    } else {
      return -1;
    }
  }

  // Calculate the "time gap" in a local debug session.
  // In current local debug implementation, there is some time that vscode is in control and extension has no control.
  // For example, between "debug-precheck" (task finishes) and "debug-all" (browser starts), vscode is starting the services.
  // However, we don't know when the services successfully start because we use problem matcher to determine the service start or fail.
  // And vscode does not provide a callback for that.
  // Estimating from the current data, this "time gap" can be up to 1 minute, so not neglectable.
  const precheckGap =
    durationBetween(TelemetryEvent.DebugPrerequisites, TelemetryEvent.DebugPreCheckStart) / 1000;
  const precheckTime = session.eventTimes[TelemetryEvent.DebugPreCheck];
  const servicesGap = precheckTime === undefined ? -1 : (performance.now() - precheckTime) / 1000;

  const properties: { [key: string]: string } = {
    [TelemetryProperty.CorrelationId]: session.id,
    [TelemetryProperty.Success]: error === undefined ? TelemetrySuccess.Yes : TelemetrySuccess.No,
    ...session.properties,
    ...additionalProperties,
  };

  // Transparent task properties
  const taskInfo = await getTaskInfo();
  if (taskInfo && taskInfo.IsTransparentTask) {
    properties[TelemetryProperty.DebugPrelaunchTaskInfo] = JSON.stringify(
      taskInfo.PreLaunchTaskInfo
    );
    properties[TelemetryProperty.DebugIsTransparentTask] =
      properties[TelemetryProperty.DebugIsTransparentTask] ?? "true";
  } else {
    properties[TelemetryProperty.DebugIsTransparentTask] =
      properties[TelemetryProperty.DebugIsTransparentTask] ?? "false";
  }

  const measurements = {
    [LocalTelemetryReporter.PropertyDuration]: duration,
    [TelemetryMeasurements.DebugPrecheckGapDuration]: precheckGap,
    [TelemetryMeasurements.DebugServicesGapDuration]: servicesGap,
  };

  if (error === undefined) {
    localTelemetryReporter.sendTelemetryEvent(TelemetryEvent.DebugAll, properties, measurements);
  } else {
    localTelemetryReporter.sendTelemetryErrorEvent(
      TelemetryEvent.DebugAll,
      error,
      properties,
      measurements
    );
  }
}

export const UnknownPlaceholder = "<unknown>";
export const UndefinedPlaceholder = "<undefined>";
export const DefaultPlaceholder = "<default>";

export function maskValue(
  value: string | undefined,
  knownValues: (string | { value: string; mask: string })[] = []
): string {
  if (typeof value === "undefined") {
    return UndefinedPlaceholder;
  }
  const findValue = knownValues.find((v) =>
    typeof v === "string" ? v === value : v.value === value
  );

  if (typeof findValue === "undefined") {
    return UnknownPlaceholder;
  } else if (typeof findValue === "string") {
    return findValue;
  } else {
    return findValue.mask;
  }
}

export function maskArrayValue(
  valueArr: string[] | undefined,
  knownValues: (string | { value: string; mask: string })[] = []
): string[] | string {
  if (typeof valueArr === "undefined") {
    return UndefinedPlaceholder;
  }

  return valueArr.map((v) => maskValue(`${v}`, knownValues));
}

interface ITaskJson {
  tasks?: ITask[];
}

interface ITask {
  label?: string;
  type?: string;
  command?: string;
  dependsOn?: string | string[];
}

interface IDependsOn {
  label: string;
  type: string;
  command: string;
}

type PreLaunchTaskInfo = { [key: string]: IDependsOn[] | undefined };
type TaskInfo = {
  PreLaunchTaskInfo: PreLaunchTaskInfo;
  IsTransparentTask: boolean;
};

export async function getTaskInfo(): Promise<TaskInfo | undefined> {
  try {
    if (!globalVariables.isTeamsFxProject || !globalVariables.workspaceUri?.fsPath) {
      return undefined;
    }

    const localEnvManager = new LocalEnvManager();
    const taskJson = (await localEnvManager.getTaskJson(
      globalVariables.workspaceUri.fsPath
    )) as ITaskJson;
    if (!taskJson) {
      return undefined;
    }

    const getDependsOn = (overallTaskLabel: string) => {
      const dependsOnArr: IDependsOn[] = [];
      const overallTask = findTask(taskJson, overallTaskLabel);
      if (!overallTask || !overallTask.dependsOn) {
        return undefined;
      }
      const labelList: string[] = Array.isArray(overallTask.dependsOn)
        ? overallTask.dependsOn
        : typeof overallTask.dependsOn === "string"
        ? [overallTask.dependsOn]
        : [];

      for (const label of labelList) {
        const task = findTask(taskJson, label);
        const isTeamsFxTask = task?.type === TeamsfxTaskProvider.type;

        // Only send the info scaffold by Teams Toolkit. If user changed some property, the value will be "unknown".
        dependsOnArr.push({
          label: maskValue(label, Object.values(TaskLabel)),
          type: maskValue(task?.type, [TeamsfxTaskProvider.type]),
          command: !isTeamsFxTask
            ? task?.command
              ? UnknownPlaceholder
              : UndefinedPlaceholder
            : maskValue(task?.command, Object.values(TaskCommand)),
        });
      }
      return dependsOnArr;
    };
    const prelaunchTaskInfo: { [key: string]: IDependsOn[] | undefined } = {};
    Object.values(TaskOverallLabel).forEach((l) => {
      const dependsOn = getDependsOn(l);
      if (dependsOn) {
        prelaunchTaskInfo[l] = dependsOn;
      }
    });

    const teamsfxTasks = taskJson?.tasks?.filter(
      (t) =>
        t?.type === TeamsfxTaskProvider.type &&
        t?.command &&
        Object.values(TaskCommand).includes(t?.command)
    );

    return {
      PreLaunchTaskInfo: prelaunchTaskInfo,
      IsTransparentTask: !!teamsfxTasks?.length,
    };
  } catch {}

  return undefined;
}

function findTask(taskJson: ITaskJson, label: string): ITask | undefined {
  return taskJson?.tasks?.find((task) => task?.label === label);
}
