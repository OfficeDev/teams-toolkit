// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as events from "events";
import * as fs from "fs-extra";
import net from "net";
import * as path from "path";
import * as sinon from "sinon";

import { getPortsInUse } from "../../../src/common/local/portChecker";

chai.use(chaiAsPromised);

class MockServer extends events.EventEmitter {
  private readonly usedPorts: Array<{ port: number; host: string }>;

  constructor(usedPorts: Array<{ port: number; host: string }>) {
    super();
    super.setMaxListeners(0);
    this.usedPorts = usedPorts;
  }

  public close(callback?: (err?: Error) => void): this {
    super.emit("close");
    if (callback) {
      callback();
    }

    return this;
  }

  public listen(port: number, host: string): this {
    if (this.usedPorts.findIndex((e) => e.port === port && e.host === host) >= 0) {
      super.emit("error", new Error("EADDRINUSE"));
    } else {
      super.emit("listening");
    }

    return this;
  }
}

describe("portChecker", () => {
  const projectPath = path.resolve(__dirname, "data");
  const projectSettings0 = {
    appName: "unit-test0",
    projectId: "11111111-1111-1111-1111-111111111111",
    programmingLanguage: "javascript",
    solutionSettings: {
      name: "fx-solution-azure",
      hostType: "Azure",
      azureResources: [],
      capabilities: [],
      activeResourcePlugins: [
        "fx-resource-frontend-hosting",
        "fx-resource-bot",
        "fx-resource-function",
      ],
    },
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
      const mockServer = new MockServer([]);
      sinon.stub(net, "createServer").returns(mockServer as unknown as net.Server);

      const ports = await getPortsInUse(projectPath, projectSettings0);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });

    it("53000 in use", async () => {
      const mockServer = new MockServer([
        {
          port: 53000,
          host: "0.0.0.0",
        },
      ]);
      sinon.stub(net, "createServer").returns(mockServer as unknown as net.Server);

      const ports = await getPortsInUse(projectPath, projectSettings0);

      chai.assert.isDefined(ports);
      chai.assert.deepEqual(ports, [53000]);
    });

    it("53000 in another host", async () => {
      const mockServer = new MockServer([
        {
          port: 53000,
          host: "unknown",
        },
      ]);
      sinon.stub(net, "createServer").returns(mockServer as unknown as net.Server);

      const ports = await getPortsInUse(projectPath, projectSettings0);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });

    it("dev:teamsfx port", async () => {
      const mockServer = new MockServer([
        {
          port: 9229,
          host: "0.0.0.0",
        },
      ]);
      sinon.stub(net, "createServer").returns(mockServer as unknown as net.Server);
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

      const ports = await getPortsInUse(projectPath, projectSettings0);

      chai.assert.isDefined(ports);
      chai.assert.deepEqual(ports, [9229]);
    });

    it("ignore customized port", async () => {
      const mockServer = new MockServer([
        {
          port: 9229,
          host: "0.0.0.0",
        },
      ]);
      sinon.stub(net, "createServer").returns(mockServer as unknown as net.Server);
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

      const ports = await getPortsInUse(projectPath, projectSettings0);

      chai.assert.isDefined(ports);
      chai.assert.equal(ports.length, 0);
    });
  });
});
