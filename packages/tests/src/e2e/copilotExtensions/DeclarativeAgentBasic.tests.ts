// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimaio@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CaseFactory } from "../caseFactory";

class DeclarativeAgentBasicTestCase extends CaseFactory {}

const myRecord: Record<string, string> = {};
myRecord["with-plugin"] = "no";

new DeclarativeAgentBasicTestCase(
  Capability.DeclarativeAgent,
  27971545,
  "huimaio@microsoft.com",
  ["function"],
  ProgrammingLanguage.None,
  { skipValidateAfterProvision: true },
  myRecord
).test();
