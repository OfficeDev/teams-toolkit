// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import semver from "semver";
import {
  nodeNotFoundHelpLink,
  nodeNotSupportedForAzureHelpLink,
  nodeNotSupportedForSPFxHelpLink,
  v3NodeNotFoundHelpLink,
  v3NodeNotSupportedHelpLink,
} from "../constant/helpLink";
import { Messages } from "../constant/message";
import { DepsCheckerEvent } from "../constant/telemetry";
import { DependencyStatus, DepsChecker, DepsType, InstallOptions } from "../depsChecker";
import {
  DepsCheckerError,
  NodeNotFoundError,
  NodeNotRecommendedError,
  NodeNotSupportedError,
} from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { cpUtils } from "../util/cpUtils";

const NodeName = "Node.js";

class NodeVersion {
  public readonly version: string;
  public readonly majorVersion: string;

  constructor(version: string, majorVersion: string) {
    this.version = version;
    this.majorVersion = majorVersion;
  }
}

export abstract class NodeChecker implements DepsChecker {
  protected abstract readonly _nodeNotFoundHelpLink: string;
  protected abstract readonly _nodeNotSupportedEvent: DepsCheckerEvent;
  protected abstract readonly _type: DepsType;
  protected abstract getSupportedVersions(projectPath?: string): Promise<string[]>;
  protected abstract getNodeNotSupportedHelpLink(): Promise<string>;
  protected abstract isVersionSupported(supportedVersions: string[], version: NodeVersion): boolean;
  protected abstract readonly _minErrorVersion: number;
  protected abstract readonly _maxErrorVersion: number;

  private readonly _telemetry: DepsTelemetry;
  private readonly _logger: DepsLogger;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async getInstallationInfo(installOptions?: InstallOptions): Promise<DependencyStatus> {
    let supportedVersions: string[] = [];
    try {
      supportedVersions = await this.getSupportedVersions(installOptions?.projectPath);

      this._logger.debug(
        `NodeChecker checking for supported versions: '${JSON.stringify(supportedVersions)}'`
      );

      const currentVersion = await NodeChecker.getInstalledNodeVersion();
      if (currentVersion === null) {
        this._telemetry.sendUserErrorEvent(
          DepsCheckerEvent.nodeNotFound,
          "Node.js can't be found."
        );
        const error = new NodeNotFoundError(
          Messages.NodeNotFound()
            .split("@NodeVersion")
            .join(supportedVersions[supportedVersions.length - 1]),
          this._nodeNotFoundHelpLink
        );
        return await this.getDepsInfo(false, supportedVersions, undefined, error);
      }
      this._telemetry.sendEvent(DepsCheckerEvent.nodeVersion, {
        "global-version": `${currentVersion.version}`,
        "global-major-version": `${currentVersion.majorVersion}`,
      });

      if (!this.isVersionSupported(supportedVersions, currentVersion)) {
        const supportedVersionsString =
          this._type === DepsType.ProjectNode
            ? supportedVersions.join(" ,")
            : supportedVersions.map((v) => "v" + v).join(" ,");
        this._telemetry.sendUserErrorEvent(
          this._nodeNotSupportedEvent,
          `Node.js ${currentVersion.version} is not supported.`
        );
        return NodeChecker.isVersionError(
          this._minErrorVersion,
          this._maxErrorVersion,
          currentVersion
        )
          ? await this.getDepsInfo(
              false,
              supportedVersions,
              currentVersion.version,
              new NodeNotSupportedError(
                Messages.NodeNotSupported()
                  .split("@CurrentVersion")
                  .join(currentVersion.version)
                  .split("@SupportedVersions")
                  .join(supportedVersionsString),
                await this.getNodeNotSupportedHelpLink()
              )
            )
          : await this.getDepsInfo(
              true,
              supportedVersions,
              currentVersion.version,
              new NodeNotRecommendedError(
                Messages.NodeNotRecommended()
                  .split("@CurrentVersion")
                  .join(currentVersion.version)
                  .split("@SupportedVersions")
                  .join(supportedVersionsString),
                await this.getNodeNotSupportedHelpLink()
              )
            );
      }
      return await this.getDepsInfo(true, supportedVersions, currentVersion.version);
    } catch (error) {
      return await this.getDepsInfo(
        false,
        supportedVersions,
        undefined,
        new DepsCheckerError(error.message, nodeNotFoundHelpLink)
      );
    }
  }

  public async resolve(installOptions?: InstallOptions): Promise<DependencyStatus> {
    const installationInfo = await this.getInstallationInfo(installOptions);
    if (installationInfo.error) {
      await this._logger.printDetailLog();
      await this._logger.error(
        `${installationInfo.error.message}, error = '${installationInfo.error}'`
      );
    }
    this._logger.cleanup();
    return installationInfo;
  }

  public async install(): Promise<void> {
    return Promise.resolve();
  }

  public async getDepsInfo(
    isInstalled: boolean,
    supportedVersions: string[],
    installVersion?: string,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return {
      name: NodeName,
      type: this._type,
      isInstalled: isInstalled,
      command: await this.command(),
      details: {
        isLinuxSupported: true,
        supportedVersions: supportedVersions,
        installVersion: installVersion,
      },
      error: error,
    };
  }

  private static isVersionError(
    minErrorVersion: number,
    maxErrorVersion: number,
    version: NodeVersion
  ): boolean {
    const majorVersion = Number.parseInt(version.majorVersion);

    return (
      !Number.isInteger(majorVersion) ||
      majorVersion <= minErrorVersion ||
      majorVersion >= maxErrorVersion
    );
  }

  public async command(): Promise<string> {
    return "node";
  }

  public static async getInstalledNodeVersion(): Promise<NodeVersion | null> {
    try {
      const output = await cpUtils.executeCommand(
        undefined,
        undefined,
        undefined,
        "node",
        "--version"
      );
      return getNodeVersion(output);
    } catch (error) {
      return null;
    }
  }
}

function getNodeVersion(output: string): NodeVersion | null {
  const regex = /v(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
  const match = regex.exec(output);
  if (!match) {
    return null;
  }

  const majorVersion = match.groups?.major_version;
  if (!majorVersion) {
    return null;
  }

  return new NodeVersion(match[0], majorVersion);
}

export class SPFxNodeChecker extends NodeChecker {
  public static readonly supportedVersions = ["16"];
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForSPFx;
  protected readonly _type = DepsType.SpfxNode;
  protected readonly _minErrorVersion = 15;
  protected readonly _maxErrorVersion = 17;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForSPFxHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return SPFxNodeChecker.supportedVersions;
  }

  protected isVersionSupported(supportedVersions: string[], version: NodeVersion): boolean {
    return supportedVersions.includes(version.majorVersion);
  }
}

export class AzureNodeChecker extends NodeChecker {
  public static readonly supportedVersions = ["14", "16", "18"];
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;
  protected readonly _type = DepsType.AzureNode;
  protected readonly _minErrorVersion = 11;
  protected readonly _maxErrorVersion = Number.MAX_SAFE_INTEGER;
  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForAzureHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return AzureNodeChecker.supportedVersions;
  }

  protected isVersionSupported(supportedVersions: string[], version: NodeVersion): boolean {
    return supportedVersions.includes(version.majorVersion);
  }
}

export class ProjectNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = v3NodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForProject;
  protected readonly _type = DepsType.ProjectNode;
  protected readonly _minErrorVersion = Number.MIN_SAFE_INTEGER;
  protected readonly _maxErrorVersion = Number.MAX_SAFE_INTEGER;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return v3NodeNotSupportedHelpLink;
  }

  protected async getSupportedVersions(projectPath?: string): Promise<string[]> {
    if (!projectPath) {
      return [];
    }
    const supportedVersion = await this.getSupportedVersion(projectPath);
    return supportedVersion ? [supportedVersion] : [];
  }

  private async getSupportedVersion(projectPath: string): Promise<string | undefined> {
    try {
      const packageJson = await fs.readJSON(path.join(projectPath, "package.json"));
      const node = packageJson?.engines?.node;
      if (typeof node !== "string") {
        return undefined;
      }
      return node;
    } catch {
      return undefined;
    }
  }

  protected isVersionSupported(supportedVersions: string[], version: NodeVersion): boolean {
    if (supportedVersions.length == 0) {
      return true;
    }
    const supportedVersion = supportedVersions[0];
    return semver.satisfies(version.version, supportedVersion);
  }
}
