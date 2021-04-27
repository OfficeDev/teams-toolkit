// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RemoteFuncValidation, NodeType, QTreeNode } from "fx-api";

import { DefaultValues, DependentPluginInfo, FunctionPluginInfo, QuestionValidationFunc } from "./constants";
import { QuestionKey } from "./enums";
import { InfoMessages } from "./resources/message";

export const functionNameQuestion = new QTreeNode({
    name: QuestionKey.functionName,
    description: InfoMessages.askFunctionName,
    type: NodeType.text,
    default: DefaultValues.functionName,
    validation: {
        namespace: `${DependentPluginInfo.solutionPluginFullName}/${FunctionPluginInfo.pluginName}`,
        method: QuestionValidationFunc.validateFunctionName
    } as RemoteFuncValidation
});
