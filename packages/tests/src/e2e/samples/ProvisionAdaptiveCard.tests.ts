// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { TemplateProjectFolder } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

describe("teamsfx new template", function () {
  it(
    `${TemplateProjectFolder.AdaptiveCard}`,
    { testPlanCaseId: 15277474, author: "v-ivanchen@microsoft.com" },
    async function () {
      const sampleCase = sampleCaseFactory(TemplateProjectFolder.AdaptiveCard)
      sampleCase.test();
    }
  );
});
