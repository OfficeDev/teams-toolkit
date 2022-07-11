// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";

import * as commonUtils from "../../src/debug/commonUtils";

const testDataFolder = path.resolve(__dirname, "test-data");

describe("[debug > commonUtils]", () => {
  beforeEach(async () => {
    await fs.ensureDir(testDataFolder);
    await fs.emptyDir(testDataFolder);
  });

  describe("loadPackageJson()", () => {
    it("happy path", async () => {
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

    it("file not found", async () => {
      const packageJsonPath = path.join(testDataFolder, "package.json");
      await fs.remove(packageJsonPath);

      const packageJson = await commonUtils.loadPackageJson(packageJsonPath);
      chai.expect(packageJson).to.be.undefined;
    });

    it("bad format", async () => {
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
});
