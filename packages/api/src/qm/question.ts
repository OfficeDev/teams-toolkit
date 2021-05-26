// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 


import { Inputs } from "../types";
import { FuncValidation, StringArrayValidation, StringValidation, ValidationSchema } from "./validation";
 

export interface FunctionRouter{
    namespace:string,
    method:string
}

export interface Func extends FunctionRouter{
    params?: unknown;
}

export type LocalFunc<T> = (inputs: Inputs) => T | Promise< T >;

export interface OptionItem {
    id: string;
    label: string;
    description?: string;
    detail?: string;
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
export type StaticOptions = string[] | OptionItem[];

/**
 * dynamic option is defined by a remote function call
 */
export type DymanicOptions = LocalFunc<StaticOptions>;


/**
 * Basic question data
 */
export interface BaseQuestion {
 
    name: string;
    
    title?:string;
 
    value?: unknown;

    default?: unknown;

    step?: number;

    totalSteps?: number;
}

export interface UserInputQuestion extends BaseQuestion{
    type: "singleSelect"|"multiSelect"|"singleFile"|"multiFile"|"folder"|"text";
    title:string ;
    placeholder?: string | LocalFunc<string | undefined>;
    prompt?: string | LocalFunc<string | undefined>;
    default?: string | string[] | LocalFunc<string | string[] | undefined>;
    validation?: ValidationSchema;
}

export interface SingleSelectQuestion extends UserInputQuestion {
    
    type: "singleSelect";

    /**
     * CLI focus only on this option
     */
    staticOptions: StaticOptions;

    dynamicOptions?: DymanicOptions;

    /**
     * for single option select question, the answer value is the `id` string (`returnObject`:false) or `OptionItem` object (`returnObject`: true)
     */
    value?: string | OptionItem;

    /**
     * The default selected `id` value of the option item
     */
    default?: string | LocalFunc<string | undefined>;

    /**
     * works for string[] option
     */
    returnObject?: boolean;

    /**
     * whether to skip the single option select question
     * if true: single select question will be automtically answered with the single option;
     * if false: use still need to do the selection manually even there is no secon choice
     */
    skipSingleOption?:boolean;
}

export interface MultiSelectQuestion extends UserInputQuestion {
    type: "multiSelect";

    staticOptions: StaticOptions;

    dynamicOptions?: DymanicOptions;
    
    /**
     * for multiple option select question, the answer value is the `id` string array (`returnObject`:false) or `OptionItem` object array (`returnObject`: true)
     */
    value?: string[] | OptionItem[];

    /**
     * The default selected `id` array of the option item
     */
    default?: string[] | LocalFunc<string[] | undefined>;

    /**
     * whether to return `OptionItem` or `OptionItem[]` if the items have type `OptionItem[]`
     * if the items has type `string[]`, this config will not take effect, the answer has type `string` or `string[]`
     */
    returnObject?: boolean;

    /**
     * whether to skip the single option select question
     * if true: single select question will be automtically answered with the single option;
     * if false: use still need to do the selection manually even there is no second choice
     */
    skipSingleOption?:boolean;
    /**
     * a callback function when the select changes
     */
    onDidChangeSelection?: (currentSelectedIds: Set<string>, previousSelectedIds: Set<string>) => Promise<Set<string>>;

    validation?: StringArrayValidation | FuncValidation;
}

export interface TextInputQuestion extends UserInputQuestion {
    type: "text";
    password?: boolean; 
    value?: string;
    default?: string | LocalFunc<string | undefined>;
    validation?: StringValidation | FuncValidation;
}


export interface SingleFileQuestion extends UserInputQuestion {
    type: "singleFile";
    value?: string;
    default?: string | LocalFunc<string | undefined>;
    validation?: FuncValidation;
}

export interface MultiFileQuestion extends UserInputQuestion {
    type: "multiFile";
    value?: string[];
    default?: string | LocalFunc<string | undefined>;
    validation?: FuncValidation;
}

export interface FolderQuestion extends UserInputQuestion {
    type: "folder";
    value?: string;
    default?: string | LocalFunc<string | undefined>;
    validation?: FuncValidation;
}

/**
 * `FuncQuestion` will not show any UI, but load some dynamic data in the question flow；
 * The dynamic data can be refered by the child question in condition check or default value.
 */
export interface FuncQuestion extends BaseQuestion{
    type: "func";
    func: LocalFunc<unknown>;
}

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
    condition?: ValidationSchema & {target?:string};
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
        if (this.data.type === "group") {
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
