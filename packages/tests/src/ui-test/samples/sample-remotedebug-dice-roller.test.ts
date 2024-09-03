// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class DiceRollerTestCase extends CaseFactory {}

new DiceRollerTestCase(
  TemplateProject.DiceRoller,
  24121529,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { skipInit: true }
).test();
