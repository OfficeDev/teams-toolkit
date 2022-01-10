import { it, describe } from "mocha";
import { expect } from "chai";
import { Depot } from "../../../src/core/pvm/depot";

describe("Plugin Version Manager: Depot(storage layer)", async () => {
  /**
   * Depot depends on the local file system. If we're gonna cover
   * all corner cases, we should use a temporary file system to
   * replace the local file system for all test case.
   */
  before(async () => {});

  it("Depot should be a singleton", async () => {
    const insA = await Depot.getInstance();
    const insB = await Depot.getInstance();
    expect(insA).equals(insB);
  });

  it("init on clean machine", async () => {});
  it("init on exist machine", async () => {});

  it("version compatible", async () => {});

  it("concurrent scenario", async () => {});

  it("single plugin with single version", async () => {});
  it("single plugin with multiple versions", async () => {});
  it("multiple plugins with single version", async () => {});
  it("multiple plugins with multiple versions", async () => {});
});
