// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  MultiSelectQuestion,
  OptionItem,
  NodeType
} from "fx-api";

import * as constants from "../constants";
import { flattenNodes } from "../utils";
import { Generator } from "./generator";

abstract class CapabilityAddGenerator extends Generator {
  abstract readonly capabilityName: string;

  public readonly doUserTask = true;
  public readonly func = {
    namespace: "fx-solution-azure",
    method: "addCapability"
  };

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    const root = result.value as QTreeNode;
    const allNodes = flattenNodes(root).filter(node => node.data.type !== NodeType.group);

    // get capabilities node
    const capabilityParamName = "capabilities";
    const capabilityNode = allNodes.filter((node) => node.data.name === capabilityParamName)[0];
    if (!capabilityNode) {
      throw Error(`${capabilityParamName} is not found in the capability add's param list.`);
    }
    const option = (capabilityNode.data as MultiSelectQuestion).option as OptionItem[];
    const optionIds = option.map((op) => op.cliName ? op.cliName : op.id);
    if (!optionIds.includes(this.capabilityName)) {
      throw Error(`${optionIds} do not include ${this.capabilityName}`);
    }
    (capabilityNode.data as any).default = [this.capabilityName];
    (capabilityNode.data as any).hide = true;

    return ok([constants.RootFolderNode, ...allNodes]);
  }
}

export class CapabilityAddTabGenerator extends CapabilityAddGenerator {
  public readonly commandName = "teamsfx capability add tab";
  public readonly capabilityName = "tab";
  public readonly outputPath = constants.capabilityAddTabParamPath;
}

export class CapabilityAddBotGenerator extends CapabilityAddGenerator {
  public readonly commandName = "teamsfx capability add bot";
  public readonly capabilityName = "bot";
  public readonly outputPath = constants.capabilityAddBotParamPath;
}

export class CapabilityAddMessageExtensionGenerator extends CapabilityAddGenerator {
  public readonly commandName = "teamsfx capability add messaging-extension";
  public readonly capabilityName = "messaging-extension";
  public readonly outputPath = constants.capabilityAddMessageExtensionParamPath;
}
