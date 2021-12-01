import { DepsCheckerEvent, nodeNotFoundHelpLink, nodeNotSupportedForSPFxHelpLink } from "./common";
import { NodeChecker } from "./nodeChecker";

export class SPFxNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForSPFx;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    return nodeNotSupportedForSPFxHelpLink;
  }

  protected async getSupportedVersions(): Promise<string[]> {
    return ["10", "12", "14"];
  }
}
