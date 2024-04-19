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
  const defaultNoJSAnswer = localize(
    "teamstoolkit.chatParticipants.officeAddIn.default.noJSAnswer"
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
    7. If the user asks questions about non-JavaScript Add-ins (like COM add-ins, VSTO add-ins), say "${defaultNoJSAnswer}".
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

export function getPlannerPrompt() {
  const plannerResponseSchema = `{
    "response":
      {
        "init_plan" : "1. the first step in the plan\n 2. the second step in the plan\n 3. the third step in the plan",
        "host" : "Word"
      }
  }`;

  const plannerPrompt = `You are the Planner and expert in Office JavaScript Add-in area to help finish the user task.
## User Character
- The User's input should be the request or additional information to automate a certain process or accomplish a certain task using Office JavaScript APIs.
- The user is asking for a code snippet or function that can be used to accomplish the task.
- The input of the User will prefix with "User:" in the chat history.

## Planner Character
- Planner is an expert in Office JavaScript Add-ins, and familiar with scenarios and capabilities of Office JavaScript Add-ins and APIs.
- Planner should try the best to plan the subtasks related with Office JavaScript Add-ins.
- Planner's role is to plan the subtasks to resolve the request from the User.

## Planner's response format
  - Planner must strictly format the response into the following JSON object:
    ${plannerResponseSchema}
  - Planner's response must always include the 2 types of elements "init_plan", "host".
    - "init_plan" is the initial plan that Planner provides to the User.
    - "host" is the platform to indicate which Office application is the most relvevant to the user's ask in "init_plan". You can only pick from "Excel", "Word", "PowerPoint", "CustomFunction".
  - Planner must not include any other types of elements in the response that can cause parsing errors.

  ## About planning
  You need to make a step-by-step plan to complete the User's task. The planning process includes 2 phases:

  ## Initial planning
    - Decompose User's API code generation ask into sub steps and list them as the detailed plan steps.
    - Each sub step should be handled by stand alone Office JavaScript API.

  ## Office JavaScript Api Host Detection
    - Determine which Office application is the most relvevant to the user's ask.
`;

  return new vscode.LanguageModelChatSystemMessage(plannerPrompt);
}

export function getOfficeGenerateCodePrompt(apiSample: string) {
  const generateCodePrompt = `
<Role>
You are a senior developer in Office JavaScript add-in development area. You are especially an expert in code generation about Office JavaScript API, JavaScript and TypeScript. Follow the <Instructions> and think step by step.

<Instructions>
- Generate Office JavaScript API related code to resolve the user's ask.
- The generated code snippet must strictly follow <CodeStructure>.
- Reference <CodeExample> for any Office JavaScript API related code generation.
- Add inline comments in the generated code. Make sure the comments align with the code.
- For asks beyond the scope of Office JavaScript Add-ins and JavaScript, politely refuse the request.
- Explain the code snippet generated. Keep the explaination short and to the point.
</Instructions>

<CodeStructure>
- There must be one and only one main method in one code snippet. The main method must strictly follow the structure <CodeTemplate>.
- The main method must have a meaningful [functionName], a correct [hostName] of Word, Excel or Powerpoint, and runnable [Code] to address the user's ask.
- All variable declarations MUST be in the body of the main method.
- No more code should be generated except for the main method.
- The main method must use well-known service, algorithm, or solutions as recommendation to cover uncleared details.
</CodeStructure>

<CodeTemplate>
\`\`\`javascript
// This is a lambda function without any parameter.
export async function [functionName]() {
  try {
    await [hostName]].run(async (context) => {
      // add comments to explain the code
      [Code]
    })
  } catch (error) {
    console.error(error);
  }
}
\`\`\`
</CodeTemplate>

<CodeExample>
\`\`\`
${apiSample}
\`\`\`
</CodeExample>
`;

  return new vscode.LanguageModelChatSystemMessage(generateCodePrompt);
}

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

export function getUserInputBreakdownTaskUserPrompt(userInput: string): string {
  return `
  # Role:
  You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.

  # Your tasks:
  For this given ask: "${userInput}" to you. I need you help to analyze it, and give me your suggestion. 

  Please share your suggestion as a JSON object.

  Think about that step by step.
  `;
}

export function getUserInputBreakdownTaskSystemPrompt(): string {
  return `
  The following content written using Markdown syntax, using "Bold" style to highlight the key information.

  # Role:
  You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.

  # Context:
  The output must be a JSON object wrapped into a markdown json block, and it will contain the following keys:
  - host. value is a string.
  - shouldContinue. value is a Boolean.
  - data. value is a string array.
  - complexity. value is a number.
  - customFunctions. value is a Boolean.

  # Your tasks:
  Repeat the user's ask, make sure you give user suggestion based on the guidance below:
  1. Check if should accept the ask or reject it, by using the following criteria:
    - If the ask is not relevant to Microsoft Excel, Microsoft Word, or Microsoft PowerPoint, you should reject it because today this agent only support offer assistant to those Office host applications. And give the reason to reject the ask.
    - If the ask is not about automating a certain process or accomplishing a certain task using Office JavaScript Add-ins, you should reject it. And give the reason to reject the ask.
    - If the ask is **NOT JUST** asking for generate **TypeScript** or **JavaScript** code for Office Add-ins. You should reject it. And give the reason to reject the ask. For example, if part of the ask is about generating code of VBA, Python, HTML, CSS, or other languages, you should reject it. If that is not relevant to Office Add-ins, you should reject it. etc.
    - If the ask is about generate content beyond the code, you should reject it. And give the reason to reject the ask. For example, if the ask is about generate a document, a noval, a word document content, a powerpoint slide content, etc. you should reject it.
    - If you cannot process the ask, you should reject it. And give me the reason to reject the ask.
    - Otherwise, treat you will accept that ask. 
  2. Only If you can process the ask, follow the steps below for offering the suggestion:
    1. Identify the user ask if it explicitly asks for custom functions:
      - set the value of "customFunctions" field of output object to be "true" if the ask is about custom functions
      - set the value of "customFunctions" field of output object to be "false" if the ask is not about custom functions
    2. Identify a "complexity" score, the value of it is a number to indicate the complexity of the user's ask. The number should be between 1 to 100, 1 means the ask is very simple, 100 means the ask is very complex. Set this score into the "complexity" field of the output JSON object.
    This is the rule to calculate the complexity:
    - If there's no interaction with Office JavaScript Add-ins API, set the score range from very simple to simple. If maps to score, that coulld be (1, 25).
    - If there's a few interaction (less than 5) with Office JavaScript Add-ins API, set the score range from simple to medium. If maps to score, that coulld be (26, 50).
    - If there's several interaction (more than or equals to 5, less than 8) with Office JavaScript Add-ins API, set the score range from medium to complex. If maps to score, that coulld be (51, 75).
    - If there's many interaction (more than or equals to 8) with Office JavaScript Add-ins API, set the score range from complex to very complex. If maps to score, that coulld be (76, 100).
    2. If this is a complex task, that the "complexity score" greater than 50, based on intentions, break it down into up to three steps present as TypeScript functions. For each function, give a one line function description, that should have description of the function intention, what parameters it should take, and what it should return. Do not break the description into multiple sub items. Add those function descriptions to the "data" field of the output JSON object.
      - bypass step like "create a new Office Add-ins project" or "create a new Excel workbook" or "create a new Word document" or "create a new PowerPoint presentation".
      - bypass step like "open the workbook" or "open the document" or "open the presentation".
      - bypass step like "save the workbook" or "save the document" or "save the presentation".
      - bypass step like the "generate Addins Code" or "generate xxx Code".
      - bypass step like "Use the Office JavaScript Add-ins API to perform the required operations".
      - bypass step like "Register the xxx function".
    3. If this is a simple task, that the "complexity score" less than 50, generate a single one line function description for this task without any break down, and put that description into the "data" field. That description should have description of the function intention, what parameters it should take, and what it should return. Do not break the description into multiple sub items.
    4. Check the value of output object's "customFunctions" field:
      - If the value is "true", you should not include the entry function description in the "data" field.
      - If the value is "false", you should include the entry function description in the "data" field. The entry function description should summarize how other functions be called in what order. The entry function must named as "main", and takes no parameters, declared as 'async function'.
    5. Identify and set the "host" property of the output JSON object, that value is a string to indicate which Office application is the most relevant to the user's ask. You can pick from "Excel", "Word", "PowerPoint". 

    Following are some Examples:
    1. This is an example of the list that ask is not about custom functions, it must contains a entry function descriptions named 'main':
      - Create a function named 'createTrendlineChart'. This function should take the object instance of 'Excel.Worksheet' and the range values which type is 'any[][]' as parameters. It should create a trendline chart in the worksheet where dates are set as the x-value and prices as the y-value. Return a Promise<Excel.Chart> object.
      - Create an entry function named 'main'. This function doesn't take any parameters and will call 'createTrendlineChart' to create a trendline chart in worksheet. The function should be declared as 'async function'.
    2. This is an example of the list that ask about custom functions, it must not contains the entry function descriptions:
      - Create a custom functions named 'addSum'. This function should take two number values as parameters. Return the Promise<number> object. The function should be declared as 'async function'.
  
  If you suggested to accept the ask. Put the list of function description into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be true.
  If you suggested to reject the ask, put the reason to reject into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be false.
  You must strickly follow the format of output.

  #The format of output:
  Beyond the mark down json code block. You should not add anything else to the output

  Think about that step by step.
  `;
}

export function getCodeGenerateGuidance(host: string) {
  return `
  # Coding rules:
    - Code must be TypeScript compabible with ES2015.
    - Include type declarations in variable declaration, function return declaration, function argument declaration.
    - Add rich comments to explain the code.
    - Don't add invocation of the main or entry function.
    - Use async/await over .then for Promise.
    - An async function must return a Promise.
    - Must await for async function.
    - Use try-catch over .catch for Promise.
    - Use "fetch" over "XMLHttpRequest".
    - Don't use enum const. Like "Sunny", "Rainy", "Cloudy", or 0, 1, 2. Use enum instead.
    - Don't add "import" statement or "require" statement.
    - If The code use hypothetical service endpoint, must explain the response data structure with comment.
    - For multiple data types, using "as" keyword convert to single type.
    - Wrapped access to Office JavaScript object into the callback function of ${host}.run.
    - Run "$AccessObject".load("$PropertyName") before access the $Propery of the object.
    - Run "context.sync()" right after the $AccessObject.load() to sync the data.
  `;
}

export function getGenerateCodeUserPrompt(
  userInput: string,
  host: string,
  suggestedFunctions: string[]
): string {
  return `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Your role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on TypeScript, JavaScript, popular algorithm, Office Add-ins API, and deep understanding on the feature of Office applications (Word, Excel, PowerPoint). You should help the user to automate a certain process or accomplish a certain task, by generate TypeScript code using Office JavaScript Add-ins.

# Context:
This is the ask need your help to generate the code for this request: ${userInput}.
- The request is about Office Add-ins, and it is relevant to the Office application "${host}".
- It's a suggested list of functions with their purpose and details. **Read through those descriptions, and repeat by yourself**. Make sure you understand that before go to the task:
${suggestedFunctions.map((task) => `- ${task}`).join("\n")}

# Your tasks:
Generate code for each listed functions based on the user request, the generated code **MUST** include implementations of those functions listed above, and not limited to this. Code write in **TypeScript code** and **Office JavaScript Add-ins API**, while **follow the coding rule**. Do not generate code to invoke the "main" function or "entry" function if that function generated.

${getCodeGenerateGuidance(host)}

# Format of output:
**You must strickly follow the format of output**. The output will only contains code without any explanation on the code or generate process. Beyond that, nothing else should be included in the output.
- The code surrounded by a pair of triple backticks, and must follow with a string "typescript". For example:
\`\`\`typescript
// The code snippet
\`\`\`

Let's think step by step.
    `;
}

export function getGenerateCodeSamplePrompt(): string {
  return `
  The following content written using Markdown syntax, using "Bold" style to highlight the key information.

  # There're some samples relevant to the user's ask, you must read and repeat following samples before generate code. And then use the content and coding styles as your reference when you generate code:
  `;
}

export function getFixIssueUserPrompt(
  codeSnippet: string,
  additionalInfo: string,
  historicalErrors: string[]
): string {
  return `
# Role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on TypeScript, JavaScript, popular algorithm, Office Add-ins API, and deep understanding on the feature of Office applications (Word, Excel, PowerPoint). You need to offer the assistance to fix the code issue in the user given code snippet.

# Context:
Given a Office JavaScript add-in code snippet. It have some errors and warnings in the code snippet. You should make code changes on my given code snippet to fix those errors and warnings. You are allowed to change the function body, but not allowed to change the function signature, function name, and function parameters. And you're not allowed to remove the function.
\`\`\`typescript
${codeSnippet};
\`\`\`
${
  !!additionalInfo
    ? "The prior fix is inapprioriate, some details as '" +
      additionalInfo +
      "', you should learn from your past errors and avoid same problem in this try."
    : ""
}

${
  historicalErrors.length > 0
    ? "The historical errors you made in previous tries that you should avoid:\n- " +
      historicalErrors.join("\n\n- ")
    : ""
}

# Your tasks:
Fix all errors on the given code snippet then return the updated code snippet back. 

Let's think step by step.
    `;
}

export function getFixIssueDefaultSystemPrompt(
  host: string,
  substeps: string[],
  errorMessages: string[],
  warningMessage: string[]
): string {
  return `
  The following content written using Markdown syntax, using "Bold" style to highlight the key information.
  
  # Context:
  The user given code snippet generated based on steps below, you should make some code changes on the code snippet, then return the code snippet with changes back.
  - ${substeps.join("\n- ")}
  
  # Your task:
  1. Fix listed errors and warining below all together. Don't introduce new errors.
  - ${errorMessages.join("\n- ")}
  - ${warningMessage.join("\n- ")}
  2. update the user given code snippet with prior fixes.
  3. Return the updated user given code snippet.
  **You must always strickly follow the coding rule, and format of output**.
  
  ${getCodeGenerateGuidance(host)}
  
  Format of output:
  - The output should only contains code snippet. Beyond that, nothing else should be included in the output. 
  - The code output should be in one single markdown code block. 
  - Don't explain the code changes, just return the fixed code snippet.
  
  Example of output:
  That code snippet should surrounded by a pair of triple backticks, and must follow with a string "typescript". For example:
  \`\`\`typescript
  // The code snippet
  \`\`\`
  
  Let's think step by step.
      `;
}

export function getFixSuggestionPropertyDoesNotExistOnTypeUnionTypePrompt(unionTypes: string[]) {
  return `The type is a union type. Add code convert the union type to a single type using "as" keyword, then use the property of the type. You should pick the most relevant one of the types to convert: ${unionTypes.join(
    ", "
  )}.`;
}

export function getFixSuggestionPropertyDoesNotExistOnTypeNoDetailSuggestion(
  className: string,
  invalidProperty: string
) {
  return `
The type '${className}' is not a valid Office JavaScript API type, and '${invalidProperty}' is invalid property or method of the type '${className}'. You may incorrectly use a namespace, or other raw JavaScript type. You should fix that by rewrite relevant code snippet with different approach.`;
}

export function getFixSuggestionPropertyDoesNotExistOnTypeFoundConcreateMembership(
  className: string,
  invalidProperty: string,
  comments: string | undefined,
  declaration: string | undefined
) {
  return `
  '${invalidProperty}' is invalid property or method of the type '${className}'. 
  You should fix that by using the listed method or property below.
  method or property of type '${className}':
  \`\`\`typescript
  ${comments || ""}
  ${declaration || ""}
  \`\`\`\n`;
}

export function getFixSuggestionPropertyDoesNotExistOnTypeFoundCandidateOfFixing(
  index: number,
  className: string,
  comments: string | undefined,
  declaration: string | undefined
) {
  return `
${index + 1}. Candidate for fixing:
  \`\`\`typescript
  // This is method or property of type '${className}'
  ${comments || ""}
  ${declaration || ""}
  \`\`\`\n`;
}

export function getFixSuggestionPropertyDoesNotExistOnTypeFoundGeneralSuggestion(
  className: string,
  invalidProperty: string,
  suggestions: string[],
  memberNames: string[]
) {
  return `
'${invalidProperty}' is invalid property or method of the type '${className}'. 
Based on the purpose of that line of code, you can refer potential possible relevant properties or method below. It may need more than one intermediate steps to get there, using your knownledge and the list below to find the path.

${suggestions.join("\n")}

You may able to use the property or method of the type '${className}' as the start of the intermediate steps. The class indicates the type of the object, and the property or method indicates the action or the property of the object.
\`\`\`typescript
${memberNames.join("\n")}
\`\`\`\n`;
}

export function getFixSuggestionNoFunctionReturnOrNoimplementation() {
  return `The function should return a value, or the function should have an implementation.`;
}

export function getFixSuggestionCannotFindModule() {
  return `Remove the module import statement from the code.`;
}

export function getFixSuggestionArgumentCountMismatchGeneral() {
  return `Rewrite the code with the correct number of arguments.`;
}

export function getFixSuggestionArgumentCountMismatchHasSignature(
  expected: number,
  actual: number,
  declaration: string
) {
  return `The method expects ${expected} arguments, but you provided ${actual}. Rewrite the code with the correct number of arguments. Make sure you follow this method declaration: \n\`\`\`typescript\n${declaration}\n\`\`\`\n`;
}

export function getFixSuggestionArgumentCountMismatchWithoutSignature(declaration: string) {
  return `Rewrite the code with the correct number of arguments. Make sure you follow this method declaration: \n\`\`\`typescript\n${declaration}\n\`\`\`\n`;
}

export function getFixSuggestionArgumentTypeMismatchWithDeclaration(declaration: string) {
  return `You make the method call with invalid arugment, or the type of arugment does not match the expected type. If the source type is a union type, and union type could convert to the target type, then convert it to the single type match the expected type using "as" keyword. Otherwise, rewrite method invocation follow the method declaration below: \n\`\`\`typescript\n${declaration}\n\`\`\`\n`;
}
export function getFixSuggestionArgumentTypeMismatchWithTypeDetail(
  invalidType: string,
  validType: string
) {
  return `Find a property or method of the type '${invalidType}' it server for a similar purpose, and result to the type '${validType}', rewrite the code to use the property or method. Or rewrite the code using an alternative approach to achieve the same purpose.`;
}

export function getFixSuggestionArgumentTypeMismatchGeneral() {
  return `Rewrite relevant code, or use an alternative approach to achieve the same purpose.`;
}

export function getFixSuggestionOperatorAddOnTypeMismatch() {
  return `You should understand the purpose of that operation. The left-hand operand or the right-hand operand is unexpected, You use wrong object, or should use an alternative format of that object, in order to make two objects type compatible for the operator.`;
}

export function getFixSuggestionTypeIsNotAssignableToType() {
  return `You should understand the purpose of that assignment. The right-hand operand is unexpected. You use wrong object, or you should not assign the right-hand operand to the left because the right-hand operand is not assignable (like 'void'), or should use an alternative format of that object in order to make two objects type compatible for the operator.`;
}

export function getFixSuggestionConvertTypeToTypeMistake() {
  return `You should understand the purpose of that expression. The right-hand operand is unexpected, You use wrong object, or should use an alternative format of that object, in order to make two objects type compatible for the operator.`;
}

export function getFixSuggestionOverloadMismatchWithDeclaration(declaration: string) {
  return `You have mixed several overload forms of the method. Rewrite the code follow this method declaration: \n\`\`\`typescript\n${declaration}\n\`\`\`\n`;
}

export function getFixSuggestionOverloadMismatchGeneral() {
  return `You have mixed several overload forms of the method. You use wrong object, or you should use an alternative format of that object, in order to match the first overload.`;
}

export function getFixSuggestionCannotFindName() {
  return `Declare the variable before using it or implement the missing function.`;
}

export function getFixSuggestionCannotAssignToReadOnlyProperty() {
  return `Remove the assignment statement, or find a method available to change the value.`;
}

export function getFixSuggestionTopLevelExpressionForbiden() {
  return `Wrap the await expression in an async function, or wrap all the code in an async function.`;
}

export function getFixSuggestionExpressionExpectedHandlder() {
  return `The expression is incomplete, finish that using Hypothetical implementation.`;
}

export function getSuggestionOnAPIObjectPropertyAccessBeforeLoad(
  accessObjStr: string,
  propertyStr: string,
  line: number
) {
  return `Double check: Office API Object Property Access: ${accessObjStr.toString()}.${propertyStr} at line ${line}. You'd make sure the ${propertyStr} been loaded from ${accessObjStr.toString()} using the load function if that is necessary.`;
}

export function getSuggestionOnExcelA1NotationInStringConcatenationRight(
  fullExpression: string,
  line: number,
  rightExpression: string
) {
  return `Double check: Excel A1 Notation in String Concatenation: '${fullExpression}' at line ${line}. Based on the Excel A1 notation string definition, and code context, double check if the ${rightExpression} represent the expected row size. And expression '${fullExpression}' present the expected range size. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getSuggestionOnExcelA1NotationInStringConcatenationLeft(
  fullExpression: string,
  line: number,
  leftExpression: string
) {
  return `Double check: Excel A1 Notation in String Concatenation: '${fullExpression}' at line ${line}. Based on the Excel A1 notation string definition, and code context, double check if the ${leftExpression} represent the expected row size. And expression '${fullExpression}' present the expected range size. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getFixSuggestionExcelA1NotationInStringInterpolationPropertyAccess(
  fullExpression: string,
  line: number,
  subExpression: string
) {
  return `Double check: Excel A1 Notation in String Interpolation: ${fullExpression} at line ${line}. Based on the Excel A1 notation string definition, and code context, Double check the ${subExpression} represent the expected size. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getFixSuggestionExcelA1NotationInStringInterpolationBinaryExpressionLeftNumberLiteral(
  fullExpression: string,
  line: number,
  subExpression: string,
  numberLiteral: string,
  targetVariable: string
) {
  return `Double check: Excel A1 Notation in String Interpolation: ${fullExpression} at line ${line}. Double check the '${subExpression}' has the expected size, because you're try to plus or minus a number '${numberLiteral}' on the '${targetVariable}'. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getFixSuggestionExcelA1NotationInStringInterpolationBinaryExpressionRightNumberLiteral(
  fullExpression: string,
  line: number,
  subExpression: string,
  numberLiteral: string,
  targetVariable: string
) {
  return `Double check: Excel A1 Notation in String Interpolation: ${fullExpression} at line ${line}. Double check the '${subExpression}' has the expected size, because you're try to plus or minus a number '${numberLiteral}' on the '${targetVariable}'.Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getFixSuggestionExcelA1NotationInStringInterpolationBinaryExpressionGeneral(
  fullExpression: string,
  line: number,
  subExpression: string,
  numberLiteral: string,
  targetVariable: string
) {
  return `Double check: Excel A1 Notation in String Interpolation: ${fullExpression} at line ${line}. Double check the '${subExpression}' has the expected size, because you're try to plus or minus '${numberLiteral}' on '${targetVariable}'. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}

export function getFixSuggestionExcelA1NotationInStringLiteralGeneral(
  fullExpression: string,
  line: number
) {
  return `Double check: Excel A1 Notation in String Literal: ${fullExpression} at line ${line}. Ensure the ${fullExpression} has the expected size. If it size is not fixed, you must update code by reading the size from the variable, object property or the function return value, convert the string literal to a template string, or use the string interpolation. Double check if the A1 notation intended to represent the expected range size, like contains the range of headers, or just range of data. If the A1 notation contains header, make sure you always count on that header in following places. If the size is not expected, update the code to match the expected size.`;
}
