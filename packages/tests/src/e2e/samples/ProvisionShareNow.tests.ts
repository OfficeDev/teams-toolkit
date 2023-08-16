// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class AdaptiveCardTestCase extends CaseFactory {}

new AdaptiveCardTestCase(
  TemplateProjectFolder.ShareNow,
  15277467,
  "v-ivanchen@microsoft.com",
  ["sql", "tab & bot"]
).test();
