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
  TemplateProject.AdaptiveCard,
  TemplateProjectFolder.AdaptiveCard,
  14524987,
  "v-ivanchen@microsoft.com",
  "local",
  [
    LocalDebugTaskLabel.StartLocalTunnel,
    LocalDebugTaskLabel.Azurite,
    LocalDebugTaskLabel.Compile,
    LocalDebugTaskLabel.StartBotApp,
  ]
);
sampleCase.test();
