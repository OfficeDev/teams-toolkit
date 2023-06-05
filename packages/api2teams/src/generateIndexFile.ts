import * as fs from 'fs-extra';
import { capitalizeFirstLetter } from './utils';
import { AdaptiveCardResult, CodeResult } from './interfaces';

export async function generateIndexFile(
  cards: AdaptiveCardResult[]
): Promise<CodeResult> {
  let importCode = '';
  const newCommandHandlers = [];
  const newActionHandler = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    importCode += `import { ${capitalizeFirstLetter(
      card.id
    )}CommandHandler } from "./commands/${card.id}CommandHandler";\n`;
    importCode += `import { ${capitalizeFirstLetter(
      card.id
    )}ActionHandler } from "./cardActions/${card.id}ActionHandler";\n`;

    newCommandHandlers.push(
      'new ' + capitalizeFirstLetter(card.id) + 'CommandHandler()'
    );
    newActionHandler.push(
      'new ' + capitalizeFirstLetter(card.id) + 'ActionHandler()'
    );
  }

  newCommandHandlers.push('new HelpCommandHandler()');
  importCode +=
    'import { HelpCommandHandler } from "./commands/helpCommandHandler";\n';

  const codeTemplate = await fs.readFile(
    __dirname + '/resources/indexFileTemplate.txt',
    'utf8'
  );

  const result = codeTemplate
    .replace(/{{importStatements}}/g, importCode)
    .replace(/{{commandHandlers}}/g, newCommandHandlers.join(', '))
    .replace(/{{actionHandlers}}/g, newActionHandler.join(', '));

  return {
    name: 'index',
    code: result
  };
}
