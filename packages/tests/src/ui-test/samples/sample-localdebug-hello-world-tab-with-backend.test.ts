// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import {
  TemplateProjectFolder,
  TemplateProject,
  LocalDebugTaskLabel,
} from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.HelloWorldTabBackEnd,
  TemplateProjectFolder.HelloWorldTabBackEnd,
  12684063,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartFrontend,
    LocalDebugTaskLabel.WatchBackend,
    LocalDebugTaskLabel.StartBackend,
  ]
);
sampleCase.test();
