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
  SystemError,
} from "@microsoft/teamsfx-api";
import { EnvInfoV3 } from "@microsoft/teamsfx-api/build/v3";
import { PathNotExistError } from "../../../../../core";
import { LocalCrypto } from "../../../../../core/crypto";
import { environmentManager, newEnvInfo } from "../../../../../core/environment";
import { PluginNames, SolutionError, SolutionSource } from "../../constants";
import { BotOptionItem } from "../../question";
import { TunnelInfo } from "./microsoftTunnelingManager";

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
    return err(
      new SystemError(SolutionSource, SolutionError.FeatureNotSupported, "Not implemented")
    );
  }

  const [_, solutionState] = getEnvAndSolutionState(localEnvInfoResult.value);

  const tunnelsClusterId = stringOrUndefined(
    solutionState?.get(nameOf<TunnelInfo>("tunnelsClusterId"))
  );
  const tunnelsId = stringOrUndefined(solutionState?.get(nameOf<TunnelInfo>("tunnelsId")));

  return ok({
    tunnelsClusterId,
    tunnelsId,
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
      return err(
        new SystemError(SolutionSource, SolutionError.FeatureNotSupported, "Not implemented")
      );
    }
    localEnvInfo = localEnvInfoResult.value;
  }

  // Don't fail because this could be the first local debug of this project.
  const [envState, solutionState] = localEnvInfo
    ? getEnvAndSolutionState(localEnvInfo)
    : newEnvAndSolutionState();

  solutionState.set(nameOf<TunnelInfo>("tunnelsClusterId"), tunnelInfo.tunnelsClusterId);
  solutionState.set(nameOf<TunnelInfo>("tunnelsId"), tunnelInfo.tunnelsId);

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
