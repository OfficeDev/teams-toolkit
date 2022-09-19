import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as path from "path";
import * as fs from "fs-extra";
import { createContextV3 } from "../../src/component/utils";
import { configLocalEnvironment, setupLocalEnvironment } from "../../src/component/debug";
import { MockTools } from "../core/utils";
import { setTools } from "../../src/core/globalVars";
import { ComponentNames, ProgrammingLanguage } from "../../src/component/constants";
import mockedEnv from "mocked-env";
chai.use(chaiAsPromised);

describe("DebugComponent", () => {
  const tools = new MockTools();
  setTools(tools);
  describe("setup", () => {
    afterEach(async () => await fs.remove(path.resolve(__dirname, "./data")));
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: "typescript",
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.TeamsTab,
            hosting: ComponentNames.AzureStorage,
          },
          {
            name: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {
          bot: {
            siteEndpoint: "https://endpoint.com/",
          },
        },
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            siteEndPoint: "https://www.test.com",
          },
        },
      };
      context.envInfo = envInfo;
      const result = await setupLocalEnvironment(context, inputs);
      chai.assert.isTrue(result.isOk());
      console.log(envInfo.state);
    });
  });

  describe("config", () => {
    afterEach(async () => await fs.remove(path.resolve(__dirname, "./data")));
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: "typescript",
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.TeamsTab,
            hosting: ComponentNames.AzureStorage,
          },
          {
            name: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo = {
        envName: "default",
        config: {
          frontend: {
            sslCertFile: "./sslCertFile",
            sslKeyFile: "./sslKeyFile",
          },
        },
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            siteEndPoint: "https://www.test.com",
            siteEndpoint: "https://endpoint.com/",
            validDomain: "endpoint.com/",
          },
          [ComponentNames.SimpleAuth]: {},
          [ComponentNames.TeamsTab]: { endpoint: "https://localhost:53000", domain: "localhost" },
          [ComponentNames.TeamsApi]: { functionEndpoint: "http://localhost:7071" },
          [ComponentNames.AppManifest]: {
            tenantId: "mockTenantId",
          },
        },
      };
      context.envInfo = envInfo;
      const result = await configLocalEnvironment(context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("config", () => {
    afterEach(async () => await fs.remove(path.resolve(__dirname, "./data")));
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: ProgrammingLanguage.TS,
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.TeamsTab,
            hosting: ComponentNames.AzureStorage,
          },
          {
            name: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo: any = {
        envName: "default",
        config: {
          frontend: {
            sslCertFile: "./sslCertFile",
            sslKeyFile: "./sslKeyFile",
          },
        },
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            siteEndPoint: "https://www.test.com",
            siteEndpoint: "https://endpoint.com/",
            validDomain: "endpoint.com/",
          },
          [ComponentNames.SimpleAuth]: {},
          [ComponentNames.TeamsTab]: { endpoint: "https://localhost:53000", domain: "localhost" },
          [ComponentNames.TeamsApi]: { functionEndpoint: "http://localhost:7071" },
          [ComponentNames.AppManifest]: {
            tenantId: "mockTenantId",
          },
        },
      };
      context.envInfo = envInfo;
      const result = await configLocalEnvironment(context, inputs);
      chai.assert.isTrue(result.isOk());
      envInfo.config = {};
      const result2 = await configLocalEnvironment(context, inputs);
      chai.assert.isTrue(result2.isOk());
    });
    it("happy path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "",
        projectId: uuid.v4(),
        programmingLanguage: ProgrammingLanguage.CSharp,
        components: [
          {
            name: ComponentNames.TeamsBot,
            hosting: ComponentNames.Function,
          },
          {
            name: ComponentNames.AadApp,
          },
        ],
      };
      const inputs = {
        platform: Platform.VS,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
        checkerInfo: { skipNgrok: true },
      };
      const context = createContextV3(projectSetting);
      const envInfo: any = {
        envName: "default",
        config: {},
        state: {
          solution: {},
          [ComponentNames.TeamsBot]: {
            siteEndPoint: "https://www.test.com",
            siteEndpoint: "https://endpoint.com/",
            domain: "endpoint.com/",
          },
          [ComponentNames.AppManifest]: {
            tenantId: "mockTenantId",
          },
        },
      };
      context.envInfo = envInfo;
      const result = await configLocalEnvironment(context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });
});
