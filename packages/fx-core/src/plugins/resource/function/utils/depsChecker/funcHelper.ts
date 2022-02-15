// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, returnUserError } from "@microsoft/teamsfx-api";
import { DepsCheckerError } from "../../../../../common/deps-checker/depsError";
import { defaultHelpLink } from "../../../../../common/deps-checker/constant/helpLink";
import { Messages } from "../../../../../common/deps-checker/constant/message";
import { installExtension } from "../../../../../common/deps-checker/util/extensionInstaller";
import { DepsLogger } from "../../../../../common";

export class FuncHelper {
  private readonly dotnetSettingKey = "function-dotnet-checker-enabled";

  public async dotnetCheckerEnabled(inputs?: Inputs): Promise<boolean> {
    let enabled = true;
    if (inputs && inputs[this.dotnetSettingKey] !== undefined) {
      enabled = (<boolean>inputs[this.dotnetSettingKey]) as boolean;
    }
    return Promise.resolve(enabled);
  }

  public async installFuncExtension(
    backendRoot: string,
    dotnetCommand: string,
    logger: DepsLogger,
    csprojPath: string,
    outputPath: string
  ): Promise<void> {
    await installExtension(backendRoot, dotnetCommand, logger, csprojPath, outputPath);
  }

  public transferError(error: Error): Error {
    const source = "functionDepsChecker";
    const defaultAnchor = "report-issues";
    if (error instanceof DepsCheckerError) {
      const [helpLink, anchor] = this.splitHelpLink(error.helpLink);
      return returnUserError(error, source, anchor || defaultAnchor, helpLink, error);
    } else {
      return returnUserError(
        new Error(Messages.defaultErrorMessage),
        source,
        defaultAnchor,
        defaultHelpLink,
        error
      );
    }
  }

  private splitHelpLink(link: string): [string, string] {
    const lastAnchor = link.lastIndexOf("#");
    if (lastAnchor !== -1) {
      return [link.slice(0, lastAnchor), link.slice(lastAnchor + 1)];
    } else {
      return [link, ""];
    }
  }
}

export const funcDepsHelper = new FuncHelper();
