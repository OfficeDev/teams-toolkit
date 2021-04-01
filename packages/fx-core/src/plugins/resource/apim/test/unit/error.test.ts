// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import 'mocha';
import * as chai from 'chai';
import { AadOperationError, AssertNotEmpty, BuildError, EmptyChoice, UnhandledError } from '../../src/error';

describe('Error', () => {
    describe('#AssertNotEmpty()', () => {
        it('Undefined string', () => {
            const testStr = undefined;
            chai.expect(() => AssertNotEmpty('testStr', testStr)).to.throw("Property 'testStr' is empty.");
        });

        it('null string', () => {
            const testStr = null;
            chai.expect(() => AssertNotEmpty('testStr', testStr)).to.throw("Property 'testStr' is empty.");
        });

        it('empty string', () => {
            const testStr: string = '';
            chai.expect(() => AssertNotEmpty('testStr', testStr)).to.throw("Property 'testStr' is empty.");
        });

        it('not empty string', () => {
            const testStr: string = 'test';
            chai.expect(AssertNotEmpty('testStr', testStr)).to.equal('test');
        });
    });
    describe('#BuildError()', () => {
        it('EmptyChoice', () => {
            const error = BuildError(EmptyChoice, 'test question');
            chai.assert.equal(error.message, `No option in question 'test question' is selected, please choose one.`);
        });

        it('UnhandledError(error)', () => {
            const error = BuildError(UnhandledError, new Error('inner error'));
            chai.assert.equal(error.message, `Unhandled error. inner error`);
        });

        it('UnhandledError()', () => {
            const error = BuildError(UnhandledError);
            chai.assert.equal(error.message, `Unhandled error.`);
        });

        it('AadOperationError(error)', () => {
            const error = BuildError(AadOperationError, new Error('inner error'), 'test-operation', 'test-resource');
            chai.assert.equal(error.message, `Failed to test-operation test-resource. inner error`);
        });
    });
});
