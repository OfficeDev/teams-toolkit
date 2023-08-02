// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.AssistDashboard,
  24121439,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { dashboardFlag: true }
);
sampleCase.test();
