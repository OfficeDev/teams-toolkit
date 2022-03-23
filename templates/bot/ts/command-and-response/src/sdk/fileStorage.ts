import { Storage, StoreItems } from "botbuilder";
import * as fse from "fs-extra";

export class LocalFileStorage implements Storage {
  private readonly filePath = ".notification.localstore.json";

  async read(keys: string[]): Promise<StoreItems> {
    if (!(await fse.pathExists(this.filePath))) {
      return {};
    }

    const data: StoreItems = await fse.readJSON(this.filePath, { encoding: "utf-8" });

    const storeItems: StoreItems = {};
    keys.map((k) => {
      storeItems[k] = data[k];
    });

    return storeItems;
  }

  async write(changes: StoreItems): Promise<void> {
    if (!(await fse.pathExists(this.filePath))) {
      await fse.writeJSON(this.filePath, changes, { encoding: "utf-8", spaces: 2 });
      return;
    }

    const data = await fse.readJSON(this.filePath, { encoding: "utf-8" });
    await fse.writeJSON(this.filePath, Object.assign(data, changes), {
      encoding: "utf-8",
      spaces: 2,
    });
  }

  delete(keys: string[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
