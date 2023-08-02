// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.MyFirstMetting,
  14571880,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  {
    teamsAppName: "hello-world-in-meeting-dev",
    type: "meeting",
    skipValidation: true,
  }
);
sampleCase.test();
