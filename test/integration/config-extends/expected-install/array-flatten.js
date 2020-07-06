/**
 * Flatten an array indefinitely.
 */
function flatten(array) {
    var result = [];
    $flatten(array, result);
    return result;
}
/**
 * Internal flatten function recursively passes `result`.
 */
function $flatten(array, result) {
    for (var i = 0; i < array.length; i++) {
        var value = array[i];
        if (Array.isArray(value)) {
            $flatten(value, result);
        }
        else {
            result.push(value);
        }
    }
}

export { flatten };
//# sourceMappingURL=array-flatten.js.map
