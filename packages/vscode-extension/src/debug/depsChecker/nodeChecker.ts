import { DepsInfo, IDepsAdapter, IDepsChecker, IDepsLogger, IDepsTelemetry } from "./checker";
import { Messages, nodeHelpLink } from "./common";
import { cpUtils } from "./cpUtils";
import { NodeNotFoundError, NotSupportedNodeError as NodeNotSupportedError } from "./errors";

export const AzureSupportedNodeVersions = ["10", "12", "14"];
const NodeName = "Node.js";

class NodeVersion {
  public readonly version: string;
  public readonly majorVersion: string;

  constructor(version: string, majorVersion: string) {
    this.version = version;
    this.majorVersion = majorVersion;
  }
}

export class NodeChecker implements IDepsChecker {
  private readonly _supportedVersions: string[];
  private readonly _adapter: IDepsAdapter;
  private readonly _logger: IDepsLogger;
  private readonly _telemetry: IDepsTelemetry;

  constructor(supportedVersions: string[], adapter: IDepsAdapter, logger: IDepsLogger, telemetry: IDepsTelemetry) {
    this._supportedVersions = supportedVersions;
    this._adapter = adapter;
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public isEnabled(): Promise<boolean> {
    return Promise.resolve(this._adapter.nodeCheckerEnabled());
  }

  public async isInstalled(): Promise<boolean> {
    this._logger.debug(`NodeChecker checking for supported versions: '${JSON.stringify(this._supportedVersions)}'`);

    const currentVersion = await getInstalledNodeVersion();
    if (currentVersion === null) {
      throw new NodeNotFoundError(Messages.NodeNotFound, nodeHelpLink);
    }

    if (!NodeChecker.isVersionSupported(this._supportedVersions, currentVersion)) {
      const supportedVersions = this._supportedVersions.map((v) => "v" + v).join(" ,");
      throw new NodeNotSupportedError(
        Messages.NodeNotSupported
          .replace("@CurrentVersion", currentVersion.version)
          .replace("@SupportedVersions", supportedVersions),
        nodeHelpLink
      );
    }

    return true;
  }

  public async install(): Promise<void> {
    return Promise.resolve();
  }

  public async getDepsInfo(): Promise<DepsInfo> {
    return {
      name: NodeName,
      supportedVersions: this._supportedVersions,
      details: new Map<string, string>()
    };
  }

  private static isVersionSupported(supportedVersion: string[], version: NodeVersion): boolean {
    return supportedVersion.includes(version.majorVersion);
  }
}

async function getInstalledNodeVersion(): Promise<NodeVersion | null> {
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
