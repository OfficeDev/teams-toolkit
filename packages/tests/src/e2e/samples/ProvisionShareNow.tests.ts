// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProjectFolder.ShareNow,
  15277467,
  "v-ivanchen@microsoft.com",
  ["sql", "tab & bot"]
);
sampleCase.test();
