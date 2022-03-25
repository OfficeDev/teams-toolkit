import { IProgressHandler } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { expect } from "../../utils";
import * as commonUtils from "../../../../src/cmds/preview/commonUtils";
import { openHubWebClient } from "../../../../src/cmds/preview/launch";
import cliTelemetry from "../../../../src/telemetry/cliTelemetry";
import cliLogger from "../../../../src/commonlib/log";
import CLIUIInstance from "../../../../src/userInteraction";
import { Browser, Hub } from "../../../../src/cmds/preview/constants";
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

  describe("openHubWebClient", () => {
    let telemetries: any[] = [];
    const telemetryProperties = {
      key1: "value1",
      key2: "value2",
    };
    let sideloadingUrl: string;
    const accountHint = "accountHint";
    const appId = "appId";
    const teamsUrl = `https://teams.microsoft.com/l/app/${appId}?installAppPackage=true&webjoin=true&${accountHint}`;
    const outlookTabUrl = `https://outlook.office.com/host/${appId}?${accountHint}`;
    const outlookBotUrl = `https://outlook.office.com/mail?${accountHint}`;
    const officeTabUrl = `https://www.office.com/m365apps/${appId}?auth=2&${accountHint}`;

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
      sandbox.stub(commonUtils, "openBrowser").callsFake(async (browser, url, browserArguments) => {
        sideloadingUrl = url;
      });
      sandbox.stub(commonUtils, "generateAccountHint").returns(Promise.resolve(accountHint));
      sandbox.stub(cliLogger, "necessaryLog").callsFake(() => {});
      sandbox.stub(CLIUIInstance, "createProgressBar").returns(new MockProgressHandler());
    });

    it("Teams Tab", async () => {
      await openHubWebClient(true, "", appId, Hub.teams, Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals(teamsUrl);
    });

    it("Teams non-Tab", async () => {
      await openHubWebClient(false, "", appId, Hub.teams, Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals(teamsUrl);
    });

    it("Outlook Tab", async () => {
      await openHubWebClient(true, "", appId, Hub.outlook, Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals(outlookTabUrl);
    });

    it("Outlook non-Tab", async () => {
      await openHubWebClient(false, "", appId, Hub.outlook, Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals(outlookBotUrl);
    });

    it("Office Tab", async () => {
      await openHubWebClient(true, "", appId, Hub.office, Browser.default);
      expect(telemetries.length).to.deep.equals(0);
      expect(sideloadingUrl).to.deep.equals(officeTabUrl);
    });

    it("Teams Tab with telemetries", async () => {
      await openHubWebClient(
        true,
        "",
        appId,
        Hub.teams,
        Browser.default,
        undefined,
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
      expect(sideloadingUrl).to.deep.equals(teamsUrl);
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
