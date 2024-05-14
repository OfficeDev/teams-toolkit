export class LanguageModelChatMessage {
  /**
   * The role of this message.
   */
  role: LanguageModelChatMessageRole;

  /**
   * The content of this message.
   */
  content: string;

  /**
   * The optional name of a user for this message.
   */
  name: string | undefined;

  /**
   * Create a new user message.
   *
   * @param role The role of the message.
   * @param content The content of the message.
   * @param name The optional name of a user for the message.
   */
  constructor(role: LanguageModelChatMessageRole, content: string, name?: string) {
    this.role = role;
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

export enum LanguageModelChatMessageRole {
  /**
   * The user role.
   */
  User = 1,

  /**
   * The assistant role.
   */
  Assistant = 2,

  /**
   * The system role.
   */
  System = 3,
}
