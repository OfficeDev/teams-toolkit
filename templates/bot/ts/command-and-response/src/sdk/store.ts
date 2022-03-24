import { ConversationReference, Storage } from "botbuilder";

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

  update(reference: Partial<ConversationReference>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  delete(reference: Partial<ConversationReference>): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
