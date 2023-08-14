// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import { assert } from "chai";
import { LogProvider, LogLevel } from "../src/utils/log";

class TestLogProvider implements LogProvider {
  msg = "";
  verbose(msg: string): void {
    this.log(LogLevel.Verbose, msg);
  }
  debug(msg: string): void {
    this.log(LogLevel.Debug, msg);
  }
  info(msg: string | Array<any>): void {
    this.log(LogLevel.Info, msg as string);
  }
  warning(msg: string): void {
    this.log(LogLevel.Warning, msg);
  }
  error(msg: string): void {
    this.log(LogLevel.Error, msg);
  }
  log(level: LogLevel, msg: string): void {
    this.msg = msg;
  }
  async logInFile(logLevel: LogLevel, message: string): Promise<void> {
    return Promise.resolve();
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
      assert.equal(logProvider.msg, "6");
    });
  });
});
