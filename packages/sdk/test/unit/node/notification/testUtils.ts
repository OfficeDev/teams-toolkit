import {
  NotificationTarget,
  NotificationTargetStorage,
  NotificationTargetType,
} from "../../../../src/notification/interface";

export class TestStorage implements NotificationTargetStorage {
  public items: any = {};

  read(key: string): Promise<{ [key: string]: any } | undefined> {
    return new Promise((resolve) => resolve(this.items[key]));
  }

  list(): Promise<{ [key: string]: any }[]> {
    return new Promise((resolve) =>
      resolve(Object.entries(this.items).map((entry) => entry[1] as { [key: string]: any }))
    );
  }

  write(key: string, object: { [key: string]: any }): Promise<void> {
    return new Promise((resolve) => {
      this.items[key] = object;
      resolve();
    });
  }

  delete(key: string): Promise<void> {
    return new Promise((resolve) => {
      delete this.items[key];
      resolve();
    });
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
