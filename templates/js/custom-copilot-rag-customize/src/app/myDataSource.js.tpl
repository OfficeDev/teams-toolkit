const path = require("path");
const fs = require("fs");

/**
 * A data source that searches through a local directory of files for a given query.
 */
class MyDataSource {
    /**
     * Creates a new instance of the MyDataSource instance.
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Initializes the data source.
     */
    init() {
        const filePath = path.join(__dirname, "../data");
        const files = fs.readdirSync(filePath);
        this._data = files.map(file => {
            return fs.readFileSync(path.join(filePath, file), "utf-8");
        });
    }

    /**
     * Renders the data source as a string of text.
     */
    async renderData(context, memory, tokenizer, maxTokens) {
        const query = memory.getValue("temp.input");
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
     */
    formatDocument(result) {
        return `<context>${result}</context>`;
    }
}

module.exports = {
  MyDataSource,
};