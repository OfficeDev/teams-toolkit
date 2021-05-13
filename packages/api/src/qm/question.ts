// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConfigMap } from "../config";

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
    localFunc = "localFunc",
}

export type AnswerValue = string | string[] | number | OptionItem | OptionItem[] | undefined | unknown;

export type KnownAnswerValue = string | string[] | number | OptionItem | OptionItem[] | undefined;

export interface FunctionRouter{
    namespace:string,
    method:string
}

export interface Func extends FunctionRouter{
    /**
     * params can be any type
     */
    params?: unknown;
}

export type LocalFunc<T> = (previousAnswers?: ConfigMap) => T | Promise< T >;

export type DynamicValue<T> = Func | LocalFunc<T>;

export interface OptionItem {
    /**
     * the unique identifier of the option in the option list, not show
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
    /**
     * CLI diplay name, will use id instead if cliname not exist.
     */
    cliName?: string;
}

/**
 * static option can be string array or OptionItem array
 * if the option is a string array, each element of which will be converted to an `OptionItem` object with `id` and `label` field equal to the string element. 
 * For example, option=['id1','id2'] => [{'id':'id1', label:'id1'},{'id':'id2', label:'id2'}]
 */
export type StaticOption = string[] | OptionItem[];

/**
 * dynamic option is defined by a remote function call
 */
export type DymanicOption = DynamicValue<StaticOption>;


/**
 * select option can be static option list or dynamic options which are loaded from a function call
 */
export type Option = StaticOption | DymanicOption;

/**
 * Validation for Any Instance Type
 * JSON Schema Validation reference: http://json-schema.org/draft/2019-09/json-schema-validation.html
 */
export interface AnyValidation {
    required?: boolean; // default value is true
    equals?: unknown;
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
    /**
     * the value must be contained in the list
     */
    enum?: number[]; 
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
    /**
     * the file/folder must exist
     */
    exists?: boolean;
}

/**
 * The validation is checked in a remote function call
 */
export interface RemoteFuncValidation extends Func{

}

/**
 * The validation is checked by a validFunc provided by user
 */
export interface LocalFuncValidationForString{
    validFunc?: (input:string|undefined, previousAnswers?: ConfigMap)=>string|undefined|Promise<string|undefined>;
}
export interface LocalFuncValidationForStringArray{
    validFunc?: (input:string[]|undefined, previousAnswers?: ConfigMap)=>string|undefined|Promise<string|undefined>;
}

export type Validation =
    | NumberValidation
    | StringValidation
    | StringArrayValidation
    | FileValidation
    | RemoteFuncValidation
    | LocalFuncValidationForString
    | LocalFuncValidationForStringArray;

/**
 * Basic question data
 */
export interface BaseQuestion {
    /**
     * question identifier
     */
    name: string;

    value?: AnswerValue;

    title?: string;

    /**
     * default value for question
     */
    default?: string | string[] | number | DynamicValue<string | string[] | number | undefined>;

    /**
     * @deprecated use `title` instead
     */
     description?: string;
}

export interface SingleSelectQuestion extends BaseQuestion {
    
    type: NodeType.singleSelect;
    
    /**
     * select option
     */
    option: Option;

    /**
     * for single option select question, the answer value is the `id` string (`returnObject`:false) or `OptionItem` object (`returnObject`: true)
     */
    value?: string | OptionItem;

    /**
     * The default selected `id` value of the option item
     */
    default?: string | DynamicValue<string|undefined>;
    
    /**
     * placeholder text
     */
    placeholder?: string | DynamicValue<string|undefined>;
    
    /**
     * whether the answer return the original `OptionItem` object.
     * if true: the answer is the original `OptionItem` object; 
     * if false: the answer is the `id` field of the `OptionItem`
     * The default value is false
     */
    returnObject?: boolean;

    /**
     * whether to skip the single option select question
     * if true: single select question will be automtically answered with the single option;
     * if false: use still need to do the selection manually even there is no secon choice
     */
    skipSingleOption?:boolean;
}

export interface MultiSelectQuestion extends BaseQuestion {
    type: NodeType.multiSelect;
    
    /**
     * select option
     */
    option: Option;
    
    /**
     * for multiple option select question, the answer value is the `id` string array (`returnObject`:false) or `OptionItem` object array (`returnObject`: true)
     */
    value?: string[] | OptionItem[];

    /**
     * The default selected `id` array of the option item
     */
    default?: string[] | DynamicValue<string|undefined>;

    /**
     * placeholder text
     */
    placeholder?: string | DynamicValue<string|undefined>;

    /**
     * prompt text
     */
    prompt?: string | DynamicValue<string|undefined>;

    /**
     * whether the answer return the original `OptionItem` object array.
     * if true: the answer is the original `OptionItem` object array; 
     * if false: the answer is the `id` array of the `OptionItem`
     * The default value is false
     */
    returnObject?: boolean;

    /**
     * whether to skip the single option select question
     * if true: single select question will be automtically answered with the single option;
     * if false: use still need to do the selection manually even there is no secon choice
     */
    skipSingleOption?:boolean;

    /**
     * a callback function when the select changes
     * @items: current selected `OptionItem` array
     * @returns: the new selected `id` array
     */
    onDidChangeSelection?: (currentSelectedItems: OptionItem[], previousSelectedItems: OptionItem[]) => Promise<string[]>;

    validation?: StringArrayValidation | RemoteFuncValidation | LocalFuncValidation;
}

export interface TextInputQuestion extends BaseQuestion {
    type: NodeType.text | NodeType.password;

    value?: string;

    /**
     * default value can be static string or dynamic string returned by function call
     */
    default?: string | DynamicValue<string|undefined>;

    /**
     * placeholder text
     */
    placeholder?: string | DynamicValue<string|undefined>;

    /**
     * prompt text
     */
    prompt?: string | DynamicValue<string|undefined>;

    /**
     * validation property:
     * 1. static validation defined by `StringValidation`
     * 2. remote function call validation
     * 3. local validation callback
     */
    validation?: StringValidation | RemoteFuncValidation | LocalFuncValidation;
}

/**
 * `NumberInputQuestion` is similar to `TextInputQuestion`
 * The only difference is `NumberInputQuestion` will have an extra `is a valid number` validation check for the input string
 */
export interface NumberInputQuestion extends BaseQuestion {
    type: NodeType.number;
    value?: number;
    default?: number | DynamicValue<number|undefined>;
    placeholder?: string | DynamicValue<string|undefined>;
    prompt?: string | DynamicValue<string|undefined>;
    validation?: NumberValidation | RemoteFuncValidation | LocalFuncValidation;
}

export interface FileQuestion extends BaseQuestion {
    type: NodeType.file | NodeType.folder;
    value?: string;
    default?: string | DynamicValue<string|undefined>;
    validation?: FileValidation | StringValidation | RemoteFuncValidation | LocalFuncValidation;
}


/**
 * `FuncQuestion` will not show any UI, but load some dynamic data in the question flow；
 * The dynamic data can be refered by the child question in condition check or default value.
 */
export interface FuncQuestion extends Func, BaseQuestion {
    type: NodeType.func;
}

export interface LocalFuncQuestion extends BaseQuestion{
    type: NodeType.localFunc;
    func: LocalFunc<AnswerValue>;
}

export interface Group {
    type: NodeType.group;
    name?: string; //group name
}

export type Question =
    | SingleSelectQuestion
    | MultiSelectQuestion
    | TextInputQuestion
    | NumberInputQuestion
    | FuncQuestion
    | LocalFuncQuestion
    | FileQuestion;


/**
 * QTreeNode is the tree node data structure, which have three main properties:
 * - data: data is either a group or question. Questions can be organized into a group, which has the same trigger condition.
 * - condition: trigger condition for this node to be activated;
 * - children: child questions that will be activated according their trigger condition.
 */
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
    trim():QTreeNode|undefined{
        if(this.children){
            const newChildren:QTreeNode[] = [];
            for(const node of this.children){
                const trimed = node.trim();
                if(trimed) 
                    newChildren.push(trimed);
            }
            this.children = newChildren;
        }
        if (this.data.type === NodeType.group) {
            if( !this.children || this.children.length === 0)
                return undefined;
            if( this.children.length === 1){
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
