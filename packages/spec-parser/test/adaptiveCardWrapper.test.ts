// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import {
  inferPreviewCardTemplate,
  wrapAdaptiveCard,
  wrapResponseSemantics,
} from "../src/adaptiveCardWrapper";
import { AdaptiveCard } from "../src/interfaces";
import { ConstantString } from "../src/constants";

describe("adaptiveCardWrapper", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("wrapResponseSemantics", () => {
    it("should infer response semanitcs card template correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "id: ${if(id, id, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "petId: ${if(petId, petId, 'N/A')}",
            wrap: true,
          },
          {
            $when: "${imageUrl != null && imageUrl != ''}",
            type: "Image",
            url: "${imageUrl}",
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = wrapResponseSemantics(card, "$");

      expect(result.data_path).to.equal("$");
      expect(result.properties!.title).to.equal("$.petId");
      expect(result.properties!.subtitle).to.equal("$.id");
      expect(result.properties!.url).to.equal("$.imageUrl");
    });

    it("should infer response semanitcs card with json path correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
          {
            type: "Container",
            $data: "${$root}",
            items: [
              {
                type: "TextBlock",
                text: "name: ${if(name, name, 'N/A')}",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "age: ${if(age, age, 'N/A')}",
                wrap: true,
              },
            ],
          },
        ],
      };

      const result = wrapResponseSemantics(card, "items");

      expect(result.data_path).to.equal("$.items");
      expect(result.properties!.title).to.equal("$.name");
      expect(result.properties!.subtitle).to.equal("$.age");
      expect(result.properties!.url).to.be.undefined;
    });
  });

  describe("inferPreviewCardTemplate", () => {
    it("should infer preview card template correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "id: ${if(id, id, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "petId: ${if(petId, petId, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("${if(petId, petId, 'N/A')}");
      expect(result.subtitle).to.equal("${if(id, id, 'N/A')}");
      expect(result.image).to.be.undefined;
    });

    it("should infer preview card template correctly for array element", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "Container",
            $data: "${$root}",
            items: [
              {
                type: "TextBlock",
                text: "id: ${if(id, id, 'N/A')}",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "name: ${if(name, name, 'N/A')}",
                wrap: true,
              },
            ],
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("${if(name, name, 'N/A')}");
      expect(result.subtitle).to.equal("${if(id, id, 'N/A')}");
      expect(result.image).to.be.undefined;
    });

    it("should handle empty card body correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("result");
      expect(result.subtitle).to.be.undefined;
      expect(result.image).to.be.undefined;
    });

    it("should handle card body with no matching text blocks correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "name: John",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "age: 30",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("result");
      expect(result.subtitle).be.undefined;
      expect(result.image).to.be.undefined;
    });

    it("should handle card body with no matching well known names", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "product: ${if(product, product, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "item: ${if(item, item, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("${if(product, product, 'N/A')}");
      expect(result.subtitle).to.equal("${if(item, item, 'N/A')}");
      expect(result.image).to.be.undefined;
    });

    it("should use subtitle as title property if it only contain subtitle", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "description: ${if(description, description, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("${if(description, description, 'N/A')}");
      expect(result.subtitle).to.be.undefined;
      expect(result.image).to.be.undefined;
    });

    it("should handle card body with well known image names", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "product: ${if(product, product, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "photoUrl: ${if(photoUrl, photoUrl, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const result = inferPreviewCardTemplate(card);

      expect(result.title).to.equal("${if(product, product, 'N/A')}");
      expect(result.subtitle).to.be.undefined;
      expect(result.image).to.be.deep.equal({
        url: "${photoUrl}",
        alt: "${if(photoUrl, photoUrl, 'N/A')}",
        $when: "${photoUrl != null && photoUrl != ''}",
      });
    });
  });

  describe("wrapAdaptiveCard", () => {
    it("should generate wrapped card correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "id: ${if(id, id, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "petId: ${if(petId, petId, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const expectedWrappedCard = {
        version: ConstantString.WrappedCardVersion,
        $schema: ConstantString.WrappedCardSchema,
        jsonPath: "$",
        responseLayout: ConstantString.WrappedCardResponseLayout,
        responseCardTemplate: card,
        previewCardTemplate: {
          title: "${if(petId, petId, 'N/A')}",
          subtitle: "${if(id, id, 'N/A')}",
        },
      };

      const wrappedCard = wrapAdaptiveCard(card, "$");
      expect(wrappedCard).to.deep.equal(expectedWrappedCard);
    });

    it("should generate wrapped card with image previewCardTemplate correctly", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "name: ${if(name, name, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "petId: ${if(petId, petId, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "imageUrl: ${if(imageUrl, imageUrl, 'N/A')}",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const expectedWrappedCard = {
        version: ConstantString.WrappedCardVersion,
        $schema: ConstantString.WrappedCardSchema,
        jsonPath: "$",
        responseLayout: ConstantString.WrappedCardResponseLayout,
        responseCardTemplate: card,
        previewCardTemplate: {
          title: "${if(name, name, 'N/A')}",
          subtitle: "${if(petId, petId, 'N/A')}",
          image: {
            url: "${imageUrl}",
            $when: "${imageUrl != null && imageUrl != ''}",
            alt: "${if(imageUrl, imageUrl, 'N/A')}",
          },
        },
      };

      const wrappedCard = wrapAdaptiveCard(card, "$");
      expect(wrappedCard).to.deep.equal(expectedWrappedCard);
    });

    it("should not generate image property if text is not expected", () => {
      const card: AdaptiveCard = {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "name: ${if(name, name, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "petId: ${if(petId, petId, 'N/A')}",
            wrap: true,
          },
          {
            type: "TextBlock",
            text: "invalid: ${if(imageUrl",
            wrap: true,
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      };

      const expectedWrappedCard = {
        version: ConstantString.WrappedCardVersion,
        $schema: ConstantString.WrappedCardSchema,
        jsonPath: "$",
        responseLayout: ConstantString.WrappedCardResponseLayout,
        responseCardTemplate: card,
        previewCardTemplate: {
          title: "${if(name, name, 'N/A')}",
          subtitle: "${if(petId, petId, 'N/A')}",
        },
      };

      const wrappedCard = wrapAdaptiveCard(card, "$");
      expect(wrappedCard).to.deep.equal(expectedWrappedCard);
    });
  });
});
