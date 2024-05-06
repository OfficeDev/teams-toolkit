export class LanguageModelChatSystemMessage {
  content: string;

  constructor(content: string) {
    this.content = content;
  }
}

export class LanguageModelChatUserMessage {
  content: string;
  name: string | undefined;

  constructor(content: string, name?: string) {
    this.content = content;
    this.name = name;
  }
}

export class LanguageModelChatAssistantMessage {
  content: string;
  name: string | undefined;

  constructor(content: string, name?: string) {
    this.content = content;
    this.name = name;
  }
}

export enum ChatLocation {
  /**
   * The chat panel
   */
  Panel = 1,
  /**
   * Terminal inline chat
   */
  Terminal = 2,
  /**
   * Notebook inline chat
   */
  Notebook = 3,
  /**
   * Code editor inline chat
   */
  Editor = 4,
}
