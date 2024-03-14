// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class HelloWorldTabBackEndTestCase extends CaseFactory {}

new HelloWorldTabBackEndTestCase(
  TemplateProjectFolder.HelloWorldTabBackEnd,
  15277459,
  "rentu@microsoft.com",
  ["tab"]
).test();
