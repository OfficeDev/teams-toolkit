// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import path from "path";
import os from "os";
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
    repoPath: "./resource/samples",
    testRootFolder: path.resolve(os.homedir(), "resource"),
  }
).test();
