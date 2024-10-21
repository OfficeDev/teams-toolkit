// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import { Mutex, withTimeout } from "async-mutex";
import fs from "fs-extra";
import path from "path";
import { featureFlagManager, FeatureFlags } from "@microsoft/teamsfx-core";
import { context, workspaceUri } from "../../../globalVariables";

interface IDevTunnelState {
  tunnelId?: string;
  clusterId?: string;
  sessionId?: string;
}

export class DevTunnelStateManager {
  // TODO: use read-write lock
  private static mutex = withTimeout(new Mutex(), 1000);
  private readonly devTunnelStateKey = "teamsToolkit:devtunnel";
  private stateService: IStateService;

  constructor(stateService: IStateService) {
    this.stateService = stateService;
  }

  public static create(): DevTunnelStateManager {
    const stateService = featureFlagManager.getBooleanValue(FeatureFlags.DevTunnelTest)
      ? new FileStateService()
      : new VSCodeStateService();
    return new DevTunnelStateManager(stateService);
  }

  public async deleteTunnelState(tunnelState: IDevTunnelState): Promise<void> {
    try {
      if (!tunnelState.tunnelId) {
        return;
      }
      await DevTunnelStateManager.mutex.runExclusive(async () => {
        const devTunnelStates = await this._listDevTunnelStates();
        const updatedTunnelState = devTunnelStates.filter(
          (t) => t.clusterId !== tunnelState.clusterId || t.tunnelId !== tunnelState.tunnelId
        );
        await this.stateService.update(this.devTunnelStateKey, updatedTunnelState);
      });
    } catch {}
  }

  public async setTunnelState(tunnelState: IDevTunnelState): Promise<void> {
    try {
      if (!tunnelState.tunnelId) {
        return;
      }

      await DevTunnelStateManager.mutex.runExclusive(async () => {
        const devTunnelStates = await this._listDevTunnelStates();
        devTunnelStates.push({
          tunnelId: tunnelState.tunnelId,
          clusterId: tunnelState.clusterId,
          sessionId: tunnelState.sessionId,
        });
        await this.stateService.update(this.devTunnelStateKey, devTunnelStates);
      });
    } catch {}
  }

  public async listDevTunnelStates(): Promise<IDevTunnelState[]> {
    try {
      return await DevTunnelStateManager.mutex.runExclusive(async () => {
        return await this._listDevTunnelStates();
      });
    } catch {
      return [];
    }
  }

  private async _listDevTunnelStates(): Promise<IDevTunnelState[]> {
    return (await this.stateService.get<IDevTunnelState[]>(this.devTunnelStateKey)) ?? [];
  }
}

interface IStateService {
  get<T>(key: string): Promise<T | undefined>;
  update(key: string, value: any): Promise<void>;
}

class VSCodeStateService implements IStateService {
  get<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      resolve(context.workspaceState.get<T>(key));
    });
  }

  async update(key: string, value: any): Promise<void> {
    await context.workspaceState.update(key, value);
  }
}

class FileStateService implements IStateService {
  private readonly stateFileName = "devtunnel.state.json";
  async get<T>(key: string): Promise<T | undefined> {
    try {
      if (!workspaceUri?.fsPath) {
        return undefined;
      }
      const data = await fs.readJson(path.resolve(workspaceUri.fsPath, this.stateFileName));

      return data?.[key] as T;
    } catch {
      return undefined;
    }
  }

  async update(key: string, value: any): Promise<void> {
    try {
      if (!workspaceUri?.fsPath) {
        return;
      }
      const stateFilePath = path.resolve(workspaceUri.fsPath, this.stateFileName);
      let data: { [key: string]: any } = {};
      try {
        data = await fs.readJson(stateFilePath);
      } catch {}

      data[key] = value;
      await fs.writeJson(stateFilePath, data);
    } catch {}
  }
}
