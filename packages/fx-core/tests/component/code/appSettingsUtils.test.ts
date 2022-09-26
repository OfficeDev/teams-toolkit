// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import { resetAppSettingsDevelopment } from "../../../src/component/code/appSettingUtils";

describe("appSettingsUtils", () => {
  describe("resetAppSettingsDevelopment", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("succeed", async () => {
      const originalAppSettingsJson = {
        Logging: {
          LogLevel: {
            Default: "Information",
            Microsoft: "Warning",
            "Microsoft.Hosting.Lifetime": "Information",
          },
        },
        AllowedHosts: "*",
        BOT_ID: "botId123",
        BOT_PASSWORD: "password",
        TeamsFx: {
          Authentication: {
            ClientId: "clientId123",
            ClientSecret: "mockClientSecret",
            OAuthAuthority: "mockOAuthAuthority",
            ApplicationIdUri: "mockApplicationUrl",
            Bot: {
              InitiateLoginEndpoint: "mockInitialLoginEndpoint",
            },
          },
        },
      };
      sandbox.stub(fs, "readJson").resolves(originalAppSettingsJson);
      const spy = sandbox.stub(fs, "writeFile").resolves();
      sandbox.stub(fs, "pathExists").resolves(true);

      const res = await resetAppSettingsDevelopment("projectPath");
      const updatedAppSettings = {
        Logging: {
          LogLevel: {
            Default: "Information",
            Microsoft: "Warning",
            "Microsoft.Hosting.Lifetime": "Information",
          },
        },
        AllowedHosts: "*",
        BOT_ID: "$botId$",
        BOT_PASSWORD: "$bot-password$",
        TeamsFx: {
          Authentication: {
            ClientId: "$clientId$",
            ClientSecret: "$client-secret$",
            OAuthAuthority: "$oauthAuthority$",
            ApplicationIdUri: "$applicationIdUri$",
            Bot: {
              InitiateLoginEndpoint: "$initiateLoginEndpoint$",
            },
          },
        },
      };
      expect(spy.args[0][1]).equal(JSON.stringify(updatedAppSettings, null, "\t"));
      if (!res.isOk()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
    });

    it("failed", async () => {
      const originalAppSettingsJson = {
        Logging: {
          LogLevel: {
            Default: "Information",
            Microsoft: "Warning",
            "Microsoft.Hosting.Lifetime": "Information",
          },
        },
        AllowedHosts: "*",
        BOT_ID: "botId123",
        BOT_PASSWORD: "password",
        TeamsFx: {
          Authentication: {
            ClientId: "clientId123",
            ClientSecret: "mockClientSecret",
            OAuthAuthority: "mockOAuthAuthority",
            ApplicationIdUri: "mockApplicationUrl",
            Bot: {
              InitiateLoginEndpoint: "mockInitialLoginEndpoint",
            },
          },
        },
      };
      sandbox.stub(fs, "readJson").resolves(originalAppSettingsJson);
      sandbox.stub(fs, "writeFile").throws();
      sandbox.stub(fs, "pathExists").resolves(true);

      const res = await resetAppSettingsDevelopment("projectPath");
      expect(res.isErr()).equal(true);
    });
  });
});
