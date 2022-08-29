// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import fs from "fs-extra";
import * as dotenv from "dotenv";
import { expect } from "chai";
import { LocalEnvProvider, LocalEnvs } from "../../../../src/common/local/localEnvProvider";
import { UserError } from "@microsoft/teamsfx-api";
import {
  AuthType,
  ComponentType,
  Constants,
} from "../../../../src/component/feature/apiconnector/constants";
import { EnvHandler } from "../../../../src/component/feature/apiconnector/envHandler";
import {
  ApiConnectorConfiguration,
  BasicAuthConfig,
} from "../../../../src/component/feature/apiconnector/config";

describe("EnvHandler", () => {
  const fakeProjectPath = path.join(__dirname, "test-api-connector");
  const botPath = path.join(fakeProjectPath, "bot");
  const apiPath = path.join(fakeProjectPath, "api");
  const localEnvFileName = ".env.teamsfx.local";
  beforeEach(async () => {
    await fs.ensureDir(fakeProjectPath);
    await fs.ensureDir(botPath);
    await fs.ensureDir(apiPath);
  });
  afterEach(async () => {
    await fs.remove(fakeProjectPath);
  });

  it("should create .env.teamsfx.local if not exist with empty api envs", async () => {
    const service: ComponentType = ComponentType.BOT;
    const envHandler = new EnvHandler(fakeProjectPath, service);
    expect(await fs.pathExists(path.join(botPath, localEnvFileName))).to.be.false;
    await envHandler.saveLocalEnvFile();
    expect(await fs.pathExists(path.join(botPath, localEnvFileName))).to.be.true;
    const provider: LocalEnvProvider = new LocalEnvProvider(fakeProjectPath);
    const envs: LocalEnvs = await provider.loadBotLocalEnvs();
    for (const item in envs.customizedLocalEnvs) {
      expect(item.startsWith("API_")).to.be.false;
    }
  });

  it("env save to .env.teamsfx.local first time", async () => {
    const service: ComponentType = ComponentType.BOT;
    const envHandler = new EnvHandler(fakeProjectPath, service);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentType: ["bot"],
      APIName: "FAKE",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.BASIC,
        UserName: "fake_api_user_name",
      } as BasicAuthConfig,
    };
    envHandler.updateEnvs(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, localEnvFileName))).to.be.false;
    await envHandler.saveLocalEnvFile();
    const envs = dotenv.parse(await fs.readFile(path.join(botPath, localEnvFileName)));
    chai.assert.strictEqual(envs[Constants.envPrefix + "FAKE_ENDPOINT"], "fake_endpoint");
    chai.assert.strictEqual(envs[Constants.envPrefix + "FAKE_USERNAME"], "fake_api_user_name");
    chai.assert.exists(envs[Constants.envPrefix + "FAKE_PASSWORD"]);
  });

  it("env update in .env.teamsfx.local", async () => {
    const service: ComponentType = ComponentType.BOT;
    const envHandler = new EnvHandler(fakeProjectPath, service);
    const fakeConfig: ApiConnectorConfiguration = {
      ComponentType: ["bot"],
      APIName: "FAKE",
      EndPoint: "fake_endpoint",
      AuthConfig: {
        AuthType: AuthType.BASIC,
        UserName: "fake_api_user_name",
      } as BasicAuthConfig,
    };
    envHandler.updateEnvs(fakeConfig);
    expect(await fs.pathExists(path.join(botPath, localEnvFileName))).to.be.false;
    await envHandler.saveLocalEnvFile();
    const envs = dotenv.parse(await fs.readFile(path.join(botPath, localEnvFileName)));
    chai.assert.strictEqual(envs[Constants.envPrefix + "FAKE_ENDPOINT"], "fake_endpoint");
    chai.assert.strictEqual(envs[Constants.envPrefix + "FAKE_USERNAME"], "fake_api_user_name");
    chai.assert.exists(envs[Constants.envPrefix + "FAKE_PASSWORD"]);

    const fakeConfig2: ApiConnectorConfiguration = {
      ComponentType: ["bot"],
      APIName: "FAKE",
      EndPoint: "fake_endpoint2",
      AuthConfig: {
        AuthType: AuthType.BASIC,
        UserName: "fake_api_user_name2",
      } as BasicAuthConfig,
    };
    try {
      envHandler.updateEnvs(fakeConfig2);
      await envHandler.saveLocalEnvFile();
    } catch (err) {
      expect(err instanceof UserError).to.be.true;
      chai.assert.strictEqual(err.source, "api-connector");
      chai.assert.strictEqual(
        err.displayMessage,
        "Please provide a different API name to avoid conflicts with existing env variables TEAMSFX_API_FAKE_ENDPOINT in .env.teamsfx.local"
      );
    }
  });
});
