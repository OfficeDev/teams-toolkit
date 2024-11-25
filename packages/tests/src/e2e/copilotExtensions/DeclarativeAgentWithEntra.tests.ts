// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CaseFactory } from "../caseFactory";
import { FeatureFlagName } from "../../../../fx-core/src/common/featureFlags";

class DeclarativeAgentWithEntra extends CaseFactory {
  public override async onBefore(): Promise<void> {
    process.env[FeatureFlagName.ApiPluginAAD] = "true";
  }
}

const myRecord: Record<string, string> = {};
myRecord["with-plugin"] = "yes";
myRecord["api-plugin-type"] = "new-api";
myRecord["api-auth"] = "microsoft-entra";

new DeclarativeAgentWithEntra(
  Capability.DeclarativeAgent,
  30310142,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.JS,
  { skipValidate: true },
  myRecord
).test();

new DeclarativeAgentWithEntra(
  Capability.DeclarativeAgent,
  30309989,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  { skipValidate: true },
  myRecord
).test();
