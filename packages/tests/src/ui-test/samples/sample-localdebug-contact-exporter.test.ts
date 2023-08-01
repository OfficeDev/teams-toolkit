// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import {
  TemplateProjectFolder,
  TemplateProject,
  LocalDebugTaskLabel,
} from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.ContactExporter,
  TemplateProjectFolder.ContactExporter,
  12599484,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend]
);
sampleCase.test();
