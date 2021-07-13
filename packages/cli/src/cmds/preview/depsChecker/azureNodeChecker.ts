import { DepsCheckerEvent, nodeNotFoundHelpLink, nodeNotSupportedForAzureHelpLink } from "./common";
import { NodeChecker } from "./nodeChecker";

export class AzureNodeChecker extends NodeChecker {
  protected readonly _supportedVersions = ["10", "12", "14"];
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedHelpLink = nodeNotSupportedForAzureHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;
}
