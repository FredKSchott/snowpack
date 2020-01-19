import { expectType } from "ts-expect";
import { flatten } from "./index";
describe("flatten", function () {
    it("should flatten an array", function () {
        var result = flatten([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10]);
        expectType(result);
        expect(result).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
    it("should work with array-like", function () {
        var result = flatten("test");
        expectType(result);
        expect(result).toStrictEqual(["t", "e", "s", "t"]);
    });
    it("should work with readonly array", function () {
        var input = [1, [2, [3, [4]]]];
        var result = flatten(input);
        expectType(result);
        expect(result).toStrictEqual([1, 2, 3, 4]);
    });
    it("should work with arguments", function () {
        var input = (function () {
            return arguments;
        })();
        var result = flatten(input);
        expectType(result);
        expect(result).toStrictEqual([]);
    });
    it("should work with mixed types", function () {
        var fn = function (x) { return x; };
        var input = [1, ["test", [fn, [true]]]];
        var result = flatten(input);
        expectType(result);
        expect(result).toStrictEqual([1, "test", fn, true]);
    });
    it("should work with tuples", function () {
        var input = [1, [1, 2], [3]];
        var result = flatten(input);
        expectType(result);
        expect(result).toStrictEqual([1, 1, 2, 3]);
    });
});
//# sourceMappingURL=index.spec.js.map