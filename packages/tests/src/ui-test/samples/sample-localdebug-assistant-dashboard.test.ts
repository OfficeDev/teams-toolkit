// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.AssistDashboard,
  24121324,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartFrontend,
    LocalDebugTaskLabel.WatchBackend,
    LocalDebugTaskLabel.StartBackend,
  ],
  { dashboardFlag: true }
);
sampleCase.test();
