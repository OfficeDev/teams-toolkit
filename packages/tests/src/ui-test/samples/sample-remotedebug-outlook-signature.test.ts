// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class OutlookSignatureTestCase extends CaseFactory {}

new OutlookSignatureTestCase(
  TemplateProject.OutlookSignature,
  24121523,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  {
    skipInit: true,
    repoPath: "./resource/Samples",
  }
).test();
