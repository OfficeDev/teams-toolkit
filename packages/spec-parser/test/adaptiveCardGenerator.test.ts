import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { AdaptiveCardGenerator } from "../src/adaptiveCardGenerator";
import { Utils } from "../src/utils";
import { SpecParserError } from "../src/specParserError";
import { ErrorType } from "../src/interfaces";
import { ConstantString } from "../src/constants";

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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
    });

    it("should generate a card from a schema object with image url property", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    photo_url: {
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
            type: "Image",
            url: "${photo_url}",
            $when: "${photo_url != null}",
          },
          {
            type: "TextBlock",
            text: "age: ${if(age, age, 'N/A')}",
            wrap: true,
          },
        ],
      };

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
    });

    it("should generate a card from a schema object with image name and uri format", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "integer",
                      },
                      title: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                      assignedTo: {
                        type: "string",
                      },
                      date: {
                        type: "string",
                        format: "date-time",
                      },
                      image: {
                        type: "string",
                        format: "uri",
                      },
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
                text: "title: ${if(title, title, 'N/A')}",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "description: ${if(description, description, 'N/A')}",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "assignedTo: ${if(assignedTo, assignedTo, 'N/A')}",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: "date: ${if(date, date, 'N/A')}",
                wrap: true,
              },
              {
                type: "Image",
                url: `\${image}`,
                $when: `\${image != null}`,
              },
            ],
          },
        ],
      };

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
    });

    it("should generate a card from a object schema with well known array property", () => {
      const operationItem = {
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                    },
                    result: {
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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("result");
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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
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

      const [actual, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(schema);

      expect(actual).to.deep.equal(expected);
      expect(jsonPath).to.equal("$");
    });
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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from an array schema object with image url property", () => {
      const schema = {
        type: "array",
        items: {
          type: "string",
        },
      };
      const name = "photoUrls";
      const parentArrayName = "";
      const expected = [
        {
          type: "Container",
          $data: "${photoUrls}",
          items: [
            {
              type: "Image",
              url: "${$data}",
              $when: "${$data != null}",
            },
          ],
        },
      ];

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

      expect(actual).to.deep.equal(expected);
    });

    it("should generate a card from a schema object with nested arrays of array with image url property", () => {
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
                  iconUrl: {
                    type: "string",
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
                  type: "Image",
                  url: `\${iconUrl}`,
                  $when: `\${iconUrl != null}`,
                },
              ],
            },
          ],
        },
      ];

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );

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

      expect(() =>
        AdaptiveCardGenerator.generateCardFromResponse(schema as any, name, parentArrayName)
      ).to.throw(Utils.format(ConstantString.SchemaNotSupported, JSON.stringify(schema)));
    });

    it("should throw an error for unknown schema types", () => {
      const schema = {
        type: "fake-type",
      };
      const name = "person";
      const parentArrayName = "";

      expect(() =>
        AdaptiveCardGenerator.generateCardFromResponse(schema as any, name, parentArrayName)
      ).to.throw(Utils.format(ConstantString.UnknownSchema, JSON.stringify(schema)));
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

      const actual = AdaptiveCardGenerator.generateCardFromResponse(
        schema as any,
        name,
        parentArrayName
      );
      sinon.assert.calledOnce(warnSpy);
      expect(actual).to.deep.equal(expected);
      sinon.assert.calledWithExactly(warnSpy, ConstantString.AdditionalPropertiesNotSupported);
    });

    it("should throw a SpecParserError if getResponseJson throws an error", () => {
      const operationItem = {} as any;
      // const getResponseJsonStub = sinon
      //   .stub(utils, "getResponseJson")
      //   .throws(new Error("getResponseJson error"));
      sinon.stub(Utils, "getResponseJson").callsFake(() => {
        throw new Error("getResponseJson error");
      });

      try {
        AdaptiveCardGenerator.generateAdaptiveCard(operationItem);
        expect.fail("Expected generateAdaptiveCard to throw a SpecParserError");
      } catch (err: any) {
        expect(err).to.be.instanceOf(SpecParserError);
        expect(err.errorType).to.equal(ErrorType.GenerateAdaptiveCardFailed);
        expect(err.message).to.equal("Error: getResponseJson error");
      }

      // getResponseJsonStub.restore();
    });
  });

  describe("isImageUrlProperty", () => {
    it("should return true for well-known image URL property", () => {
      const schema = {
        type: "string",
      } as any;
      const name = "imageUrl";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.true;
    });

    it("should return true for well-known image URL property with _", () => {
      const schema = {
        type: "string",
      } as any;
      const name = "logo_url";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.true;
    });

    it("should return true for well-known image name with uri format", () => {
      const schema = {
        type: "string",
        format: "uri",
      } as any;
      const name = "icon";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.true;
    });

    it("should return true for well-known image property with URL in name", () => {
      const schema = {
        type: "string",
      } as any;
      const name = "imageURL";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.true;
    });

    it("should return false for non-string property", () => {
      const schema = {
        type: "integer",
      } as any;
      const name = "imageUrl";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.false;
    });

    it("should return false for non-image property", () => {
      const schema = {
        type: "string",
      } as any;
      const name = "text";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.false;
    });

    it("should return false for empty property name", () => {
      const schema = {
        type: "string",
      } as any;
      const name = "";
      const parentArrayName = "items";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.false;
    });

    it("should return false for empty schema", () => {
      const schema = {};
      const name = "imageUrl";
      const parentArrayName = "";

      const result = AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName);

      expect(result).to.be.false;
    });
  });
});
