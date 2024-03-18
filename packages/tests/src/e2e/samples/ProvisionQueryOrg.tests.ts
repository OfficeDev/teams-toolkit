// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class QueryOrgTestCase extends CaseFactory {}

new QueryOrgTestCase(
  TemplateProjectFolder.QueryOrg,
  24132148,
  "wenyutang@microsoft.com"
).test();
