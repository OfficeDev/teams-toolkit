import { DepsInfo, IDepsAdapter, IDepsChecker, IDepsLogger, IDepsTelemetry } from "./checker";
import { DepsCheckerEvent, Messages } from "./common";
import { cpUtils } from "./cpUtils";
import { NodeNotFoundError, NodeNotSupportedError } from "./errors";
const NodeName = "Node.js";

class NodeVersion {
  public readonly version: string;
  public readonly majorVersion: string;

  constructor(version: string, majorVersion: string) {
    this.version = version;
    this.majorVersion = majorVersion;
  }
}

export abstract class NodeChecker implements IDepsChecker {
  protected abstract readonly _nodeNotFoundHelpLink: string;
  protected abstract readonly _nodeNotSupportedEvent: DepsCheckerEvent;
  protected abstract getSupportedVersions(): Promise<string[]>;
  protected abstract getNodeNotSupportedHelpLink(): Promise<string>;

  private readonly _telemetry: IDepsTelemetry;
  protected readonly _adapter: IDepsAdapter;
  private readonly _logger: IDepsLogger;

  constructor(adapter: IDepsAdapter, logger: IDepsLogger, telemetry: IDepsTelemetry) {
    this._adapter = adapter;
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public isEnabled(): Promise<boolean> {
    return this._adapter.nodeCheckerEnabled();
  }

  public async isInstalled(): Promise<boolean> {
    const supportedVersions = await this.getSupportedVersions();

    this._logger.debug(
      `NodeChecker checking for supported versions: '${JSON.stringify(supportedVersions)}'`
    );

    const currentVersion = await getInstalledNodeVersion();
    if (currentVersion === null) {
      this._telemetry.sendUserErrorEvent(DepsCheckerEvent.nodeNotFound, "Node.js can't be found.");
      throw new NodeNotFoundError(Messages.NodeNotFound, this._nodeNotFoundHelpLink);
    }

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

  public async install(): Promise<void> {
    return Promise.resolve();
  }

  public async getDepsInfo(): Promise<DepsInfo> {
    return {
      name: NodeName,
      supportedVersions: await this.getSupportedVersions(),
      details: new Map<string, string>(),
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
