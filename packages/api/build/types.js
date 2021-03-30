// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = exports.Stage = exports.LifecycleStage = exports.PluginType = void 0;
var PluginType;
(function (PluginType) {
    PluginType["Frontend"] = "Frontend";
    PluginType["Backend"] = "Backend";
    PluginType["DataStorage"] = "DataStorage";
})(PluginType = exports.PluginType || (exports.PluginType = {}));
var LifecycleStage;
(function (LifecycleStage) {
    LifecycleStage[LifecycleStage["Init"] = 0] = "Init";
    LifecycleStage[LifecycleStage["Scaffold"] = 1] = "Scaffold";
    LifecycleStage[LifecycleStage["Provision"] = 2] = "Provision";
    LifecycleStage[LifecycleStage["Build"] = 3] = "Build";
    LifecycleStage[LifecycleStage["Test"] = 4] = "Test";
    LifecycleStage[LifecycleStage["Run"] = 5] = "Run";
    LifecycleStage[LifecycleStage["Debug"] = 6] = "Debug";
    LifecycleStage[LifecycleStage["Deploy"] = 7] = "Deploy";
    LifecycleStage[LifecycleStage["Publish"] = 8] = "Publish";
})(LifecycleStage = exports.LifecycleStage || (exports.LifecycleStage = {}));
var Stage;
(function (Stage) {
    Stage["create"] = "create";
    Stage["update"] = "update";
    Stage["debug"] = "debug";
    Stage["provision"] = "provision";
    Stage["deploy"] = "deploy";
})(Stage = exports.Stage || (exports.Stage = {}));
var Platform;
(function (Platform) {
    Platform["VSCode"] = "vsc";
    Platform["VS"] = "vs";
    Platform["CLI"] = "cli";
})(Platform = exports.Platform || (exports.Platform = {}));
//# sourceMappingURL=types.js.map