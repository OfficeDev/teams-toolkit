// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class AdaptiveCardTestCase extends CaseFactory {}

new AdaptiveCardTestCase(
  TemplateProjectFolder.OutlookTab,
  24132142,
  "v-ivanchen@microsoft.com"
).test();
