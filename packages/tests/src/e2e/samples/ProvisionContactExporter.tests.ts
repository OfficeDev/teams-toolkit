// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class ContactExporterTestCase extends CaseFactory {}

new ContactExporterTestCase(
  TemplateProjectFolder.ContactExporter,
  15277462,
  "rentu@microsoft.com",
  ["tab", "aad"]
).test();
