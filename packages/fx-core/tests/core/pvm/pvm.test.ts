import { it, describe } from "mocha";
import { ensureDir, rmdir } from "fs-extra";
import { expect } from "chai";
import { tmpdir } from "os";
import { join } from "path";
import { nanoid } from "nanoid";

import pvm, { BuiltInFeaturePluginNames } from "../../../src/core/pvm/pvm";

describe("Plugin Version Manager: PVM", async () => {
  it("should load only static plugins", async () => {
    const targetPath = join(tmpdir(), nanoid(10));
    await ensureDir(targetPath);

    const result = await pvm.load(targetPath);
    expect(result.isOk()).is.true;
    if (result.isOk()) {
      expect(result.value.length).equals(BuiltInFeaturePluginNames.length);
    }

    await rmdir(targetPath, { recursive: true });
  });

  it("should load dynamic plugins", async () => {
    const targetPath = join(tmpdir(), nanoid(10));
    await ensureDir(targetPath);

    const result = await pvm.load(targetPath);
    expect(result.isOk()).is.true;
    if (result.isOk()) {
      expect(result.value.length).equals(
        BuiltInFeaturePluginNames.length + BuiltInScaffoldPluginNames.length
      );
    }

    await rmdir(targetPath, { recursive: true });
  });
});
