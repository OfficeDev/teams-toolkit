// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";

import * as commonUtils from "../../../src/debug/commonUtils";

const testDataFolder = path.resolve(__dirname, "test-data");

suite("[debug > commonUtils]", () => {
  suiteSetup(async () => {
    await fs.ensureDir(testDataFolder);
    await fs.emptyDir(testDataFolder);
  });

  suite("loadPackageJson()", () => {
    test("happy path", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const packageJson = await commonUtils.loadPackageJson(packageJsonPath);
      chai.expect(packageJson).not.to.be.undefined;
      chai.expect(packageJson!.name).equals("test");
      chai.expect(packageJson!.version).equals("1.0.0");
      chai.expect(packageJson!.scripts).eql({ build: "tsc --build" });
    });

    test("file not found", async () => {
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.remove(packageJsonPath);

      const packageJson = await commonUtils.loadPackageJson(packageJsonPath);
      chai.expect(packageJson).to.be.undefined;
    });

    test("bad format", async () => {
      const content = `\
        {\n\
          "name": "test",,,,\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const packageJson = await commonUtils.loadPackageJson(packageJsonPath);
      chai.expect(packageJson).to.be.undefined;
    });
  });

  suite("loadTeamsFxDevScript()", () => {
    test("happy path", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "dev:teamsfx": "npm run dev",\n\
            "dev": "npx func start"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).not.to.be.undefined;
      chai.expect(devScript).equals("npx func start");
    });

    test("file not found", async () => {
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.remove(packageJsonPath);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).to.be.undefined;
    });

    test("bad format", async () => {
      const content = `\
        {\n\
          "name": "test",,,,\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).to.be.undefined;
    });

    test("no scripts", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0"\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).to.be.undefined;
    });

    test("no dev:teamsfx", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "dev": "npx func start -- Y"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).to.be.undefined;
    });

    test("custom dev:teamsfx", async () => {
      const content = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "dev:teamsfx": "npx func start --X",\n\
            "dev": "npx func start -- Y"\n\
          }\n\
        }`;
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.writeFile(packageJsonPath, content);

      const devScript = await commonUtils.loadTeamsFxDevScript(testDataFolder);
      chai.expect(devScript).not.to.be.undefined;
      chai.expect(devScript).equals("npx func start --X");
    });
  });
});
