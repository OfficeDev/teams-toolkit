// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsCheckerError, NodeNotFoundError, NodeNotSupportedError } from "../depsError";
import { cpUtils } from "../util/cpUtils";
import { DepsCheckerEvent } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DependencyStatus, DepsChecker, DepsType } from "../depsChecker";
import { Messages } from "../constant/message";
import {
  nodeNotFoundHelpLink,
  nodeNotSupportedForFunctionsHelpLink,
  nodeNotSupportedForSPFxHelpLink,
  nodeNotSupportedForAzureHelpLink,
} from "../constant/helpLink";

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
  protected abstract getSupportedVersions(): Promise<string[]>;
  protected abstract getNodeNotSupportedHelpLink(): Promise<string>;

  private readonly _telemetry: DepsTelemetry;
  private readonly _logger: DepsLogger;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async getInstallationInfo(): Promise<DependencyStatus> {
    try {
      const supportedVersions = await this.getSupportedVersions();

      this._logger.debug(
        `NodeChecker checking for supported versions: '${JSON.stringify(supportedVersions)}'`
      );

      const currentVersion = await getInstalledNodeVersion();
      if (currentVersion === null) {
        this._telemetry.sendUserErrorEvent(
          DepsCheckerEvent.nodeNotFound,
          "Node.js can't be found."
        );
        const error = new NodeNotFoundError(
          Messages.NodeNotFound.split("@NodeVersion").join(
            supportedVersions[supportedVersions.length - 1]
          ),
          this._nodeNotFoundHelpLink
        );
        return await this.getDepsInfo(false, undefined, error);
      }
      this._telemetry.sendEvent(DepsCheckerEvent.nodeVersion, {
        "global-version": `${currentVersion.version}`,
        "global-major-version": `${currentVersion.majorVersion}`,
      });

      if (!NodeChecker.isVersionSupported(supportedVersions, currentVersion)) {
        const supportedVersionsString = supportedVersions.map((v) => "v" + v).join(" ,");
        this._telemetry.sendUserErrorEvent(
          this._nodeNotSupportedEvent,
          `Node.js ${currentVersion.version} is not supported.`
        );
        const error = new NodeNotSupportedError(
          Messages.NodeNotSupported.split("@CurrentVersion")
            .join(currentVersion.version)
            .split("@SupportedVersions")
            .join(supportedVersionsString),
          await this.getNodeNotSupportedHelpLink()
        );
        return await this.getDepsInfo(false, currentVersion.version, error);
      }

      return await this.getDepsInfo(true, currentVersion.version);
    } catch (error) {
      return await this.getDepsInfo(
        false,
        undefined,
        new DepsCheckerError(error.message, nodeNotFoundHelpLink)
      );
    }
  }

  public async resolve(): Promise<DependencyStatus> {
    const installationInfo = await this.getInstallationInfo();
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
        supportedVersions: await this.getSupportedVersions(),
        installVersion: installVersion,
      },
      error: error,
    };
  }

  private static isVersionSupported(supportedVersion: string[], version: NodeVersion): boolean {
    return supportedVersion.includes(version.majorVersion);
  }

  public async command(): Promise<string> {
    return "node";
  }
}

export async function getInstalledNodeVersion(): Promise<NodeVersion | null> {
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
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForSPFx;
  protected readonly _type = DepsType.SpfxNode;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForSPFxHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return ["12", "14"];
  }
}

export class AzureNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;
  protected readonly _type = DepsType.AzureNode;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForAzureHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return ["14", "16"];
  }
}

export class FunctionNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;
  protected readonly _type = DepsType.FunctionNode;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForFunctionsHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return ["14", "16"];
  }
}
