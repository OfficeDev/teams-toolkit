/* eslint-disable max-classes-per-file */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

"use strict";

import { EventEmitter as NodeEventEmitter } from "events";
import * as vscode from "vscode";
// export * from './range';
// export * from './position';
// export * from './selection';
export * as chat from "./chat";
export * as vscMockExtHostedTypes from "./extHostedTypes";
export * as vscUri from "./uri";

const escapeCodiconsRegex = /(\\)?\$\([a-z0-9\-]+?(?:~[a-z0-9\-]*?)?\)/gi;
export function escapeCodicons(text: string): string {
  return text.replace(escapeCodiconsRegex, (match, escaped) => (escaped ? match : `\\${match}`));
}

export enum ExtensionKind {
  /**
   * Extension runs where the UI runs.
   */
  UI = 1,

  /**
   * Extension runs where the remote extension host runs.
   */
  Workspace = 2,
}

export enum LanguageStatusSeverity {
  Information = 0,
  Warning = 1,
  Error = 2,
}

export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export class Disposable {
  constructor(private callOnDispose: () => void) {}

  public dispose(): void {
    if (this.callOnDispose) {
      this.callOnDispose();
    }
  }
}

export class EventEmitter<T> implements vscode.EventEmitter<T> {
  public event: vscode.Event<T>;

  public emitter: NodeEventEmitter;

  constructor() {
    this.event = this.add.bind(this) as unknown as vscode.Event<T>;
    this.emitter = new NodeEventEmitter();
  }

  public fire(data?: T): void {
    this.emitter.emit("evt", data);
  }

  public dispose(): void {
    this.emitter.removeAllListeners();
  }

  protected add = (
    listener: (e: T) => void,
    _thisArgs?: EventEmitter<T>,
    _disposables?: Disposable[]
  ): Disposable => {
    const bound = _thisArgs ? listener.bind(_thisArgs) : listener;
    this.emitter.addListener("evt", bound);
    return {
      dispose: () => {
        this.emitter.removeListener("evt", bound);
      },
    } as Disposable;
  };
}

export class CancellationToken<T> extends EventEmitter<T> implements vscode.CancellationToken {
  public isCancellationRequested!: boolean;

  public onCancellationRequested: vscode.Event<T>;

  constructor() {
    super();
    this.onCancellationRequested = this.add.bind(this) as vscode.Event<T>;
  }

  public cancel(): void {
    this.isCancellationRequested = true;
    this.fire();
  }
}

export class CancellationTokenSource {
  public token: CancellationToken<unknown>;

  constructor() {
    this.token = new CancellationToken();
  }

  public cancel(): void {
    this.token.cancel();
  }

  public dispose(): void {
    this.token.dispose();
  }
}

export class CodeAction {
  public title: string;

  public edit?: vscode.WorkspaceEdit;

  public diagnostics?: vscode.Diagnostic[];

  public command?: vscode.Command;

  public kind?: CodeActionKind;

  public isPreferred?: boolean;

  constructor(_title: string, _kind?: CodeActionKind) {
    this.title = _title;
    this.kind = _kind;
  }
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  Reference = 17,
  File = 16,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
  User = 25,
  Issue = 26,
}
export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}
export enum IndentAction {
  None = 0,
  Indent = 1,
  IndentOutdent = 2,
  Outdent = 3,
}

export enum CompletionTriggerKind {
  Invoke = 0,
  TriggerCharacter = 1,
  TriggerForIncompleteCompletions = 2,
}

export class MarkdownString {
  public value: string;

  public isTrusted?: boolean;

  public readonly supportThemeIcons?: boolean;

  constructor(value?: string, supportThemeIcons = false) {
    this.value = value ?? "";
    this.supportThemeIcons = supportThemeIcons;
  }

  public static isMarkdownString(
    thing?: string | MarkdownString | unknown
  ): thing is vscode.MarkdownString {
    if (thing instanceof MarkdownString) {
      return true;
    }
    return (
      thing !== undefined &&
      typeof thing === "object" &&
      thing !== null &&
      thing.hasOwnProperty("appendCodeblock") &&
      thing.hasOwnProperty("appendMarkdown") &&
      thing.hasOwnProperty("appendText") &&
      thing.hasOwnProperty("value")
    );
  }

  public appendText(value: string): MarkdownString {
    // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    this.value += (this.supportThemeIcons ? escapeCodicons(value) : value)
      .replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&")
      .replace(/\n/, "\n\n");

    return this;
  }

  public appendMarkdown(value: string): MarkdownString {
    this.value += value;

    return this;
  }

  public appendCodeblock(code: string, language = ""): MarkdownString {
    this.value += "\n```";
    this.value += language;
    this.value += "\n";
    this.value += code;
    this.value += "\n```\n";
    return this;
  }
}

export class Hover {
  public contents: vscode.MarkdownString[] | vscode.MarkedString[];

  public range: vscode.Range | undefined;

  constructor(
    contents:
      | vscode.MarkdownString
      | vscode.MarkedString
      | vscode.MarkdownString[]
      | vscode.MarkedString[],
    range?: vscode.Range
  ) {
    if (!contents) {
      throw new Error("Illegal argument, contents must be defined");
    }
    if (Array.isArray(contents)) {
      this.contents = <vscode.MarkdownString[] | vscode.MarkedString[]>contents;
    } else if (MarkdownString.isMarkdownString(contents)) {
      this.contents = [contents];
    } else {
      this.contents = [contents];
    }
    this.range = range;
  }
}

export class CodeActionKind {
  public static readonly Empty: CodeActionKind = new CodeActionKind("empty");

  public static readonly QuickFix: CodeActionKind = new CodeActionKind("quick.fix");

  public static readonly Refactor: CodeActionKind = new CodeActionKind("refactor");

  public static readonly RefactorExtract: CodeActionKind = new CodeActionKind("refactor.extract");

  public static readonly RefactorInline: CodeActionKind = new CodeActionKind("refactor.inline");

  public static readonly RefactorRewrite: CodeActionKind = new CodeActionKind("refactor.rewrite");

  public static readonly Source: CodeActionKind = new CodeActionKind("source");

  public static readonly SourceOrganizeImports: CodeActionKind = new CodeActionKind(
    "source.organize.imports"
  );

  public static readonly SourceFixAll: CodeActionKind = new CodeActionKind("source.fix.all");

  private constructor(private _value: string) {}

  public append(parts: string): CodeActionKind {
    return new CodeActionKind(`${this._value}.${parts}`);
  }

  public intersects(other: CodeActionKind): boolean {
    return this._value.includes(other._value) || other._value.includes(this._value);
  }

  public contains(other: CodeActionKind): boolean {
    return this._value.startsWith(other._value);
  }

  public get value(): string {
    return this._value;
  }
}

export interface DebugAdapterExecutableOptions {
  env?: { [key: string]: string };
  cwd?: string;
}

export class DebugAdapterServer {
  constructor(public readonly port: number, public readonly host?: string) {}
}
export class DebugAdapterExecutable {
  constructor(
    public readonly command: string,
    public readonly args: string[] = [],
    public readonly options?: DebugAdapterExecutableOptions
  ) {}
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export enum UIKind {
  Desktop = 1,
  Web = 2,
}

export class InlayHint {
  tooltip?: string | MarkdownString | undefined;

  textEdits?: vscode.TextEdit[];

  paddingLeft?: boolean;

  paddingRight?: boolean;

  constructor(public position: vscode.Position) {}
}

export enum TaskRevealKind {
  Always = 1,
  Silent = 2,
  Never = 3,
}
