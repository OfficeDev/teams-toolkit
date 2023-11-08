// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference } from "botbuilder";
import * as fs from "fs";
import * as path from "path";
import {
  NotificationTargetStorage,
  ConversationReferenceStore,
  ConversationReferenceStoreAddOptions,
  PagedData,
} from "./interface";

/**
 * @internal
 */
export class LocalFileStorage implements NotificationTargetStorage {
  private readonly localFileName =
    process.env.TEAMSFX_NOTIFICATION_STORE_FILENAME ?? ".notification.localstore.json";
  private readonly filePath: string;

  constructor(fileDir: string) {
    this.filePath = path.resolve(fileDir, this.localFileName);
  }

  async read(key: string): Promise<{ [key: string]: unknown } | undefined> {
    if (!(await this.storeFileExists())) {
      return undefined;
    }

    const data = await this.readFromFile();

    return data[key];
  }

  async list(): Promise<{ [key: string]: unknown }[]> {
    if (!(await this.storeFileExists())) {
      return [];
    }

    const data = await this.readFromFile();

    return Object.entries(data).map((entry) => entry[1] as { [key: string]: unknown });
  }

  async write(key: string, object: { [key: string]: unknown }): Promise<void> {
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

  private async writeToFile(data: unknown): Promise<void> {
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
export class DefaultConversationReferenceStore implements ConversationReferenceStore {
  private readonly storage: NotificationTargetStorage;

  constructor(storage: NotificationTargetStorage) {
    this.storage = storage;
  }

  async add(
    key: string,
    reference: Partial<ConversationReference>,
    options: ConversationReferenceStoreAddOptions
  ): Promise<boolean> {
    if (options.overwrite) {
      await this.storage.write(key, reference);
      return true;
    }

    const ref = await this.storage.read(key);
    if (ref === undefined) {
      await this.storage.write(key, reference);
      return true;
    }

    return false;
  }

  async remove(key: string, reference: Partial<ConversationReference>): Promise<boolean> {
    const ref = await this.storage.read(key);
    if (ref === undefined) {
      return false;
    }

    await this.storage.delete(key);
    return true;
  }

  async list(
    pageSize?: number,
    continuationToken?: string
  ): Promise<PagedData<Partial<ConversationReference>>> {
    const data = await this.storage.list();
    return {
      data,
      continuationToken: "",
    };
  }
}
