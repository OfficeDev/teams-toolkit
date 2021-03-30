"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.QTreeNode = exports.NodeType = void 0;
/**
 * reference:
 * https://www.w3schools.com/html/html_form_input_types.asp
 * https://www.w3schools.com/tags/att_option_value.asp
 */
var NodeType;
(function (NodeType) {
    NodeType["text"] = "text";
    NodeType["password"] = "password";
    NodeType["singleSelect"] = "singleSelect";
    NodeType["multiSelect"] = "multiSelect";
    NodeType["file"] = "file";
    NodeType["folder"] = "folder";
    NodeType["group"] = "group";
    NodeType["func"] = "func";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
class QTreeNode {
    constructor(data) {
        this.data = data;
    }
    addChild(node) {
        if (!this.children) {
            this.children = [];
        }
        this.children.push(node);
        if (this.validate()) {
            return this;
        }
        throw new Error('validation failed');
    }
    validate() {
        //1. validate the cycle depedency
        //2. validate the name uniqueness
        //3. validate the params of RPC
        if (this.data.type === NodeType.group && (!this.children || this.children.length === 0))
            return false;
        return true;
    }
}
exports.QTreeNode = QTreeNode;
//# sourceMappingURL=question.js.map