// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.TodoListSpfx,
  9958516,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.GulpServe],
  {
    teamsAppName: "TodoListSPFx-local",
    type: "spfx",
    skipValidation: true,
  }
);
sampleCase.test();
