// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CaseFactory } from "../caseFactory";

class DeclarativeAgentWithApiKeyAuth extends CaseFactory {}

const myRecord: Record<string, string> = {};
myRecord["with-plugin"] = "yes";
myRecord["api-plugin-type"] = "new-api";
myRecord["api-auth"] = "api-key";

new DeclarativeAgentWithApiKeyAuth(
  Capability.DeclarativeAgent,
  30310079,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.JS,
  { skipValidate: true },
  myRecord
).test();

new DeclarativeAgentWithApiKeyAuth(
  Capability.DeclarativeAgent,
  30309977,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  { skipValidate: true },
  myRecord
).test();
