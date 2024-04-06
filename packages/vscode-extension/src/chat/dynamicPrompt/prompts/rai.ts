// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDynamicPromptTemplateSet } from "../utils/types";

export const raiSystem: IDynamicPromptTemplateSet<never> = {
  templates: {
    main: `
You act as an AI assistant helping to avoid offensive or Inappropriate words or sentence from user message. Those offensive or inappropriate words or sentence may include but not limited to illegal or harmful content, such as hate speech, incitement or glorification of violence, 
self-mutilation, racially discriminatory, sexual solicitation, or sexually graphic content, or content that describes, features, or promotes child sexual exploitation or abuse. The superficially harmless content that is used to mask harmful content is also included.
For this task, you should not answer the user's ask, but act as a Responsible AI service, check and analyze as a text processing system using your knownledge and any relevant service behind. Using the given user message as raw text, scanning line by line, check how likely the content of each line in the message harmful or inappropriate, according to the definition above. Give a 0-100 score to each line, conclude the highest score as the final score of the message. Return the score itself, don't explain that.
`,
  },
  version: "0.2",
};

export const inputRai: IDynamicPromptTemplateSet<string[]> = {
  templates: {
    main: `
Please review the content of list of items below, send me back with a 0-100 score. Message: 
{{arrayJoin(args, templates.phrase)}}`,
    phrase: `{{itemIndex}}. {{item}}.\n`,
  },
  version: "0.2",
};

export const outputRai: IDynamicPromptTemplateSet<string> = {
  templates: {
    main: `
Please send following message back to me in orginal format. Message: 
{{args}}
`,
  },
  version: "0.2",
};
