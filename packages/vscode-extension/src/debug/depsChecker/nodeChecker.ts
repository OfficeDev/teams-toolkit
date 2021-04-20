import { DepsInfo, IDepsChecker } from "./checker";
import { cpUtils, nodeCheckerEnabled } from "./checkerAdapter";
import { nodeHelpLink } from "./common";
import { NodeNotFoundError, NotSupportedNodeError as NodeNotSupportedError } from "./errors";
import * as StringResources from "../../resources/Strings.json";

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
  public isEnabled(): Promise<boolean> {
    return Promise.resolve(nodeCheckerEnabled());
  }

  public async isInstalled(): Promise<boolean> {
    const currentVersion = await getInstalledNodeVersion();
    if (currentVersion === null) {
      throw new NodeNotFoundError(StringResources.vsc.debug.nodeNotFound, nodeHelpLink);
    }

    if (!currentVersion.isSupported) {
      const supportedVersions = SupportedNodeVersions.map((v) => "v" + v).join(" ,");
      throw new NodeNotSupportedError(
        StringResources.vsc.debug.nodeNotSupported
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
