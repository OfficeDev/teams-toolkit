// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder, TemplateProject } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.ContactExporter,
  TemplateProjectFolder.ContactExporter,
  14571878,
  "v-ivanchen@microsoft.com",
  "dev"
);
sampleCase.test();
