// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference, Storage, StoreItems } from "botbuilder";
import * as fs from "fs";
import * as path from "path";

/**
 * @internal
 */
export class LocalFileStorage implements Storage {
  private readonly localFileName = ".notification.localstore.json";
  private readonly filePath: string;

  constructor(fileDir: string) {
    this.filePath = path.resolve(fileDir, this.localFileName);
  }

  async read(keys: string[]): Promise<StoreItems> {
    if (!(await this.storeFileExists())) {
      return {};
    }

    const data = await this.readFromFile();

    const storeItems: StoreItems = {};
    keys.map((k) => {
      if (data[k]) {
        storeItems[k] = data[k];
      }
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
        fs.access(this.filePath, (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
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
          } else {
            resolve(JSON.parse(rawData));
          }
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
          } else {
            resolve();
          }
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

  constructor(storage: Storage, storageKey: string) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async getAll(): Promise<Map<string, Partial<ConversationReference>>> {
    const items = await this.storage.read([this.storageKey]);
    const itemsMap = items[this.storageKey];
    if (itemsMap === undefined) {
      return new Map<string, Partial<ConversationReference>>();
    }

    return new Map(Object.entries(itemsMap));
  }

  async set(reference: Partial<ConversationReference>): Promise<void> {
    const references = await this.getAll();
    references.set(this.getKey(reference), reference);
    await this.storage.write({ [this.storageKey]: Object.fromEntries(references) });
  }

  async delete(reference: Partial<ConversationReference>): Promise<void> {
    const references = await this.getAll();
    references.delete(this.getKey(reference));
    await this.storage.write({ [this.storageKey]: Object.fromEntries(references) });
  }

  private getKey(reference: Partial<ConversationReference>): string {
    return `_${reference.conversation?.tenantId}_${reference.conversation?.id}`;
  }
}
