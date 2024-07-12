// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { replaceSecretKey, validateFiles } from "./helper";
import * as path from "path";
export class CopilotPluginCommonTest extends CaseFactory {
  validateFileList?: string[];
  authOption?: string;

  public constructor(
    testPlanCaseId: number,
    author: string,
    authOption: "none" | "api-key" | "oauth",
    programmingLanguage?: ProgrammingLanguage,
    validateFileList?: string[]
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
    this.validateFileList = validateFileList;
    this.authOption = authOption;
    this.onAfterCreate = this.onAfterCreate.bind(this);
  }

  public override async onAfterCreate(projectPath: string): Promise<void> {
    await validateFiles(projectPath, this.validateFileList || []);

    if (this.authOption === "api-key") {
      const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
      await replaceSecretKey(userFile);
    }
  }
}
