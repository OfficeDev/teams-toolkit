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
