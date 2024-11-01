import { JsonDataGenerator } from "../src/jsonDataGenerator";
import { OpenAPIV3 } from "openapi-types";
import "mocha";
import { expect } from "chai";

describe("JsonDataGenerator", () => {
  it("should generate a string example", () => {
    const schema: OpenAPIV3.SchemaObject = { type: "string", example: "test string" };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("test string");
  });

  it("should generate a number example", () => {
    const schema: OpenAPIV3.SchemaObject = { type: "number", example: 42.5 };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(42.5);
  });

  it("should generate a boolean example", () => {
    const schema: OpenAPIV3.SchemaObject = { type: "boolean", example: false };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(false);
  });

  it("should generate a boolean without example", () => {
    const schema: OpenAPIV3.SchemaObject = { type: "boolean" };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(true);
  });

  it("should generate an array example", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "array",
      items: { type: "integer", example: 10 },
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal([10]);
  });

  it("should generate an object example", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string", example: "John Doe" },
        age: { type: "integer", example: 30 },
      },
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({ name: "John Doe", age: 30 });
  });

  it("should generate an object without properties", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({});
  });

  it("should handle anyOf by selecting one schema", () => {
    const schema: OpenAPIV3.SchemaObject = {
      anyOf: [
        { type: "string", example: "Any string" },
        { type: "number", example: 100 },
      ],
    };
    const result = JsonDataGenerator.generate(schema);
    expect(["Any string", 100]).contain(result);
  });

  it("should handle oneOf by selecting one schema", () => {
    const schema: OpenAPIV3.SchemaObject = {
      oneOf: [
        { type: "boolean", example: true },
        { type: "string", example: "111" },
      ],
    };
    const result = JsonDataGenerator.generate(schema);
    expect([true, "111"]).contain(result);
  });

  it("should merge data correctly when data is an object and not null", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        key1: { type: "string", example: "value1" },
        key2: { type: "number", example: 123 },
      },
    };

    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({
      key1: "value1",
      key2: 123,
    });
  });

  it("should handle allOf by merging schemas", () => {
    const schema: OpenAPIV3.SchemaObject = {
      allOf: [
        {
          type: "object",
          properties: {
            firstName: { type: "string", example: "Jane" },
          },
        },
        {
          type: "object",
          properties: {
            lastName: { type: "string", example: "Doe" },
          },
        },
      ],
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({ firstName: "Jane", lastName: "Doe" });
  });

  it("should prevent circular references", () => {
    const circularSchema: OpenAPIV3.SchemaObject = { type: "object" };
    circularSchema.properties = {
      self: circularSchema,
    };
    const result = JsonDataGenerator.generate(circularSchema);
    expect(result).deep.equal({ self: null });
  });

  it("should return null for invalid schema", () => {
    const schema = { id: "string" };
    const result = JsonDataGenerator.generate(schema as any);
    expect(result).to.be.null;
  });

  it("should handle missing example by providing default value", () => {
    const schema: OpenAPIV3.SchemaObject = { type: "string" };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("example string");
  });

  it("should handle nested schemas", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            profile: {
              type: "object",
              properties: {
                email: { type: "string", example: "user@example.com" },
              },
            },
          },
        },
      },
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({
      user: {
        id: 1,
        profile: { email: "user@example.com" },
      },
    });
  });

  it("should handle string format date-time", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "date-time",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(new Date(result).toISOString()).to.equal(result);
  });

  it("should handle string format email", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "email",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("example@example.com");
  });

  it("should handle string format uuid", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "uuid",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("123e4567-e89b-12d3-a456-426614174000");
  });

  it("should handle string format ipv4", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "ipv4",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("192.168.0.1");
  });

  it("should handle string format ipv6", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "ipv6",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
  });

  it("should handle string with unknown format by using default", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "string",
      format: "unknown-format",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal("example string");
  });

  it("should handle number format float", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "number",
      format: "float",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(3.14);
  });

  it("should handle without format", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "number",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123);
  });

  it("should handle number format double", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "number",
      format: "double",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(3.14159);
  });

  it("should handle number with unknown format by using default", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "number",
      format: "unknown-format",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123);
  });

  it("should handle integer format int32", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "integer",
      format: "int32",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123456);
  });

  it("should handle integer without format", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "integer",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123);
  });

  it("should handle integer format int64", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "integer",
      format: "int64",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123456789);
  });

  it("should handle integer with unknown format by using default", () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: "integer",
      format: "unknown-format",
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).to.equal(123);
  });

  it("should handle real case: pet store", () => {
    const schema: OpenAPIV3.SchemaObject = {
      required: ["name", "photoUrls"],
      type: "object",
      properties: {
        id: {
          type: "integer",
          format: "int64",
          example: 10,
        },
        name: {
          type: "string",
          example: "doggie",
        },
        category: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              format: "int64",
              example: 1,
            },
            name: {
              type: "string",
              example: "Dogs",
            },
          },
          xml: {
            name: "category",
          },
        },
        photoUrls: {
          type: "array",
          xml: {
            wrapped: true,
          },
          items: {
            type: "string",
            example: "string",
            xml: {
              name: "photoUrl",
            },
          },
        },
        tags: {
          type: "array",
          xml: {
            wrapped: true,
          },
          items: {
            type: "object",
            properties: {
              id: {
                type: "integer",
                format: "int64",
                example: 0,
              },
              name: {
                type: "string",
                example: "string",
              },
            },
            xml: {
              name: "tag",
            },
          },
        },
        status: {
          type: "string",
          description: "pet status in the store",
          example: "available",
          enum: ["available", "pending", "sold"],
        },
      },
    };
    const result = JsonDataGenerator.generate(schema);
    expect(result).deep.equal({
      id: 10,
      name: "doggie",
      category: {
        id: 1,
        name: "Dogs",
      },
      photoUrls: ["string"],
      tags: [
        {
          id: 0,
          name: "string",
        },
      ],
      status: "available",
    });
  });
});
