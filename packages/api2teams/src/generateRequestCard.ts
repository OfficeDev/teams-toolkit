import { OpenAPIV3 } from 'openapi-types';
import { getCardTitle, getSafeCardName, wrapperCard } from './utils';
import { AdaptiveCardResult } from './interfaces';

export async function generateRequestCard(
  apis: OpenAPIV3.Document
): Promise<AdaptiveCardResult[]> {
  console.log('Generate adaptive cards');
  const result: AdaptiveCardResult[] = [];
  for (const url in apis.paths) {
    for (const operation in apis.paths[url]) {
      if (operation === 'get') {
        console.log(`API: ${operation} ${url}`);
        try {
          const card = parseGetRequest(
            apis.paths[url]![operation]!,
            url,
            operation
          );
          result.push(card);
          console.log(`\tsuccessfully generated request card for this api\n`);
        } catch (error) {
          console.error(
            `\tfailed to generate request card for ${operation} ${url} due to error: ${(
              error as Error
            ).toString()}\n`
          );
          throw error;
        }
      }
    }
  }
  return result;
}

function generateCardFromParams(
  schema: OpenAPIV3.SchemaObject,
  name: string,
  paramIn: string | undefined = undefined
): any {
  if (!schema) {
    return [];
  }

  const prefix = paramIn ? `(${paramIn})` : '';
  const isRequired = !!schema.required;

  if (schema.type === 'boolean') {
    name = name || 'body';

    return [
      {
        type: 'Input.Toggle',
        title: `${prefix}${name}`,
        id: name,
        isRequired
      }
    ];
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    name = name || 'body';

    return [
      {
        type: 'Input.Number',
        placeholder: `${prefix}Input ${name} number`,
        id: name,
        isRequired
      }
    ];
  }
  if (schema.type === 'string') {
    name = name || 'body';

    if (schema.enum) {
      return [
        {
          type: 'Input.ChoiceSet',
          choices: schema.enum.map((v) => ({ title: v, value: v })),
          placeholder: `${prefix}Select a value for ${name}`,
          id: name,
          isRequired
        }
      ];
    }

    return [
      {
        type: 'Input.Text',
        placeholder: `${prefix}Input ${name} value`,
        id: name,
        isRequired
      }
    ];
  }
  if (schema.type === 'object') {
    const { properties } = schema;
    const result = [];
    for (const property in properties) {
      const obj = generateCardFromParams(
        properties[property] as OpenAPIV3.SchemaObject,
        name ? `${name}.${property}` : property
      );
      result.push(...obj);
    }

    return result;
  }
  if (schema.type === 'array') {
    name = name || 'array';
    return [
      {
        type: 'Input.Text',
        placeholder: `${prefix}Input ${name} value, it is a json array`,
        id: name
      }
    ];
  }
  if (schema.allOf) {
    const result = [];
    for (let i = 0; i < schema.allOf.length; i++) {
      result.push(
        ...generateCardFromParams(
          schema.allOf[i] as OpenAPIV3.SchemaObject,
          name
        )
      );
    }
    return result;
  }

  if (schema.oneOf || schema.anyOf || schema.not) {
    throw new Error(
      `oneOf, anyOf, and not schema is not supported: ${JSON.stringify(schema)}`
    );
  }

  throw new Error(`Unknown schema: ${JSON.stringify(schema)}`);
}

function parseGetRequest(
  api: OpenAPIV3.OperationObject,
  url: string,
  operation: string
): AdaptiveCardResult {
  const cardBody = [];

  if (api.parameters) {
    for (const index in api.parameters) {
      const param = api.parameters[index] as OpenAPIV3.ParameterObject;
      const schema = param.schema as OpenAPIV3.SchemaObject;
      const paramResult = generateCardFromParams(schema, param.name, param.in);

      cardBody.unshift(...paramResult);
    }
  }

  const cardTitle = getCardTitle(operation, url, api.summary);
  cardBody.unshift(cardTitle);

  const adaptiveCardName = getSafeCardName(api, url, operation);

  const fullCard = wrapperCard(cardBody, adaptiveCardName, operation);

  return {
    tag: api.tags ? api.tags[0] : 'default',
    id: adaptiveCardName,
    name: adaptiveCardName + 'RequestCard',
    content: fullCard,
    url,
    operation,
    isArray: false,
    api
  };
}
