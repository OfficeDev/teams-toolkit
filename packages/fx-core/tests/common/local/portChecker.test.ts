// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import proxyquire from "proxyquire";
chai.use(chaiAsPromised);
describe("portChecker", () => {
  const projectPath = path.resolve(__dirname, "data");
  const projectSettings0 = {
    appName: "unit-test0",
    projectId: "11111111-1111-1111-1111-111111111111",
    programmingLanguage: "javascript",
    solutionSettings: {
      name: "fx-solution-azure",
      hostType: "Azure",
      azureResources: ["function"],
      capabilities: ["Tab", "Bot"],
    },
    components: [{ name: "teams-tab" }, { name: "teams-bot" }, { name: "teams-api" }],
  };

  describe("getPortsInUse()", () => {
    beforeEach(() => {
      sinon.restore();
      fs.ensureDirSync(projectPath);
      fs.emptyDirSync(projectPath);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => port,
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });

    it("detect-port timeout", async () => {
      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) =>
          new Promise((resolve) => {
            setTimeout(() => resolve(port + 1), 60 * 1000);
          }),
      });
      const clock = sinon.useFakeTimers();

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        {
          appName: "unit-test0",
          projectId: "11111111-1111-1111-1111-111111111111",
          programmingLanguage: "javascript",
          solutionSettings: {
            name: "fx-solution-azure",
            hostType: "Azure",
            capabilities: ["Bot"],
          },
          components: [{ name: "teams-bot" }],
        },
        true
      );
      const portsPromise = portChecker.getPortsInUse(waitingCheckPorts);
      clock.tick(30 * 1000);
      const ports = await portsPromise;

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });

    it("53000 in use", async () => {
      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => (port === 53000 ? 53001 : port),
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.deepEqual(ports, [53000]);
    });

    it("55000 in use, do not detect", async () => {
      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => (port === 55000 ? 55001 : port),
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.deepEqual(ports, []);
    });

    it("dev:teamsfx port", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "dev:teamsfx": "npm run dev",\n\
            "dev": "npx func start --inspect = '9229'"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(projectPath, "api/package.json");
      await fs.ensureDir(path.join(projectPath, "api"));
      await fs.writeFile(packageJsonPath, content);

      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => (port === 9229 ? 9230 : port),
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.deepEqual(ports, [9229]);
    });

    it("ignore customized port", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "dev:teamsfx": "npm run dev",\n\
            "dev": "npx func start --inspect = '9230'"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(projectPath, "api/package.json");
      await fs.ensureDir(path.join(projectPath, "api"));
      await fs.writeFile(packageJsonPath, content);

      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => (port === 9229 ? 9230 : port),
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });

    it("ignore debug port", async () => {
      const portChecker = proxyquire("../../../src/common/local/portChecker", {
        "detect-port": async (port: number) => (port === 9229 ? 9230 : port),
      });

      const waitingCheckPorts = await portChecker.getPortsFromProject(
        projectPath,
        projectSettings0,
        true
      );
      const ports = await portChecker.getPortsInUse(waitingCheckPorts);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });
  });
});
