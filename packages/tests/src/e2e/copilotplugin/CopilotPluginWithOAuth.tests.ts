// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

class CopilotPluginOAuthTestCase extends CaseFactory {}

const copilotPluginOAuth: Record<string, string> = {};
copilotPluginOAuth["api-auth"] = "oauth";

const env = Object.assign({}, process.env);
env["API_COPILOT_PLUGIN"] = "true";
env["DEVELOP_COPILOT_PLUGIN"] = "true";

const options = {
  skipValidate: true,
  skipErrorMessage: "No elements found in the manifest",
};

new CopilotPluginOAuthTestCase(
  Capability.CopilotPluginFromScratch,
  27569691,
  "huimiao@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  options,
  copilotPluginOAuth,
  env
).test();
