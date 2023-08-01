// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder, TemplateProject } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.AssistDashboard,
  TemplateProjectFolder.AssistDashboard,
  24121439,
  "v-ivanchen@microsoft.com",
  "dev"
);
sampleCase.test();
