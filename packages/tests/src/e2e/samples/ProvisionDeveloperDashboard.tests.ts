// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProjectFolder.AssistDashboard,
  24121324,
  "v-ivanchen@microsoft.com",
  ["dashboard"]
);
sampleCase.test();
