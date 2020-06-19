"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_expect_1 = require("ts-expect");
var index_1 = require("./index");
describe("flatten", function () {
    it("should flatten an array", function () {
        var result = index_1.flatten([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10]);
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
    it("should work with array-like", function () {
        var result = index_1.flatten("test");
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual(["t", "e", "s", "t"]);
    });
    it("should work with readonly array", function () {
        var input = [1, [2, [3, [4]]]];
        var result = index_1.flatten(input);
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual([1, 2, 3, 4]);
    });
    it("should work with arguments", function () {
        var input = (function () {
            return arguments;
        })();
        var result = index_1.flatten(input);
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual([]);
    });
    it("should work with mixed types", function () {
        var fn = function (x) { return x; };
        var input = [1, ["test", [fn, [true]]]];
        var result = index_1.flatten(input);
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual([1, "test", fn, true]);
    });
    it("should work with tuples", function () {
        var input = [1, [1, 2], [3]];
        var result = index_1.flatten(input);
        ts_expect_1.expectType(result);
        expect(result).toStrictEqual([1, 1, 2, 3]);
    });
});
//# sourceMappingURL=index.spec.js.map