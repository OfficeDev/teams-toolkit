// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 


import { Inputs } from "../types";
import { FuncValidation, StringArrayValidation, StringValidation, ValidationSchema } from "./validation";


export interface FunctionRouter {
  namespace: string,
  method: string
}

export interface Func extends FunctionRouter {
  params?: unknown;
}

/**
 * definition of a function that return some dynamic value
 */
export type LocalFunc<T> = (inputs: Inputs) => T | Promise<T>;

/**
 * Definition of option item in single selection or multiple selection
 */
export interface OptionItem {
  /**
   * unique identifier of the option item in the option list
   */
  id: string;
  /**
   * display name
   */
  label: string;
  /**
   * short description
   */
  description?: string;
  /**
   * detailed description
   */
  detail?: string;
  /**
   * customized user data, which is not displayed
   */
  data?: unknown;
  /**
   * CLI display name. CLI will use `cliName` as display name, and use `id` instead if `cliName` is undefined.
   */
  cliName?: string;
}

/**
 * static option is `string` array or `OptionItem` array.
 * If the option is a string array, each element of which will be converted to an `OptionItem` object with `id` and `label` field equal to the string element. 
 * For example, option=['id1','id2'] => [{'id':'id1', label:'id1'},{'id':'id2', label:'id2'}].
 */
export type StaticOptions = string[] | OptionItem[];

/**
 * dynamic option is defined by a function
 */
export type DymanicOptions = LocalFunc<StaticOptions>;


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
  title?: string;

  /**
   * the answer of the question
   */
  value?: unknown;

  /**
   * default value of the question
   */
  default?: unknown;

  /**
   * `step` and `totalSteps` are used to discribe the progress in question flow
   * `step` is the sequence number of current question
   */
  step?: number;

  /**
   * `totalStep` is the number of questions totally
   */
  totalSteps?: number;
}

/**
 * Definition of question that needs human input
 */
export interface UserInputQuestion extends BaseQuestion {
  /**
   * question type
   */
  type: "singleSelect" | "multiSelect" | "singleFile" | "multiFile" | "folder" | "text";
  /**
   * title is required for human input question
   */
  title: string;
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
   * dynamic option, which has higer priority than static options
   */
  dynamicOptions?: DymanicOptions;

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
   * if true: single select question will be automtically answered with the single option;
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
   * dynamic option, which has higer priority than static options
   */
  dynamicOptions?: DymanicOptions;

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
   * if true: single select question will be automtically answered with the single option;
   * if false: use still need to do the selection manually even there is no second choice
   */
  skipSingleOption?: boolean;
  /**
   * a callback function which is triggered when the selected values change, which can change the final selected values.
   * @returns the final selected option ids
   */
  onDidChangeSelection?: (currentSelectedIds: Set<string>, previousSelectedIds: Set<string>) => Promise<Set<string>>;

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
  validation?: FuncValidation<string[]>
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
 * The dynamic data can be refered by the following question.
 */
export interface FuncQuestion extends BaseQuestion {
  type: "func";
  /**
   * A function that will be called to when the question is activated.
   */
  func: LocalFunc<any>;
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
  | SingleFileQuestion;


/**
 * QTreeNode is the tree node data structure, which have three main properties:
 * - data: data is either a group or question. Questions can be organized into a group, which has the same trigger condition.
 * - condition: trigger condition for this node to be activated;
 * - children: child questions that will be activated according their trigger condition.
 */
export class QTreeNode {
  data: Question | Group;
  condition?: ValidationSchema & { target?: string };
  children?: QTreeNode[];
  addChild(node: QTreeNode): QTreeNode {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(node);
    return this;
  }
  validate(): boolean {
    //1. validate the cycle depedency
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
        const trimed = node.trim();
        if (trimed)
          newChildren.push(trimed);
      }
      this.children = newChildren;
    }
    if (this.data.type === "group") {
      if (!this.children || this.children.length === 0)
        return undefined;
      if (this.children.length === 1) {
        this.children[0].condition = this.condition;
        return this.children[0];
      }
    }
    return this;
  }
  constructor(data: Question | Group) {
    this.data = data;
  }
}
