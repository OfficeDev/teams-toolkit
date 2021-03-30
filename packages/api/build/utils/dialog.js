// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogMsg = exports.DialogType = exports.QuestionType = exports.MsgLevel = void 0;
var MsgLevel;
(function (MsgLevel) {
    MsgLevel["Info"] = "Info";
    MsgLevel["Warning"] = "Warning";
    MsgLevel["Error"] = "Error";
})(MsgLevel = exports.MsgLevel || (exports.MsgLevel = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["Text"] = "Text";
    QuestionType["Radio"] = "radio";
    QuestionType["SelectFolder"] = "SelectFolder";
    QuestionType["OpenFolder"] = "OpenFolder";
    QuestionType["ExecuteCmd"] = "ExecuteCmd";
    QuestionType["OpenExternal"] = "OpenExternal";
})(QuestionType = exports.QuestionType || (exports.QuestionType = {}));
var DialogType;
(function (DialogType) {
    DialogType["Show"] = "Show";
    DialogType["ShowProgress"] = "ShowProgress";
    DialogType["Ask"] = "Ask";
    DialogType["Answer"] = "Answer";
    DialogType["Output"] = "Output";
})(DialogType = exports.DialogType || (exports.DialogType = {}));
class DialogMsg {
    constructor(dialogType, content) {
        this.dialogType = dialogType;
        // TODO: check the dialog type.
        this.content = content;
    }
    getAnswer() {
        if (this.dialogType === DialogType.Answer && this.content !== undefined) {
            return this.content;
        }
        return undefined;
    }
}
exports.DialogMsg = DialogMsg;
//# sourceMappingURL=dialog.js.map