// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Result, FxError, err, ok, Inputs, Tools, Stage, Platform, QTreeNode, Question, isAutoSkipSelect, SingleSelectQuestion, MultiSelectQuestion, OptionItem } from "@microsoft/teamsfx-api";

import { FxCore } from "@microsoft/teamsfx-core";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenProvider from "./commonlib/appStudioLogin";
import GraphTokenProvider from "./commonlib/graphLogin";
import CLILogProvider from "./commonlib/log";
import DialogManagerInstance from "./userInterface";
import { CliTelemetry } from "./telemetry/cliTelemetry";
import CLIUIInstance from "./userInteraction";
import { flattenNodes, getSingleOptionString, toYargsOptions } from "./utils";
import { Options } from "yargs";

const rootFolderNode = new QTreeNode({
  type: "folder",
  name: "folder",
  title: "Select root folder of the project",
  default: "./",
});

export class HelpParamGenerator {
  private static core: FxCore | undefined;
  private static questionsMap: Map<string, QTreeNode> = new Map<string, QTreeNode>();
  public static activate(): Result<FxCore, FxError> {
    const tools: Tools = {
      logProvider: CLILogProvider,
      tokenProvider: {
        azureAccountProvider: AzureAccountManager,
        graphTokenProvider: GraphTokenProvider,
        appStudioToken: AppStudioTokenProvider
      },
      telemetryReporter: CliTelemetry.getReporter(),
      dialog: DialogManagerInstance,
      ui: CLIUIInstance
    };
    const core: FxCore = new FxCore(tools);
    return ok(core);
  }

  public static setCore(core: FxCore) {
    HelpParamGenerator.core = core;
  }

  private static getSystemInputs(projectPath?: string, platform?: Platform): Inputs {
    const systemInputs: Inputs = {
      platform: platform === undefined ? Platform.CLI_HELP : platform, 
      projectPath: projectPath
    };
    return systemInputs;
  }

  private static setQuestionNodes(stage: string, questions: QTreeNode | undefined) {
    if (questions) {
      HelpParamGenerator.questionsMap.set(stage, questions);
    }
  }

  private static async getQuestionsForUserTask(stage: string, systemInput: Inputs, core: FxCore) {
    const func = {
      namespace: "fx-solution-azure",
      method: stage
    };
    const result = await core.getQuestionsForUserTask(func, systemInput);
    if (result.isErr()) {
      return err(result.error);
    }
    else {
      HelpParamGenerator.setQuestionNodes(stage, result.value);
    }
    return ok(undefined);
  }

  private static getQuestionRootNodeForHelp(stage: string): QTreeNode | undefined {
    if (HelpParamGenerator.questionsMap.has(stage)) {
      return HelpParamGenerator.questionsMap.get(stage);
    }
    return undefined;
  }

  public static async initializeQuestionsForHelp(): Promise<Result<undefined, FxError>> {
    const result = HelpParamGenerator.activate();
    if (result.isErr()) {
      return err(result.error);
    }
    const core = result.value;
    const systemInput = HelpParamGenerator.getSystemInputs();
    for (const stage in Stage) {
      let result;
      if(stage === Stage.publish){
        result = await core.getQuestions(stage as Stage, HelpParamGenerator.getSystemInputs("",Platform.VS));
      }
      else{
        result = await core.getQuestions(stage as Stage, systemInput);
      }
      if (result.isErr()) {
        return err(result.error);
      }
      else {
        HelpParamGenerator.setQuestionNodes(stage, result.value);
      }
    }
    const userTasks = ["addCapability","addResource"];
    for (const userTask of userTasks )
    {
      const result = await HelpParamGenerator.getQuestionsForUserTask(userTask, systemInput, core);
      if (result.isErr()) {
        return err(result.error);
      }
    }

    return ok(undefined);
  }

  public static getYargsParamForHelp(stage: string): { [_: string]: Options } {
    let resourceName: string | undefined;
    let capabilityName: string | undefined;
    if (stage.startsWith("addResource")) {
      resourceName = stage.split("-")[1];
      stage = "addResource";
    }
    else if (stage.startsWith("addCapability")) {
      capabilityName = stage.split("-")[1];
      stage = "addCapability";
    }
    const root = HelpParamGenerator.getQuestionRootNodeForHelp(stage);
    let nodes: QTreeNode[] = [];
    if (resourceName && root?.children) {
      // Do CLI map for resource add
      const mustHaveNodes = root.children.filter(node => (node.condition as any).minItems === 1);
      const resourcesNodes = root.children.filter(node => (node.condition as any).contains === resourceName)[0];
      (root.data as any).default = [resourceName];
      (root.data as any).hide = true;
      root.children = undefined;
      nodes = [root].concat(mustHaveNodes).concat(resourcesNodes ? flattenNodes(resourcesNodes) : []);
    }
    else if (capabilityName && root?.children){
      // Do CLI map for capability add 
      const capabilityNodes = root.children.filter(node => ((node.condition as any).containsAny as string[]).includes(capabilityName as string))[0];
      (root.data as any).default = [capabilityName];
      (root.data as any).hide = true;
      root.children = undefined;
      nodes = [root].concat(capabilityNodes ? flattenNodes(capabilityNodes) : []);
    }
    else if (root) {
      nodes = flattenNodes(root);
    }

    // hide VS param for publish.
    if (stage === Stage.publish){
      for (const node of nodes) {
        (node.data as any).hide = true;
      }
    }

    // Add folder node
    if (stage !== Stage.create) {
      nodes = nodes.concat([rootFolderNode]);
    }
    // Set default folder value for create stage
    else {
      for (const node of nodes) {
        if (node.data.name === "folder") {
          (node.data as any).default = "./";
        }
      }
    }

    const nodesWithoutGroup = nodes.filter((node) => node.data.type !== "group");
    const params: { [_: string]: Options } = {};
    nodesWithoutGroup.forEach((node) => {
      const data = node.data as Question;
      if (isAutoSkipSelect(data) && data.type != "func") {
        // set the only option to default value so yargs will auto fill it.
        data.default = getSingleOptionString(data as SingleSelectQuestion | MultiSelectQuestion);
        (data as any).hide = true;
      }
      params[data.name] = toYargsOptions(data);
    });

    return params;
  }
}

