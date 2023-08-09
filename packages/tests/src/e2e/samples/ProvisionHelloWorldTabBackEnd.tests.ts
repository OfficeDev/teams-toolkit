// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProjectFolder.HelloWorldTabBackEnd,
  15277459,
  "v-ivanchen@microsoft.com",
  ["tab"]
);
sampleCase.test();
