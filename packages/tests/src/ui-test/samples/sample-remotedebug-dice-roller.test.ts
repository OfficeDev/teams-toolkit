// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class DiceRollerTestCase extends CaseFactory {}

new DiceRollerTestCase(
  TemplateProject.GraphConnectorBot,
  24121529,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { skipValidation: true }
).test();
