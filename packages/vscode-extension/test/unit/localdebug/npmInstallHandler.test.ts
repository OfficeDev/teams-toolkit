// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";

import { hasNpmInstalled } from "../../../src/debug/npmInstallHandler";

const testDataFolder = path.resolve(__dirname, "test-data");

suite("[debug > npmInstallHandler]", () => {
  suiteSetup(async () => {
    await fs.ensureDir(testDataFolder);
  });

  suite("hasNpmInstalled()", () => {
    setup(async () => {
      await fs.emptyDir(testDataFolder);
    });
    test("npm installed", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
            "my-package": "1.0.0"\n\
          }\n\
        }`;
      const packageLockJson = "package-lock.json place holder";
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);
      await fs.writeFile(path.join(testDataFolder, "package-lock.json"), packageLockJson);
      await fs.ensureDir(path.join(testDataFolder, "node_modules", "my-package"));

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.true;
    });

    test("npm installing", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
            "my-package": "1.0.0"\n\
          }\n\
        }`;
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);
      await fs.ensureDir(path.join(testDataFolder, "node_modules", "my-package"));

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.false;
    });

    test("no package-lock.json", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
            "my-package": "1.0.0"\n\
          }\n\
        }`;
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.false;
    });

    test("has dependencies but no node_modules", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
            "my-package": "1.0.0"\n\
          }\n\
        }`;
      const packageLockJson = "package-lock.json place holder";
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);
      await fs.writeFile(path.join(testDataFolder, "package-lock.json"), packageLockJson);

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.false;
    });

    test("has dependencies but no package installed", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
            "my-package": "1.0.0"\n\
          }\n\
        }`;
      const packageLockJson = "package-lock.json place holder";
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);
      await fs.writeFile(path.join(testDataFolder, "package-lock.json"), packageLockJson);
      await fs.ensureDir(path.join(testDataFolder, "node_modules", ".staging"));

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.false;
    });

    test("no dependencies npm installed", async () => {
      const packageJson = `\
        {\n\
          "name": "test",\n\
          "version": "1.0.0",\n\
          "scripts": {\n\
            "build": "tsc --build"\n\
          },\n\
          "dependencies": {\n\
          }\n\
        }`;
      const packageLockJson = "package-lock.json place holder";
      await fs.writeFile(path.join(testDataFolder, "package.json"), packageJson);
      await fs.writeFile(path.join(testDataFolder, "package-lock.json"), packageLockJson);

      const npmInstalled = await hasNpmInstalled(testDataFolder);
      chai.expect(npmInstalled).to.be.true;
    });
  });
});
