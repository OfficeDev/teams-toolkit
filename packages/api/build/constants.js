// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfName = exports.Platform = exports.Stage = void 0;
var Stage;
(function (Stage) {
    Stage["create"] = "create";
    Stage["update"] = "update";
    Stage["debug"] = "debug";
    Stage["provision"] = "provision";
    Stage["deploy"] = "deploy";
    Stage["publish"] = "publish";
    Stage["userTask"] = "userTask";
})(Stage = exports.Stage || (exports.Stage = {}));
var Platform;
(function (Platform) {
    Platform["VSCode"] = "vsc";
    Platform["VS"] = "vs";
    Platform["CLI"] = "cli";
})(Platform = exports.Platform || (exports.Platform = {}));
exports.ConfName = 'teamsfx';
//# sourceMappingURL=constants.js.map