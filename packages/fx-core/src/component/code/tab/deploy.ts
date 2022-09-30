// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { PathConstants } from "../../constants";
import { TabDeployIgnoreFolder } from "./constants";
import { forEachFileAndDir } from "../../utils/fileOperation";
import { envFileName, envFileNamePrefix } from "./env";
import { TelemetryEvent } from "../../../common/telemetry";
import { TelemetryReporter } from "@microsoft/teamsfx-api";

interface DeploymentInfo {
  lastBuildTime?: string;
  lastDeployTime?: string;
}

export class FrontendDeployment {
  public static async needBuild(
    componentPath: string,
    envName: string,
    telemetryReporter?: TelemetryReporter
  ): Promise<boolean> {
    const lastBuildTime = await FrontendDeployment.getLastBuildTime(
      componentPath,
      envName,
      telemetryReporter
    );
    if (!lastBuildTime) {
      return true;
    }
    return FrontendDeployment.hasUpdatedContent(
      componentPath,
      lastBuildTime,
      (itemPath) => !itemPath.startsWith(envFileNamePrefix) || itemPath === envFileName(envName)
    );
  }

  public static async needDeploy(componentPath: string, envName: string): Promise<boolean> {
    const lastBuildTime = await FrontendDeployment.getLastBuildTime(componentPath, envName);
    const lastDeployTime = await FrontendDeployment.getLastDeploymentTime(componentPath, envName);
    if (!lastBuildTime || !lastDeployTime) {
      return true;
    }
    return lastDeployTime < lastBuildTime;
  }

  private static async hasUpdatedContent(
    componentPath: string,
    referenceTime: Date,
    filter?: (itemPath: string) => boolean
  ): Promise<boolean> {
    const folderFilter = (itemPath: string) =>
      !TabDeployIgnoreFolder.includes(path.basename(itemPath));

    let changed = false;
    await forEachFileAndDir(
      componentPath,
      (itemPath, stats) => {
        const relativePath = path.relative(componentPath, itemPath);
        if (relativePath && referenceTime < stats.mtime && (!filter || filter(relativePath))) {
          changed = true;
          return true;
        }
      },
      folderFilter
    );

    return changed;
  }

  private static async getDeploymentInfo(
    componentPath: string,
    envName: string,
    telemetryReporter?: TelemetryReporter
  ): Promise<DeploymentInfo | undefined> {
    const deploymentDir = path.join(componentPath, PathConstants.deploymentInfoFolder);
    const deploymentInfoPath = path.join(deploymentDir, PathConstants.deploymentInfoFile);

    try {
      const deploymentInfoJson = await fs.readJSON(deploymentInfoPath);
      if (!deploymentInfoJson) {
        return undefined;
      }
      return deploymentInfoJson[envName];
    } catch {
      telemetryReporter?.sendTelemetryEvent(TelemetryEvent.DeploymentInfoNotFound);
      return undefined;
    }
  }

  private static async getLastBuildTime(
    componentPath: string,
    envName: string,
    telemetryReporter?: TelemetryReporter
  ): Promise<Date | undefined> {
    const deploymentInfoJson = await FrontendDeployment.getDeploymentInfo(
      componentPath,
      envName,
      telemetryReporter
    );
    return deploymentInfoJson?.lastBuildTime
      ? new Date(deploymentInfoJson.lastBuildTime)
      : undefined;
  }

  private static async getLastDeploymentTime(
    componentPath: string,
    envName: string
  ): Promise<Date | undefined> {
    const deploymentInfoJson = await FrontendDeployment.getDeploymentInfo(componentPath, envName);
    return deploymentInfoJson?.lastDeployTime
      ? new Date(deploymentInfoJson.lastDeployTime)
      : undefined;
  }

  public static async saveDeploymentInfo(
    componentPath: string,
    envName: string,
    deploymentInfo: DeploymentInfo
  ): Promise<void> {
    const deploymentDir = path.join(componentPath, PathConstants.deploymentInfoFolder);
    const deploymentInfoPath = path.join(deploymentDir, PathConstants.deploymentInfoFile);

    await fs.ensureDir(deploymentDir);
    let deploymentInfoJson: any = {};
    try {
      deploymentInfoJson = await fs.readJSON(deploymentInfoPath);
    } catch {
      // Failed to read info file, which doesn't block deployment
    }

    deploymentInfoJson[envName] ??= {};
    deploymentInfoJson[envName].lastBuildTime =
      deploymentInfo.lastBuildTime ?? deploymentInfoJson[envName].lastBuildTime;
    deploymentInfoJson[envName].lastDeployTime =
      deploymentInfo.lastDeployTime ?? deploymentInfoJson[envName].lastDeployTime;

    try {
      await fs.writeJSON(deploymentInfoPath, deploymentInfoJson);
    } catch {
      // Failed to write deployment info, which doesn't block deployment
    }
  }
}
