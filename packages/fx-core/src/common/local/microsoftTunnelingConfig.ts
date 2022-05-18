// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ok,
  err,
  FxError,
  Result,
  EnvInfo,
  ProjectSettings,
  AzureSolutionSettings,
  ConfigMap,
  v3,
} from "@microsoft/teamsfx-api";
import { PathNotExistError, NotImplementedError } from "../../core/error";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { BotOptionItem } from "../../plugins/solution/fx-solution/question";
import { TunnelInfo } from "./microsoftTunnelingManager";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";

export const TunnelPorts: {
  [name: string]: { ports: number[]; tunnelNeeded: (projectSettings: ProjectSettings) => boolean };
} = {
  // TODO: support other types of app for mobile
  bot: {
    ports: [3978],
    tunnelNeeded: (projectSettings: ProjectSettings): boolean => {
      const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
      return !!solutionSettings?.capabilities?.includes(BotOptionItem.id);
    },
  },
};

export async function loadTunnelInfo(
  projectPath: string,
  projectId: string
): Promise<Result<TunnelInfo, FxError>> {
  const crypto = new LocalCrypto(projectId);
  const localEnvInfoResult = await environmentManager.loadEnvInfo(
    projectPath,
    crypto,
    environmentManager.getLocalEnvName()
  );
  if (localEnvInfoResult.isErr()) {
    if (localEnvInfoResult.error instanceof PathNotExistError) {
      // Do not fail if the env state file are not created yet.
      return ok({});
    }
    return err(localEnvInfoResult.error);
  }
  if (!isEnvInfo(localEnvInfoResult.value)) {
    return err(new NotImplementedError("loadTunnelInfo() for V3"));
  }

  const [_, solutionState] = getEnvAndSolutionState(localEnvInfoResult.value);

  const tunnelClusterId = stringOrUndefined(
    solutionState?.get(nameOf<TunnelInfo>("tunnelClusterId"))
  );
  const tunnelId = stringOrUndefined(solutionState?.get(nameOf<TunnelInfo>("tunnelId")));

  return ok({
    tunnelClusterId,
    tunnelId,
  });
}

export async function storeTunnelInfo(
  projectPath: string,
  projectId: string,
  tunnelInfo: TunnelInfo
): Promise<Result<void, FxError>> {
  const crypto = new LocalCrypto(projectId);
  const localEnvInfoResult = await environmentManager.loadEnvInfo(
    projectPath,
    crypto,
    environmentManager.getLocalEnvName()
  );

  let localEnvInfo = undefined;
  if (localEnvInfoResult.isOk()) {
    if (!isEnvInfo(localEnvInfoResult.value)) {
      return err(new NotImplementedError("loadTunnelInfo() for V3"));
    }
    localEnvInfo = localEnvInfoResult.value;
  }

  // Don't fail because this could be the first local debug of this project.
  const [envState, solutionState] = localEnvInfo
    ? getEnvAndSolutionState(localEnvInfo)
    : newEnvAndSolutionState();

  // Save the write file effort if not changed
  let changed = false;
  const keys: (keyof TunnelInfo)[] = ["tunnelId", "tunnelClusterId"];
  for (const key of keys) {
    const value = tunnelInfo[key];
    if (value != solutionState.get(key)) {
      solutionState.set(key, value);
      changed = true;
    }
  }
  if (!changed) {
    return ok(undefined);
  }

  solutionState.set(nameOf<TunnelInfo>("tunnelId"), tunnelInfo.tunnelId);
  const result = await environmentManager.writeEnvState(
    envState,
    projectPath,
    crypto,
    environmentManager.getLocalEnvName()
  );
  if (result.isErr()) {
    return err(result.error);
  }
  return ok(undefined);
}

export async function getTunnelPorts(projectSettings: ProjectSettings): Promise<number[]> {
  const allPorts = new Set<number>();
  for (const name in TunnelPorts) {
    const feature = TunnelPorts[name];
    if (feature.tunnelNeeded(projectSettings)) {
      feature.ports.forEach((port) => allPorts.add(port));
    }
  }

  return [...allPorts];
}

function nameOf<T>(name: keyof T): keyof T {
  return name;
}

function isEnvInfo(envInfo: EnvInfo | v3.EnvInfoV3 | undefined): envInfo is EnvInfo {
  return envInfo !== undefined && envInfo.state instanceof Map;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Returns [envState, solutionState] and make sure solutionState is a reference of envState.get(PluginNames.SOLUTION).
function getEnvAndSolutionState(envInfo: EnvInfo): [Map<string, unknown>, ConfigMap] {
  const solutionStateRaw: unknown = envInfo.state.get(PluginNames.SOLUTION);
  const solutionState = solutionStateRaw instanceof ConfigMap ? solutionStateRaw : new ConfigMap();
  envInfo.state.set(PluginNames.SOLUTION, solutionState);
  return [envInfo.state, solutionState];
}

// Returns [envState, solutionState] and make sure solutionState is a reference of envState.get(PluginNames.SOLUTION).
function newEnvAndSolutionState(): [Map<string, unknown>, ConfigMap] {
  const solutionState = new ConfigMap();
  const envState = new Map([[PluginNames.SOLUTION, solutionState]]);
  return [envState, solutionState];
}
