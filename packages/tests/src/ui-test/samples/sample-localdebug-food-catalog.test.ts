// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class FoodCatalogTestCase extends CaseFactory {}

new FoodCatalogTestCase(
  TemplateProject.FoodCatalog,
  27851421,
  "v-ivanchen@microsoft.com",
  "local",
  [],
  {
    skipInit: true,
  }
).test();
