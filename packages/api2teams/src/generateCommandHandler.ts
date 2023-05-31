import * as fs from 'fs-extra';
import { capitalizeFirstLetter, getSafeName } from './utils';
import { CodeResult } from './interfaces';
import { OpenAPIV3 } from 'openapi-types';

export async function generateCommandHandler(
  api: OpenAPIV3.OperationObject,
  responseCardName: string,
  cardId: string,
  url: string,
  tag: string
): Promise<CodeResult> {
  let apiUrl = url;

  let containHeaderParams = false;
  let containCookiePrarms = false;
  let containQueryParams = false;
  const requiredParameters: string[] = [];
  if (api.parameters) {
    for (const index in api.parameters) {
      const param = api.parameters[index] as OpenAPIV3.ParameterObject;
      if (param.in === 'path') {
        apiUrl = apiUrl.replace(`{${param.name}}`, `(?<${param.name}>\\\\w+)`);
      } else if (param.in === 'query') {
        containQueryParams = true;
        param.required && requiredParameters.push(param.name);
      } else if (param.in === 'cookie') {
        containCookiePrarms = true;
      } else if (param.in === 'header') {
        containHeaderParams = true;
      }
    }
  }

  const queriesRegex = containQueryParams
    ? '(\\\\?(?<queries>(?:&?\\\\w+=(?:\\\\w+))*))?'
    : '';

  const triggerPattern = `${apiUrl}${queriesRegex}$`;

  const codeTemplate = await fs.readFile(
    __dirname + '/resources/commandHandlerTemplate.txt',
    'utf8'
  );

  const result = codeTemplate
    .replace(/{{requestCardName}}/g, cardId + 'RequestCard')
    .replace(/{{responseCardName}}/g, responseCardName)
    .replace(/{{operation}}/g, 'GET')
    .replace(/{{id}}/g, cardId)
    .replace(/{{triggerPattern}}/g, triggerPattern)
    .replace(/{{tag}}/g, capitalizeFirstLetter(getSafeName(tag)))
    .replace(/{{className}}/g, capitalizeFirstLetter(cardId) + 'CommandHandler')
    .replace(/{{requiredParams}}/g, JSON.stringify(requiredParameters))
    .replace(
      /{{needCookieOrHeaderParams}}/g,
      containCookiePrarms || containHeaderParams ? 'true' : 'false'
    );

  return {
    name: cardId + 'CommandHandler',
    code: result
  };
}
