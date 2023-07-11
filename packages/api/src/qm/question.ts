// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, OptionItem } from "../types";
import { InputTextConfig } from "./ui";
import {
  ConditionFunc,
  FuncValidation,
  StringArrayValidation,
  StringValidation,
  ValidationSchema,
} from "./validation";

export interface FunctionRouter {
  namespace: string;
  method: string;
}

export interface Func extends FunctionRouter {
  params?: any;
}

/**
 * definition of a function that return some dynamic value
 */
export type LocalFunc<T> = (inputs: Inputs) => T | Promise<T>;

export type OnSelectionChangeFunc = (
  currentSelectedIds: Set<string>,
  previousSelectedIds: Set<string>
) => Promise<Set<string>>;

/**
 * static option is `string` array or `OptionItem` array.
 * If the option is a string array, each element of which will be converted to an `OptionItem` object with `id` and `label` field equal to the string element.
 * For example, option=['id1','id2'] => [{'id':'id1', label:'id1'},{'id':'id2', label:'id2'}].
 */
export type StaticOptions = string[] | OptionItem[];

/**
 * dynamic option is defined by a function
 */
export type DynamicOptions = LocalFunc<StaticOptions>;

/**
 * Basic question data
 */
export interface BaseQuestion {
  /**
   * name is the identifier of the question
   */
  name: string;

  /**
   * human readable meaningful display name of the question
   */
  title?: string | LocalFunc<string | undefined>;

  /**
   * the answer of the question
   */
  value?: unknown;

  /**
   * default input value
   */
  default?: unknown;

  /**
   * `step` and `totalSteps` are used to describe the progress in question flow
   * `step` is the sequence number of current question
   */
  step?: number;

  /**
   * `totalStep` is the number of questions totally
   */
  totalSteps?: number;

  /**
   * if true, the toolkit will not remember the value as default value
   */
  forgetLastValue?: boolean;

  /**
   * Actions that can be made within the question.
   * @param An array of actions
   * @param `icon` is the icon id of the action item
   * @param `tooltip` is the hint of the action item
   * @param `command` is the command name that will be executed when current action triggered
   */
  buttons?: { icon: string; tooltip: string; command: string }[];
}

/**
 * Definition of question that needs human input
 */
export interface UserInputQuestion extends BaseQuestion {
  /**
   * question type
   */
  type:
    | "singleSelect"
    | "multiSelect"
    | "singleFile"
    | "multiFile"
    | "folder"
    | "text"
    | "singleFileOrText";
  /**
   * title is required for human input question
   */
  title: string | LocalFunc<string | undefined>;
  /**
   * placeholder in the input text box
   * placeholder can have dynamic value defined by a function with type `LocalFunc<string | undefined>`
   */
  placeholder?: string | LocalFunc<string | undefined>;
  /**
   * prompt text providing some ask or explanation to the user
   * prompt can have dynamic value defined by a function with type `LocalFunc<string | undefined>`
   */
  prompt?: string | LocalFunc<string | undefined>;
  /**
   * default value of the question
   */
  default?: string | string[] | LocalFunc<string | string[] | undefined>;
  /**
   * validation schema for the answer value, which can be static validation schema or dynamic customized validation function
   */
  validation?: ValidationSchema;
  /**
   * An optional validation message indicating or explaining the problem with the current input value.
   */
  validationHelp?: string;
}

/**
 * Definition of single selection question
 */
export interface SingleSelectQuestion extends UserInputQuestion {
  type: "singleSelect";

  /**
   * static options array
   * CLI's help command focus only on this static option
   */
  staticOptions: StaticOptions;

  /**
   * dynamic option, which has higher priority than static options
   */
  dynamicOptions?: DynamicOptions;

  /**
   * answer value, which is the `id` string or `OptionItem` object
   */
  value?: string | OptionItem;

  /**
   * The default selected `id` value of the option item
   */
  default?: string | LocalFunc<string | undefined>;

  /**
   * This config only works for option items with `OptionItem[]` type. If `returnObject` is true, the answer value is an `OptionItem` object; otherwise, the answer value is the `id` string of the `OptionItem`.
   * In case of option items with `string[]` type, whether `returnObject` is true or false, the returned answer value is always a string.
   */
  returnObject?: boolean;

  /**
   * whether to skip the single option select question
   * if true: single select question will be automatically answered with the single option;
   * if false: use still need to do the selection manually even there is no other choice.
   */
  skipSingleOption?: boolean;
}

/**
 * Definition of multiple selection question
 */
export interface MultiSelectQuestion extends UserInputQuestion {
  type: "multiSelect";
  /**
   * static options array
   * CLI's help command focus only on this static option
   */
  staticOptions: StaticOptions;

  /**
   * dynamic option, which has higher priority than static options
   */
  dynamicOptions?: DynamicOptions;

  /**
   * answer value, which is `id` string array or `OptionItem` object array
   */
  value?: string[] | OptionItem[];

  /**
   * The default selected `id` array of the option item
   */
  default?: string[] | LocalFunc<string[] | undefined>;

  /**
   * This config only works for option items with `OptionItem[]` type. If `returnObject` is true, the answer value is an array of `OptionItem` objects; otherwise, the answer value is an array of `id` strings.
   * In case of option items with `string[]` type, whether `returnObject` is true or false, the returned answer value is always a string array.
   */
  returnObject?: boolean;

  /**
   * whether to skip the single option select question
   * if true: single select question will be automatically answered with the single option;
   * if false: use still need to do the selection manually even there is no second choice
   */
  skipSingleOption?: boolean;
  /**
   * a callback function which is triggered when the selected values change, which can change the final selected values.
   * @param currentSelectedIds current selected option ids
   * @param previousSelectedIds previous selected option ids
   * @returns the final selected option ids
   */
  onDidChangeSelection?: OnSelectionChangeFunc;

  /**
   * validation schema for the answer values
   */
  validation?: StringArrayValidation | FuncValidation<string[]>;
}

/**
 * Definition of text input question
 */
export interface TextInputQuestion extends UserInputQuestion {
  type: "text";
  /**
   * If the input value should be hidden. Defaults to false.
   */
  password?: boolean;
  /**
   * input value.
   */
  value?: string;
  /**
   * default value
   *
   */
  default?: string | LocalFunc<string | undefined>;
  /**
   * validation schema, which can be a dynamic function closure
   */
  validation?: StringValidation | FuncValidation<string>;
}

/**
 * Definition of single file selection
 */
export interface SingleFileQuestion extends UserInputQuestion {
  type: "singleFile";
  /**
   * the answer value is a file path string
   */
  value?: string;
  /**
   * default selected file path
   */
  default?: string | LocalFunc<string | undefined>;
  /**
   * validation function
   */
  validation?: FuncValidation<string>;

  /**
   * This will only take effect in VSC.
   * A set of file filters that are used by the dialog. Each entry is a human-readable label,
   * like "TypeScript", and an array of extensions, e.g.
   * ```ts
   * {
   *     'Images': ['png', 'jpg']
   *     'TypeScript': ['ts', 'tsx']
   * }
   * ```
   */
  filters?: { [name: string]: string[] };
}

export interface MultiFileQuestion extends UserInputQuestion {
  type: "multiFile";
  /**
   * the answer value is an array of file paths
   */
  value?: string[];
  /**
   * default selected file path
   */
  default?: string | LocalFunc<string | undefined>;
  /**
   * validation function
   */
  validation?: FuncValidation<string[]>;
}

export interface FolderQuestion extends UserInputQuestion {
  type: "folder";
  /**
   * the answer value is a folder path string
   */
  value?: string;
  /**
   * default selected folder path
   */
  default?: string | LocalFunc<string | undefined>;
  /**
   * validation function
   */
  validation?: FuncValidation<string>;
}

/**
 * `FuncQuestion` will not show any UI, but load some dynamic data in the question flow;
 * The dynamic data can be referred by the following question.
 */
export interface FuncQuestion extends BaseQuestion {
  type: "func";
  /**
   * A function that will be called to when the question is activated.
   */
  func: LocalFunc<any>;
}

export interface SingleFileOrInputQuestion extends UserInputQuestion {
  type: "singleFileOrText";
  /**
   * An item shown in the list in VSC that user can click to input text.
   */
  inputOptionItem: OptionItem;

  /**
   * Config for the input box.
   */
  inputBoxConfig: InputTextConfig;

  /**
   * This will only take effect in VSC.
   * A set of file filters that are used by the dialog. Each entry is a human-readable label,
   * like "TypeScript", and an array of extensions, e.g.
   * ```ts
   * {
   *     'Images': ['png', 'jpg']
   *     'TypeScript': ['ts', 'tsx']
   * }
   * ```
   */
  filters?: { [name: string]: string[] };
}

/**
 * `Group` is a virtual node in the question tree that wraps a group of questions, which share the same activation condition in this group.
 */
export interface Group {
  type: "group";
  name?: string;
}

export type Question =
  | SingleSelectQuestion
  | MultiSelectQuestion
  | TextInputQuestion
  | SingleFileQuestion
  | MultiFileQuestion
  | FolderQuestion
  | FuncQuestion
  | SingleFileQuestion
  | SingleFileOrInputQuestion;

/**
 * QTreeNode is the tree node data structure, which have three main properties:
 * - data: data is either a group or question. Questions can be organized into a group, which has the same trigger condition.
 * - condition: trigger condition for this node to be activated;
 * - children: child questions that will be activated according their trigger condition.
 */
export class QTreeNode implements IQTreeNode {
  data: Question | Group;
  condition?: StringValidation | StringArrayValidation | ConditionFunc;
  children?: QTreeNode[];
  addChild(node: QTreeNode): QTreeNode {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(node);
    return this;
  }
  validate(): boolean {
    //1. validate the cycle dependency
    //2. validate the name uniqueness
    //3. validate the params of RPC
    // if (this.data.type === NodeType.group && (!this.children || this.children.length === 0)) return false;
    return true;
  }

  /**
   * trim the tree
   */
  trim(): QTreeNode | undefined {
    if (this.children) {
      const newChildren: QTreeNode[] = [];
      for (const node of this.children) {
        const trimmed = node.trim();
        if (trimmed) newChildren.push(trimmed);
      }
      this.children = newChildren;
    }
    if (this.data.type === "group") {
      if (!this.children || this.children.length === 0) return undefined;
      if (this.children.length === 1) {
        const child = this.children[0];
        if (!(this.condition && child.condition)) {
          child.condition ||= this.condition;
          return child;
        }
      }
    }
    return this;
  }
  constructor(data: Question | Group) {
    this.data = data;
  }
}

export interface IQTreeNode {
  data: Question | Group;
  condition?: StringValidation | StringArrayValidation | ConditionFunc;
  children?: IQTreeNode[];
}
