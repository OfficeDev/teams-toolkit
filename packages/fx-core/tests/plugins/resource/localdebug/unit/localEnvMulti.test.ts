import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

import {
  LocalEnvMultiProvider,
  LocalEnvs,
} from "../../../../../src/plugins/resource/localdebug/localEnvMulti";

chai.use(chaiAsPromised);

describe("LocalEnvProvider-MultiEnv", () => {
  const workspaceFolder = path.resolve(__dirname, "../data/.teamsfx/");

  describe("load", () => {
    let localEnvMultiProvider: LocalEnvMultiProvider;

    beforeEach(() => {
      localEnvMultiProvider = new LocalEnvMultiProvider(workspaceFolder);
      fs.emptyDirSync(workspaceFolder);
    });

    it("frontend", async () => {
      const raw =
        "\
        BROWSER=a\n\
        HTTPS=b\n\
        MYENV1=1\n\
        SSL_CRT_FILE=c\n\
        SSL_KEY_FILE=d\n\
        REACT_APP_TEAMSFX_ENDPOINT=e\n\
        REACT_APP_START_LOGIN_PAGE_URL=f\n\
        \n\
        # ENV COMMENT\n\
        REACT_APP_FUNC_ENDPOINT=g\n\
        REACT_APP_FUNC_NAME=h\n\
        REACT_APP_CLIENT_ID=i\n\
        MYENV2=2\n";
      const expected: LocalEnvs = {
        teamsfxLocalEnvs: {
          BROWSER: "a",
          HTTPS: "b",
          SSL_CRT_FILE: "c",
          SSL_KEY_FILE: "d",
          REACT_APP_TEAMSFX_ENDPOINT: "e",
          REACT_APP_START_LOGIN_PAGE_URL: "f",
          REACT_APP_FUNC_ENDPOINT: "g",
          REACT_APP_FUNC_NAME: "h",
          REACT_APP_CLIENT_ID: "i",
        },
        customizedLocalEnvs: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };

      const envFile = path.join(workspaceFolder, "tabs", ".env.teamsfx.local");
      fs.createFileSync(envFile);
      fs.writeFileSync(envFile, raw);

      const actual = await localEnvMultiProvider.loadFrontendLocalEnvs(true, true);
      chai.assert.deepEqual(actual, expected);
    });

    it("backend", async () => {
      const raw =
        "\
        AzureWebJobsStorage=a\n\
        FUNCTIONS_WORKER_RUNTIME=b\n\
        MYENV1=1\n\
        M365_AUTHORITY_HOST=c\n\
        M365_TENANT_ID=d\n\
        M365_CLIENT_ID=e\n\
        M365_CLIENT_SECRET=f\n\
        # ENV COMMENT\n\
        \n\
        API_ENDPOINT=h\n\
        M365_APPLICATION_ID_URI=i\n\
        ALLOWED_APP_IDS=j\n\
        MYENV2=2\n";
      const expected: LocalEnvs = {
        teamsfxLocalEnvs: {
          AzureWebJobsStorage: "a",
          FUNCTIONS_WORKER_RUNTIME: "b",
          M365_AUTHORITY_HOST: "c",
          M365_TENANT_ID: "d",
          M365_CLIENT_ID: "e",
          M365_CLIENT_SECRET: "f",
          API_ENDPOINT: "h",
          M365_APPLICATION_ID_URI: "i",
          ALLOWED_APP_IDS: "j",
        },
        customizedLocalEnvs: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };

      const envFile = path.join(workspaceFolder, "api", ".env.teamsfx.local");
      fs.createFileSync(envFile);
      fs.writeFileSync(envFile, raw);

      const actual = await localEnvMultiProvider.loadBackendLocalEnvs();
      chai.assert.deepEqual(actual, expected);
    });

    it("bot", async () => {
      const raw =
        "\
        BOT_ID=a\n\
        BOT_PASSWORD=b\n\
        MYENV1=1\n\
        M365_CLIENT_ID=c\n\
        \n\
        M365_CLIENT_SECRET=d\n\
        M365_TENANT_ID=e\n\
        M365_AUTHORITY_HOST=f\n\
        # ENV COMMENT\n\
        INITIATE_LOGIN_ENDPOINT=g\n\
        API_ENDPOINT=i\n\
        M365_APPLICATION_ID_URI=j\n\
        MYENV2=2\n";
      const expected: LocalEnvs = {
        teamsfxLocalEnvs: {
          BOT_ID: "a",
          BOT_PASSWORD: "b",
          M365_CLIENT_ID: "c",
          M365_CLIENT_SECRET: "d",
          M365_TENANT_ID: "e",
          M365_AUTHORITY_HOST: "f",
          INITIATE_LOGIN_ENDPOINT: "g",
          API_ENDPOINT: "i",
          M365_APPLICATION_ID_URI: "j",
        },
        customizedLocalEnvs: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };

      const envFile = path.join(workspaceFolder, "bot", ".env.teamsfx.local");
      fs.createFileSync(envFile);
      fs.writeFileSync(envFile, raw);

      const actual = await localEnvMultiProvider.loadBotLocalEnvs(false);
      chai.assert.deepEqual(actual, expected);
    });
  });

  describe("save", () => {
    let localEnvMultiProvider: LocalEnvMultiProvider;

    beforeEach(() => {
      localEnvMultiProvider = new LocalEnvMultiProvider(workspaceFolder);
      fs.emptyDirSync(workspaceFolder);
    });

    it("save all", async () => {
      const frontendEnvs: LocalEnvs = {
        teamsfxLocalEnvs: {
          npm_hello: "world",
          F1: "a",
          AA: "x",
        },
        customizedLocalEnvs: {
          C1: "1",
        },
      };
      const backendEnvs: LocalEnvs = {
        teamsfxLocalEnvs: {
          B1: "a",
        },
        customizedLocalEnvs: {},
      };
      const botEnvs: LocalEnvs = {
        teamsfxLocalEnvs: {},
        customizedLocalEnvs: {
          C1: "1",
        },
      };

      const expectedFrontendRaw =
        "# Following variables are generated by TeamsFx" +
        os.EOL +
        "npm_hello=world" +
        os.EOL +
        "F1=a" +
        os.EOL +
        "AA=x" +
        os.EOL +
        os.EOL +
        "# Following variables can be customized or you can add your owns" +
        os.EOL +
        "# FOO=BAR" +
        os.EOL +
        "C1=1" +
        os.EOL;
      const expectedBackendRaw =
        "# Following variables are generated by TeamsFx" +
        os.EOL +
        "B1=a" +
        os.EOL +
        os.EOL +
        "# Following variables can be customized or you can add your owns" +
        os.EOL +
        "# FOO=BAR" +
        os.EOL;
      const expectedBotRaw =
        "# Following variables are generated by TeamsFx" +
        os.EOL +
        os.EOL +
        "# Following variables can be customized or you can add your owns" +
        os.EOL +
        "# FOO=BAR" +
        os.EOL +
        "C1=1" +
        os.EOL;

      await localEnvMultiProvider.saveLocalEnvs(frontendEnvs, backendEnvs, botEnvs);

      const actualFrontendRaw = fs.readFileSync(
        path.join(workspaceFolder, "tabs", ".env.teamsfx.local"),
        "utf8"
      );
      chai.assert.equal(expectedFrontendRaw, actualFrontendRaw);
      const actualBackendRaw = fs.readFileSync(
        path.join(workspaceFolder, "api", ".env.teamsfx.local"),
        "utf8"
      );
      chai.assert.equal(expectedBackendRaw, actualBackendRaw);
      const actualBotRaw = fs.readFileSync(
        path.join(workspaceFolder, "bot", ".env.teamsfx.local"),
        "utf8"
      );
      chai.assert.equal(expectedBotRaw, actualBotRaw);
    });

    it("save partial", async () => {
      const frontendEnvs: LocalEnvs = {
        teamsfxLocalEnvs: {
          AA: "x",
          npm_hello: "world",
          F1: "a",
        },
        customizedLocalEnvs: {
          C1: "1",
        },
      };

      const expectedFrontendRaw =
        "# Following variables are generated by TeamsFx" +
        os.EOL +
        "AA=x" +
        os.EOL +
        "npm_hello=world" +
        os.EOL +
        "F1=a" +
        os.EOL +
        os.EOL +
        "# Following variables can be customized or you can add your owns" +
        os.EOL +
        "# FOO=BAR" +
        os.EOL +
        "C1=1" +
        os.EOL;

      await localEnvMultiProvider.saveLocalEnvs(frontendEnvs, undefined, undefined);

      const actualFrontendRaw = fs.readFileSync(
        path.join(workspaceFolder, "tabs", ".env.teamsfx.local"),
        "utf8"
      );
      chai.assert.equal(expectedFrontendRaw, actualFrontendRaw);
      chai.assert.isNotTrue(
        fs.pathExistsSync(path.join(workspaceFolder, "api", ".env.teamsfx.local"))
      );
      chai.assert.isNotTrue(
        fs.pathExistsSync(path.join(workspaceFolder, "bot", ".env.teamsfx.local"))
      );
    });
  });

  describe("init", () => {
    let localEnvMultiProvider: LocalEnvMultiProvider;

    beforeEach(() => {
      localEnvMultiProvider = new LocalEnvMultiProvider(workspaceFolder);
      fs.emptyDirSync(workspaceFolder);
    });

    it("frontend", () => {
      const envs = localEnvMultiProvider.initFrontendLocalEnvs(false, false);
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 2);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 0);
    });

    it("frontend + auth", () => {
      const envs = localEnvMultiProvider.initFrontendLocalEnvs(false, true);
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 5);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 0);
    });

    it("frontend + auth + backend", () => {
      const envs = localEnvMultiProvider.initFrontendLocalEnvs(true, true);
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 7);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 0);
    });

    it("backend", () => {
      const envs = localEnvMultiProvider.initBackendLocalEnvs();
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 9);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 4);
    });

    it("bot", () => {
      const envs = localEnvMultiProvider.initBotLocalEnvs(false);
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 9);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 4);
    });

    it("bot v1", () => {
      const envs = localEnvMultiProvider.initBotLocalEnvs(true);
      chai.assert.equal(Object.values(envs.teamsfxLocalEnvs).length, 2);
      chai.assert.equal(Object.values(envs.customizedLocalEnvs).length, 0);
    });
  });
});
