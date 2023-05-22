import * as fs from 'fs-extra';
import { capitalizeFirstLetter } from './utils';
import { ActionHandlerResult } from './interfaces';

export async function generateActionHandler(
  tag: string,
  responseCardName: string,
  cardId: string
): Promise<ActionHandlerResult> {
  const codeTemplate = await fs.readFile(
    './src/resources/actionHandlerTemplate.txt',
    'utf8'
  );

  const result = codeTemplate
    .replace(/{{tag}}/g, capitalizeFirstLetter(tag))
    .replace(/{{cardName}}/g, responseCardName)
    .replace(/{{id}}/g, cardId)
    .replace(/{{className}}/g, capitalizeFirstLetter(cardId) + 'ActionHandler');

  return {
    name: cardId + 'ActionHandler',
    code: result
  };
}
