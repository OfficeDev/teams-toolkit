// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.StockUpdate,
  17303802,
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
