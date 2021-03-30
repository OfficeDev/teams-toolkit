/**
 * reference:
 * https://www.w3schools.com/html/html_form_input_types.asp
 * https://www.w3schools.com/tags/att_option_value.asp
 */
export declare enum NodeType {
    text = "text",
    password = "password",
    singleSelect = "singleSelect",
    multiSelect = "multiSelect",
    file = "file",
    folder = "folder",
    group = "group",
    func = "func"
}
export interface Func {
    namespace: string;
    method: string;
    params?: (number | string | undefined)[];
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
export declare type StaticOption = string[] | OptionItem[];
export declare type DymanicOption = Func;
export declare type Option = StaticOption | DymanicOption;
/**
 *
 * JSON Schema Validation reference:
 * http://json-schema.org/draft/2019-09/json-schema-validation.html
 *
 */
export interface AnyValidation {
    target?: string;
    enum?: any[];
    equals?: number | string | boolean;
    required?: boolean;
}
export interface NumericValidation extends AnyValidation {
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimumm?: number;
}
export interface StringValidation extends AnyValidation {
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    startsWith?: string;
    endsWith?: string;
    contains?: string;
}
export interface ArrayValidation extends AnyValidation {
    maxItems?: number;
    minItems?: number;
    uniqueItems?: number;
    maxContains?: number;
    minContains?: number;
    contains?: number | string;
    containsAll?: string[];
    containsAny?: string[];
}
export interface FileValidation extends AnyValidation {
    exists?: boolean;
    notExist?: boolean;
}
export interface FuncValidation extends Func, AnyValidation {
}
export interface LocalFuncValidation extends AnyValidation {
    validFunc?: (input: string) => string | undefined | null | Promise<string | undefined | null>;
}
export declare type Validation = AnyValidation | NumericValidation | StringValidation | ArrayValidation | FileValidation | FuncValidation | LocalFuncValidation;
export interface ValidationResult {
    valid: boolean;
    errors?: any[];
}
export interface BaseQuestion {
    name: string;
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
    name?: string;
    description?: string;
}
export declare type Question = SingleSelectQuestion | MultiSelectQuestion | InputQuestion | FunctionCallQuestion;
export declare class QTreeNode {
    data: Question | Group;
    condition?: Validation;
    children?: QTreeNode[];
    addChild(node: QTreeNode): QTreeNode;
    validate(): boolean;
    constructor(data: Question | Group);
}
//# sourceMappingURL=question.d.ts.map