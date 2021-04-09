// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license
export interface FactoryFunc<TResult> { (): TResult; }

// Do not support parallel execution
export class Lazy<T> {
    private readonly factoryFunc: FactoryFunc<Promise<T>>;
    factoryOutput: T | undefined;

    constructor(factoryFunc: FactoryFunc<Promise<T>>) {
        this.factoryFunc = factoryFunc;
    }

    async getValue(): Promise<T> {
        if (typeof this.factoryOutput === "undefined") {
            this.factoryOutput = await this.factoryFunc();
        }
        return this.factoryOutput;
    }
}