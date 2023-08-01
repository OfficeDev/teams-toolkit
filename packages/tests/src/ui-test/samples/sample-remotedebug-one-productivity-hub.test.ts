// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder, TemplateProject } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.OneProductivityHub,
  TemplateProjectFolder.OneProductivityHub,
  24121468,
  "v-ivanchen@microsoft.com",
  "dev"
);
sampleCase.test();
