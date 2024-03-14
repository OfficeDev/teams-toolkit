// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class TodoListM365TestCase extends CaseFactory {}

new TodoListM365TestCase(
  TemplateProjectFolder.TodoListM365,
  15277470,
  "qidon@microsoft.com",
  ["aad", "tab", "function"]
).test();
