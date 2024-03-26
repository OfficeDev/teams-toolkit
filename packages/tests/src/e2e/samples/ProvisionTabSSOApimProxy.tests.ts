// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class TabSSOApimProxyTestCase extends CaseFactory {}

new TabSSOApimProxyTestCase(
  TemplateProjectFolder.TabSSOApimProxy,
  25191528,
  "bowen.song@microsoft.com",
  ["tab", "aad"]
).test();
