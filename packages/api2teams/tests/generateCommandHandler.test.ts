import { expect } from 'chai';
import { generateCommandHandler } from '../src/generateCommandHandler';

describe('generateCommandHandler test', () => {
  describe('generateCommandHandler test', () => {
    it('should generate the correct trigger pattern', async () => {
      const api = {
        parameters: [
          { in: 'path', name: 'id' },
          { in: 'query', name: 'sort', required: true },
          { in: 'query', name: 'filter' },
          { in: 'cookie', name: 'session' },
          { in: 'header', name: 'authorization' }
        ]
      };
      const responseCardName = 'TestResponseCard';
      const cardId = 'test';
      const url = '/api/test/{id}';
      const tag = 'test';

      const expectedTriggerPattern =
        '/api/test/(?<id>\\\\w+)(\\\\?(?<queries>(?:&?\\\\w+=(?:\\\\w+))*))?$';

      const result = await generateCommandHandler(
        api,
        responseCardName,
        cardId,
        url,
        tag
      );

      expect(result.code).to.include(expectedTriggerPattern);
    });

    it('should generate the correct class name', async () => {
      const api = { parameters: [] };
      const responseCardName = 'TestResponseCard';
      const cardId = 'test';
      const url = '/api/test';
      const tag = 'test';

      const expectedClassName = 'testCommandHanlder';

      const result = await generateCommandHandler(
        api,
        responseCardName,
        cardId,
        url,
        tag
      );

      expect(result.name).to.equal(expectedClassName);
    });
  });
});
