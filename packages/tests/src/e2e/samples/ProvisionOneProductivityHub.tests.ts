// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class OneProductivityHubTestCase extends CaseFactory {}

new OneProductivityHubTestCase(
  TemplateProjectFolder.OneProductivityHub,
  15277463,
  "rentu@microsoft.com",
  ["aad", "tab"]
).test();
