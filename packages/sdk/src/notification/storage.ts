// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference, Storage, StoreItems } from "botbuilder";
import * as fs from "fs";

/**
 * @internal
 */
export class LocalFileStorage implements Storage {
  private readonly filePath = ".notification.localstore.json";

  async read(keys: string[]): Promise<StoreItems> {
    if (!(await this.storeFileExists())) {
      return {};
    }

    const data: StoreItems = await this.readFromFile();

    const storeItems: StoreItems = {};
    keys.map((k) => {
      storeItems[k] = data[k];
    });

    return storeItems;
  }

  async write(changes: StoreItems): Promise<void> {
    if (!(await this.storeFileExists())) {
      await this.writeToFile(changes);
      return;
    }

    const data = await this.readFromFile();
    await this.writeToFile(Object.assign(data, changes));
  }

  delete(keys: string[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private storeFileExists(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        fs.access(this.filePath, () => resolve(true));
      } catch (error: unknown) {
        resolve(false);
      }
    });
  }

  private readFromFile(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        fs.readFile(this.filePath, { encoding: "utf-8" }, (err, rawData) => {
          if (err) {
            reject(err);
          }

          resolve(JSON.parse(rawData));
        });
      } catch (error: unknown) {
        reject(error);
      }
    });
  }

  private async writeToFile(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const rawData = JSON.stringify(data, undefined, 2);
        fs.writeFile(this.filePath, rawData, { encoding: "utf-8" }, (err) => {
          if (err) {
            reject(err);
          }

          resolve();
        });
      } catch (error: unknown) {
        reject(error);
      }
    });
  }
}

/**
 * @internal
 */
export class ConversationReferenceStore {
  private readonly storage: Storage;
  private readonly storageKey: string;
  private readonly objectKey = "conversations";

  constructor(storage: Storage, storageKey: string) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async list(): Promise<Partial<ConversationReference>[]> {
    const items = await this.storage.read([this.storageKey]);
    if (
      items[this.storageKey] === undefined ||
      items[this.storageKey][this.objectKey] === undefined
    ) {
      return new Array<Partial<ConversationReference>>();
    }

    return items[this.storageKey][this.objectKey];
  }

  async add(reference: Partial<ConversationReference>): Promise<Partial<ConversationReference>[]> {
    const references = await this.list();
    if (references.find((r) => r.conversation?.id === reference.conversation?.id)) {
      return references;
    }

    references.push(reference);
    await this.storage.write({ [this.storageKey]: { [this.objectKey]: references } });
    return references;
  }
}
