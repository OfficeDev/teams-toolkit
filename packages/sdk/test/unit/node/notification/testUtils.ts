import { Storage, StoreItems } from "botbuilder";
import { NotificationTarget, NotificationTargetType } from "../../../../src/notification/interface";

export class TestStorage implements Storage {
  public items: any = {};
  async read(keys: string[]): Promise<StoreItems> {
    const storeItems: StoreItems = {};
    keys.map((k) => {
      if (this.items[k]) {
        storeItems[k] = this.items[k];
      }
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

export class TestTarget implements NotificationTarget {
  public content: any;
  public type?: NotificationTargetType | undefined;
  public sendMessage(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.content = text;
      resolve();
    });
  }
  public sendAdaptiveCard(card: unknown): Promise<void> {
    return new Promise((resolve) => {
      this.content = card;
      resolve();
    });
  }
}
