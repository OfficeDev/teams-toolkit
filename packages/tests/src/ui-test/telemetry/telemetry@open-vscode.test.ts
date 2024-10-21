// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Long Hao <haolong@microsoft.com>
 */

import { TeamsFxProject, Timeout } from "../../utils/constants";
import { TestContext } from "../testContext";
import * as fs from "fs-extra";
import * as chai from "chai";
import { it } from "../../utils/it";

const TelemetryLogRegex = /\[.+\]\s\[DEBUG\]\sTelemTest\s-\s([\w\d-]+)\s{/g;
const TelemetryNames = [
  "vsc-configuration",
  "show-what-is-new-notification",
  "query-expfeature",
  "open-v1-project",
  "check-sideloading",
  "quick-start",
  "survey",
  "walkthrough-build-intelligent-apps",
];

describe("telemetry", function () {
  this.timeout(Timeout.testCase);

  const testContext = new TestContext("telemetry");

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    await testContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await testContext.after();
  });

  it(
    "[auto] Auto send telemetry",
    {
      testPlanCaseId: 11967511,
      author: "haolong@microsoft.com",
    },
    async () => {
      const content = await fs.readFile(
        TeamsFxProject.TelemetryLoggerFilePath,
        "utf-8"
      );
      const regexPatternWithGlobal = RegExp(TelemetryLogRegex);
      let match: RegExpExecArray | null;
      const telemetryNameSet: Set<string> = new Set<string>();
      while ((match = regexPatternWithGlobal.exec(content))) {
        telemetryNameSet.add(match[1]);
      }

      chai.assert.includeMembers(TelemetryNames, [
        ...telemetryNameSet.values(),
      ]);
    }
  );
});
