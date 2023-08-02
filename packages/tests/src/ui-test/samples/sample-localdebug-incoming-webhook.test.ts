// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import sampleCaseFactory from "./sampleCaseFactory";

const sampleCase = sampleCaseFactory(
  TemplateProject.IncomingWebhook,
  14524902,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartWebhook],
  { skipInit: true }
);
sampleCase.test();
