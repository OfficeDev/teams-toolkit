import { expect } from "chai";
import * as util from "util";
import "mocha";
import sinon from "sinon";
import {
  generateAdaptiveCard,
  generateCardFromResponse,
} from "../../../src/common/spec-parser/adaptiveCardGenerator";
import * as utils from "../../../src/common/spec-parser/utils";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";
import { ErrorType } from "../../../src/common/spec-parser/interfaces";
import { ConstantString } from "../../../src/common/spec-parser/constants";

describe("adaptiveCardGenerator", () => {
  afterEach(() => {
    sinon.restore();
  });
  describe("generateAdaptiveCard", () => {
    it("should generate a card from a schema object", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                    },
                    age: {
                      type: "number",
                    },
                  },
                },
              },
            },
          },
        },
      } as any;
      const expected = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
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
      };

      const actual = generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from an example value", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  name: "John",
                  age: 30,
                },
              },
            },
          },
        },
      };
      const expected = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "${jsonStringify($root)}",
            wrap: true,
          },
        ],
      };

      const actual = generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a default success response", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
          },
        },
      };
      const expected = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "success",
            wrap: true,
          },
        ],
      };

      const actual = generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card if no json response", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/xml": {},
            },
          },
        },
      };
      const expected = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: "success",
            wrap: true,
          },
        ],
      };

      const actual = generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
    });
  });

  it("should generate a card if schema is empty", () => {
    const schema = {};
    const expected = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: "success",
          wrap: true,
        },
      ],
    };

    const actual = generateAdaptiveCard(schema);

    expect(actual).to.deep.equal(expected);
  });

  describe("generateCardFromResponse", () => {
    it("should generate a card from a schema object", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          age: {
            type: "number",
          },
        },
      };
      const name = "person";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "person.name: ${if(person.name, person.name, 'N/A')}",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: "person.age: ${if(person.age, person.age, 'N/A')}",
          wrap: true,
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from an array schema object", () => {
      const schema = {
        type: "array",
        items: {
          type: "string",
        },
      };
      const name = "colors";
      const parentArrayName = "";
      const expected = [
        {
          type: "Container",
          $data: "${colors}",
          items: [
            {
              type: "TextBlock",
              text: "colors: ${$data}",
              wrap: true,
            },
          ],
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from an empty array schema object", () => {
      const schema = {
        type: "array",
        items: {},
      };
      const name = "colors";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "colors: ${jsonStringify(colors)}",
          wrap: true,
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with a boolean type", () => {
      const schema = {
        type: "boolean",
      };
      const name = "person";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "person: ${if(person, person, 'N/A')}",
          wrap: true,
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          address: {
            type: "object",
            properties: {
              street: {
                type: "string",
              },
              city: {
                type: "string",
              },
            },
          },
        },
      };
      const name = "person";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "person.name: ${if(person.name, person.name, 'N/A')}",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: "person.address.street: ${if(person.address.street, person.address.street, 'N/A')}",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: "person.address.city: ${if(person.address.city, person.address.city, 'N/A')}",
          wrap: true,
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested objects without root name", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          address: {
            type: "object",
            properties: {
              street: {
                type: "string",
              },
              city: {
                type: "string",
              },
            },
          },
        },
      };
      const name = "";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "name: ${if(name, name, 'N/A')}",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: "address.street: ${if(address.street, address.street, 'N/A')}",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: "address.city: ${if(address.city, address.city, 'N/A')}",
          wrap: true,
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested arrays of array", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            people: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  age: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      };
      const name = "company";
      const parentArrayName = "";
      const expected = [
        {
          type: "Container",
          $data: "${company}",
          items: [
            {
              type: "TextBlock",
              text: "company.name: ${if(name, name, 'N/A')}",
              wrap: true,
            },
            {
              type: "Container",
              $data: "${people}",
              items: [
                {
                  type: "TextBlock",
                  text: "people.name: ${if(name, name, 'N/A')}",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "people.age: ${if(age, age, 'N/A')}",
                  wrap: true,
                },
              ],
            },
          ],
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested arrays of array without root name", () => {
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            people: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  age: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      };
      const name = "";
      const parentArrayName = "";
      const expected = [
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
              type: "Container",
              $data: "${people}",
              items: [
                {
                  type: "TextBlock",
                  text: "people.name: ${if(name, name, 'N/A')}",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "people.age: ${if(age, age, 'N/A')}",
                  wrap: true,
                },
              ],
            },
          ],
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested arrays of objects", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          people: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                age: {
                  type: "number",
                },
              },
            },
          },
        },
      };
      const name = "company";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "company.name: ${if(company.name, company.name, 'N/A')}",
          wrap: true,
        },
        {
          type: "Container",
          $data: "${company.people}",
          items: [
            {
              type: "TextBlock",
              text: "company.people.name: ${if(name, name, 'N/A')}",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: "company.people.age: ${if(age, age, 'N/A')}",
              wrap: true,
            },
          ],
        },
      ];

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);

      expect(actual).to.deep.equal(expected);
    });

    it("should throw an error for unsupported schema types", () => {
      const schema = {
        oneOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const name = "person";
      const parentArrayName = "";

      expect(() => generateCardFromResponse(schema as any, name, parentArrayName)).to.throw(
        util.format(ConstantString.SchemaNotSupported, JSON.stringify(schema))
      );
    });

    it("should throw an error for unknown schema types", () => {
      const schema = {
        type: "fake-type",
      };
      const name = "person";
      const parentArrayName = "";

      expect(() => generateCardFromResponse(schema as any, name, parentArrayName)).to.throw(
        util.format(ConstantString.UnknownSchema, JSON.stringify(schema))
      );
    });

    it("should ignore additionalProperties", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
        additionalProperties: true,
      };
      const name = "person";
      const parentArrayName = "";
      const expected = [
        {
          type: "TextBlock",
          text: "person.name: ${if(person.name, person.name, 'N/A')}",
          wrap: true,
        },
      ];

      const warnSpy = sinon.spy(console, "warn");

      const actual = generateCardFromResponse(schema as any, name, parentArrayName);
      sinon.assert.calledOnce(warnSpy);
      expect(actual).to.deep.equal(expected);
      sinon.assert.calledWithExactly(warnSpy, ConstantString.AdditionalPropertiesNotSupported);
    });

    it("should throw a SpecParserError if getResponseJson throws an error", () => {
      const operationItem = {} as any;
      const getResponseJsonStub = sinon
        .stub(utils, "getResponseJson")
        .throws(new Error("getResponseJson error"));

      try {
        generateAdaptiveCard(operationItem);
        expect.fail("Expected generateAdaptiveCard to throw a SpecParserError");
      } catch (err) {
        expect(err).to.be.instanceOf(SpecParserError);
        expect(err.errorType).to.equal(ErrorType.GenerateAdaptiveCardFailed);
        expect(err.message).to.equal("Error: getResponseJson error");
      }

      getResponseJsonStub.restore();
    });
  });
});
