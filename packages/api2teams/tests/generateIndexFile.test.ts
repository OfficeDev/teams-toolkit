import { expect } from 'chai';
import { generateIndexFile } from '../src/generateIndexFile';
import { AdaptiveCardResult } from '../src/interfaces';

describe('generateIndexFile', () => {
    it('should generate an index file with the correct code', async () => {
        const cards: AdaptiveCardResult[] = [
            {
                id: 'card1',
                name: 'Card 1',
                url: 'https://example.com/card1',
                operation: 'get',
                isArray: false,
                content: {},
                tag: 'card',
                api: {}
            },
            {
                id: 'card2',
                name: 'Card 2',
                url: 'https://example.com/card2',
                operation: 'post',
                isArray: true,
                content: {},
                tag: 'card',
                api: {}
            }
        ];

        const expectedCode1 = `import { Card1CommandHandler } from './commands/card1CommandHandler';
import { Card1ActionHandler } from './cardActions/card1ActionHandler';
import { Card2CommandHandler } from './commands/card2CommandHandler';
import { Card2ActionHandler } from './cardActions/card2ActionHandler';`;

        const expectedCode2 = `commands: [new Card1CommandHandler(), new Card2CommandHandler()]`;
        const expectedCode3 = `actions: [new Card1ActionHandler(), new Card2ActionHandler()]`;


        const result = await generateIndexFile(cards);

        expect(result.name).to.equal('index.ts');
        expect(result.code).to.contain(expectedCode1);
        expect(result.code).to.contain(expectedCode2);
        expect(result.code).to.contain(expectedCode3);
    });
});
