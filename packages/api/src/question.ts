// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


/**
 * reference:
 * https://www.w3schools.com/html/html_form_input_types.asp
 * https://www.w3schools.com/tags/att_option_value.asp
 */
export enum NodeType {
    text = 'text',
    password = 'password',
    singleSelect = 'singleSelect',
    multiSelect = 'multiSelect',
    file = 'file',
    folder = 'folder',
    group = 'group',
    func = 'func',
}

export interface Func {
    namespace: string; //scope of api: core, solution, resource plugin
    method: string; //method name
    params?: (number | string | undefined)[]; // there are two types of parameters: 1. basic types(number, string, undefined)  2. answer of ancestor question ($parent, $parent.name)
}

export interface OptionItem {
    /**
     * A human-readable string which is rendered prominent. Supports rendering of [theme icons](#ThemeIcon) via
     * the `$(<name>)`-syntax.
     */
    label: string;

    /**
     * A human-readable string which is rendered less prominent in the same line. Supports rendering of
     * [theme icons](#ThemeIcon) via the `$(<name>)`-syntax.
     */
    description?: string;

    /**
     * A human-readable string which is rendered less prominent in a separate line. Supports rendering of
     * [theme icons](#ThemeIcon) via the `$(<name>)`-syntax.
     */
    detail?: string;

    /**
     * hidden data for this option item
     */
    data?: any;
}

export type StaticOption = string[] | OptionItem[];

export type DymanicOption = Func;

export type Option = StaticOption | DymanicOption;

/**
 *
 * JSON Schema Validation reference:
 * http://json-schema.org/draft/2019-09/json-schema-validation.html
 *
 */

export interface AnyValidation {
    target?: string; // default value: "$parent", you can also reference $parent.property
    //Validation Keywords for Any Instance Type
    enum?: any[]; // the value must be contained in this list
    equals?: number | string | boolean; //non-standard
    required?: boolean; // default value is true
}

export interface NumericValidation extends AnyValidation {
    //Validation Keywords for Numeric Instances (number and integer)
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimumm?: number;
}

export interface StringValidation extends AnyValidation {
    //Validation Keywords for Strings
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    startsWith?: string; //non-standard
    endsWith?: string; //non-standard
    contains?: string; //non-standard
}

export interface ArrayValidation extends AnyValidation {
    //Validation Keywords for Arrays
    maxItems?: number;
    minItems?: number;
    uniqueItems?: number;
    maxContains?: number;
    minContains?: number;
    contains?: number | string; ////non-standard
    containsAll?: string[]; ///non-standard, must contains all items in the array
    containsAny?: string[]; ///non-standard, contains any one in the array
}

export interface FileValidation extends AnyValidation {
    exists?: boolean;
    notExist?: boolean;
}

export interface FuncValidation extends Func, AnyValidation {}

export interface LocalFuncValidation extends AnyValidation {
    validFunc?: (input: string) => string | undefined | null | Promise<string | undefined | null>;
}

export type Validation =
    | AnyValidation
    | NumericValidation
    | StringValidation
    | ArrayValidation
    | FileValidation
    | FuncValidation
    | LocalFuncValidation;

export interface ValidationResult {
    valid: boolean;
    errors?: any[];
}

export interface BaseQuestion {
    name: string; //question name, suggest to be consistent with MODS config name
    description?: string;
    validation?: Validation;
    value?: any;
    default?: any;
    title?: string;
}

export interface SingleSelectQuestion extends BaseQuestion {
    type: NodeType.singleSelect;
    option: Option;
    value?: string | OptionItem;
    default?: string;
    placeholder?: string;
    prompt?: string;
    returnObject?: boolean;
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

export interface InputQuestion extends BaseQuestion {
    type: NodeType.text | NodeType.password | NodeType.file | NodeType.folder;
    value?: string;
    default?: string;
    placeholder?: string;
    prompt?: string;
}

export interface FunctionCallQuestion extends BaseQuestion, Func {
    type: NodeType.func;
    value?: any;
}

export interface Group {
    type: NodeType.group;
    name?: string; //group name
    description?: string; // description
}

export type Question = SingleSelectQuestion | MultiSelectQuestion | InputQuestion | FunctionCallQuestion;

export class QTreeNode {
    data: Question | Group;
    condition?: Validation;
    children?: QTreeNode[];
    addChild(node: QTreeNode): QTreeNode {
        if (!this.children) {
            this.children = [];
        }
        this.children.push(node);
        if (this.validate()) {
            return this;
        }
        throw new Error('validation failed');
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
