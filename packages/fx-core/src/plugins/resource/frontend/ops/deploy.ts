// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureStorageClient } from "../clients";
import {
  BuildError,
  ClearStorageError,
  GetContainerError,
  NpmInstallError,
  UploadToStorageError,
  runWithErrorCatchAndThrow,
  NoBuildPathError,
} from "../resources/errors";
import { Commands, Constants, FrontendPathInfo, TelemetryEvent } from "../constants";
import { DeploySteps, ProgressHelper } from "../utils/progress-helper";
import { Logger } from "../utils/logger";
import { Messages } from "../resources/messages";
import { Utils } from "../utils";
import fs from "fs-extra";
import path from "path";
import { TelemetryHelper } from "../utils/telemetry-helper";
import { envFileName, envFileNamePrefix, RemoteEnvs } from "../env";
import { IProgressHandler } from "../../../../../../api/build";
import * as v3error from "../v3/error";

interface DeploymentInfo {
  lastBuildTime?: string;
  lastDeployTime?: string;
}

export class FrontendDeployment {
  public static async needBuild(componentPath: string, envName: string): Promise<boolean> {
    const lastBuildTime = await FrontendDeployment.getLastBuildTime(componentPath, envName);
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

  public static async doFrontendBuild(
    componentPath: string,
    envs: RemoteEnvs,
    envName: string
  ): Promise<void> {
    if (!(await FrontendDeployment.needBuild(componentPath, envName))) {
      return FrontendDeployment.skipBuild();
    }

    const progressHandler = ProgressHelper.deployProgress;

    await progressHandler?.next(DeploySteps.NPMInstall);
    await runWithErrorCatchAndThrow(new NpmInstallError(), async () => {
      await Utils.execute(Commands.InstallNodePackages, componentPath);
    });

    await progressHandler?.next(DeploySteps.Build);
    await runWithErrorCatchAndThrow(new BuildError(), async () => {
      await Utils.execute(Commands.BuildFrontend, componentPath, {
        ...envs.customizedRemoteEnvs,
        ...envs.teamsfxRemoteEnvs,
      });
    });
    await FrontendDeployment.saveDeploymentInfo(componentPath, envName, {
      lastBuildTime: new Date().toISOString(),
    });
  }
  public static async doFrontendBuildV3(
    componentPath: string,
    envs: RemoteEnvs,
    envName: string,
    progress?: IProgressHandler
  ): Promise<void> {
    const skip = await FrontendDeployment.needBuild(componentPath, envName);
    await progress?.next(DeploySteps.NPMInstall);
    if (!skip) {
      await runWithErrorCatchAndThrow(new v3error.NpmInstallError(), async () => {
        await Utils.execute(Commands.InstallNodePackages, componentPath);
      });
    }
    await progress?.next(DeploySteps.Build);
    if (!skip) {
      await runWithErrorCatchAndThrow(new v3error.BuildError(), async () => {
        await Utils.execute(Commands.BuildFrontend, componentPath, {
          ...envs.customizedRemoteEnvs,
          ...envs.teamsfxRemoteEnvs,
        });
      });
      await FrontendDeployment.saveDeploymentInfo(componentPath, envName, {
        lastBuildTime: new Date().toISOString(),
      });
    }
  }
  public static async skipBuild(): Promise<void> {
    Logger.info(Messages.SkipBuild);

    const progressHandler = ProgressHelper.deployProgress;
    await progressHandler?.next(DeploySteps.NPMInstall);
    await progressHandler?.next(DeploySteps.Build);
  }

  public static async getBuiltPath(componentPath: string): Promise<string> {
    const builtPath = path.join(componentPath, FrontendPathInfo.BuildPath);
    const pathExists = await fs.pathExists(builtPath);
    if (!pathExists) {
      throw new NoBuildPathError();
    }
    return builtPath;
  }

  public static async doFrontendDeployment(
    client: AzureStorageClient,
    componentPath: string,
    envName: string
  ): Promise<void> {
    if (!(await FrontendDeployment.needDeploy(componentPath, envName))) {
      return FrontendDeployment.skipDeployment();
    }

    const progressHandler = ProgressHelper.deployProgress;

    await progressHandler?.next(DeploySteps.getSrcAndDest);
    const builtPath = await FrontendDeployment.getBuiltPath(componentPath);
    const container = await runWithErrorCatchAndThrow(
      new GetContainerError(),
      async () => await client.getContainer(Constants.AzureStorageWebContainer)
    );

    await progressHandler?.next(DeploySteps.Clear);
    await runWithErrorCatchAndThrow(new ClearStorageError(), async () => {
      await client.deleteAllBlobs(container);
    });

    await progressHandler?.next(DeploySteps.Upload);
    await runWithErrorCatchAndThrow(new UploadToStorageError(), async () => {
      await client.uploadFiles(container, builtPath);
    });

    await FrontendDeployment.saveDeploymentInfo(componentPath, envName, {
      lastDeployTime: new Date().toISOString(),
    });
  }

  public static async doFrontendDeploymentV3(
    client: AzureStorageClient,
    componentPath: string,
    envName: string,
    progress?: IProgressHandler
  ): Promise<void> {
    const skip = await FrontendDeployment.needDeploy(componentPath, envName);
    if (!skip) {
      await progress?.next(DeploySteps.getSrcAndDest);
      await progress?.next(DeploySteps.Clear);
      await progress?.next(DeploySteps.Upload);
      return;
    }
    await progress?.next(DeploySteps.getSrcAndDest);
    const builtPath = await FrontendDeployment.getBuiltPath(componentPath);
    const container = await runWithErrorCatchAndThrow(
      new v3error.GetContainerError(),
      async () => await client.getContainer(Constants.AzureStorageWebContainer)
    );

    await progress?.next(DeploySteps.Clear);
    await runWithErrorCatchAndThrow(new v3error.ClearStorageError(), async () => {
      await client.deleteAllBlobs(container);
    });

    await progress?.next(DeploySteps.Upload);
    await runWithErrorCatchAndThrow(new v3error.UploadToStorageError(), async () => {
      await client.uploadFiles(container, builtPath);
    });
    await FrontendDeployment.saveDeploymentInfo(componentPath, envName, {
      lastDeployTime: new Date().toISOString(),
    });
  }

  public static async skipDeployment(): Promise<void> {
    TelemetryHelper.sendGeneralEvent(TelemetryEvent.SkipDeploy);
    Logger.warning(Messages.SkipDeploy);

    const progressHandler = ProgressHelper.deployProgress;
    await progressHandler?.next(DeploySteps.getSrcAndDest);
    await progressHandler?.next(DeploySteps.Clear);
    await progressHandler?.next(DeploySteps.Upload);
  }

  private static async hasUpdatedContent(
    componentPath: string,
    referenceTime: Date,
    filter?: (itemPath: string) => boolean
  ): Promise<boolean> {
    const folderFilter = (itemPath: string) =>
      !FrontendPathInfo.TabDeployIgnoreFolder.includes(path.basename(itemPath));

    let changed = false;
    await Utils.forEachFileAndDir(
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
    envName: string
  ): Promise<DeploymentInfo | undefined> {
    const deploymentDir = path.join(componentPath, FrontendPathInfo.TabDeploymentFolderName);
    const deploymentInfoPath = path.join(deploymentDir, FrontendPathInfo.TabDeploymentInfoFileName);

    try {
      const deploymentInfoJson = await fs.readJSON(deploymentInfoPath);
      if (!deploymentInfoJson) {
        return undefined;
      }
      return deploymentInfoJson[envName];
    } catch {
      TelemetryHelper.sendGeneralEvent(TelemetryEvent.DeploymentInfoNotFound);
      return undefined;
    }
  }

  private static async getLastBuildTime(
    componentPath: string,
    envName: string
  ): Promise<Date | undefined> {
    const deploymentInfoJson = await FrontendDeployment.getDeploymentInfo(componentPath, envName);
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

  private static async saveDeploymentInfo(
    componentPath: string,
    envName: string,
    deploymentInfo: DeploymentInfo
  ): Promise<void> {
    const deploymentDir = path.join(componentPath, FrontendPathInfo.TabDeploymentFolderName);
    const deploymentInfoPath = path.join(deploymentDir, FrontendPathInfo.TabDeploymentInfoFileName);

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
