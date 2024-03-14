// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class DiceRollerTestCase extends CaseFactory {}

new DiceRollerTestCase(
  TemplateProjectFolder.DiceRoller,
  24132156,
  "ning.tang@microsoft.com"
).test();
