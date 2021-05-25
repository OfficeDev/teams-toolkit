// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {Tools} from "./utils";
import { Result } from "neverthrow";
import { Inputs, Void } from "./types";
import { Func, FunctionRouter, QTreeNode } from "./qm";
import { FxError } from "./error";
import { Stage } from ".";

export interface Core {
    
    init: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
    
    createProject: ( systemInputs: Inputs ) => Promise<Result<string, FxError>>;
    provisionResources: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
    buildArtifacts: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;
    deployArtifacts: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;
    localDebug: (systemInputs: Inputs) => Promise<Result<Void, FxError>>;
    publishApplication: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;
    executeUserTask: ( func: Func, inputs: Inputs ) => Promise<Result<unknown, FxError>>;

    createEnv: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;
    removeEnv: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;
    switchEnv: ( systemInputs: Inputs ) => Promise<Result<Void, FxError>>;

    /**
     * only for CLI
     */
    getQuestions: ( task: Stage, inputs: Inputs ) => Promise<Result<QTreeNode | undefined, FxError>>;    
    getQuestionsForUserTask?: ( router: FunctionRouter, inputs: Inputs ) => Promise<Result<QTreeNode | undefined, FxError>>;
}
