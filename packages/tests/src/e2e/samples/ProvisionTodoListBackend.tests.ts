// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProjectFolder.TodoListBackend,
  15277465,
  "v-ivanchen@microsoft.com",
  ["aad", "tab", "function", "sql"]
);
sampleCase.test();
