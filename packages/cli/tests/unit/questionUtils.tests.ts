// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IQTreeNode, Question, StaticOptions } from "@microsoft/teamsfx-api";
import "mocha";
import sinon from "sinon";
import { filterQTreeNode } from "../../src/questionUtils";
import { expect } from "./utils";

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
  const root: IQTreeNode = {
    data: {
      type: "multiSelect",
      name: "add-azure-resources",
      title: "Cloud Resources",
      staticOptions: resources,
      onDidChangeSelection: async (currentSelectedIds: Set<string>, _: any) => {
        if (currentSelectedIds.has("sql")) currentSelectedIds.add("function");
        return currentSelectedIds;
      },
    },
    children: [
      {
        condition: { contains: "function" },
        data: {
          type: "text",
          name: "function-name",
          title: "Function Name",
        },
      },
    ],
  };

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
    expect(await filterQTreeNode(root, "add-azure-resources", "xxx")).deep.equal(root);
    expect(await filterQTreeNode(root, "add-azure-resources", undefined)).deep.equal(root);
  });
});
