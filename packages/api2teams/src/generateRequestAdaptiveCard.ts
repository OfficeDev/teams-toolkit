import { OpenAPIV3 } from 'openapi-types';
import { getSafeAdaptiveCardName } from './utils';
import fs from 'fs-extra';
import path from 'path';

export async function generateRequestAdaptiveCard(
  apis: OpenAPIV3.Document,
  outputFolder: string
) {
  console.log('Generate adaptive cards');
  for (const url in apis.paths) {
    for (const operation in apis.paths[url]) {
      if (operation === 'get') {
        console.log(`API: ${operation} ${url}`);
        try {
          parseGetRequest(
            apis.paths[url]![operation]!,
            url,
            operation,
            outputFolder
          );
          console.log(`\tsuccessfully generated request card for this api\n`);
        } catch (error) {
          console.error(
            `\tfailed to generate code due to error: ${(
              error as Error
            ).toString()}\n`
          );
          throw error;
        }
      }
    }
  }
}

function generateRequestAdaptiveCardFromParameters(
  schema: OpenAPIV3.SchemaObject,
  name: string,
  paramIn: string | undefined
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
      const obj = generateRequestAdaptiveCardFromParameters(
        properties[property] as OpenAPIV3.SchemaObject,
        name ? `${name}.${property}` : property,
        undefined
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
        ...generateRequestAdaptiveCardFromParameters(
          schema.allOf[i] as OpenAPIV3.SchemaObject,
          name,
          undefined
        )
      );
    }
    return result;
  }

  if (schema.oneOf || schema.anyOf) {
    throw new Error(
      `oneOf or anyOf schema is not supported: ${JSON.stringify(schema)}`
    );
  }

  throw new Error(`Unknown schema: ${JSON.stringify(schema)}`);
}

function generateFullAdaptiveCard(
  body: any,
  adaptiveCardName: string,
  operation: string
): string {
  const fullCard = {
    type: 'AdaptiveCard',
    body,
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5'
  } as any;
  if (adaptiveCardName && operation) {
    fullCard.actions = [
      {
        type: 'Action.Execute',
        verb: adaptiveCardName,
        title: `${operation.toUpperCase()}`
      }
    ];
  }

  return fullCard;
}

function parseGetRequest(
  api: OpenAPIV3.OperationObject,
  url: string,
  operation: string,
  outputFolder: string
) {
  const cardBody = [];

  if (api.parameters) {
    for (const index in api.parameters) {
      const param = api.parameters[index] as OpenAPIV3.ParameterObject;
      const schema = param.schema as OpenAPIV3.SchemaObject;
      const paramResult = generateRequestAdaptiveCardFromParameters(
        schema,
        param.name,
        param.in
      );

      cardBody.unshift(...paramResult);
    }
  }

  const requestCommand = `${operation.toUpperCase()} ${url}`;

  const titleTextBlock = {
    type: 'TextBlock',
    text: `${requestCommand}: ${api.summary ?? ''}`,
    wrap: true
  };

  const adaptiveCardName = getSafeAdaptiveCardName(api, url, operation);

  cardBody.unshift(titleTextBlock);

  const fullCard = generateFullAdaptiveCard(
    cardBody,
    adaptiveCardName,
    operation
  );

  const cardName = `${adaptiveCardName}RequestCard.json`;
  fs.outputJSONSync(path.join(outputFolder, cardName), fullCard, { spaces: 2 });
}
