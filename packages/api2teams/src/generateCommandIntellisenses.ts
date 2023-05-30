import { AdaptiveCardResult, CommandIntellisense } from './interfaces';

export function generateCommandIntellisenses(
  requestCards: AdaptiveCardResult[]
): CommandIntellisense[] {
  const commandIntellisenses: CommandIntellisense[] = [];
  for (const card of requestCards) {
    if (commandIntellisenses.length >= 10) {
      console.log(
        `Intellisen for ${card.url} is not included due to command length exceeds maximum length of 10`
      );
    } else {
      const title = `${card.operation.toUpperCase()} ${card.url}`;
      if (title.length <= 32) {
        commandIntellisenses.push({
          title: `${card.operation.toUpperCase()} ${card.url}`,
          description:
            card.api.summary ??
            card.api.description ??
            card.api.operationId ??
            card.url
        });
      } else {
        console.log(
          `Intellisen for ${card.url} is not included due command title '${title}' exceeds maximum length of 32`
        );
      }
    }
  }

  return commandIntellisenses;
}
