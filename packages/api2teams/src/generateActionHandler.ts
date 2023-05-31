import * as fs from 'fs-extra';
import { capitalizeFirstLetter, getSafeName } from './utils';
import { CodeResult } from './interfaces';

export async function generateActionHandler(
  tag: string,
  responseCardName: string,
  cardId: string
): Promise<CodeResult> {
  const codeTemplate = await fs.readFile(
    __dirname + '/resources/actionHandlerTemplate.txt',
    'utf8'
  );

  const result = codeTemplate
    .replace(/{{tag}}/g, capitalizeFirstLetter(getSafeName(tag)))
    .replace(/{{cardName}}/g, responseCardName)
    .replace(/{{id}}/g, cardId)
    .replace(/{{className}}/g, capitalizeFirstLetter(cardId) + 'ActionHandler');

  return {
    name: cardId + 'ActionHandler',
    code: result
  };
}
