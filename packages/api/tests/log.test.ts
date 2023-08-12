// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import { assert } from "chai";
import { LogProvider, LogLevel } from "../src/utils/log";

class TestLogProvider implements LogProvider {
  msg: string;
  verbose(msg: string): void {}
  debug(msg: string): void {}
  info(msg: string | Array<any>): void {}
  warning(msg: string): void {}
  error(msg: string): void {}
  fatal(msg: string): void {}
  log(level: LogLevel, msg: string): void {
    this.msg = msg;
  }
  getLogFilePath(): string {
    return "";
  }
}

describe("log", function () {
  describe("logProvider", function () {
    it("happy path", () => {
      const logProvider = new TestLogProvider();
      logProvider.log(LogLevel.Debug, "1");
      assert.equal(logProvider.msg, "1");
      logProvider.verbose("2");
      assert.equal(logProvider.msg, "2");
      logProvider.debug("3");
      assert.equal(logProvider.msg, "3");
      logProvider.info("4");
      assert.equal(logProvider.msg, "4");
      logProvider.warning("5");
      assert.equal(logProvider.msg, "5");
      logProvider.error("6");
      assert.equal(logProvider.msg, "5");
    });
  });
});
