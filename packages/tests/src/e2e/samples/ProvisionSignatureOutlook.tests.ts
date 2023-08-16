// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class AdaptiveCardTestCase extends CaseFactory {}

new AdaptiveCardTestCase(
  TemplateProjectFolder.OutlookSignature,
  24132154,
  "v-ivanchen@microsoft.com",
  [],
  { skipDeploy: true }
).test();
