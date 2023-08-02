// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.OneProductivityHub,
  15090375,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend]
);
sampleCase.test();
