import { assert } from "chai";
import { MessageBuilder } from "../../../../src";

describe("attachAdaptiveCard", () => {
  it("adaptive card with data", () => {
    const card = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: "Hello, ${name}!",
        },
      ],
    };

    const data = {
      name: "test",
    };

    const expectedCard = {
      attachments: [
        {
          content: {
            type: "AdaptiveCard",
            body: [
              {
                type: "TextBlock",
                text: "Hello, test!",
              },
            ],
          },
          contentType: "application/vnd.microsoft.card.adaptive",
        },
      ],
    };

    const result = MessageBuilder.attachAdaptiveCard(card, data);
    assert.deepStrictEqual(result, expectedCard);
  });
});
