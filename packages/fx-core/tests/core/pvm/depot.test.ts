import { it, describe } from "mocha";
import { ensureDir, pathExists, rmdir } from "fs-extra";
import { expect } from "chai";
import { lock } from "proper-lockfile";
import rewire from "rewire";

import { Depot } from "../../../src/core/pvm/depot";
import { PVM_SPEC_VERSION } from "../../../src/core/pvm/constant";
import { Plugins } from "../../../src/core/pvm/type";

describe("Plugin Version Manager: Depot(storage layer)", async () => {
  const rewireDepot = rewire("../../../src/core/pvm/depot.ts");
  /**
   * Depot depends on the local file system. If we're gonna cover
   * all corner cases, we should use a temporary file system to
   * replace the local file system for all test case.
   */
  beforeEach(async () => {
    if (await pathExists(rewireDepot.__get__("DEPOT_ADDR"))) {
      await rmdir(rewireDepot.__get__("DEPOT_ADDR"), { recursive: true });
    }
  });

  it("should init on clean machine successfully", async () => {
    let exist = await pathExists(rewireDepot.__get__("DEPOT_ADDR"));
    expect(exist).to.be.false;

    const mf = await Depot.getManifest();

    exist = await pathExists(rewireDepot.__get__("DEPOT_ADDR"));
    expect(exist).to.be.true;

    expect(mf.version).equals(PVM_SPEC_VERSION);
    expect(Object.keys(mf.plugins).length).equals(0);
  });

  it("should init on existing machine successfully", async () => {
    let mf = await Depot.getManifest();

    const exist = await pathExists(rewireDepot.__get__("DEPOT_ADDR"));
    expect(exist).to.be.true;

    mf = await Depot.getManifest();
    expect(mf.version).equals(PVM_SPEC_VERSION);
  });

  it("version compatible", async () => {
    // nothing to do right now
  });

  it("validarot will block invalid package uri", async () => {
    const mf = await Depot.getManifest();
    expect(Object.keys(mf.plugins).length).equals(0);

    const pkgs: Plugins = {
      "@microsoft/teamsfx-cli": "something",
    };
    const result = await Depot.install(pkgs);
    expect(result.isOk()).to.be.false;
  });

  it("install local plugin and save to depot", async () => {
    const targetAddr = `${__dirname}/../../../../cli`;
    const pkgs: Plugins = {
      "@microsoft/teamsfx-cli": targetAddr,
    };
    const result = await Depot.install(pkgs);
    if (result.isErr()) {
      console.log(result.error);
    }
    expect(result.isOk()).to.be.true;

    const mf = await Depot.getManifest();
    expect(Object.keys(mf.plugins).length).equals(1);
    expect(Object.values(mf.plugins).length).equals(1);
    const cliPkg = require(`${targetAddr}/package.json`);
    expect(mf.plugins["@microsoft/teamsfx-cli"][0]).equals(cliPkg.version);
  });

  it("should return error if run install in parallel", async () => {
    const targetAddr = `${__dirname}/../../../../cli`;
    const pkgs: Plugins = {
      "@microsoft/teamsfx-cli": targetAddr,
    };
    try {
      await ensureDir(rewireDepot.__get__("DEPOT_ADDR"));
      await lock(rewireDepot.__get__("DEPOT_ADDR"));
      const result = await Depot.install(pkgs);
      expect(result.isOk()).to.be.false;
      if (result.isErr()) {
        console.log(result.error.name);
        expect(result.error.name).equals("ConcurrentError");
      }
    } catch (e) {
      expect(e).to.be.null;
    }
  });
});
