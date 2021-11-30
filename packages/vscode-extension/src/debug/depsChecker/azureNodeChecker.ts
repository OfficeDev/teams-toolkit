import { DepsCheckerEvent, nodeNotFoundHelpLink, nodeNotSupportedForAzureHelpLink } from "./common";
import { NodeChecker } from "./nodeChecker";

export class AzureNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedHelpLink = nodeNotSupportedForAzureHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;

  protected async getSupportedVersions(): Promise<string[]> {
    if (await this._adapter.hasTeamsfxBackend()) {
      return ["10", "12", "14"];
    } else {
      return ["10", "12", "14", "16"];
    }
  }
}
