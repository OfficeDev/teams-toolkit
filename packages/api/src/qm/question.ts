// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Platform } from "../constants";
import { Dict, FunctionRouter} from "../config";

/**
 * reference:
 * https://www.w3schools.com/html/html_form_input_types.asp
 * https://www.w3schools.com/tags/att_option_value.asp
 */
export enum NodeType {
    text = "text",
    number = "number",
    password = "password",
    singleSelect = "singleSelect",
    multiSelect = "multiSelect",
    file = "file",
    folder = "folder",
    group = "group",
    func = "func",
}

export type AnswerValue = string | string[] | number | OptionItem | OptionItem[] | undefined | unknown;

export interface UserInputs extends Dict<AnswerValue>{
    platform: Platform;
}    

export type ReadonlyUserInputs = Readonly<UserInputs>;

export interface Func extends FunctionRouter{
    params?: string|string[]; // there are two types of parameters: 1. basic types(number, string, undefined)  2. answer of ancestor question ($parent, $parent.name)
}

export interface OptionItem {
    /**
     * the identifier of the option, not show
     */
    id: string;
    /**
     * A human-readable string which is rendered prominent.
     */
    label: string;
    /**
     * A human-readable string which is rendered less prominent in the same line.
     */
    description?: string;
    /**
     * A human-readable string which is rendered less prominent in a separate line.
     */
    detail?: string;
    /**
     * hidden data for this option item, not show
     */
    data?: unknown;
}

export type StaticOption = string[] | OptionItem[];

export type DymanicOption = Func;

export type Option = StaticOption | DymanicOption;

/**
 * Validation for Any Instance Type
 * JSON Schema Validation reference: http://json-schema.org/draft/2019-09/json-schema-validation.html
 */
export interface AnyValidation {
    required?: boolean; // default value is true
}

/**
 * Validation for Numeric Instances (number and integer)
 */
export interface NumberValidation extends AnyValidation {
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    enum?: number[]; // the value must be contained in this list
    equals?: number; //non-standard
}

/**
 * //Validation for Strings
 */
export interface StringValidation extends AnyValidation {
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    enum?: string[]; // the value must be contained in this list
    startsWith?: string; //non-standard
    endsWith?: string; //non-standard
    includes?: string; //non-standard
    equals?: string; //non-standard
}

/**
 * Validation for String Arrays
 */
export interface StringArrayValidation extends AnyValidation {
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    equals?: string[]; //non-standard
    enum?: string[]; // non-standard all the values must be contained in this list
    contains?: string; ////non-standard
    containsAll?: string[]; ///non-standard, the values must contains all items in the array
    containsAny?: string[]; ///non-standard, the values must contains any one in the array
}

export interface FileValidation extends AnyValidation {
    exists?: boolean;
    notExist?: boolean;
}

export interface FuncValidation extends Func, AnyValidation {}

export interface LocalFuncValidation extends AnyValidation {
    validFunc?: (input: string) => string | undefined | Promise<string | undefined>;
}

export type Validation =
    | NumberValidation
    | StringValidation
    | StringArrayValidation
    | FileValidation
    | FuncValidation
    | LocalFuncValidation;

export interface BaseQuestion {
    name: string; //question name, suggest to be consistent with MODS config name
    title?: string;
    description?: string;
    value?: AnswerValue;
    default?: string | string[] | number | Func;
}

export interface SingleSelectQuestion extends BaseQuestion {
    type: NodeType.singleSelect;
    option: Option;
    value?: string | OptionItem;
    default?: string;
    placeholder?: string;
    prompt?: string;
    returnObject?: boolean;
    skipSingleOption?:boolean;
}

export interface MultiSelectQuestion extends BaseQuestion {
    type: NodeType.multiSelect;
    option: Option;
    value?: string[] | OptionItem[];
    default?: string[];
    placeholder?: string;
    prompt?: string;
    returnObject?: boolean;
}

export interface TextInputQuestion extends BaseQuestion {
    type: NodeType.text | NodeType.password;
    value?: string;
    default?: string | Func;
    placeholder?: string;
    prompt?: string;
    validation?: StringValidation;
}

export interface NumberInputQuestion extends BaseQuestion {
    type: NodeType.number;
    value?: number;
    default?: number | Func;
    placeholder?: string;
    prompt?: string;
    validation?: NumberValidation;
}

export interface FileQuestion extends BaseQuestion {
    type: NodeType.file | NodeType.folder;
    value?: string;
    default?: string;
    validation?: FileValidation | StringValidation;
}

export interface FuncQuestion extends BaseQuestion, Func {
    type: NodeType.func;
}

export interface Group {
    type: NodeType.group;
    name?: string; //group name
    description?: string; // description
}

export type Question =
    | SingleSelectQuestion
    | MultiSelectQuestion
    | TextInputQuestion
    | NumberInputQuestion
    | FuncQuestion
    | FileQuestion;

export class QTreeNode {
    data: Question | Group;
    condition?: {
        target?: string; //default value is parent question's answer, noted by "$parent", if parent is an object, you can also refer parent's property using expression "$parent.property"
    } & Validation;
    children?: QTreeNode[];
    addChild(node: QTreeNode): QTreeNode {
        if (!this.children) {
            this.children = [];
        }
        this.children.push(node);
        if (this.validate()) {
            return this;
        }
        throw new Error("validation failed");
    }
    validate(): boolean {
        //1. validate the cycle depedency
        //2. validate the name uniqueness
        //3. validate the params of RPC
        if (this.data.type === NodeType.group && (!this.children || this.children.length === 0)) return false;
        return true;
    }
    constructor(data: Question | Group) {
        this.data = data;
    }
}
