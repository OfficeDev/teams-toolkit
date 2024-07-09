import { DataSource, Memory, RenderedPromptSection, Tokenizer } from "@microsoft/teams-ai";
import { TurnContext } from "botbuilder";
import * as path from "path";
import * as fs from "fs";

/**
 * A data source that searches through a local directory of files for a given query.
 */
export class MyDataSource implements DataSource {
    /**
     * Name of the data source.
     */
    public readonly name: string;

    /**
     * Local data.
     */
    private _data: string[];

    /**
     * Creates a new instance of the MyDataSource instance.
     */
    public constructor(name: string) {
        this.name = name;
    }

    /**
     * Initializes the data source.
     */
    public init() {
        const filePath = path.join(__dirname, "../data");
        const files = fs.readdirSync(filePath);
        this._data = files.map(file => {
            return fs.readFileSync(path.join(filePath, file), "utf-8");
        });
    }

    /**
     * Renders the data source as a string of text.
     * @remarks
     * The returned output should be a string of text that will be injected into the prompt at render time.
     * @param context Turn context for the current turn of conversation with the user.
     * @param memory An interface for accessing state values.
     * @param tokenizer Tokenizer to use when rendering the data source.
     * @param maxTokens Maximum number of tokens allowed to be rendered.
     * @returns A promise that resolves to the rendered data source.
     */
    public async renderData(context: TurnContext, memory: Memory, tokenizer: Tokenizer, maxTokens: number): Promise<RenderedPromptSection<string>> {
        const query = memory.getValue("temp.input") as string;
        if(!query) {
            return { output: "", length: 0, tooLong: false };
        }
        for (let data of this._data) {
            if (data.includes(query)) {
                return { output: this.formatDocument(data), length: data.length, tooLong: false };
            }
        }
        if (query.toLocaleLowerCase().includes("perksplus")) {
            return { output: this.formatDocument(this._data[0]), length: this._data[0].length, tooLong: false };
        } else if (query.toLocaleLowerCase().includes("company") || query.toLocaleLowerCase().includes("history")) {
            return { output: this.formatDocument(this._data[1]), length: this._data[1].length, tooLong: false };
        } else if (query.toLocaleLowerCase().includes("northwind") || query.toLocaleLowerCase().includes("health")) {
            return { output: this.formatDocument(this._data[2]), length: this._data[2].length, tooLong: false };
        }
        return { output: "", length: 0, tooLong: false };
    }

    /**
     * Formats the result string 
     * @param result 
     * @returns 
     */
    private formatDocument(result: string): string {
        return `<context>${result}</context>`;
    }
}