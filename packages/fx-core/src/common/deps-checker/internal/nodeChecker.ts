// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsCheckerError, NodeNotFoundError, NodeNotSupportedError } from "../depsError";
import { cpUtils } from "../util/cpUtils";
import { DepsCheckerEvent } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsInfo, DepsChecker } from "../depsChecker";
import { Messages } from "../constant/message";
import { Result, ok, err } from "@microsoft/teamsfx-api";
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
  protected abstract getSupportedVersions(): Promise<string[]>;
  protected abstract getNodeNotSupportedHelpLink(): Promise<string>;

  private readonly _telemetry: DepsTelemetry;
  private readonly _logger: DepsLogger;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async isInstalled(): Promise<boolean> {
    try {
      return await this.checkInstalled();
    } catch (e) {
      return false;
    }
  }

  public async checkInstalled(): Promise<boolean> {
    const supportedVersions = await this.getSupportedVersions();

    this._logger.debug(
      `NodeChecker checking for supported versions: '${JSON.stringify(supportedVersions)}'`
    );

    const currentVersion = await getInstalledNodeVersion();
    if (currentVersion === null) {
      this._telemetry.sendUserErrorEvent(DepsCheckerEvent.nodeNotFound, "Node.js can't be found.");
      throw new NodeNotFoundError(
        Messages.NodeNotFound.split("@NodeVersion").join(
          supportedVersions[supportedVersions.length - 1]
        ),
        this._nodeNotFoundHelpLink
      );
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
      throw new NodeNotSupportedError(
        Messages.NodeNotSupported.split("@CurrentVersion")
          .join(currentVersion.version)
          .split("@SupportedVersions")
          .join(supportedVersionsString),
        await this.getNodeNotSupportedHelpLink()
      );
    }

    return true;
  }

  public async resolve(): Promise<Result<boolean, DepsCheckerError>> {
    try {
      if (!(await this.checkInstalled())) {
        await this.install();
      }
    } catch (error) {
      await this._logger.printDetailLog();
      await this._logger.error(`${error.message}, error = '${error}'`);
      if (error instanceof DepsCheckerError) {
        return err(error);
      }
      return err(new DepsCheckerError(error.message, nodeNotFoundHelpLink));
    } finally {
      this._logger.cleanup();
    }

    return ok(true);
  }

  public async install(): Promise<void> {
    return Promise.resolve();
  }

  public async getDepsInfo(): Promise<DepsInfo> {
    return {
      name: NodeName,
      isLinuxSupported: true,
      installVersion: (await getInstalledNodeVersion())?.version,
      supportedVersions: await this.getSupportedVersions(),
      details: new Map<string, string>(),
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

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForFunctionsHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return ["14", "16"];
  }
}
