import { DepsInfo, IDepsAdapter, IDepsChecker, IDepsLogger, IDepsTelemetry } from "./checker";
import { Messages, nodeHelpLink } from "./common";
import { cpUtils } from "./cpUtils";
import { NodeNotFoundError, NotSupportedNodeError as NodeNotSupportedError } from "./errors";

const SupportedNodeVersions = ["10", "12", "14"];
const NodeName = "Node.js";

class NodeVersion {
  public readonly version: string;
  public readonly isSupported: boolean;

  constructor(version: string, majorVersion: string) {
    this.version = version;
    this.isSupported = SupportedNodeVersions.includes(majorVersion);
  }
}

export class NodeChecker implements IDepsChecker {
  private readonly _adapter: IDepsAdapter;
  private readonly _logger: IDepsLogger;
  private readonly _telemetry: IDepsTelemetry;

  constructor(adapter: IDepsAdapter, logger: IDepsLogger, telemetry: IDepsTelemetry) {
    this._adapter = adapter;
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public isEnabled(): Promise<boolean> {
    return Promise.resolve(this._adapter.nodeCheckerEnabled());
  }

  public async isInstalled(): Promise<boolean> {
    const currentVersion = await getInstalledNodeVersion();
    if (currentVersion === null) {
      throw new NodeNotFoundError(Messages.NodeNotFound, nodeHelpLink);
    }

    if (!currentVersion.isSupported) {
      const supportedVersions = SupportedNodeVersions.map((v) => "v" + v).join(" ,");
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
      supportedVersions: SupportedNodeVersions,
      details: new Map<string, string>()
    };
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
