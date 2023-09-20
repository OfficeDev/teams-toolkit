// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class RetailDashboardTestCase extends CaseFactory {}

new RetailDashboardTestCase(
  TemplateProjectFolder.RetailDashboard,
  25051144,
  "v-ivanchen@microsoft.com",
  ["tab"]
).test();
