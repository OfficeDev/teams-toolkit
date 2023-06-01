import { AdaptiveCardResult, CommandIntellisense } from './interfaces';
import { truncateString } from './utils';

export function generateCommandIntellisenses(
  requestCards: AdaptiveCardResult[]
): CommandIntellisense[] {
  const commandIntellisenses: CommandIntellisense[] = [];
  for (const card of requestCards) {
    if (commandIntellisenses.length >= 10) {
      console.warn(
        ` > [WARNING] Intellisen for ${card.url} is not included due to command length exceeds maximum length of 10`
      );
    } else {
      const title = `${card.operation.toUpperCase()} ${card.url}`;
      const description =
        card.api.summary ??
        card.api.description ??
        card.api.operationId ??
        card.url;

      if (title.length <= 32) {
        commandIntellisenses.push({
          title: `${card.operation.toUpperCase()} ${card.url}`,
          description: truncateString(description, 128)
        });
      } else {
        console.warn(
          ` > [WARNING] Intellisen for ${card.url} is not included due command title '${title}' exceeds maximum length of 32`
        );
      }
    }
  }

  return commandIntellisenses;
}
