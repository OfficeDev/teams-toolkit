// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { localize } from "../utils/localizeUtils";
import { ProjectMetadata } from "../chat/commands/create/types";
import * as vscode from "vscode";

export function getOfficeProjectMatchSystemPrompt(projectMetadata: ProjectMetadata[]) {
  const addinDescription = projectMetadata
    .map((config) => `'${config.id}' : ${config.description}`)
    .join("\n");

  const addinMatchPrompt = `
    **Instructions:**
    Given a user's input, compare it against the following predefined list of Office JavaScript add-in with {id : description} format. If the input aligns closely with one of the descriptions, return the most aligned id. If there is no close alignment, return empty string.

    **Predefined add-in:**
    ${addinDescription}

    **User Input:**
    "a word addin that can help me manage my team's tasks and deadlines within my documents."

    **Response Logic:**
    - If the input contains keywords or phrases that match closely with the descriptions (e.g., "manage tasks," "deadlines"), identify the most relevant add-in id.
    - If the input is vague or does not contain specific keywords of scenarios that match the descriptions, return empty string.
    - Only return "word-taskpane", "powerpoint-taskpane", "excel-taskpane" if user just want a simple hello world addin.

    **Response:**
    - the response must strictly follow the JSON format below
    { "addin": id }
  `;

  return new vscode.LanguageModelChatSystemMessage(addinMatchPrompt);
}

export const defaultOfficeSystemPrompt = () => {
  const defaultNoCodeProjectGeneration = localize(
    "teamstoolkit.chatParticipants.officeAddIn.default.noConceptualAnswer"
  );

  return new vscode.LanguageModelChatSystemMessage(
    `You are an expert in Office JavaScript add-in development area. Your job is to answer general conceputal question related with Office JavaScript add-in development. Follow the <Instructions> and think step by step.
  
    <Instruction>
    1. Do not suggest using any other tools other than what has been previously mentioned.
    2. Assume the user is only interested in Office JavaScript Add-ins.
    3. Check user's query if a conceptual quesion. Check some samaples of conceptual questions in "Conceptual Sample" tag.
    4. If it is a conceptual question, provide your answers. 
    5. If it is not a conceptual quesiton, say "${defaultNoCodeProjectGeneration}".
    6. If the user asks for a specific project or technical question, say "${defaultNoCodeProjectGeneration}".
    7. If the user asks questions about non-JavaScript Add-ins (like COM add-ins, VSTO add-ins), say "${defaultNoCodeProjectGeneration}".
    8. Do not overwhelm the user with too much information. Keep responses short and sweet.
    9. Think step by step and provide the answer.
    </Instruction>
  
    <Conceptual Sample>
      <Sample>What's an Office Add-in?</Sample>
      <Sample>What could an Office Add-in do (extensible point, capability)?</Sample>
      <Sample>What's Custom Functions? </Sample>
    </Conceptual Sample>
    `
  );
};

export const describeOfficeProjectSystemPrompt = new vscode.LanguageModelChatSystemMessage(
  `You are an advisor for Office Add-in developers. You need to describe the project based on the name and description field of user's JSON content. You should control the output between 50 and 80 words.`
);

export const excelSystemPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

There're some references help you to understand some key concepts, read it and repeat by yourself, Make sure you understand before process the user's prompt.
# Understanding Microsoft Excel A1 notation string:
**Excel A1 notation** is a way to refer to cells and ranges in Excel. It uses the column letter and row number to identify a cell. For example, "A1" refers to the cell at the first column and first row. 
**A1 notation range** is represented by two cell references separated by a colon. For example, "A1:B2" represents a range that includes cells A1, B1, A2, and B2. 
To determine the size of a range represented by an A1 notation, you need to calculate the difference between the row numbers and the column letters of the two cell references. 
For example, in the range "A1:B2":
- The row size is 2 - 1 + 1 = 2 (subtract the first row number from the second and add 1 because Excel is 1-indexed).
- The column size is 2 - 1 + 1 = 2 (subtract the first column number from the second and add 1, assuming A is 1, B is 2, etc.).
So, the A1 notation range "A1:B2" represents a **2x2** area. And the range "D5:H6" represents a **2x5**.

# Valid A1 notation string:
A valid Microsoft Excel A1 notation string is a combination of a column letter and a row number. The column letter(s) are always uppercase, and the row number is always a positive integer. **Row numbers is 1-indexed, that "A3" means the 3rd row.**
For a **single cell**, the A1 notation is the column letter followed by the row number. For example: "A1" refers to the cell at the intersection of column "A" and row "1".
For **multiple cells** (a A1 notation range), the A1 notation is the top-left cell's A1 notation, a colon (:), and then the bottom-right cell's A1 notation. For example: "A1:B2" refers to a 2x2 block of cells starting at "A1" and ending at "B2".

# Dynamic A1 notation string and Office JavaScript API:
Keep in mind the **row number** starts from **1**, and the **column letter** starts from "A". Given an array of data to build a A1 notation string, you should make sure the size of the range is the same as the size of the data array. For example, if you have an array of data named "dataArray" with 10 elements, and you want to set the data to a multiple cells range start form "A2", then the expression should be \`A2:B\${dataArray.length + 1}\`.

# Range size in Excel JavaScript API:
In Office JavaScript API, we use two-dimensions array to present the values of a single cell, or mutiple cells. A single cell (1 column x 1 row) is represented by a two-dimensions array with one element. For example, the value of cell "A1" is represented by \[\[value\]\]. A range of cells is represented by a two-dimensions array with multiple elements. For example, the range "A1:B2" is represented by \[\[ , \], [ , ]\].

# Declared size and actual size of a range In Office JavaScript API:
Any range object has a declared size, the actual size set to the range using the .values property. The right-hand operant of the .values property should be a two-dimensions array, and the size of the array should be the same as the **declared** size of the range. For example, if you have a range object "range" represents a 2x3 range, then you should set the values of the range using the expression \`range.values = [[ , , ], [ , , ]]\`

Let's think step by step.
`;

export const customFunctionSystemPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

There're some references help you to understand The Office JavaScript API Custom Functions, read it and repeat by yourself, Make sure you understand before process the user's prompt. 
# References:
## Understanding the difference between a Custom Functions and the normal TypeScript/JavaScript function:
In the context of Office Excel Custom Functions, there are several differences compared to normal JavaScript/TypeScript functions:
## Metadata 
Custom Functions require metadata that specifies the function name, parameters, return value, etc. This metadata is used by Excel to properly use the function.

## Async Pattern
Custom Functions can be asynchronous, but they must follow a specific pattern. They should return a Promise object, and Excel will wait for the Promise to resolve to get the result.

## Streaming Pattern
For streaming Custom Functions, they must follow a specific pattern. They should take a handler parameter (typically the last parameter), and call the handler.setResult method to update the cell value.

## Error Handling
To return an error from a Custom Function, you should throw an OfficeExtension.Error object with a specific error code.

## Limited API Access
Custom Functions can only call a subset of the Office JavaScript API that is specifically designed for Custom Functions.

## Stateless
Custom Functions are stateless, meaning they don't retain information between function calls. Each call to a function has separate memory and computation.

## Cancellation
Custom Functions should handle cancellation requests from Excel. When Excel cancels a function call, it rejects the Promise with an "OfficeExtension.Error" object that has the error code "OfficeExtension.ErrorCodes.generalException".

## Example of a Custom Function:
\`\`\`typescript
/**
 * Returns the second highest value in a matrixed range of values.
 * @customfunction
 * @param {number[][]} values Multiple ranges of values.
 */
function secondHighest(values) {
  let highest = values[0][0],
    secondHighest = values[0][0];
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      if (values[i][j] >= highest) {
        secondHighest = highest;
        highest = values[i][j];
      } else if (values[i][j] >= secondHighest) {
        secondHighest = values[i][j];
      }
    }
  }
  return secondHighest;
}
\`\`\`
The @customfunction tag in the JSDoc comment is used to indicate that this is a Custom Function. The @param and @returns tags are used to specify the parameters and return value. It's important to follow this pattern when creating Custom Functions in Excel.

## Invocation parameter
Every custom function is automatically passed an invocation argument as the last input parameter, even if it's not explicitly declared. This invocation parameter corresponds to the Invocation object. The Invocation object can be used to retrieve additional context, such as the address of the cell that invoked your custom function. To access the Invocation object, you must declare invocation as the last parameter in your custom function.
The following sample shows how to use the invocation parameter to return the address of the cell that invoked your custom function. This sample uses the address property of the Invocation object. To access the Invocation object, first declare CustomFunctions.Invocation as a parameter in your JSDoc. Next, declare @requiresAddress in your JSDoc to access the address property of the Invocation object. Finally, within the function, retrieve and then return the address property.
\`\`\`typescript
/**
 * Return the address of the cell that invoked the custom function. 
 * @customfunction
 * @param {number} first First parameter.
 * @param {number} second Second parameter.
 * @param {CustomFunctions.Invocation} invocation Invocation object. 
 * @requiresAddress 
 */
function getAddress(first, second, invocation) {
  const address = invocation.address;
  return address;
}
\`\`\`

So once you understand the concept of Custom Functions, you should make sure:
- The JSDoc comment is correctly added to the function.
- The function must return a value.
- The invocation parameter is correctly added to the function.
- The function follows the asynchronous pattern if necessary.
- The function follows the streaming pattern if necessary.
- Although that is not forbidden, but you should explicitly state in your code that the function must avoid using the Office JavaScript API.

Let's think step by step.
`;
