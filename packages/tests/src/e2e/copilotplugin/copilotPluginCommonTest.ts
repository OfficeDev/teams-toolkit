// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

export class CopilotPluginCommonTest extends CaseFactory {
  public constructor(
    testPlanCaseId: number,
    author: string,
    authOption: "none" | "api-key" | "oauth",
    programmingLanguage?: ProgrammingLanguage
  ) {
    const env = Object.assign({}, process.env);
    env["DEVELOP_COPILOT_PLUGIN"] = "true";
    if (programmingLanguage === ProgrammingLanguage.CSharp) {
      env["TEAMSFX_CLI_DOTNET"] = "true";
    }

    const skipOptions = {
      skipValidate: true,
      skipErrorMessage: "No elements found in the manifest",
    };

    const authOptions: Record<string, string> = {};
    authOptions["api-auth"] = authOption;

    super(
      Capability.CopilotPluginFromScratch,
      testPlanCaseId,
      author,
      ["function"],
      programmingLanguage,
      skipOptions,
      authOptions,
      env
    );
  }
}
