// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProjectFolder } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";

class MyFirstMeetingTestCase extends CaseFactory {}

new MyFirstMeetingTestCase(
  TemplateProjectFolder.MyFirstMeeting,
  15277468,
  "kaiyan@microsoft.com",
  ["tab"]
).test();
