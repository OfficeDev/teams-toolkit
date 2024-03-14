// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class GraphConnectorTestCase extends CaseFactory {}

new GraphConnectorTestCase(
  TemplateProjectFolder.GraphConnector,
  15277460,
  "junhan@microsoft.com",
  ["tab", "aad"]
).test();
