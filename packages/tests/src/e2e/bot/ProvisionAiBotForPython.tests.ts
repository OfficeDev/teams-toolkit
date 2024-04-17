// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

class AiBotAzureOpenAITestCase extends CaseFactory {}

class AiBotOpenAITestCase extends CaseFactory {}

// Azure OpenAI
const myRecordAzOpenAI: Record<string, string> = {};
myRecordAzOpenAI["llm-service"] = "llm-service-azure-openai";
myRecordAzOpenAI["azure-openai-key"] = "fake";
myRecordAzOpenAI["azure-openai-deployment-name"] = "fake";
myRecordAzOpenAI["azure-openai-endpoint"] = "https://test.com";
new AiBotAzureOpenAITestCase(
  Capability.AiBot,
  27551399,
  "frankqian@microsoft.com",
  ["bot"],
  ProgrammingLanguage.PY,
  {},
  myRecordAzOpenAI
).test();

// OpenAI
const myRecordOpenAI: Record<string, string> = {};
myRecordOpenAI["llm-service"] = "llm-service-openai";
myRecordOpenAI["openai-key"] = "fake";
new AiBotOpenAITestCase(
  Capability.AiBot,
  27551403,
  "frankqian@microsoft.com",
  ["bot"],
  ProgrammingLanguage.PY,
  {},
  myRecordOpenAI
).test();
