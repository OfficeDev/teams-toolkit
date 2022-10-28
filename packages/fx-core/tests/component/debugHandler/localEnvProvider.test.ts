// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as sinon from "sinon";

import { FolderName } from "../../../src/common/local/constants";
import { LocalEnvProvider, LocalEnvs } from "../../../src/component/debugHandler/localEnvProvider";

describe("LocalEnvProvider", () => {
  const projectPath = path.resolve(__dirname, "data");
  const frontendEnvPath = path.join(
    projectPath,
    FolderName.Frontend,
    LocalEnvProvider.LocalEnvFileName
  );
  const backendEnvPath = path.join(
    projectPath,
    FolderName.Function,
    LocalEnvProvider.LocalEnvFileName
  );
  const botEnvPath = path.join(projectPath, FolderName.Bot, LocalEnvProvider.LocalEnvFileName);

  const frontendTemplateComment =
    "# TeamsFx will overwrite the following variable values when running debug. They are used by create-react-app.";
  const botTemplateComment =
    "# TeamsFx will overwrite the following variable values when running debug. They are used by the bot code.";
  const teamsfxComment =
    "# TeamsFx will overwrite the following variable values when running debug. They are used by TeamsFx SDK.";
  const customizedComment =
    "# Following variables can be customized or you can add your owns." + os.EOL + "# FOO=BAR";

  afterEach(() => {
    sinon.restore();
  });

  describe("loadFrontendLocalEnvs", () => {
    it("happy path", async () => {
      sinon.stub(fs, "pathExists").callsFake(async (_path) => {
        return _path === frontendEnvPath;
      });
      const content =
        "\
        BROWSER=a\n\
        HTTPS=b\n\
        MYENV1=1\n\
        SSL_CRT_FILE=c\n\
        SSL_KEY_FILE=d\n\
        PORT=e\n\
        REACT_APP_START_LOGIN_PAGE_URL=f\n\
        \n\
        # ENV COMMENT\n\
        REACT_APP_FUNC_ENDPOINT=g\n\
        REACT_APP_FUNC_NAME=h\n\
        REACT_APP_CLIENT_ID=i\n\
        MYENV2=2\n";
      sinon.stub(fs, "readFile").callsFake(async (file) => {
        if (file === frontendEnvPath) {
          return Buffer.from(content);
        }
        throw new Error("path does not exist");
      });
      const localEnvProvider = new LocalEnvProvider(projectPath);
      const actual = await localEnvProvider.loadFrontendLocalEnvs();
      const expected: LocalEnvs = {
        template: {
          BROWSER: "a",
          HTTPS: "b",
          SSL_CRT_FILE: "c",
          SSL_KEY_FILE: "d",
          PORT: "e",
        },
        teamsfx: {
          REACT_APP_START_LOGIN_PAGE_URL: "f",
          REACT_APP_FUNC_ENDPOINT: "g",
          REACT_APP_FUNC_NAME: "h",
          REACT_APP_CLIENT_ID: "i",
        },
        customized: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };
      chai.assert.deepEqual(actual, expected);
      sinon.restore();
    });
  });

  describe("loadBackendLocalEnvs", () => {
    it("happy path", async () => {
      sinon.stub(fs, "pathExists").callsFake(async (_path) => {
        return _path === backendEnvPath;
      });
      const content =
        "\
        MYENV1=1\n\
        M365_AUTHORITY_HOST=c\n\
        M365_TENANT_ID=d\n\
        M365_CLIENT_ID=e\n\
        M365_CLIENT_SECRET=f\n\
        # ENV COMMENT\n\
        \n\
        ALLOWED_APP_IDS=j\n\
        MYENV2=2\n";
      sinon.stub(fs, "readFile").callsFake(async (file) => {
        if (file === backendEnvPath) {
          return Buffer.from(content);
        }
        throw new Error("path does not exist");
      });
      const localEnvProvider = new LocalEnvProvider(projectPath);
      const actual = await localEnvProvider.loadBackendLocalEnvs();
      const expected: LocalEnvs = {
        template: {},
        teamsfx: {
          M365_AUTHORITY_HOST: "c",
          M365_TENANT_ID: "d",
          M365_CLIENT_ID: "e",
          M365_CLIENT_SECRET: "f",
          ALLOWED_APP_IDS: "j",
        },
        customized: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };
      chai.assert.deepEqual(actual, expected);
      sinon.restore();
    });
  });

  describe("loadBotLocalEnvs", () => {
    it("happy path", async () => {
      sinon.stub(fs, "pathExists").callsFake(async (_path) => {
        return _path === botEnvPath;
      });
      const content =
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
        M365_APPLICATION_ID_URI=j\n\
        MYENV2=2\n";
      sinon.stub(fs, "readFile").callsFake(async (file) => {
        if (file === botEnvPath) {
          return Buffer.from(content);
        }
        throw new Error("path does not exist");
      });
      const localEnvProvider = new LocalEnvProvider(projectPath);
      const actual = await localEnvProvider.loadBotLocalEnvs();
      const expected: LocalEnvs = {
        template: {
          BOT_ID: "a",
          BOT_PASSWORD: "b",
        },
        teamsfx: {
          M365_CLIENT_ID: "c",
          M365_CLIENT_SECRET: "d",
          M365_TENANT_ID: "e",
          M365_AUTHORITY_HOST: "f",
          INITIATE_LOGIN_ENDPOINT: "g",
          M365_APPLICATION_ID_URI: "j",
        },
        customized: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };
      chai.assert.deepEqual(actual, expected);
      sinon.restore();
    });
  });

  describe("saveFrontendLocalEnvs", () => {
    it("happy path", async () => {
      let content =
        "\
        BROWSER=a\n\
        HTTPS=b\n\
        MYENV1=1\n\
        SSL_CRT_FILE=c\n\
        SSL_KEY_FILE=d\n\
        PORT=e\n\
        REACT_APP_START_LOGIN_PAGE_URL=f\n\
        \n\
        # ENV COMMENT\n\
        REACT_APP_FUNC_ENDPOINT=g\n\
        REACT_APP_FUNC_NAME=h\n\
        REACT_APP_CLIENT_ID=i\n\
        MYENV2=2\n";
      sinon.stub(fs, "ensureDir").callsFake(async () => {});
      sinon.stub(fs, "createFile").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async (file, data) => {
        if (file === frontendEnvPath) {
          content = data;
        }
      });
      sinon.stub(fs, "appendFile").callsFake(async (file, data) => {
        if (file === frontendEnvPath) {
          content += data;
        }
      });
      const envs: LocalEnvs = {
        template: {
          BROWSER: "a",
          HTTPS: "b",
          PORT: "e",
        },
        teamsfx: {
          REACT_APP_START_LOGIN_PAGE_URL: "f",
          REACT_APP_CLIENT_ID: "i",
        },
        customized: {
          MYENV1: "1",
        },
      };
      const localEnvProvider = new LocalEnvProvider(projectPath);
      await localEnvProvider.saveFrontendLocalEnvs(envs);
      const expected =
        frontendTemplateComment +
        os.EOL +
        "BROWSER=a" +
        os.EOL +
        "HTTPS=b" +
        os.EOL +
        "PORT=e" +
        os.EOL +
        os.EOL +
        teamsfxComment +
        os.EOL +
        "REACT_APP_START_LOGIN_PAGE_URL=f" +
        os.EOL +
        "REACT_APP_CLIENT_ID=i" +
        os.EOL +
        os.EOL +
        customizedComment +
        os.EOL +
        "MYENV1=1" +
        os.EOL;
      chai.assert.equal(content, expected);
      sinon.restore();
    });
  });

  describe("saveBackendLocalEnvs", () => {
    it("happy path", async () => {
      let content =
        "\
        MYENV1=1\n\
        M365_AUTHORITY_HOST=c\n\
        M365_TENANT_ID=d\n\
        M365_CLIENT_ID=e\n\
        M365_CLIENT_SECRET=f\n\
        # ENV COMMENT\n\
        \n\
        ALLOWED_APP_IDS=j\n\
        MYENV2=2\n";
      sinon.stub(fs, "ensureDir").callsFake(async () => {});
      sinon.stub(fs, "createFile").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async (file, data) => {
        if (file === backendEnvPath) {
          content = data;
        }
      });
      sinon.stub(fs, "appendFile").callsFake(async (file, data) => {
        if (file === backendEnvPath) {
          content += data;
        }
      });
      const envs: LocalEnvs = {
        template: {},
        teamsfx: {
          M365_AUTHORITY_HOST: "c",
          M365_TENANT_ID: "d",
          M365_CLIENT_ID: "e",
          M365_CLIENT_SECRET: "f",
          ALLOWED_APP_IDS: "j",
        },
        customized: {
          MYENV1: "1",
          MYENV2: "2",
        },
      };
      const localEnvProvider = new LocalEnvProvider(projectPath);
      await localEnvProvider.saveBackendLocalEnvs(envs);
      const expected =
        teamsfxComment +
        os.EOL +
        "M365_AUTHORITY_HOST=c" +
        os.EOL +
        "M365_TENANT_ID=d" +
        os.EOL +
        "M365_CLIENT_ID=e" +
        os.EOL +
        "M365_CLIENT_SECRET=f" +
        os.EOL +
        "ALLOWED_APP_IDS=j" +
        os.EOL +
        os.EOL +
        customizedComment +
        os.EOL +
        "MYENV1=1" +
        os.EOL +
        "MYENV2=2" +
        os.EOL;
      chai.assert.equal(content, expected);
      sinon.restore();
    });
  });

  describe("saveBotLocalEnvs", () => {
    it("happy path", async () => {
      let content =
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
      sinon.stub(fs, "ensureDir").callsFake(async () => {});
      sinon.stub(fs, "createFile").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async (file, data) => {
        if (file === botEnvPath) {
          content = data;
        }
      });
      sinon.stub(fs, "appendFile").callsFake(async (file, data) => {
        if (file === botEnvPath) {
          content += data;
        }
      });
      const envs: LocalEnvs = {
        template: {
          BOT_ID: "a",
          BOT_PASSWORD: "b",
        },
        teamsfx: {
          M365_CLIENT_ID: "c",
          M365_CLIENT_SECRET: "d",
          M365_TENANT_ID: "e",
          M365_AUTHORITY_HOST: "f",
          M365_APPLICATION_ID_URI: "j",
        },
        customized: {
          MYENV1: "1",
        },
      };
      const localEnvProvider = new LocalEnvProvider(projectPath);
      await localEnvProvider.saveBotLocalEnvs(envs);
      const expected =
        botTemplateComment +
        os.EOL +
        "BOT_ID=a" +
        os.EOL +
        "BOT_PASSWORD=b" +
        os.EOL +
        os.EOL +
        teamsfxComment +
        os.EOL +
        "M365_CLIENT_ID=c" +
        os.EOL +
        "M365_CLIENT_SECRET=d" +
        os.EOL +
        "M365_TENANT_ID=e" +
        os.EOL +
        "M365_AUTHORITY_HOST=f" +
        os.EOL +
        "M365_APPLICATION_ID_URI=j" +
        os.EOL +
        os.EOL +
        customizedComment +
        os.EOL +
        "MYENV1=1" +
        os.EOL;
      chai.assert.equal(content, expected);
      sinon.restore();
    });
  });
});
