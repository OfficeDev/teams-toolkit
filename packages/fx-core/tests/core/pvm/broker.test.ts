import { it, describe } from "mocha";
import { ensureDir, pathExists, rmdir } from "fs-extra";
import { expect } from "chai";
import { tmpdir } from "os";
import { join } from "path";
import { nanoid } from "nanoid";

import { Broker } from "../../../src/core/pvm/broker";
import { ConfigFolderName, UserError } from "@microsoft/teamsfx-api";
import { PLUGIN_DOT_JSON } from "../../../src/core/pvm/constant";
import { Plugins } from "../../../src/core/pvm/type";

describe("Plugin Version Manager: Broker(API layer)", async () => {
  it("throw InvalidProjectError if path isn't existed", async () => {
    const targetPath = join(tmpdir(), nanoid(10));
    expect(await pathExists(targetPath)).to.be.false;

    try {
      await Broker.list(targetPath);
    } catch (e) {
      if (e instanceof UserError) {
        expect(e.name).equals("InvalidProject");
      } else {
        expect(e).is.null;
      }
    }
  });

  it("should init config file for new project", async () => {
    const targetPath = join(tmpdir(), nanoid(10));
    expect(await pathExists(targetPath)).to.be.false;
    await ensureDir(targetPath);

    try {
      await Broker.list(targetPath);

      expect(await pathExists(join(targetPath, ConfigFolderName))).is.true;
      expect(await pathExists(join(targetPath, ConfigFolderName, PLUGIN_DOT_JSON))).is.true;
    } catch (e) {
      expect(e).is.null;
    } finally {
      await rmdir(targetPath, { recursive: true });
    }
  });

  it("should insert / update / delete / list plugins", async () => {
    const targetPath = join(tmpdir(), nanoid(10));
    expect(await pathExists(targetPath)).to.be.false;
    await ensureDir(targetPath);

    let plugins: Plugins = {
      a: "1.0.0",
    };

    try {
      await Broker.save(targetPath, plugins);
      let result = await Broker.list(targetPath);
      expect(Object.keys(result).length).equals(1);
      expect(result["a"]).equals("1.0.0");

      plugins = {
        a: "2.0.0",
        b: "1.0.0",
      };

      await Broker.save(targetPath, plugins);
      result = await Broker.list(targetPath);
      expect(Object.keys(result).length).equals(2);
      expect(result["a"]).equals("2.0.0");
      expect(result["b"]).equals("1.0.0");

      await Broker.remove(targetPath, ["a"]);
      result = await Broker.list(targetPath);
      expect(Object.keys(result).length).equals(1);
      expect(result["a"]).is.undefined;
      expect(result["b"]).equals("1.0.0");
    } catch (e) {
      expect(e).is.null;
    } finally {
      await rmdir(targetPath, { recursive: true });
    }
  });
});
