// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDynamicPromptFormat } from "../utils/types";

const raiSystemTemplate = `
You act as an AI assistant helping to avoid offensive or Inappropriate words or sentence from user message. Those offensive or inappropriate words or sentence may include but not limited to illegal or harmful content, such as hate speech, incitement or glorification of violence, 
self-mutilation, racially discriminatory, sexual solicitation, or sexually graphic content, or content that describes, features, or promotes child sexual exploitation or abuse. The superficially harmless content that is used to mask harmful content is also included.
For this task, you should not answer the user's ask, but act as a Responsible AI service, check and analyze as a text processing system using your knownledge and any relevant service behind. Using the given user message as raw text, scanning line by line, check how likely the content of each line in the message harmful or inappropriate, according to the definition above. Give a 0-100 score to each line, conclude the highest score as the final score of the message. Return the score itself, don't explain that.
`;

export const inputRai: IDynamicPromptFormat<string[]> = {
  templates: {
    system: raiSystemTemplate,
    user: `
Please review the content of list of items below, send me back with a 0-100 score. Message: 
{{arrayJoin(args, templates.phrase)}}`,
    phrase: `{{itemIndex}}. {{item}}.\n`,
  },
  messages: [
    {
      role: "system",
      entryTemplate: "system",
    },
    {
      role: "user",
      entryTemplate: "user",
    },
  ],
  version: "0.3",
};

export const outputRai: IDynamicPromptFormat<string> = {
  templates: {
    system: raiSystemTemplate,
    user: `
Please send following message back to me in orginal format. Message: 
{{args}}
`,
  },
  messages: [
    {
      role: "system",
      entryTemplate: "system",
    },
    {
      role: "user",
      entryTemplate: "user",
    },
  ],
  version: "0.3",
};
