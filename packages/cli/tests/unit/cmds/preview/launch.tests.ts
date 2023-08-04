// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";
import * as constants from "@microsoft/teamsfx-core";
import * as sinon from "sinon";
import { expect } from "../../utils";
import * as commonUtils from "../../../../src/cmds/preview/commonUtils";
import { openHubWebClientNew } from "../../../../src/cmds/preview/launch";
import cliTelemetry from "../../../../src/telemetry/cliTelemetry";
import cliLogger from "../../../../src/commonlib/log";
import CLIUIInstance from "../../../../src/userInteraction";
import { Browser } from "../../../../src/cmds/preview/constants";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../../src/telemetry/cliTelemetryEvents";

describe("launch", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("openHubWebClientNew", () => {
    let telemetries: any[] = [];
    const telemetryProperties = {
      key1: "value1",
      key2: "value2",
    };
    let sideloadingUrl: string;

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

    it("happy path", async () => {
      sandbox.stub(commonUtils, "openBrowser").callsFake(async (browser, url, browserArguments) => {
        sideloadingUrl = url;
      });
      await openHubWebClientNew(constants.HubTypes.teams, "test-url", Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals("test-url");
    });

    it("happy path with telemetries", async () => {
      sandbox.stub(commonUtils, "openBrowser").callsFake(async (browser, url, browserArguments) => {
        sideloadingUrl = url;
      });
      await openHubWebClientNew(
        constants.HubTypes.teams,
        "test-url",
        Browser.default,
        [],
        telemetryProperties
      );
      expect(telemetries.length).to.deep.equals(2);
      expect(telemetries[0]).to.deep.equals([
        TelemetryEvent.PreviewSideloadingStart,
        telemetryProperties,
      ]);
      expect(telemetries[1]).to.deep.equals([
        TelemetryEvent.PreviewSideloading,
        {
          ...telemetryProperties,
          [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        },
      ]);
      expect(sideloadingUrl).to.deep.equals("test-url");
    });

    it("openBrowser error", async () => {
      sandbox.stub(commonUtils, "openBrowser").throws();
      await openHubWebClientNew(constants.HubTypes.teams, "test-url", Browser.default);
      expect(telemetries.length).to.deep.equals(0);
    });
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
