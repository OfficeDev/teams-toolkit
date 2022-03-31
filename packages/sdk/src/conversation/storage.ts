// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference } from "botbuilder";
import * as fs from "fs";
import * as path from "path";
import { NotificationTargetStorage } from "./interface";

/**
 * @internal
 */
export class LocalFileStorage implements NotificationTargetStorage {
  private readonly localFileName = ".notification.localstore.json";
  private readonly filePath: string;

  constructor(fileDir: string) {
    this.filePath = path.resolve(fileDir, this.localFileName);
  }

  async read(key: string): Promise<{ [key: string]: any } | undefined> {
    if (!(await this.storeFileExists())) {
      return undefined;
    }

    const data = await this.readFromFile();

    return data[key];
  }

  async list(): Promise<{ [key: string]: any }[]> {
    if (!(await this.storeFileExists())) {
      return [];
    }

    const data = await this.readFromFile();

    return Object.entries(data).map((entry) => entry[1] as { [key: string]: any });
  }

  async write(key: string, object: { [key: string]: any }): Promise<void> {
    if (!(await this.storeFileExists())) {
      await this.writeToFile({ [key]: object });
      return;
    }

    const data = await this.readFromFile();
    await this.writeToFile(Object.assign(data, { [key]: object }));
  }

  async delete(key: string): Promise<void> {
    if (await this.storeFileExists()) {
      const data = await this.readFromFile();
      if (data[key] !== undefined) {
        delete data[key];
        await this.writeToFile(data);
      }
    }
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
  private readonly storage: NotificationTargetStorage;

  constructor(storage: NotificationTargetStorage) {
    this.storage = storage;
  }

  async check(reference: Partial<ConversationReference>): Promise<boolean> {
    const ref = await this.storage.read(this.getKey(reference));
    return ref !== undefined;
  }

  getAll(): Promise<Partial<ConversationReference>[]> {
    return this.storage.list();
  }

  set(reference: Partial<ConversationReference>): Promise<void> {
    return this.storage.write(this.getKey(reference), reference);
  }

  delete(reference: Partial<ConversationReference>): Promise<void> {
    return this.storage.delete(this.getKey(reference));
  }

  private getKey(reference: Partial<ConversationReference>): string {
    return `_${reference.conversation?.tenantId}_${reference.conversation?.id}`;
  }
}
