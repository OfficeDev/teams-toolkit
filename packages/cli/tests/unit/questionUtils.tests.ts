// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { QTreeNode, Question, StaticOptions } from "@microsoft/teamsfx-api";
import sinon from "sinon";

import { expect } from "./utils";
import { filterQTreeNode } from "../../src/questionUtils";
import { EmptyQTreeNode } from "../../src/constants";

describe("Question Utils Tests", function () {
  const sandbox = sinon.createSandbox();
  const resources: StaticOptions = [
    {
      id: "function",
      label: "Azure Function",
      cliName: "azure-function",
    },
    {
      id: "sql",
      label: "Azure SQL",
      cliName: "azure-sql",
    },
  ];
  const root = new QTreeNode({
    type: "multiSelect",
    name: "add-azure-resources",
    title: "Cloud Resources",
    staticOptions: resources,
    onDidChangeSelection: async (currentSelectedIds: Set<string>, _: any) => {
      if (currentSelectedIds.has("sql")) currentSelectedIds.add("function");
      return currentSelectedIds;
    },
  });
  const functionNode = new QTreeNode({
    type: "text",
    name: "function-name",
    title: "Function Name",
  });
  functionNode.condition = { contains: "function" };
  root.addChild(functionNode);

  afterEach(() => {
    sandbox.restore();
  });

  it("filterQTreeNode - only sql", async function () {
    const newRoot = await filterQTreeNode(root, "add-azure-resources", ["sql"]);
    expect(newRoot).not.undefined;
    expect(newRoot!.data.name).equal("add-azure-resources");
    expect((newRoot!.data as Question).value).deep.equal(["sql", "function"]);
  });

  it("filterQTreeNode - only function", async function () {
    const newRoot = await filterQTreeNode(root, "add-azure-resources", ["function"]);
    expect(newRoot).not.undefined;
    expect(newRoot!.data.name).equal("add-azure-resources");
    expect((newRoot!.data as Question).value).deep.equal(["function"]);
  });

  it("filterQTreeNode - function & xxx", async function () {
    const newRoot = await filterQTreeNode(root, "add-azure-resources", ["function", "xxx"]);
    expect(newRoot).not.undefined;
    expect(newRoot!.data.name).equal("add-azure-resources");
    expect((newRoot!.data as Question).value).deep.equal(["function"]);
  });

  it("filterQTreeNode - EmptyQTreeNode", async function () {
    expect(await filterQTreeNode(root, "add-azure-resources", "xxx")).deep.equal(EmptyQTreeNode);
    expect(await filterQTreeNode(root, "add-azure-resources", undefined)).deep.equal(
      EmptyQTreeNode
    );
  });
});
