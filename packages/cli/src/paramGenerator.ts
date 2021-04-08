// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import fs from "fs-extra";
import os from "os";
import path from "path";

import {
  NodeType,
  Platform,
  Stage,
  Core,
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  MultiSelectQuestion,
  OptionItem,
  TextInputQuestion,
  SingleSelectQuestion
} from "fx-api";

import activate from "./activate";
import CLILogProvider from "./commonlib/log";
import * as constants from "./constants";
import { flattenNodes } from "./utils";

async function main() {
  CLILogProvider.setLogLevel(constants.CLILogLevel.debug);
  try {
    // get the params of new command
    CLILogProvider.info(`[ParamGenerator] start to get new command params!`);
    const newParamsResult = await getNewParams();
    if (newParamsResult.isErr()) {
      throw newParamsResult.error;
    }
    const newParams = newParamsResult.value;
    await writeJSON(constants.newParamPath, newParams);
    CLILogProvider.info(
      `[ParamGenerator] finish to write new command params to ${constants.newParamPath}!`
    );

    // create an project with azure resources
    CLILogProvider.info(`[ParamGenerator] start to create a new project with azure resources!`);
    const workspaceResult = await createAzureProject(newParams);
    if (workspaceResult.isErr()) {
      throw workspaceResult.error;
    }
    const workspace = workspaceResult.value;
    CLILogProvider.info(`[ParamGenerator] finish to create a project at ${workspace}!`);

    // get the params of resouce add commands (sql, function)
    CLILogProvider.info(`[ParamGenerator] start to get resource add command params!`);
    const resourceAddParamsResult = await getResourceAddParams(workspace);
    if (resourceAddParamsResult.isErr()) {
      throw resourceAddParamsResult.error;
    }
    const resourceAddParams = resourceAddParamsResult.value;
    for (const filename in resourceAddParams) {
      await writeJSON(filename, resourceAddParams[filename]);
      CLILogProvider.info(
        `[ParamGenerator] finish to write resource add command params to ${filename}!`
      );
    }

    // get the params of provision command
    CLILogProvider.info(`[ParamGenerator] start to get provision command params!`);
    const provisionParamsResult = await getProvisionParams(workspace);
    if (provisionParamsResult.isErr()) {
      throw provisionParamsResult.error;
    }
    await writeJSON(constants.provisionParamPath, provisionParamsResult.value);
    CLILogProvider.info(
      `[ParamGenerator] finish to write provision command params to ${constants.provisionParamPath}!`
    );

    /// get the params of deploy command
    CLILogProvider.info(`[ParamGenerator] start to get deploy command params!`);
    const deployParamsResult = await getDeployParams(workspace);
    if (deployParamsResult.isErr()) {
      throw deployParamsResult.error;
    }
    await writeJSON(constants.deployParamPath, deployParamsResult.value);
    CLILogProvider.info(
      `[ParamGenerator] finish to write provision command params to ${constants.deployParamPath}!`
    );

    /// TODO: get the params of resource config aad command
  } catch (e) {
    CLILogProvider.error(`code:${e.source}.${e.name}, message: ${e.message}, stack: ${e.stack}`);
  }
}

async function getNewParams(): Promise<Result<QTreeNode[], FxError>> {
  const result = await activate();
  if (result.isErr()) {
    return err(result.error);
  }
  const core = result.value;

  {
    const result = await getParams(core, Stage.create);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value;

    const rootFolderNode = allNodes.filter((node) => node.data.name === "folder")[0];
    (rootFolderNode.data as TextInputQuestion).default = "./";

    const solutionNode = allNodes.filter((node) => node.data.name === "solution")[0];
    (solutionNode.data as SingleSelectQuestion).default = ((solutionNode.data as SingleSelectQuestion)
      .option as string[])[0];
    return ok(allNodes);
  }
}

async function createAzureProject(params: QTreeNode[]): Promise<Result<string, FxError>> {
  /// TODO: run `teamsfx new` to create an azure project.
  return ok(path.resolve(__dirname, "..", "test-folder", "azureApp"));
}

async function getResourceAddParams(
  workspace: string
): Promise<Result<{ [_: string]: QTreeNode[] }, FxError>> {
  const result = await activate(workspace);
  if (result.isErr()) {
    return err(result.error);
  }
  const core = result.value;

  {
    const result = await getParams(core, Stage.update);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value;

    const resourceParamName = "add-azure-resources";
    const resourceNode = allNodes.filter((node) => node.data.name === resourceParamName)[0];
    if (!resourceNode) {
      throw Error(`${resourceParamName} is not found in the update stage's param list.`);
    }

    (resourceNode.data as any).hide = true;

    const option = (resourceNode.data as MultiSelectQuestion).option as OptionItem[];
    const optionLabels = option.map((op) => op.label);
    if (!optionLabels.includes("sql") || !optionLabels.includes("function")) {
      throw Error(`${optionLabels} do not include sql or function`);
    }

    const sqlResourceNode = new QTreeNode(Object.assign({}, resourceNode.data));
    (sqlResourceNode.data as MultiSelectQuestion).default = ["sql"];

    const functionResourceNode = new QTreeNode(Object.assign({}, resourceNode.data));
    (functionResourceNode.data as MultiSelectQuestion).default = ["function"];

    const functionNodeParamName = "function-name";
    const functionNameNode = allNodes.filter((node) => node.data.name === functionNodeParamName)[0];
    if (!functionNameNode) {
      throw Error(`${functionNodeParamName} is not found in the update stage's param list.`);
    }

    const params: { [_: string]: QTreeNode[] } = {};
    params[constants.resourceAddSqlParamPath] = [
      sqlResourceNode,
      constants.SqlUsernameNode,
      constants.SqlPasswordNode
    ];
    params[constants.resourceAddFunctionParamPath] = [functionResourceNode, functionNameNode];
    return ok(params);
  }
}

async function getProvisionParams(workspace: string): Promise<Result<QTreeNode[], FxError>> {
  const result = await activate(workspace);
  if (result.isErr()) {
    return err(result.error);
  }
  const core = result.value;

  {
    const result = await getParams(core, Stage.provision);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value;

    const params = [constants.RootFolderNode, constants.SubscriptionNode].concat(allNodes);
    return ok(params);
  }
}

async function getDeployParams(workspace: string): Promise<Result<QTreeNode[], FxError>> {
  const result = await activate(workspace);
  if (result.isErr()) {
    return err(result.error);
  }
  const core = result.value;

  {
    const result = await getParams(core, Stage.deploy);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value;

    const params = [constants.RootFolderNode].concat(allNodes, [constants.DeployedPluginNode]);
    return ok(params);
  }
}

async function getParams(core: Core, stage: Stage): Promise<Result<QTreeNode[], FxError>> {
  const result = await core.getQuestions!(stage, Platform.CLI);
  if (result.isErr()) {
    return err(result.error);
  }

  const root = result.value!;
  const nodes = flattenNodes(root);
  const nodesWithoutGroup = nodes.filter((node) => node.data.type !== NodeType.group);
  return ok(nodesWithoutGroup);
}

async function writeJSON(filename: string, params: QTreeNode[]) {
  return fs.writeJSON(filename, params, {
    spaces: 4,
    EOL: os.EOL,
    encoding: "utf-8"
  });
}

(async () => {
  await main();
})();
