// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class NpmSearchTestCase extends CaseFactory {}

new NpmSearchTestCase(
  TemplateProjectFolder.NpmSearch,
  15277471,
  "qidon@microsoft.com",
  ["bot"]
).test();
