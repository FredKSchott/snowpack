"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourcemap_stacktrace = void 0;
const path_1 = __importDefault(require("path"));
const source_map_1 = require("source-map");
function get_sourcemap_url(contents) {
    const reversed = contents.split('\n').reverse().join('\n');
    const match = /\/[/*]#[ \t]+sourceMappingURL=([^\s'"]+?)(?:[ \t]+|$)/gm.exec(reversed);
    if (match)
        return match[1];
    return undefined;
}
async function replace_async(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}
// TODO does Snowpack compose sourcemaps, or will this only undo
// the last in a series of transformations?
async function sourcemap_stacktrace(stack, load_contents) {
    const replace = (line) => replace_async(line, /^ {4}at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?)\)?/, async (input, var_name, address, line, column) => {
        if (!address)
            return input;
        const contents = await load_contents(address);
        if (!contents)
            return input;
        const sourcemap_url = get_sourcemap_url(contents);
        if (!sourcemap_url)
            return input;
        let dir = path_1.default.dirname(address);
        let sourcemap_data;
        if (/^data:application\/json[^,]+base64,/.test(sourcemap_url)) {
            const raw_data = sourcemap_url.slice(sourcemap_url.indexOf(',') + 1);
            try {
                sourcemap_data = Buffer.from(raw_data, 'base64').toString();
            }
            catch (_a) {
                return input;
            }
        }
        else {
            const sourcemap_path = path_1.default.resolve(dir, sourcemap_url);
            const data = await load_contents(sourcemap_path);
            if (!data)
                return input;
            sourcemap_data = data;
            dir = path_1.default.dirname(sourcemap_path);
        }
        let raw_sourcemap;
        try {
            raw_sourcemap = JSON.parse(sourcemap_data);
        }
        catch (_b) {
            return input;
        }
        // TODO: according to typings, this code cannot work;
        // the constructor returns a promise that needs to be awaited
        const consumer = await new source_map_1.SourceMapConsumer(raw_sourcemap);
        const pos = consumer.originalPositionFor({
            line: Number(line),
            column: Number(column),
            bias: source_map_1.SourceMapConsumer.LEAST_UPPER_BOUND,
        });
        if (!pos.source)
            return input;
        const source_path = path_1.default.resolve(dir, pos.source);
        const source = `${source_path}:${pos.line || 0}:${pos.column || 0}`;
        if (!var_name)
            return `    at ${source}`;
        return `    at ${var_name} (${source})`;
    });
    return (await Promise.all(stack.split('\n').map(replace))).join('\n');
}
exports.sourcemap_stacktrace = sourcemap_stacktrace;
