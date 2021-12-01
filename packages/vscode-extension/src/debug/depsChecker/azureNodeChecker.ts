import {
  DepsCheckerEvent,
  nodeNotFoundHelpLink,
  nodeNotSupportedForAzureHelpLink,
  nodeNotSupportedForFunctionsHelpLink,
} from "./common";

import { NodeChecker } from "./nodeChecker";

export class AzureNodeChecker extends NodeChecker {
  protected readonly _nodeNotFoundHelpLink = nodeNotFoundHelpLink;
  protected readonly _nodeNotSupportedEvent = DepsCheckerEvent.nodeNotSupportedForAzure;

  protected async getNodeNotSupportedHelpLink(): Promise<string> {
    if (await this._adapter.hasTeamsfxBackend()) {
      return nodeNotSupportedForFunctionsHelpLink;
    } else {
      return nodeNotSupportedForAzureHelpLink;
    }
  }

  protected async getSupportedVersions(): Promise<string[]> {
    if (await this._adapter.hasTeamsfxBackend()) {
      return ["10", "12", "14"];
    } else {
      return ["10", "12", "14", "16"];
    }
  }
}
