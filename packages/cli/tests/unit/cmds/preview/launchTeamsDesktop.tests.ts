// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { expect } from "../../utils";
import * as commonUtils from "../../../../src/cmds/preview/commonUtils";
import { openTeamsDesktopClient } from "../../../../src/cmds/preview/launch";
import cliTelemetry from "../../../../src/telemetry/cliTelemetry";
import cliLogger from "../../../../src/commonlib/log";
import CLIUIInstance from "../../../../src/userInteraction";
import { Browser } from "../../../../src/cmds/preview/constants";

describe("launch Teams desktop client", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("openTeamsDesktopClientNew", () => {
    let telemetries: any[] = [];

    beforeEach(() => {
      telemetries = [];

      sandbox.stub(cliTelemetry, "sendTelemetryEvent").callsFake((eventName, properties) => {
        telemetries.push([eventName, properties]);
      });
      sandbox
        .stub(cliTelemetry, "sendTelemetryErrorEvent")
        .callsFake((eventName, error, properties) => {
          telemetries.push([eventName, error, properties]);
        });
      sandbox.stub(cliLogger, "necessaryLog").callsFake(() => {});
      sandbox.stub(CLIUIInstance, "createProgressBar").returns(new MockProgressHandler());
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path windows", async () => {
      sandbox.stub(process, "platform").value("win32");
      await openTeamsDesktopClient("http://test-url", "username", Browser.default);
      expect(telemetries.length).to.deep.equals(0);
    });

    // it("happy path mac", async () => {
    //   sandbox.stub(process, "platform").value("darwin");
    //   await openTeamsDesktopClient("http://test-url", "username", Browser.default);
    //   expect(telemetries.length).to.deep.equals(0);
    // });

    // it("happy path others", async () => {
    //   sandbox.stub(process, "platform").value("linux");
    //   sandbox
    //     .stub(commonUtils, "openBrowser")
    //     .callsFake(async (browser, url, browserArguments) => {});
    //   await openTeamsDesktopClient("http://test-url", "username", Browser.default);
    //   expect(telemetries.length).to.deep.equals(0);
    // });

    // it("openBrowser error", async () => {
    //   sandbox.stub(process, "platform").value("linux");
    //   sandbox.stub(commonUtils, "openBrowser").throws();
    //   await openTeamsDesktopClient("http://test-url", "username", Browser.default);
    //   expect(telemetries.length).to.deep.equals(0);
    // });
  });
});

class MockProgressHandler implements IProgressHandler {
  start(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  next(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  end(success: boolean): Promise<void> {
    return Promise.resolve();
  }
}
