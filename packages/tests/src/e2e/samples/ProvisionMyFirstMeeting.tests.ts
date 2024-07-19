// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class MyFirstMettingTestCase extends CaseFactory {}

new MyFirstMettingTestCase(
  TemplateProjectFolder.MyFirstMetting,
  15277468,
  "kaiyan@microsoft.com",
  ["tab"]
).test();
