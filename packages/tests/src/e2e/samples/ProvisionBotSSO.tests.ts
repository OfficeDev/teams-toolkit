// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class HelloWorldBotSSOTestCase extends CaseFactory {}

new HelloWorldBotSSOTestCase(
  TemplateProjectFolder.HelloWorldBotSSO,
  15277464,
  "yukundong@microsoft.com",
  ["bot"]
).test();
