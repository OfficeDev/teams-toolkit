import { Storage, StoreItems } from "botbuilder";

export class TestStorage implements Storage {
  public items: any = {};
  async read(keys: string[]): Promise<StoreItems> {
    const storeItems: StoreItems = {};
    keys.map((k) => {
      storeItems[k] = this.items[k];
    });
    return storeItems;
  }

  async write(changes: StoreItems): Promise<void> {
    Object.assign(this.items, changes);
  }

  delete(keys: string[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
