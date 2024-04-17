// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class GraphConnectorBotTestCase extends CaseFactory {}

new GraphConnectorBotTestCase(
  TemplateProjectFolder.GraphConnectorBot,
  25178480,
  "junhan@microsoft.com",
  ["bot", "aad"]
).test();
