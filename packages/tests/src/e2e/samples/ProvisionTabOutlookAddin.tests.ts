// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class OutlookTabTestCase extends CaseFactory {}

new OutlookTabTestCase(
  TemplateProjectFolder.OutlookTab,
  24132142,
  "huajiezhang@microsoft.com"
).test();
