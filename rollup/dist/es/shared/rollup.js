/*
  @license
	Rollup.js v2.34.2
	Sun, 06 Dec 2020 05:40:46 GMT - commit 92a2dfa8f18350373aa2329dec45e56bd076909d


	https://github.com/rollup/rollup

	Released under the MIT License.
*/
import { relative as relative$1, extname, basename, dirname, resolve } from 'path';
import { createHash as createHash$1 } from 'crypto';
import { writeFile as writeFile$1, readdirSync, mkdirSync, readFile as readFile$1, lstatSync, realpathSync } from 'fs';
import { EventEmitter } from 'events';

var version = "2.34.2";

var charToInteger = {};
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
for (var i = 0; i < chars.length; i++) {
    charToInteger[chars.charCodeAt(i)] = i;
}
function decode(mappings) {
    var decoded = [];
    var line = [];
    var segment = [
        0,
        0,
        0,
        0,
        0,
    ];
    var j = 0;
    for (var i = 0, shift = 0, value = 0; i < mappings.length; i++) {
        var c = mappings.charCodeAt(i);
        if (c === 44) { // ","
            segmentify(line, segment, j);
            j = 0;
        }
        else if (c === 59) { // ";"
            segmentify(line, segment, j);
            j = 0;
            decoded.push(line);
            line = [];
            segment[0] = 0;
        }
        else {
            var integer = charToInteger[c];
            if (integer === undefined) {
                throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
            }
            var hasContinuationBit = integer & 32;
            integer &= 31;
            value += integer << shift;
            if (hasContinuationBit) {
                shift += 5;
            }
            else {
                var shouldNegate = value & 1;
                value >>>= 1;
                if (shouldNegate) {
                    value = value === 0 ? -0x80000000 : -value;
                }
                segment[j] += value;
                j++;
                value = shift = 0; // reset
            }
        }
    }
    segmentify(line, segment, j);
    decoded.push(line);
    return decoded;
}
function segmentify(line, segment, j) {
    // This looks ugly, but we're creating specialized arrays with a specific
    // length. This is much faster than creating a new array (which v8 expands to
    // a capacity of 17 after pushing the first item), or slicing out a subarray
    // (which is slow). Length 4 is assumed to be the most frequent, followed by
    // length 5 (since not everything will have an associated name), followed by
    // length 1 (it's probably rare for a source substring to not have an
    // associated segment data).
    if (j === 4)
        line.push([segment[0], segment[1], segment[2], segment[3]]);
    else if (j === 5)
        line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
    else if (j === 1)
        line.push([segment[0]]);
}
function encode(decoded) {
    var sourceFileIndex = 0; // second field
    var sourceCodeLine = 0; // third field
    var sourceCodeColumn = 0; // fourth field
    var nameIndex = 0; // fifth field
    var mappings = '';
    for (var i = 0; i < decoded.length; i++) {
        var line = decoded[i];
        if (i > 0)
            mappings += ';';
        if (line.length === 0)
            continue;
        var generatedCodeColumn = 0; // first field
        var lineMappings = [];
        for (var _i = 0, line_1 = line; _i < line_1.length; _i++) {
            var segment = line_1[_i];
            var segmentMappings = encodeInteger(segment[0] - generatedCodeColumn);
            generatedCodeColumn = segment[0];
            if (segment.length > 1) {
                segmentMappings +=
                    encodeInteger(segment[1] - sourceFileIndex) +
                        encodeInteger(segment[2] - sourceCodeLine) +
                        encodeInteger(segment[3] - sourceCodeColumn);
                sourceFileIndex = segment[1];
                sourceCodeLine = segment[2];
                sourceCodeColumn = segment[3];
            }
            if (segment.length === 5) {
                segmentMappings += encodeInteger(segment[4] - nameIndex);
                nameIndex = segment[4];
            }
            lineMappings.push(segmentMappings);
        }
        mappings += lineMappings.join(',');
    }
    return mappings;
}
function encodeInteger(num) {
    var result = '';
    num = num < 0 ? (-num << 1) | 1 : num << 1;
    do {
        var clamped = num & 31;
        num >>>= 5;
        if (num > 0) {
            clamped |= 32;
        }
        result += chars[clamped];
    } while (num > 0);
    return result;
}

var BitSet = function BitSet(arg) {
	this.bits = arg instanceof BitSet ? arg.bits.slice() : [];
};

BitSet.prototype.add = function add (n) {
	this.bits[n >> 5] |= 1 << (n & 31);
};

BitSet.prototype.has = function has (n) {
	return !!(this.bits[n >> 5] & (1 << (n & 31)));
};

var Chunk = function Chunk(start, end, content) {
	this.start = start;
	this.end = end;
	this.original = content;

	this.intro = '';
	this.outro = '';

	this.content = content;
	this.storeName = false;
	this.edited = false;

	// we make these non-enumerable, for sanity while debugging
	Object.defineProperties(this, {
		previous: { writable: true, value: null },
		next:     { writable: true, value: null }
	});
};

Chunk.prototype.appendLeft = function appendLeft (content) {
	this.outro += content;
};

Chunk.prototype.appendRight = function appendRight (content) {
	this.intro = this.intro + content;
};

Chunk.prototype.clone = function clone () {
	var chunk = new Chunk(this.start, this.end, this.original);

	chunk.intro = this.intro;
	chunk.outro = this.outro;
	chunk.content = this.content;
	chunk.storeName = this.storeName;
	chunk.edited = this.edited;

	return chunk;
};

Chunk.prototype.contains = function contains (index) {
	return this.start < index && index < this.end;
};

Chunk.prototype.eachNext = function eachNext (fn) {
	var chunk = this;
	while (chunk) {
		fn(chunk);
		chunk = chunk.next;
	}
};

Chunk.prototype.eachPrevious = function eachPrevious (fn) {
	var chunk = this;
	while (chunk) {
		fn(chunk);
		chunk = chunk.previous;
	}
};

Chunk.prototype.edit = function edit (content, storeName, contentOnly) {
	this.content = content;
	if (!contentOnly) {
		this.intro = '';
		this.outro = '';
	}
	this.storeName = storeName;

	this.edited = true;

	return this;
};

Chunk.prototype.prependLeft = function prependLeft (content) {
	this.outro = content + this.outro;
};

Chunk.prototype.prependRight = function prependRight (content) {
	this.intro = content + this.intro;
};

Chunk.prototype.split = function split (index) {
	var sliceIndex = index - this.start;

	var originalBefore = this.original.slice(0, sliceIndex);
	var originalAfter = this.original.slice(sliceIndex);

	this.original = originalBefore;

	var newChunk = new Chunk(index, this.end, originalAfter);
	newChunk.outro = this.outro;
	this.outro = '';

	this.end = index;

	if (this.edited) {
		// TODO is this block necessary?...
		newChunk.edit('', false);
		this.content = '';
	} else {
		this.content = originalBefore;
	}

	newChunk.next = this.next;
	if (newChunk.next) { newChunk.next.previous = newChunk; }
	newChunk.previous = this;
	this.next = newChunk;

	return newChunk;
};

Chunk.prototype.toString = function toString () {
	return this.intro + this.content + this.outro;
};

Chunk.prototype.trimEnd = function trimEnd (rx) {
	this.outro = this.outro.replace(rx, '');
	if (this.outro.length) { return true; }

	var trimmed = this.content.replace(rx, '');

	if (trimmed.length) {
		if (trimmed !== this.content) {
			this.split(this.start + trimmed.length).edit('', undefined, true);
		}
		return true;

	} else {
		this.edit('', undefined, true);

		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) { return true; }
	}
};

Chunk.prototype.trimStart = function trimStart (rx) {
	this.intro = this.intro.replace(rx, '');
	if (this.intro.length) { return true; }

	var trimmed = this.content.replace(rx, '');

	if (trimmed.length) {
		if (trimmed !== this.content) {
			this.split(this.end - trimmed.length);
			this.edit('', undefined, true);
		}
		return true;

	} else {
		this.edit('', undefined, true);

		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) { return true; }
	}
};

var btoa = function () {
	throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
};
if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
	btoa = function (str) { return window.btoa(unescape(encodeURIComponent(str))); };
} else if (typeof Buffer === 'function') {
	btoa = function (str) { return Buffer.from(str, 'utf-8').toString('base64'); };
}

var SourceMap = function SourceMap(properties) {
	this.version = 3;
	this.file = properties.file;
	this.sources = properties.sources;
	this.sourcesContent = properties.sourcesContent;
	this.names = properties.names;
	this.mappings = encode(properties.mappings);
};

SourceMap.prototype.toString = function toString () {
	return JSON.stringify(this);
};

SourceMap.prototype.toUrl = function toUrl () {
	return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
};

function guessIndent(code) {
	var lines = code.split('\n');

	var tabbed = lines.filter(function (line) { return /^\t+/.test(line); });
	var spaced = lines.filter(function (line) { return /^ {2,}/.test(line); });

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	var min = spaced.reduce(function (previous, current) {
		var numSpaces = /^ +/.exec(current)[0].length;
		return Math.min(numSpaces, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

function getRelativePath(from, to) {
	var fromParts = from.split(/[/\\]/);
	var toParts = to.split(/[/\\]/);

	fromParts.pop(); // get dirname

	while (fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	if (fromParts.length) {
		var i = fromParts.length;
		while (i--) { fromParts[i] = '..'; }
	}

	return fromParts.concat(toParts).join('/');
}

var toString = Object.prototype.toString;

function isObject(thing) {
	return toString.call(thing) === '[object Object]';
}

function getLocator(source) {
	var originalLines = source.split('\n');
	var lineOffsets = [];

	for (var i = 0, pos = 0; i < originalLines.length; i++) {
		lineOffsets.push(pos);
		pos += originalLines[i].length + 1;
	}

	return function locate(index) {
		var i = 0;
		var j = lineOffsets.length;
		while (i < j) {
			var m = (i + j) >> 1;
			if (index < lineOffsets[m]) {
				j = m;
			} else {
				i = m + 1;
			}
		}
		var line = i - 1;
		var column = index - lineOffsets[line];
		return { line: line, column: column };
	};
}

var Mappings = function Mappings(hires) {
	this.hires = hires;
	this.generatedCodeLine = 0;
	this.generatedCodeColumn = 0;
	this.raw = [];
	this.rawSegments = this.raw[this.generatedCodeLine] = [];
	this.pending = null;
};

Mappings.prototype.addEdit = function addEdit (sourceIndex, content, loc, nameIndex) {
	if (content.length) {
		var segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
		if (nameIndex >= 0) {
			segment.push(nameIndex);
		}
		this.rawSegments.push(segment);
	} else if (this.pending) {
		this.rawSegments.push(this.pending);
	}

	this.advance(content);
	this.pending = null;
};

Mappings.prototype.addUneditedChunk = function addUneditedChunk (sourceIndex, chunk, original, loc, sourcemapLocations) {
	var originalCharIndex = chunk.start;
	var first = true;

	while (originalCharIndex < chunk.end) {
		if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
			this.rawSegments.push([this.generatedCodeColumn, sourceIndex, loc.line, loc.column]);
		}

		if (original[originalCharIndex] === '\n') {
			loc.line += 1;
			loc.column = 0;
			this.generatedCodeLine += 1;
			this.raw[this.generatedCodeLine] = this.rawSegments = [];
			this.generatedCodeColumn = 0;
			first = true;
		} else {
			loc.column += 1;
			this.generatedCodeColumn += 1;
			first = false;
		}

		originalCharIndex += 1;
	}

	this.pending = null;
};

Mappings.prototype.advance = function advance (str) {
	if (!str) { return; }

	var lines = str.split('\n');

	if (lines.length > 1) {
		for (var i = 0; i < lines.length - 1; i++) {
			this.generatedCodeLine++;
			this.raw[this.generatedCodeLine] = this.rawSegments = [];
		}
		this.generatedCodeColumn = 0;
	}

	this.generatedCodeColumn += lines[lines.length - 1].length;
};

var n = '\n';

var warned = {
	insertLeft: false,
	insertRight: false,
	storeName: false
};

var MagicString = function MagicString(string, options) {
	if ( options === void 0 ) options = {};

	var chunk = new Chunk(0, string.length, string);

	Object.defineProperties(this, {
		original:              { writable: true, value: string },
		outro:                 { writable: true, value: '' },
		intro:                 { writable: true, value: '' },
		firstChunk:            { writable: true, value: chunk },
		lastChunk:             { writable: true, value: chunk },
		lastSearchedChunk:     { writable: true, value: chunk },
		byStart:               { writable: true, value: {} },
		byEnd:                 { writable: true, value: {} },
		filename:              { writable: true, value: options.filename },
		indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
		sourcemapLocations:    { writable: true, value: new BitSet() },
		storedNames:           { writable: true, value: {} },
		indentStr:             { writable: true, value: guessIndent(string) }
	});

	this.byStart[0] = chunk;
	this.byEnd[string.length] = chunk;
};

MagicString.prototype.addSourcemapLocation = function addSourcemapLocation (char) {
	this.sourcemapLocations.add(char);
};

MagicString.prototype.append = function append (content) {
	if (typeof content !== 'string') { throw new TypeError('outro content must be a string'); }

	this.outro += content;
	return this;
};

MagicString.prototype.appendLeft = function appendLeft (index, content) {
	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

	this._split(index);

	var chunk = this.byEnd[index];

	if (chunk) {
		chunk.appendLeft(content);
	} else {
		this.intro += content;
	}
	return this;
};

MagicString.prototype.appendRight = function appendRight (index, content) {
	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

	this._split(index);

	var chunk = this.byStart[index];

	if (chunk) {
		chunk.appendRight(content);
	} else {
		this.outro += content;
	}
	return this;
};

MagicString.prototype.clone = function clone () {
	var cloned = new MagicString(this.original, { filename: this.filename });

	var originalChunk = this.firstChunk;
	var clonedChunk = (cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone());

	while (originalChunk) {
		cloned.byStart[clonedChunk.start] = clonedChunk;
		cloned.byEnd[clonedChunk.end] = clonedChunk;

		var nextOriginalChunk = originalChunk.next;
		var nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

		if (nextClonedChunk) {
			clonedChunk.next = nextClonedChunk;
			nextClonedChunk.previous = clonedChunk;

			clonedChunk = nextClonedChunk;
		}

		originalChunk = nextOriginalChunk;
	}

	cloned.lastChunk = clonedChunk;

	if (this.indentExclusionRanges) {
		cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
	}

	cloned.sourcemapLocations = new BitSet(this.sourcemapLocations);

	cloned.intro = this.intro;
	cloned.outro = this.outro;

	return cloned;
};

MagicString.prototype.generateDecodedMap = function generateDecodedMap (options) {
		var this$1 = this;

	options = options || {};

	var sourceIndex = 0;
	var names = Object.keys(this.storedNames);
	var mappings = new Mappings(options.hires);

	var locate = getLocator(this.original);

	if (this.intro) {
		mappings.advance(this.intro);
	}

	this.firstChunk.eachNext(function (chunk) {
		var loc = locate(chunk.start);

		if (chunk.intro.length) { mappings.advance(chunk.intro); }

		if (chunk.edited) {
			mappings.addEdit(
				sourceIndex,
				chunk.content,
				loc,
				chunk.storeName ? names.indexOf(chunk.original) : -1
			);
		} else {
			mappings.addUneditedChunk(sourceIndex, chunk, this$1.original, loc, this$1.sourcemapLocations);
		}

		if (chunk.outro.length) { mappings.advance(chunk.outro); }
	});

	return {
		file: options.file ? options.file.split(/[/\\]/).pop() : null,
		sources: [options.source ? getRelativePath(options.file || '', options.source) : null],
		sourcesContent: options.includeContent ? [this.original] : [null],
		names: names,
		mappings: mappings.raw
	};
};

MagicString.prototype.generateMap = function generateMap (options) {
	return new SourceMap(this.generateDecodedMap(options));
};

MagicString.prototype.getIndentString = function getIndentString () {
	return this.indentStr === null ? '\t' : this.indentStr;
};

MagicString.prototype.indent = function indent (indentStr, options) {
	var pattern = /^[^\r\n]/gm;

	if (isObject(indentStr)) {
		options = indentStr;
		indentStr = undefined;
	}

	indentStr = indentStr !== undefined ? indentStr : this.indentStr || '\t';

	if (indentStr === '') { return this; } // noop

	options = options || {};

	// Process exclusion ranges
	var isExcluded = {};

	if (options.exclude) {
		var exclusions =
			typeof options.exclude[0] === 'number' ? [options.exclude] : options.exclude;
		exclusions.forEach(function (exclusion) {
			for (var i = exclusion[0]; i < exclusion[1]; i += 1) {
				isExcluded[i] = true;
			}
		});
	}

	var shouldIndentNextCharacter = options.indentStart !== false;
	var replacer = function (match) {
		if (shouldIndentNextCharacter) { return ("" + indentStr + match); }
		shouldIndentNextCharacter = true;
		return match;
	};

	this.intro = this.intro.replace(pattern, replacer);

	var charIndex = 0;
	var chunk = this.firstChunk;

	while (chunk) {
		var end = chunk.end;

		if (chunk.edited) {
			if (!isExcluded[charIndex]) {
				chunk.content = chunk.content.replace(pattern, replacer);

				if (chunk.content.length) {
					shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === '\n';
				}
			}
		} else {
			charIndex = chunk.start;

			while (charIndex < end) {
				if (!isExcluded[charIndex]) {
					var char = this.original[charIndex];

					if (char === '\n') {
						shouldIndentNextCharacter = true;
					} else if (char !== '\r' && shouldIndentNextCharacter) {
						shouldIndentNextCharacter = false;

						if (charIndex === chunk.start) {
							chunk.prependRight(indentStr);
						} else {
							this._splitChunk(chunk, charIndex);
							chunk = chunk.next;
							chunk.prependRight(indentStr);
						}
					}
				}

				charIndex += 1;
			}
		}

		charIndex = chunk.end;
		chunk = chunk.next;
	}

	this.outro = this.outro.replace(pattern, replacer);

	return this;
};

MagicString.prototype.insert = function insert () {
	throw new Error('magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)');
};

MagicString.prototype.insertLeft = function insertLeft (index, content) {
	if (!warned.insertLeft) {
		console.warn('magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead'); // eslint-disable-line no-console
		warned.insertLeft = true;
	}

	return this.appendLeft(index, content);
};

MagicString.prototype.insertRight = function insertRight (index, content) {
	if (!warned.insertRight) {
		console.warn('magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead'); // eslint-disable-line no-console
		warned.insertRight = true;
	}

	return this.prependRight(index, content);
};

MagicString.prototype.move = function move (start, end, index) {
	if (index >= start && index <= end) { throw new Error('Cannot move a selection inside itself'); }

	this._split(start);
	this._split(end);
	this._split(index);

	var first = this.byStart[start];
	var last = this.byEnd[end];

	var oldLeft = first.previous;
	var oldRight = last.next;

	var newRight = this.byStart[index];
	if (!newRight && last === this.lastChunk) { return this; }
	var newLeft = newRight ? newRight.previous : this.lastChunk;

	if (oldLeft) { oldLeft.next = oldRight; }
	if (oldRight) { oldRight.previous = oldLeft; }

	if (newLeft) { newLeft.next = first; }
	if (newRight) { newRight.previous = last; }

	if (!first.previous) { this.firstChunk = last.next; }
	if (!last.next) {
		this.lastChunk = first.previous;
		this.lastChunk.next = null;
	}

	first.previous = newLeft;
	last.next = newRight || null;

	if (!newLeft) { this.firstChunk = first; }
	if (!newRight) { this.lastChunk = last; }
	return this;
};

MagicString.prototype.overwrite = function overwrite (start, end, content, options) {
	if (typeof content !== 'string') { throw new TypeError('replacement content must be a string'); }

	while (start < 0) { start += this.original.length; }
	while (end < 0) { end += this.original.length; }

	if (end > this.original.length) { throw new Error('end is out of bounds'); }
	if (start === end)
		{ throw new Error('Cannot overwrite a zero-length range – use appendLeft or prependRight instead'); }

	this._split(start);
	this._split(end);

	if (options === true) {
		if (!warned.storeName) {
			console.warn('The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string'); // eslint-disable-line no-console
			warned.storeName = true;
		}

		options = { storeName: true };
	}
	var storeName = options !== undefined ? options.storeName : false;
	var contentOnly = options !== undefined ? options.contentOnly : false;

	if (storeName) {
		var original = this.original.slice(start, end);
		this.storedNames[original] = true;
	}

	var first = this.byStart[start];
	var last = this.byEnd[end];

	if (first) {
		if (end > first.end && first.next !== this.byStart[first.end]) {
			throw new Error('Cannot overwrite across a split point');
		}

		first.edit(content, storeName, contentOnly);

		if (first !== last) {
			var chunk = first.next;
			while (chunk !== last) {
				chunk.edit('', false);
				chunk = chunk.next;
			}

			chunk.edit('', false);
		}
	} else {
		// must be inserting at the end
		var newChunk = new Chunk(start, end, '').edit(content, storeName);

		// TODO last chunk in the array may not be the last chunk, if it's moved...
		last.next = newChunk;
		newChunk.previous = last;
	}
	return this;
};

MagicString.prototype.prepend = function prepend (content) {
	if (typeof content !== 'string') { throw new TypeError('outro content must be a string'); }

	this.intro = content + this.intro;
	return this;
};

MagicString.prototype.prependLeft = function prependLeft (index, content) {
	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

	this._split(index);

	var chunk = this.byEnd[index];

	if (chunk) {
		chunk.prependLeft(content);
	} else {
		this.intro = content + this.intro;
	}
	return this;
};

MagicString.prototype.prependRight = function prependRight (index, content) {
	if (typeof content !== 'string') { throw new TypeError('inserted content must be a string'); }

	this._split(index);

	var chunk = this.byStart[index];

	if (chunk) {
		chunk.prependRight(content);
	} else {
		this.outro = content + this.outro;
	}
	return this;
};

MagicString.prototype.remove = function remove (start, end) {
	while (start < 0) { start += this.original.length; }
	while (end < 0) { end += this.original.length; }

	if (start === end) { return this; }

	if (start < 0 || end > this.original.length) { throw new Error('Character is out of bounds'); }
	if (start > end) { throw new Error('end must be greater than start'); }

	this._split(start);
	this._split(end);

	var chunk = this.byStart[start];

	while (chunk) {
		chunk.intro = '';
		chunk.outro = '';
		chunk.edit('');

		chunk = end > chunk.end ? this.byStart[chunk.end] : null;
	}
	return this;
};

MagicString.prototype.lastChar = function lastChar () {
	if (this.outro.length)
		{ return this.outro[this.outro.length - 1]; }
	var chunk = this.lastChunk;
	do {
		if (chunk.outro.length)
			{ return chunk.outro[chunk.outro.length - 1]; }
		if (chunk.content.length)
			{ return chunk.content[chunk.content.length - 1]; }
		if (chunk.intro.length)
			{ return chunk.intro[chunk.intro.length - 1]; }
	} while (chunk = chunk.previous);
	if (this.intro.length)
		{ return this.intro[this.intro.length - 1]; }
	return '';
};

MagicString.prototype.lastLine = function lastLine () {
	var lineIndex = this.outro.lastIndexOf(n);
	if (lineIndex !== -1)
		{ return this.outro.substr(lineIndex + 1); }
	var lineStr = this.outro;
	var chunk = this.lastChunk;
	do {
		if (chunk.outro.length > 0) {
			lineIndex = chunk.outro.lastIndexOf(n);
			if (lineIndex !== -1)
				{ return chunk.outro.substr(lineIndex + 1) + lineStr; }
			lineStr = chunk.outro + lineStr;
		}

		if (chunk.content.length > 0) {
			lineIndex = chunk.content.lastIndexOf(n);
			if (lineIndex !== -1)
				{ return chunk.content.substr(lineIndex + 1) + lineStr; }
			lineStr = chunk.content + lineStr;
		}

		if (chunk.intro.length > 0) {
			lineIndex = chunk.intro.lastIndexOf(n);
			if (lineIndex !== -1)
				{ return chunk.intro.substr(lineIndex + 1) + lineStr; }
			lineStr = chunk.intro + lineStr;
		}
	} while (chunk = chunk.previous);
	lineIndex = this.intro.lastIndexOf(n);
	if (lineIndex !== -1)
		{ return this.intro.substr(lineIndex + 1) + lineStr; }
	return this.intro + lineStr;
};

MagicString.prototype.slice = function slice (start, end) {
		if ( start === void 0 ) start = 0;
		if ( end === void 0 ) end = this.original.length;

	while (start < 0) { start += this.original.length; }
	while (end < 0) { end += this.original.length; }

	var result = '';

	// find start chunk
	var chunk = this.firstChunk;
	while (chunk && (chunk.start > start || chunk.end <= start)) {
		// found end chunk before start
		if (chunk.start < end && chunk.end >= end) {
			return result;
		}

		chunk = chunk.next;
	}

	if (chunk && chunk.edited && chunk.start !== start)
		{ throw new Error(("Cannot use replaced character " + start + " as slice start anchor.")); }

	var startChunk = chunk;
	while (chunk) {
		if (chunk.intro && (startChunk !== chunk || chunk.start === start)) {
			result += chunk.intro;
		}

		var containsEnd = chunk.start < end && chunk.end >= end;
		if (containsEnd && chunk.edited && chunk.end !== end)
			{ throw new Error(("Cannot use replaced character " + end + " as slice end anchor.")); }

		var sliceStart = startChunk === chunk ? start - chunk.start : 0;
		var sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

		result += chunk.content.slice(sliceStart, sliceEnd);

		if (chunk.outro && (!containsEnd || chunk.end === end)) {
			result += chunk.outro;
		}

		if (containsEnd) {
			break;
		}

		chunk = chunk.next;
	}

	return result;
};

// TODO deprecate this? not really very useful
MagicString.prototype.snip = function snip (start, end) {
	var clone = this.clone();
	clone.remove(0, start);
	clone.remove(end, clone.original.length);

	return clone;
};

MagicString.prototype._split = function _split (index) {
	if (this.byStart[index] || this.byEnd[index]) { return; }

	var chunk = this.lastSearchedChunk;
	var searchForward = index > chunk.end;

	while (chunk) {
		if (chunk.contains(index)) { return this._splitChunk(chunk, index); }

		chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start];
	}
};

MagicString.prototype._splitChunk = function _splitChunk (chunk, index) {
	if (chunk.edited && chunk.content.length) {
		// zero-length edited chunks are a special case (overlapping replacements)
		var loc = getLocator(this.original)(index);
		throw new Error(
			("Cannot split a chunk that has already been edited (" + (loc.line) + ":" + (loc.column) + " – \"" + (chunk.original) + "\")")
		);
	}

	var newChunk = chunk.split(index);

	this.byEnd[index] = chunk;
	this.byStart[index] = newChunk;
	this.byEnd[newChunk.end] = newChunk;

	if (chunk === this.lastChunk) { this.lastChunk = newChunk; }

	this.lastSearchedChunk = chunk;
	return true;
};

MagicString.prototype.toString = function toString () {
	var str = this.intro;

	var chunk = this.firstChunk;
	while (chunk) {
		str += chunk.toString();
		chunk = chunk.next;
	}

	return str + this.outro;
};

MagicString.prototype.isEmpty = function isEmpty () {
	var chunk = this.firstChunk;
	do {
		if (chunk.intro.length && chunk.intro.trim() ||
				chunk.content.length && chunk.content.trim() ||
				chunk.outro.length && chunk.outro.trim())
			{ return false; }
	} while (chunk = chunk.next);
	return true;
};

MagicString.prototype.length = function length () {
	var chunk = this.firstChunk;
	var length = 0;
	do {
		length += chunk.intro.length + chunk.content.length + chunk.outro.length;
	} while (chunk = chunk.next);
	return length;
};

MagicString.prototype.trimLines = function trimLines () {
	return this.trim('[\\r\\n]');
};

MagicString.prototype.trim = function trim (charType) {
	return this.trimStart(charType).trimEnd(charType);
};

MagicString.prototype.trimEndAborted = function trimEndAborted (charType) {
	var rx = new RegExp((charType || '\\s') + '+$');

	this.outro = this.outro.replace(rx, '');
	if (this.outro.length) { return true; }

	var chunk = this.lastChunk;

	do {
		var end = chunk.end;
		var aborted = chunk.trimEnd(rx);

		// if chunk was trimmed, we have a new lastChunk
		if (chunk.end !== end) {
			if (this.lastChunk === chunk) {
				this.lastChunk = chunk.next;
			}

			this.byEnd[chunk.end] = chunk;
			this.byStart[chunk.next.start] = chunk.next;
			this.byEnd[chunk.next.end] = chunk.next;
		}

		if (aborted) { return true; }
		chunk = chunk.previous;
	} while (chunk);

	return false;
};

MagicString.prototype.trimEnd = function trimEnd (charType) {
	this.trimEndAborted(charType);
	return this;
};
MagicString.prototype.trimStartAborted = function trimStartAborted (charType) {
	var rx = new RegExp('^' + (charType || '\\s') + '+');

	this.intro = this.intro.replace(rx, '');
	if (this.intro.length) { return true; }

	var chunk = this.firstChunk;

	do {
		var end = chunk.end;
		var aborted = chunk.trimStart(rx);

		if (chunk.end !== end) {
			// special case...
			if (chunk === this.lastChunk) { this.lastChunk = chunk.next; }

			this.byEnd[chunk.end] = chunk;
			this.byStart[chunk.next.start] = chunk.next;
			this.byEnd[chunk.next.end] = chunk.next;
		}

		if (aborted) { return true; }
		chunk = chunk.next;
	} while (chunk);

	return false;
};

MagicString.prototype.trimStart = function trimStart (charType) {
	this.trimStartAborted(charType);
	return this;
};

var hasOwnProp = Object.prototype.hasOwnProperty;

var Bundle = function Bundle(options) {
	if ( options === void 0 ) options = {};

	this.intro = options.intro || '';
	this.separator = options.separator !== undefined ? options.separator : '\n';
	this.sources = [];
	this.uniqueSources = [];
	this.uniqueSourceIndexByFilename = {};
};

Bundle.prototype.addSource = function addSource (source) {
	if (source instanceof MagicString) {
		return this.addSource({
			content: source,
			filename: source.filename,
			separator: this.separator
		});
	}

	if (!isObject(source) || !source.content) {
		throw new Error('bundle.addSource() takes an object with a `content` property, which should be an instance of MagicString, and an optional `filename`');
	}

	['filename', 'indentExclusionRanges', 'separator'].forEach(function (option) {
		if (!hasOwnProp.call(source, option)) { source[option] = source.content[option]; }
	});

	if (source.separator === undefined) {
		// TODO there's a bunch of this sort of thing, needs cleaning up
		source.separator = this.separator;
	}

	if (source.filename) {
		if (!hasOwnProp.call(this.uniqueSourceIndexByFilename, source.filename)) {
			this.uniqueSourceIndexByFilename[source.filename] = this.uniqueSources.length;
			this.uniqueSources.push({ filename: source.filename, content: source.content.original });
		} else {
			var uniqueSource = this.uniqueSources[this.uniqueSourceIndexByFilename[source.filename]];
			if (source.content.original !== uniqueSource.content) {
				throw new Error(("Illegal source: same filename (" + (source.filename) + "), different contents"));
			}
		}
	}

	this.sources.push(source);
	return this;
};

Bundle.prototype.append = function append (str, options) {
	this.addSource({
		content: new MagicString(str),
		separator: (options && options.separator) || ''
	});

	return this;
};

Bundle.prototype.clone = function clone () {
	var bundle = new Bundle({
		intro: this.intro,
		separator: this.separator
	});

	this.sources.forEach(function (source) {
		bundle.addSource({
			filename: source.filename,
			content: source.content.clone(),
			separator: source.separator
		});
	});

	return bundle;
};

Bundle.prototype.generateDecodedMap = function generateDecodedMap (options) {
		var this$1 = this;
		if ( options === void 0 ) options = {};

	var names = [];
	this.sources.forEach(function (source) {
		Object.keys(source.content.storedNames).forEach(function (name) {
			if (!~names.indexOf(name)) { names.push(name); }
		});
	});

	var mappings = new Mappings(options.hires);

	if (this.intro) {
		mappings.advance(this.intro);
	}

	this.sources.forEach(function (source, i) {
		if (i > 0) {
			mappings.advance(this$1.separator);
		}

		var sourceIndex = source.filename ? this$1.uniqueSourceIndexByFilename[source.filename] : -1;
		var magicString = source.content;
		var locate = getLocator(magicString.original);

		if (magicString.intro) {
			mappings.advance(magicString.intro);
		}

		magicString.firstChunk.eachNext(function (chunk) {
			var loc = locate(chunk.start);

			if (chunk.intro.length) { mappings.advance(chunk.intro); }

			if (source.filename) {
				if (chunk.edited) {
					mappings.addEdit(
						sourceIndex,
						chunk.content,
						loc,
						chunk.storeName ? names.indexOf(chunk.original) : -1
					);
				} else {
					mappings.addUneditedChunk(
						sourceIndex,
						chunk,
						magicString.original,
						loc,
						magicString.sourcemapLocations
					);
				}
			} else {
				mappings.advance(chunk.content);
			}

			if (chunk.outro.length) { mappings.advance(chunk.outro); }
		});

		if (magicString.outro) {
			mappings.advance(magicString.outro);
		}
	});

	return {
		file: options.file ? options.file.split(/[/\\]/).pop() : null,
		sources: this.uniqueSources.map(function (source) {
			return options.file ? getRelativePath(options.file, source.filename) : source.filename;
		}),
		sourcesContent: this.uniqueSources.map(function (source) {
			return options.includeContent ? source.content : null;
		}),
		names: names,
		mappings: mappings.raw
	};
};

Bundle.prototype.generateMap = function generateMap (options) {
	return new SourceMap(this.generateDecodedMap(options));
};

Bundle.prototype.getIndentString = function getIndentString () {
	var indentStringCounts = {};

	this.sources.forEach(function (source) {
		var indentStr = source.content.indentStr;

		if (indentStr === null) { return; }

		if (!indentStringCounts[indentStr]) { indentStringCounts[indentStr] = 0; }
		indentStringCounts[indentStr] += 1;
	});

	return (
		Object.keys(indentStringCounts).sort(function (a, b) {
			return indentStringCounts[a] - indentStringCounts[b];
		})[0] || '\t'
	);
};

Bundle.prototype.indent = function indent (indentStr) {
		var this$1 = this;

	if (!arguments.length) {
		indentStr = this.getIndentString();
	}

	if (indentStr === '') { return this; } // noop

	var trailingNewline = !this.intro || this.intro.slice(-1) === '\n';

	this.sources.forEach(function (source, i) {
		var separator = source.separator !== undefined ? source.separator : this$1.separator;
		var indentStart = trailingNewline || (i > 0 && /\r?\n$/.test(separator));

		source.content.indent(indentStr, {
			exclude: source.indentExclusionRanges,
			indentStart: indentStart //: trailingNewline || /\r?\n$/.test( separator )  //true///\r?\n/.test( separator )
		});

		trailingNewline = source.content.lastChar() === '\n';
	});

	if (this.intro) {
		this.intro =
			indentStr +
			this.intro.replace(/^[^\n]/gm, function (match, index) {
				return index > 0 ? indentStr + match : match;
			});
	}

	return this;
};

Bundle.prototype.prepend = function prepend (str) {
	this.intro = str + this.intro;
	return this;
};

Bundle.prototype.toString = function toString () {
		var this$1 = this;

	var body = this.sources
		.map(function (source, i) {
			var separator = source.separator !== undefined ? source.separator : this$1.separator;
			var str = (i > 0 ? separator : '') + source.content.toString();

			return str;
		})
		.join('');

	return this.intro + body;
};

Bundle.prototype.isEmpty = function isEmpty () {
	if (this.intro.length && this.intro.trim())
		{ return false; }
	if (this.sources.some(function (source) { return !source.content.isEmpty(); }))
		{ return false; }
	return true;
};

Bundle.prototype.length = function length () {
	return this.sources.reduce(function (length, source) { return length + source.content.length(); }, this.intro.length);
};

Bundle.prototype.trimLines = function trimLines () {
	return this.trim('[\\r\\n]');
};

Bundle.prototype.trim = function trim (charType) {
	return this.trimStart(charType).trimEnd(charType);
};

Bundle.prototype.trimStart = function trimStart (charType) {
	var rx = new RegExp('^' + (charType || '\\s') + '+');
	this.intro = this.intro.replace(rx, '');

	if (!this.intro) {
		var source;
		var i = 0;

		do {
			source = this.sources[i++];
			if (!source) {
				break;
			}
		} while (!source.content.trimStartAborted(charType));
	}

	return this;
};

Bundle.prototype.trimEnd = function trimEnd (charType) {
	var rx = new RegExp((charType || '\\s') + '+$');

	var source;
	var i = this.sources.length - 1;

	do {
		source = this.sources[i--];
		if (!source) {
			this.intro = this.intro.replace(rx, '');
			break;
		}
	} while (!source.content.trimEndAborted(charType));

	return this;
};

function relative(from, to) {
    const fromParts = from.split(/[/\\]/).filter(Boolean);
    const toParts = to.split(/[/\\]/).filter(Boolean);
    if (fromParts[0] === '.')
        fromParts.shift();
    if (toParts[0] === '.')
        toParts.shift();
    while (fromParts[0] && toParts[0] && fromParts[0] === toParts[0]) {
        fromParts.shift();
        toParts.shift();
    }
    while (toParts[0] === '..' && fromParts.length > 0) {
        toParts.shift();
        fromParts.pop();
    }
    while (fromParts.pop()) {
        toParts.unshift('..');
    }
    return toParts.join('/');
}

const ArrowFunctionExpression = 'ArrowFunctionExpression';
const BlockStatement = 'BlockStatement';
const CallExpression = 'CallExpression';
const ExpressionStatement = 'ExpressionStatement';
const FunctionExpression = 'FunctionExpression';
const Identifier = 'Identifier';
const ImportDefaultSpecifier = 'ImportDefaultSpecifier';
const ImportNamespaceSpecifier = 'ImportNamespaceSpecifier';
const Program = 'Program';
const Property = 'Property';
const ReturnStatement = 'ReturnStatement';

function treeshakeNode(node, code, start, end) {
    code.remove(start, end);
    if (node.annotations) {
        for (const annotation of node.annotations) {
            if (annotation.start < start) {
                code.remove(annotation.start, annotation.end);
            }
            else {
                return;
            }
        }
    }
}
function removeAnnotations(node, code) {
    if (!node.annotations && node.parent.type === ExpressionStatement) {
        node = node.parent;
    }
    if (node.annotations) {
        for (const annotation of node.annotations) {
            code.remove(annotation.start, annotation.end);
        }
    }
}

const NO_SEMICOLON = { isNoStatement: true };
// This assumes there are only white-space and comments between start and the string we are looking for
function findFirstOccurrenceOutsideComment(code, searchString, start = 0) {
    let searchPos, charCodeAfterSlash;
    searchPos = code.indexOf(searchString, start);
    while (true) {
        start = code.indexOf('/', start);
        if (start === -1 || start >= searchPos)
            return searchPos;
        charCodeAfterSlash = code.charCodeAt(++start);
        ++start;
        // With our assumption, '/' always starts a comment. Determine comment type:
        start =
            charCodeAfterSlash === 47 /*"/"*/
                ? code.indexOf('\n', start) + 1
                : code.indexOf('*/', start) + 2;
        if (start > searchPos) {
            searchPos = code.indexOf(searchString, start);
        }
    }
}
const WHITESPACE = /\s/;
function findNonWhiteSpace(code, index) {
    while (index < code.length && WHITESPACE.test(code[index]))
        index++;
    return index;
}
// This assumes "code" only contains white-space and comments
// Returns position of line-comment if applicable
function findFirstLineBreakOutsideComment(code) {
    let lineBreakPos, charCodeAfterSlash, start = 0;
    lineBreakPos = code.indexOf('\n', start);
    while (true) {
        start = code.indexOf('/', start);
        if (start === -1 || start > lineBreakPos)
            return [lineBreakPos, lineBreakPos + 1];
        // With our assumption, '/' always starts a comment. Determine comment type:
        charCodeAfterSlash = code.charCodeAt(start + 1);
        if (charCodeAfterSlash === 47 /*"/"*/)
            return [start, lineBreakPos + 1];
        start = code.indexOf('*/', start + 3) + 2;
        if (start > lineBreakPos) {
            lineBreakPos = code.indexOf('\n', start);
        }
    }
}
function renderStatementList(statements, code, start, end, options) {
    let currentNode, currentNodeStart, currentNodeNeedsBoundaries, nextNodeStart;
    let nextNode = statements[0];
    let nextNodeNeedsBoundaries = !nextNode.included || nextNode.needsBoundaries;
    if (nextNodeNeedsBoundaries) {
        nextNodeStart =
            start + findFirstLineBreakOutsideComment(code.original.slice(start, nextNode.start))[1];
    }
    for (let nextIndex = 1; nextIndex <= statements.length; nextIndex++) {
        currentNode = nextNode;
        currentNodeStart = nextNodeStart;
        currentNodeNeedsBoundaries = nextNodeNeedsBoundaries;
        nextNode = statements[nextIndex];
        nextNodeNeedsBoundaries =
            nextNode === undefined ? false : !nextNode.included || nextNode.needsBoundaries;
        if (currentNodeNeedsBoundaries || nextNodeNeedsBoundaries) {
            nextNodeStart =
                currentNode.end +
                    findFirstLineBreakOutsideComment(code.original.slice(currentNode.end, nextNode === undefined ? end : nextNode.start))[1];
            if (currentNode.included) {
                currentNodeNeedsBoundaries
                    ? currentNode.render(code, options, {
                        end: nextNodeStart,
                        start: currentNodeStart
                    })
                    : currentNode.render(code, options);
            }
            else {
                treeshakeNode(currentNode, code, currentNodeStart, nextNodeStart);
            }
        }
        else {
            currentNode.render(code, options);
        }
    }
}
// This assumes that the first character is not part of the first node
function getCommaSeparatedNodesWithBoundaries(nodes, code, start, end) {
    const splitUpNodes = [];
    let node, nextNode, nextNodeStart, contentEnd, char;
    let separator = start - 1;
    for (let nextIndex = 0; nextIndex < nodes.length; nextIndex++) {
        nextNode = nodes[nextIndex];
        if (node !== undefined) {
            separator =
                node.end +
                    findFirstOccurrenceOutsideComment(code.original.slice(node.end, nextNode.start), ',');
        }
        nextNodeStart = contentEnd =
            separator +
                1 +
                findFirstLineBreakOutsideComment(code.original.slice(separator + 1, nextNode.start))[1];
        while (((char = code.original.charCodeAt(nextNodeStart)),
            char === 32 /*" "*/ || char === 9 /*"\t"*/ || char === 10 /*"\n"*/ || char === 13) /*"\r"*/)
            nextNodeStart++;
        if (node !== undefined) {
            splitUpNodes.push({
                contentEnd,
                end: nextNodeStart,
                node,
                separator,
                start
            });
        }
        node = nextNode;
        start = nextNodeStart;
    }
    splitUpNodes.push({
        contentEnd: end,
        end,
        node: node,
        separator: null,
        start
    });
    return splitUpNodes;
}
// This assumes there are only white-space and comments between start and end
function removeLineBreaks(code, start, end) {
    while (true) {
        const [removeStart, removeEnd] = findFirstLineBreakOutsideComment(code.original.slice(start, end));
        if (removeStart === -1) {
            break;
        }
        code.remove(start + removeStart, (start += removeEnd));
    }
}

function getSystemExportStatement(exportedVariables, options) {
    const _ = options.compact ? '' : ' ';
    if (exportedVariables.length === 1 &&
        options.exportNamesByVariable.get(exportedVariables[0]).length === 1) {
        const variable = exportedVariables[0];
        return `exports('${options.exportNamesByVariable.get(variable)}',${_}${variable.getName()})`;
    }
    else {
        return `exports({${_}${exportedVariables
            .map(variable => {
            return options.exportNamesByVariable
                .get(variable)
                .map(exportName => `${exportName}:${_}${variable.getName()}`)
                .join(`,${_}`);
        })
            .join(`,${_}`)}${_}})`;
    }
}
function getSystemExportFunctionLeft(exportedVariables, setFromExpression, options) {
    const _ = options.compact ? '' : ' ';
    const s = options.compact ? '' : ';';
    return `function${_}(v)${_}{${_}return exports({${_}${exportedVariables
        .map(variable => {
        return options.exportNamesByVariable
            .get(variable)
            .map(exportName => `${exportName}:${_}${setFromExpression ? variable.getName() : 'v'}`)
            .join(`,${_}`);
    })
        .join(`,${_}`)}${_}}),${_}v${s}${_}}(`;
}

const chars$1 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
const base = 64;
function toBase64(num) {
    let outStr = '';
    do {
        const curDigit = num % base;
        num = Math.floor(num / base);
        outStr = chars$1[curDigit] + outStr;
    } while (num !== 0);
    return outStr;
}

const RESERVED_NAMES = {
    // @ts-ignore
    __proto__: null,
    await: true,
    break: true,
    case: true,
    catch: true,
    class: true,
    const: true,
    continue: true,
    debugger: true,
    default: true,
    delete: true,
    do: true,
    else: true,
    enum: true,
    eval: true,
    export: true,
    extends: true,
    false: true,
    finally: true,
    for: true,
    function: true,
    if: true,
    implements: true,
    import: true,
    in: true,
    instanceof: true,
    interface: true,
    let: true,
    new: true,
    null: true,
    package: true,
    private: true,
    protected: true,
    public: true,
    return: true,
    static: true,
    super: true,
    switch: true,
    this: true,
    throw: true,
    true: true,
    try: true,
    typeof: true,
    undefined: true,
    var: true,
    void: true,
    while: true,
    with: true,
    yield: true
};

function getSafeName(baseName, usedNames) {
    let safeName = baseName;
    let count = 1;
    while (usedNames.has(safeName) || RESERVED_NAMES[safeName]) {
        safeName = `${baseName}$${toBase64(count++)}`;
    }
    usedNames.add(safeName);
    return safeName;
}

const NO_ARGS = [];

function getOrCreate(map, key, init) {
    const existing = map.get(key);
    if (existing) {
        return existing;
    }
    const value = init();
    map.set(key, value);
    return value;
}

const UnknownKey = Symbol('Unknown Key');
const EMPTY_PATH = [];
const UNKNOWN_PATH = [UnknownKey];
const EntitiesKey = Symbol('Entities');
class PathTracker {
    constructor() {
        this.entityPaths = Object.create(null, { [EntitiesKey]: { value: new Set() } });
    }
    getEntities(path) {
        let currentPaths = this.entityPaths;
        for (const pathSegment of path) {
            currentPaths = currentPaths[pathSegment] =
                currentPaths[pathSegment] ||
                    Object.create(null, { [EntitiesKey]: { value: new Set() } });
        }
        return currentPaths[EntitiesKey];
    }
}
const SHARED_RECURSION_TRACKER = new PathTracker();
class DiscriminatedPathTracker {
    constructor() {
        this.entityPaths = Object.create(null, {
            [EntitiesKey]: { value: new Map() }
        });
    }
    getEntities(path, discriminator) {
        let currentPaths = this.entityPaths;
        for (const pathSegment of path) {
            currentPaths = currentPaths[pathSegment] =
                currentPaths[pathSegment] ||
                    Object.create(null, { [EntitiesKey]: { value: new Map() } });
        }
        return getOrCreate(currentPaths[EntitiesKey], discriminator, () => new Set());
    }
}

function assembleMemberDescriptions(memberDescriptions, inheritedDescriptions = null) {
    return Object.create(inheritedDescriptions, memberDescriptions);
}
const UnknownValue = Symbol('Unknown Value');
const UNKNOWN_EXPRESSION = {
    deoptimizePath: () => { },
    getLiteralValueAtPath: () => UnknownValue,
    getReturnExpressionWhenCalledAtPath: () => UNKNOWN_EXPRESSION,
    hasEffectsWhenAccessedAtPath: path => path.length > 0,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: () => true,
    include: () => { },
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    },
    included: true,
    toString: () => '[[UNKNOWN]]'
};
const UNDEFINED_EXPRESSION = {
    deoptimizePath: () => { },
    getLiteralValueAtPath: () => undefined,
    getReturnExpressionWhenCalledAtPath: () => UNKNOWN_EXPRESSION,
    hasEffectsWhenAccessedAtPath: path => path.length > 0,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: () => true,
    include: () => { },
    includeCallArguments() { },
    included: true,
    toString: () => 'undefined'
};
const returnsUnknown = {
    value: {
        callsArgs: null,
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_EXPRESSION
    }
};
const mutatesSelfReturnsUnknown = {
    value: { returns: null, returnsPrimitive: UNKNOWN_EXPRESSION, callsArgs: null, mutatesSelf: true }
};
const callsArgReturnsUnknown = {
    value: { returns: null, returnsPrimitive: UNKNOWN_EXPRESSION, callsArgs: [0], mutatesSelf: false }
};
class UnknownArrayExpression {
    constructor() {
        this.included = false;
    }
    deoptimizePath() { }
    getLiteralValueAtPath() {
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(arrayMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(arrayMembers, path[0], this.included, callOptions, context);
        }
        return true;
    }
    include() {
        this.included = true;
    }
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    }
    toString() {
        return '[[UNKNOWN ARRAY]]';
    }
}
const returnsArray = {
    value: {
        callsArgs: null,
        mutatesSelf: false,
        returns: UnknownArrayExpression,
        returnsPrimitive: null
    }
};
const mutatesSelfReturnsArray = {
    value: {
        callsArgs: null,
        mutatesSelf: true,
        returns: UnknownArrayExpression,
        returnsPrimitive: null
    }
};
const callsArgReturnsArray = {
    value: {
        callsArgs: [0],
        mutatesSelf: false,
        returns: UnknownArrayExpression,
        returnsPrimitive: null
    }
};
const callsArgMutatesSelfReturnsArray = {
    value: {
        callsArgs: [0],
        mutatesSelf: true,
        returns: UnknownArrayExpression,
        returnsPrimitive: null
    }
};
const UNKNOWN_LITERAL_BOOLEAN = {
    deoptimizePath: () => { },
    getLiteralValueAtPath: () => UnknownValue,
    getReturnExpressionWhenCalledAtPath: path => {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalBooleanMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    },
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !literalBooleanMembers[subPath];
        }
        return true;
    },
    include: () => { },
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    },
    included: true,
    toString: () => '[[UNKNOWN BOOLEAN]]'
};
const returnsBoolean = {
    value: {
        callsArgs: null,
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_BOOLEAN
    }
};
const callsArgReturnsBoolean = {
    value: {
        callsArgs: [0],
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_BOOLEAN
    }
};
const UNKNOWN_LITERAL_NUMBER = {
    deoptimizePath: () => { },
    getLiteralValueAtPath: () => UnknownValue,
    getReturnExpressionWhenCalledAtPath: path => {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalNumberMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    },
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: path => {
        if (path.length === 1) {
            const subPath = path[0];
            return typeof subPath !== 'string' || !literalNumberMembers[subPath];
        }
        return true;
    },
    include: () => { },
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    },
    included: true,
    toString: () => '[[UNKNOWN NUMBER]]'
};
const returnsNumber = {
    value: {
        callsArgs: null,
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    }
};
const mutatesSelfReturnsNumber = {
    value: {
        callsArgs: null,
        mutatesSelf: true,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    }
};
const callsArgReturnsNumber = {
    value: {
        callsArgs: [0],
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_NUMBER
    }
};
const UNKNOWN_LITERAL_STRING = {
    deoptimizePath: () => { },
    getLiteralValueAtPath: () => UnknownValue,
    getReturnExpressionWhenCalledAtPath: path => {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(literalStringMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    },
    hasEffectsWhenAccessedAtPath: path => path.length > 1,
    hasEffectsWhenAssignedAtPath: path => path.length > 0,
    hasEffectsWhenCalledAtPath: (path, callOptions, context) => {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(literalStringMembers, path[0], true, callOptions, context);
        }
        return true;
    },
    include: () => { },
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    },
    included: true,
    toString: () => '[[UNKNOWN STRING]]'
};
const returnsString = {
    value: {
        callsArgs: null,
        mutatesSelf: false,
        returns: null,
        returnsPrimitive: UNKNOWN_LITERAL_STRING
    }
};
class UnknownObjectExpression {
    constructor() {
        this.included = false;
    }
    deoptimizePath() { }
    getLiteralValueAtPath() {
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length === 1) {
            return getMemberReturnExpressionWhenCalled(objectMembers, path[0]);
        }
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(objectMembers, path[0], this.included, callOptions, context);
        }
        return true;
    }
    include() {
        this.included = true;
    }
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    }
    toString() {
        return '[[UNKNOWN OBJECT]]';
    }
}
const objectMembers = assembleMemberDescriptions({
    hasOwnProperty: returnsBoolean,
    isPrototypeOf: returnsBoolean,
    propertyIsEnumerable: returnsBoolean,
    toLocaleString: returnsString,
    toString: returnsString,
    valueOf: returnsUnknown
});
const arrayMembers = assembleMemberDescriptions({
    concat: returnsArray,
    copyWithin: mutatesSelfReturnsArray,
    every: callsArgReturnsBoolean,
    fill: mutatesSelfReturnsArray,
    filter: callsArgReturnsArray,
    find: callsArgReturnsUnknown,
    findIndex: callsArgReturnsNumber,
    forEach: callsArgReturnsUnknown,
    includes: returnsBoolean,
    indexOf: returnsNumber,
    join: returnsString,
    lastIndexOf: returnsNumber,
    map: callsArgReturnsArray,
    pop: mutatesSelfReturnsUnknown,
    push: mutatesSelfReturnsNumber,
    reduce: callsArgReturnsUnknown,
    reduceRight: callsArgReturnsUnknown,
    reverse: mutatesSelfReturnsArray,
    shift: mutatesSelfReturnsUnknown,
    slice: returnsArray,
    some: callsArgReturnsBoolean,
    sort: callsArgMutatesSelfReturnsArray,
    splice: mutatesSelfReturnsArray,
    unshift: mutatesSelfReturnsNumber
}, objectMembers);
const literalBooleanMembers = assembleMemberDescriptions({
    valueOf: returnsBoolean
}, objectMembers);
const literalNumberMembers = assembleMemberDescriptions({
    toExponential: returnsString,
    toFixed: returnsString,
    toLocaleString: returnsString,
    toPrecision: returnsString,
    valueOf: returnsNumber
}, objectMembers);
const literalStringMembers = assembleMemberDescriptions({
    charAt: returnsString,
    charCodeAt: returnsNumber,
    codePointAt: returnsNumber,
    concat: returnsString,
    endsWith: returnsBoolean,
    includes: returnsBoolean,
    indexOf: returnsNumber,
    lastIndexOf: returnsNumber,
    localeCompare: returnsNumber,
    match: returnsBoolean,
    normalize: returnsString,
    padEnd: returnsString,
    padStart: returnsString,
    repeat: returnsString,
    replace: {
        value: {
            callsArgs: [1],
            mutatesSelf: false,
            returns: null,
            returnsPrimitive: UNKNOWN_LITERAL_STRING
        }
    },
    search: returnsNumber,
    slice: returnsString,
    split: returnsArray,
    startsWith: returnsBoolean,
    substr: returnsString,
    substring: returnsString,
    toLocaleLowerCase: returnsString,
    toLocaleUpperCase: returnsString,
    toLowerCase: returnsString,
    toUpperCase: returnsString,
    trim: returnsString,
    valueOf: returnsString
}, objectMembers);
function getLiteralMembersForValue(value) {
    switch (typeof value) {
        case 'boolean':
            return literalBooleanMembers;
        case 'number':
            return literalNumberMembers;
        case 'string':
            return literalStringMembers;
        default:
            return Object.create(null);
    }
}
function hasMemberEffectWhenCalled(members, memberName, parentIncluded, callOptions, context) {
    if (typeof memberName !== 'string' ||
        !members[memberName] ||
        (members[memberName].mutatesSelf && parentIncluded))
        return true;
    if (!members[memberName].callsArgs)
        return false;
    for (const argIndex of members[memberName].callsArgs) {
        if (callOptions.args[argIndex] &&
            callOptions.args[argIndex].hasEffectsWhenCalledAtPath(EMPTY_PATH, {
                args: NO_ARGS,
                withNew: false
            }, context))
            return true;
    }
    return false;
}
function getMemberReturnExpressionWhenCalled(members, memberName) {
    if (typeof memberName !== 'string' || !members[memberName])
        return UNKNOWN_EXPRESSION;
    return members[memberName].returnsPrimitive !== null
        ? members[memberName].returnsPrimitive
        : new members[memberName].returns();
}

class Variable {
    constructor(name) {
        this.alwaysRendered = false;
        this.included = false;
        this.isId = false;
        this.isReassigned = false;
        this.renderBaseName = null;
        this.renderName = null;
        this.name = name;
    }
    /**
     * Binds identifiers that reference this variable to this variable.
     * Necessary to be able to change variable names.
     */
    addReference(_identifier) { }
    deoptimizePath(_path) { }
    getBaseVariableName() {
        return this.renderBaseName || this.renderName || this.name;
    }
    getLiteralValueAtPath(_path, _recursionTracker, _origin) {
        return UnknownValue;
    }
    getName() {
        const name = this.renderName || this.name;
        return this.renderBaseName
            ? `${this.renderBaseName}${RESERVED_NAMES[name] ? `['${name}']` : `.${name}`}`
            : name;
    }
    getReturnExpressionWhenCalledAtPath(_path, _recursionTracker, _origin) {
        return UNKNOWN_EXPRESSION;
    }
    hasEffectsWhenAccessedAtPath(path, _context) {
        return path.length > 0;
    }
    hasEffectsWhenAssignedAtPath(_path, _context) {
        return true;
    }
    hasEffectsWhenCalledAtPath(_path, _callOptions, _context) {
        return true;
    }
    /**
     * Marks this variable as being part of the bundle, which is usually the case when one of
     * its identifiers becomes part of the bundle. Returns true if it has not been included
     * previously.
     * Once a variable is included, it should take care all its declarations are included.
     */
    include() {
        this.included = true;
    }
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    }
    markCalledFromTryStatement() { }
    setRenderNames(baseName, name) {
        this.renderBaseName = baseName;
        this.renderName = name;
    }
}

class ExternalVariable extends Variable {
    constructor(module, name) {
        super(name);
        this.module = module;
        this.isNamespace = name === '*';
        this.referenced = false;
    }
    addReference(identifier) {
        this.referenced = true;
        if (this.name === 'default' || this.name === '*') {
            this.module.suggestName(identifier.name);
        }
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.module.used = true;
        }
    }
}

const BLANK = Object.freeze(Object.create(null));
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const reservedWords = 'break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public'.split(' ');
const builtins = 'Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl'.split(' ');
const blacklisted = new Set(reservedWords.concat(builtins));
const illegalCharacters = /[^$_a-zA-Z0-9]/g;
const startsWithDigit = (str) => /\d/.test(str[0]);
function isLegal(str) {
    if (startsWithDigit(str) || blacklisted.has(str)) {
        return false;
    }
    return !illegalCharacters.test(str);
}
function makeLegal(str) {
    str = str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase()).replace(illegalCharacters, '_');
    if (startsWithDigit(str) || blacklisted.has(str))
        str = `_${str}`;
    return str || '_';
}

const absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/;
const relativePath = /^\.?\.\//;
function isAbsolute(path) {
    return absolutePath.test(path);
}
function isRelative(path) {
    return relativePath.test(path);
}
function normalize(path) {
    if (path.indexOf('\\') == -1)
        return path;
    return path.replace(/\\/g, '/');
}

class ExternalModule {
    constructor(options, id, hasModuleSideEffects, meta) {
        this.options = options;
        this.id = id;
        this.defaultVariableName = '';
        this.dynamicImporters = [];
        this.importers = [];
        this.mostCommonSuggestion = 0;
        this.namespaceVariableName = '';
        this.reexported = false;
        this.renderPath = undefined;
        this.renormalizeRenderPath = false;
        this.used = false;
        this.variableName = '';
        this.execIndex = Infinity;
        this.suggestedVariableName = makeLegal(id.split(/[\\/]/).pop());
        this.nameSuggestions = Object.create(null);
        this.declarations = Object.create(null);
        this.exportedVariables = new Map();
        const module = this;
        this.info = {
            ast: null,
            code: null,
            dynamicallyImportedIds: EMPTY_ARRAY,
            get dynamicImporters() {
                return module.dynamicImporters.sort();
            },
            hasModuleSideEffects,
            id,
            implicitlyLoadedAfterOneOf: EMPTY_ARRAY,
            implicitlyLoadedBefore: EMPTY_ARRAY,
            importedIds: EMPTY_ARRAY,
            get importers() {
                return module.importers.sort();
            },
            isEntry: false,
            isExternal: true,
            meta,
            syntheticNamedExports: false
        };
    }
    getVariableForExportName(name) {
        let declaration = this.declarations[name];
        if (declaration)
            return declaration;
        this.declarations[name] = declaration = new ExternalVariable(this, name);
        this.exportedVariables.set(declaration, name);
        return declaration;
    }
    setRenderPath(options, inputBase) {
        this.renderPath =
            typeof options.paths === 'function' ? options.paths(this.id) : options.paths[this.id];
        if (!this.renderPath) {
            if (!isAbsolute(this.id)) {
                this.renderPath = this.id;
            }
            else {
                this.renderPath = normalize(relative$1(inputBase, this.id));
                this.renormalizeRenderPath = true;
            }
        }
        return this.renderPath;
    }
    suggestName(name) {
        if (!this.nameSuggestions[name])
            this.nameSuggestions[name] = 0;
        this.nameSuggestions[name] += 1;
        if (this.nameSuggestions[name] > this.mostCommonSuggestion) {
            this.mostCommonSuggestion = this.nameSuggestions[name];
            this.suggestedVariableName = name;
        }
    }
    warnUnusedImports() {
        const unused = Object.keys(this.declarations).filter(name => {
            if (name === '*')
                return false;
            const declaration = this.declarations[name];
            return !declaration.included && !this.reexported && !declaration.referenced;
        });
        if (unused.length === 0)
            return;
        const names = unused.length === 1
            ? `'${unused[0]}' is`
            : `${unused
                .slice(0, -1)
                .map(name => `'${name}'`)
                .join(', ')} and '${unused.slice(-1)}' are`;
        this.options.onwarn({
            code: 'UNUSED_EXTERNAL_IMPORT',
            message: `${names} imported from external module '${this.id}' but never used`,
            names: unused,
            source: this.id
        });
    }
}

function markModuleAndImpureDependenciesAsExecuted(baseModule) {
    baseModule.isExecuted = true;
    const modules = [baseModule];
    const visitedModules = new Set();
    for (const module of modules) {
        for (const dependency of [...module.dependencies, ...module.implicitlyLoadedBefore]) {
            if (!(dependency instanceof ExternalModule) &&
                !dependency.isExecuted &&
                (dependency.info.hasModuleSideEffects || module.implicitlyLoadedBefore.has(dependency)) &&
                !visitedModules.has(dependency.id)) {
                dependency.isExecuted = true;
                visitedModules.add(dependency.id);
                modules.push(dependency);
            }
        }
    }
}

const BROKEN_FLOW_NONE = 0;
const BROKEN_FLOW_BREAK_CONTINUE = 1;
const BROKEN_FLOW_ERROR_RETURN_LABEL = 2;
function createInclusionContext() {
    return {
        brokenFlow: BROKEN_FLOW_NONE,
        includedCallArguments: new Set(),
        includedLabels: new Set()
    };
}
function createHasEffectsContext() {
    return {
        accessed: new PathTracker(),
        assigned: new PathTracker(),
        brokenFlow: BROKEN_FLOW_NONE,
        called: new DiscriminatedPathTracker(),
        ignore: {
            breaks: false,
            continues: false,
            labels: new Set(),
            returnAwaitYield: false
        },
        includedLabels: new Set(),
        instantiated: new DiscriminatedPathTracker(),
        replacedVariableInits: new Map()
    };
}

// To avoid infinite recursions
const MAX_PATH_DEPTH = 7;
class LocalVariable extends Variable {
    constructor(name, declarator, init, context) {
        super(name);
        this.additionalInitializers = null;
        this.calledFromTryStatement = false;
        this.expressionsToBeDeoptimized = [];
        this.declarations = declarator ? [declarator] : [];
        this.init = init;
        this.deoptimizationTracker = context.deoptimizationTracker;
        this.module = context.module;
    }
    addDeclaration(identifier, init) {
        this.declarations.push(identifier);
        if (this.additionalInitializers === null) {
            this.additionalInitializers = this.init === null ? [] : [this.init];
            this.init = UNKNOWN_EXPRESSION;
            this.isReassigned = true;
        }
        if (init !== null) {
            this.additionalInitializers.push(init);
        }
    }
    consolidateInitializers() {
        if (this.additionalInitializers !== null) {
            for (const initializer of this.additionalInitializers) {
                initializer.deoptimizePath(UNKNOWN_PATH);
            }
            this.additionalInitializers = null;
        }
    }
    deoptimizePath(path) {
        if (path.length > MAX_PATH_DEPTH || this.isReassigned)
            return;
        const trackedEntities = this.deoptimizationTracker.getEntities(path);
        if (trackedEntities.has(this))
            return;
        trackedEntities.add(this);
        if (path.length === 0) {
            if (!this.isReassigned) {
                this.isReassigned = true;
                const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
                this.expressionsToBeDeoptimized = [];
                for (const expression of expressionsToBeDeoptimized) {
                    expression.deoptimizeCache();
                }
                if (this.init) {
                    this.init.deoptimizePath(UNKNOWN_PATH);
                }
            }
        }
        else if (this.init) {
            this.init.deoptimizePath(path);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (this.isReassigned || !this.init || path.length > MAX_PATH_DEPTH) {
            return UnknownValue;
        }
        const trackedEntities = recursionTracker.getEntities(path);
        if (trackedEntities.has(this.init)) {
            return UnknownValue;
        }
        this.expressionsToBeDeoptimized.push(origin);
        trackedEntities.add(this.init);
        const value = this.init.getLiteralValueAtPath(path, recursionTracker, origin);
        trackedEntities.delete(this.init);
        return value;
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        if (this.isReassigned || !this.init || path.length > MAX_PATH_DEPTH) {
            return UNKNOWN_EXPRESSION;
        }
        const trackedEntities = recursionTracker.getEntities(path);
        if (trackedEntities.has(this.init)) {
            return UNKNOWN_EXPRESSION;
        }
        this.expressionsToBeDeoptimized.push(origin);
        trackedEntities.add(this.init);
        const value = this.init.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
        trackedEntities.delete(this.init);
        return value;
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        if (this.isReassigned || path.length > MAX_PATH_DEPTH)
            return true;
        const trackedExpressions = context.accessed.getEntities(path);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return (this.init && this.init.hasEffectsWhenAccessedAtPath(path, context));
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (this.included || path.length > MAX_PATH_DEPTH)
            return true;
        if (path.length === 0)
            return false;
        if (this.isReassigned)
            return true;
        const trackedExpressions = context.assigned.getEntities(path);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return (this.init && this.init.hasEffectsWhenAssignedAtPath(path, context));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length > MAX_PATH_DEPTH || this.isReassigned)
            return true;
        const trackedExpressions = (callOptions.withNew
            ? context.instantiated
            : context.called).getEntities(path, callOptions);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return (this.init && this.init.hasEffectsWhenCalledAtPath(path, callOptions, context));
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (!this.module.isExecuted) {
                markModuleAndImpureDependenciesAsExecuted(this.module);
            }
            for (const declaration of this.declarations) {
                // If node is a default export, it can save a tree-shaking run to include the full declaration now
                if (!declaration.included)
                    declaration.include(createInclusionContext(), false);
                let node = declaration.parent;
                while (!node.included) {
                    // We do not want to properly include parents in case they are part of a dead branch
                    // in which case .include() might pull in more dead code
                    node.included = true;
                    if (node.type === Program)
                        break;
                    node = node.parent;
                }
            }
        }
    }
    includeCallArguments(context, args) {
        if (this.isReassigned || (this.init && context.includedCallArguments.has(this.init))) {
            for (const arg of args) {
                arg.include(context, false);
            }
        }
        else if (this.init) {
            context.includedCallArguments.add(this.init);
            this.init.includeCallArguments(context, args);
            context.includedCallArguments.delete(this.init);
        }
    }
    markCalledFromTryStatement() {
        this.calledFromTryStatement = true;
    }
}

class Scope {
    constructor() {
        this.children = [];
        this.variables = new Map();
    }
    addDeclaration(identifier, context, init, _isHoisted) {
        const name = identifier.name;
        let variable = this.variables.get(name);
        if (variable) {
            variable.addDeclaration(identifier, init);
        }
        else {
            variable = new LocalVariable(identifier.name, identifier, init || UNDEFINED_EXPRESSION, context);
            this.variables.set(name, variable);
        }
        return variable;
    }
    contains(name) {
        return this.variables.has(name);
    }
    findVariable(_name) {
        throw new Error('Internal Error: findVariable needs to be implemented by a subclass');
    }
}

class ChildScope extends Scope {
    constructor(parent) {
        super();
        this.accessedOutsideVariables = new Map();
        this.parent = parent;
        parent.children.push(this);
    }
    addAccessedDynamicImport(importExpression) {
        (this.accessedDynamicImports || (this.accessedDynamicImports = new Set())).add(importExpression);
        if (this.parent instanceof ChildScope) {
            this.parent.addAccessedDynamicImport(importExpression);
        }
    }
    addAccessedGlobals(globals, accessedGlobalsByScope) {
        const accessedGlobals = accessedGlobalsByScope.get(this) || new Set();
        for (const name of globals) {
            accessedGlobals.add(name);
        }
        accessedGlobalsByScope.set(this, accessedGlobals);
        if (this.parent instanceof ChildScope) {
            this.parent.addAccessedGlobals(globals, accessedGlobalsByScope);
        }
    }
    addNamespaceMemberAccess(name, variable) {
        this.accessedOutsideVariables.set(name, variable);
        this.parent.addNamespaceMemberAccess(name, variable);
    }
    addReturnExpression(expression) {
        this.parent instanceof ChildScope && this.parent.addReturnExpression(expression);
    }
    addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope) {
        for (const variable of this.accessedOutsideVariables.values()) {
            if (variable.included) {
                usedNames.add(variable.getBaseVariableName());
                if (format === 'system' && exportNamesByVariable.has(variable)) {
                    usedNames.add('exports');
                }
            }
        }
        const accessedGlobals = accessedGlobalsByScope.get(this);
        if (accessedGlobals) {
            for (const name of accessedGlobals) {
                usedNames.add(name);
            }
        }
    }
    contains(name) {
        return this.variables.has(name) || this.parent.contains(name);
    }
    deconflict(format, exportNamesByVariable, accessedGlobalsByScope) {
        const usedNames = new Set();
        this.addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope);
        if (this.accessedDynamicImports) {
            for (const importExpression of this.accessedDynamicImports) {
                if (importExpression.inlineNamespace) {
                    usedNames.add(importExpression.inlineNamespace.getBaseVariableName());
                }
            }
        }
        for (const [name, variable] of this.variables) {
            if (variable.included || variable.alwaysRendered) {
                variable.setRenderNames(null, getSafeName(name, usedNames));
            }
        }
        for (const scope of this.children) {
            scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
        }
    }
    findLexicalBoundary() {
        return this.parent.findLexicalBoundary();
    }
    findVariable(name) {
        const knownVariable = this.variables.get(name) || this.accessedOutsideVariables.get(name);
        if (knownVariable) {
            return knownVariable;
        }
        const variable = this.parent.findVariable(name);
        this.accessedOutsideVariables.set(name, variable);
        return variable;
    }
}

function getLocator$1(source, options) {
    if (options === void 0) { options = {}; }
    var offsetLine = options.offsetLine || 0;
    var offsetColumn = options.offsetColumn || 0;
    var originalLines = source.split('\n');
    var start = 0;
    var lineRanges = originalLines.map(function (line, i) {
        var end = start + line.length + 1;
        var range = { start: start, end: end, line: i };
        start = end;
        return range;
    });
    var i = 0;
    function rangeContains(range, index) {
        return range.start <= index && index < range.end;
    }
    function getLocation(range, index) {
        return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
    }
    function locate(search, startIndex) {
        if (typeof search === 'string') {
            search = source.indexOf(search, startIndex || 0);
        }
        var range = lineRanges[i];
        var d = search >= range.end ? 1 : -1;
        while (range) {
            if (rangeContains(range, search))
                return getLocation(range, search);
            i += d;
            range = lineRanges[i];
        }
    }
    return locate;
}
function locate(source, search, options) {
    if (typeof options === 'number') {
        throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
    }
    return getLocator$1(source, options)(search, options && options.startIndex);
}

const keys = {
    Literal: [],
    Program: ['body']
};
function getAndCreateKeys(esTreeNode) {
    keys[esTreeNode.type] = Object.keys(esTreeNode).filter(key => typeof esTreeNode[key] === 'object');
    return keys[esTreeNode.type];
}

const INCLUDE_PARAMETERS = 'variables';
class NodeBase {
    constructor(esTreeNode, parent, parentScope) {
        this.included = false;
        this.esTreeNode = esTreeNode;
        this.keys = keys[esTreeNode.type] || getAndCreateKeys(esTreeNode);
        this.parent = parent;
        this.context = parent.context;
        this.createScope(parentScope);
        this.parseNode(esTreeNode);
        this.initialise();
        this.context.magicString.addSourcemapLocation(this.start);
        this.context.magicString.addSourcemapLocation(this.end);
    }
    /**
     * Override this to bind assignments to variables and do any initialisations that
     * require the scopes to be populated with variables.
     */
    bind() {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null || key === 'annotations')
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.bind();
                }
            }
            else {
                value.bind();
            }
        }
    }
    /**
     * Override if this node should receive a different scope than the parent scope.
     */
    createScope(parentScope) {
        this.scope = parentScope;
    }
    declare(_kind, _init) {
        return [];
    }
    deoptimizePath(_path) { }
    getLiteralValueAtPath(_path, _recursionTracker, _origin) {
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(_path, _recursionTracker, _origin) {
        return UNKNOWN_EXPRESSION;
    }
    hasEffects(context) {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null || key === 'annotations')
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null && child.hasEffects(context))
                        return true;
                }
            }
            else if (value.hasEffects(context))
                return true;
        }
        return false;
    }
    hasEffectsWhenAccessedAtPath(path, _context) {
        return path.length > 0;
    }
    hasEffectsWhenAssignedAtPath(_path, _context) {
        return true;
    }
    hasEffectsWhenCalledAtPath(_path, _callOptions, _context) {
        return true;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const key of this.keys) {
            const value = this[key];
            if (value === null || key === 'annotations')
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.include(context, includeChildrenRecursively);
                }
            }
            else {
                value.include(context, includeChildrenRecursively);
            }
        }
    }
    includeCallArguments(context, args) {
        for (const arg of args) {
            arg.include(context, false);
        }
    }
    includeWithAllDeclaredVariables(includeChildrenRecursively, context) {
        this.include(context, includeChildrenRecursively);
    }
    /**
     * Override to perform special initialisation steps after the scope is initialised
     */
    initialise() { }
    insertSemicolon(code) {
        if (code.original[this.end - 1] !== ';') {
            code.appendLeft(this.end, ';');
        }
    }
    parseNode(esTreeNode) {
        for (const key of Object.keys(esTreeNode)) {
            // That way, we can override this function to add custom initialisation and then call super.parseNode
            if (this.hasOwnProperty(key))
                continue;
            const value = esTreeNode[key];
            if (typeof value !== 'object' || value === null || key === 'annotations') {
                this[key] = value;
            }
            else if (Array.isArray(value)) {
                this[key] = [];
                for (const child of value) {
                    this[key].push(child === null
                        ? null
                        : new (this.context.nodeConstructors[child.type] ||
                            this.context.nodeConstructors.UnknownNode)(child, this, this.scope));
                }
            }
            else {
                this[key] = new (this.context.nodeConstructors[value.type] ||
                    this.context.nodeConstructors.UnknownNode)(value, this, this.scope);
            }
        }
    }
    render(code, options) {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null || key === 'annotations')
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.render(code, options);
                }
            }
            else {
                value.render(code, options);
            }
        }
    }
    shouldBeIncluded(context) {
        return this.included || (!context.brokenFlow && this.hasEffects(createHasEffectsContext()));
    }
    toString() {
        return this.context.code.slice(this.start, this.end);
    }
}

class ClassNode extends NodeBase {
    createScope(parentScope) {
        this.scope = new ChildScope(parentScope);
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (path.length <= 1)
            return false;
        return path.length > 2 || path[0] !== 'prototype';
    }
    hasEffectsWhenAssignedAtPath(path) {
        if (path.length <= 1)
            return false;
        return path.length > 2 || path[0] !== 'prototype';
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (!callOptions.withNew)
            return true;
        return (this.body.hasEffectsWhenCalledAtPath(path, callOptions, context) ||
            (this.superClass !== null &&
                this.superClass.hasEffectsWhenCalledAtPath(path, callOptions, context)));
    }
    initialise() {
        if (this.id !== null) {
            this.id.declare('class', this);
        }
    }
}

class ClassDeclaration extends ClassNode {
    initialise() {
        super.initialise();
        if (this.id !== null) {
            this.id.variable.isId = true;
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.id !== null) {
            this.id = new this.context.nodeConstructors.Identifier(esTreeNode.id, this, this.scope.parent);
        }
        super.parseNode(esTreeNode);
    }
    render(code, options) {
        if (options.format === 'system' &&
            this.id &&
            options.exportNamesByVariable.has(this.id.variable)) {
            code.appendLeft(this.end, `${options.compact ? '' : ' '}${getSystemExportStatement([this.id.variable], options)};`);
        }
        super.render(code, options);
    }
}

class ArgumentsVariable extends LocalVariable {
    constructor(context) {
        super('arguments', null, UNKNOWN_EXPRESSION, context);
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath() {
        return true;
    }
    hasEffectsWhenCalledAtPath() {
        return true;
    }
}

class ThisVariable extends LocalVariable {
    constructor(context) {
        super('this', null, null, context);
    }
    getLiteralValueAtPath() {
        return UnknownValue;
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        return (this.getInit(context).hasEffectsWhenAccessedAtPath(path, context) ||
            super.hasEffectsWhenAccessedAtPath(path, context));
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return (this.getInit(context).hasEffectsWhenAssignedAtPath(path, context) ||
            super.hasEffectsWhenAssignedAtPath(path, context));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        return (this.getInit(context).hasEffectsWhenCalledAtPath(path, callOptions, context) ||
            super.hasEffectsWhenCalledAtPath(path, callOptions, context));
    }
    getInit(context) {
        return context.replacedVariableInits.get(this) || UNKNOWN_EXPRESSION;
    }
}

class SpreadElement extends NodeBase {
    bind() {
        super.bind();
        // Only properties of properties of the argument could become subject to reassignment
        // This will also reassign the return values of iterators
        this.argument.deoptimizePath([UnknownKey, UnknownKey]);
    }
}

class ParameterScope extends ChildScope {
    constructor(parent, context) {
        super(parent);
        this.parameters = [];
        this.hasRest = false;
        this.context = context;
        this.hoistedBodyVarScope = new ChildScope(this);
    }
    /**
     * Adds a parameter to this scope. Parameters must be added in the correct
     * order, e.g. from left to right.
     */
    addParameterDeclaration(identifier) {
        const name = identifier.name;
        let variable = this.hoistedBodyVarScope.variables.get(name);
        if (variable) {
            variable.addDeclaration(identifier, null);
        }
        else {
            variable = new LocalVariable(name, identifier, UNKNOWN_EXPRESSION, this.context);
        }
        this.variables.set(name, variable);
        return variable;
    }
    addParameterVariables(parameters, hasRest) {
        this.parameters = parameters;
        for (const parameterList of parameters) {
            for (const parameter of parameterList) {
                parameter.alwaysRendered = true;
            }
        }
        this.hasRest = hasRest;
    }
    includeCallArguments(context, args) {
        let calledFromTryStatement = false;
        let argIncluded = false;
        const restParam = this.hasRest && this.parameters[this.parameters.length - 1];
        for (const checkedArg of args) {
            if (checkedArg instanceof SpreadElement) {
                for (const arg of args) {
                    arg.include(context, false);
                }
                break;
            }
        }
        for (let index = args.length - 1; index >= 0; index--) {
            const paramVars = this.parameters[index] || restParam;
            const arg = args[index];
            if (paramVars) {
                calledFromTryStatement = false;
                for (const variable of paramVars) {
                    if (variable.included) {
                        argIncluded = true;
                    }
                    if (variable.calledFromTryStatement) {
                        calledFromTryStatement = true;
                    }
                }
            }
            if (!argIncluded && arg.shouldBeIncluded(context)) {
                argIncluded = true;
            }
            if (argIncluded) {
                arg.include(context, calledFromTryStatement);
            }
        }
    }
}

class ReturnValueScope extends ParameterScope {
    constructor() {
        super(...arguments);
        this.returnExpression = null;
        this.returnExpressions = [];
    }
    addReturnExpression(expression) {
        this.returnExpressions.push(expression);
    }
    getReturnExpression() {
        if (this.returnExpression === null)
            this.updateReturnExpression();
        return this.returnExpression;
    }
    updateReturnExpression() {
        if (this.returnExpressions.length === 1) {
            this.returnExpression = this.returnExpressions[0];
        }
        else {
            this.returnExpression = UNKNOWN_EXPRESSION;
            for (const expression of this.returnExpressions) {
                expression.deoptimizePath(UNKNOWN_PATH);
            }
        }
    }
}

class FunctionScope extends ReturnValueScope {
    constructor(parent, context) {
        super(parent, context);
        this.variables.set('arguments', (this.argumentsVariable = new ArgumentsVariable(context)));
        this.variables.set('this', (this.thisVariable = new ThisVariable(context)));
    }
    findLexicalBoundary() {
        return this;
    }
    includeCallArguments(context, args) {
        super.includeCallArguments(context, args);
        if (this.argumentsVariable.included) {
            for (const arg of args) {
                if (!arg.included) {
                    arg.include(context, false);
                }
            }
        }
    }
}

function isReference(node, parent) {
    if (node.type === 'MemberExpression') {
        return !node.computed && isReference(node.object, node);
    }
    if (node.type === 'Identifier') {
        if (!parent)
            return true;
        switch (parent.type) {
            // disregard `bar` in `foo.bar`
            case 'MemberExpression': return parent.computed || node === parent.object;
            // disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
            case 'MethodDefinition': return parent.computed;
            // disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
            case 'FieldDefinition': return parent.computed || node === parent.value;
            // disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
            case 'Property': return parent.computed || node === parent.value;
            // disregard the `bar` in `export { foo as bar }` or
            // the foo in `import { foo as bar }`
            case 'ExportSpecifier':
            case 'ImportSpecifier': return node === parent.local;
            // disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
            case 'LabeledStatement':
            case 'BreakStatement':
            case 'ContinueStatement': return false;
            default: return true;
        }
    }
    return false;
}

const ValueProperties = Symbol('Value Properties');
const PURE = { pure: true };
const IMPURE = { pure: false };
// We use shortened variables to reduce file size here
/* OBJECT */
const O = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: IMPURE
};
/* PURE FUNCTION */
const PF = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: PURE
};
/* CONSTRUCTOR */
const C = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: IMPURE,
    prototype: O
};
/* PURE CONSTRUCTOR */
const PC = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: PURE,
    prototype: O
};
const ARRAY_TYPE = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: PURE,
    from: PF,
    of: PF,
    prototype: O
};
const INTL_MEMBER = {
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: PURE,
    supportedLocalesOf: PC
};
const knownGlobals = {
    // Placeholders for global objects to avoid shape mutations
    global: O,
    globalThis: O,
    self: O,
    window: O,
    // Common globals
    // @ts-ignore
    __proto__: null,
    [ValueProperties]: IMPURE,
    Array: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: IMPURE,
        from: O,
        isArray: PF,
        of: PF,
        prototype: O
    },
    ArrayBuffer: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        isView: PF,
        prototype: O
    },
    Atomics: O,
    BigInt: C,
    BigInt64Array: C,
    BigUint64Array: C,
    Boolean: PC,
    // @ts-ignore
    constructor: C,
    DataView: PC,
    Date: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        now: PF,
        parse: PF,
        prototype: O,
        UTC: PF
    },
    decodeURI: PF,
    decodeURIComponent: PF,
    encodeURI: PF,
    encodeURIComponent: PF,
    Error: PC,
    escape: PF,
    eval: O,
    EvalError: PC,
    Float32Array: ARRAY_TYPE,
    Float64Array: ARRAY_TYPE,
    Function: C,
    // @ts-ignore
    hasOwnProperty: O,
    Infinity: O,
    Int16Array: ARRAY_TYPE,
    Int32Array: ARRAY_TYPE,
    Int8Array: ARRAY_TYPE,
    isFinite: PF,
    isNaN: PF,
    // @ts-ignore
    isPrototypeOf: O,
    JSON: O,
    Map: PC,
    Math: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: IMPURE,
        abs: PF,
        acos: PF,
        acosh: PF,
        asin: PF,
        asinh: PF,
        atan: PF,
        atan2: PF,
        atanh: PF,
        cbrt: PF,
        ceil: PF,
        clz32: PF,
        cos: PF,
        cosh: PF,
        exp: PF,
        expm1: PF,
        floor: PF,
        fround: PF,
        hypot: PF,
        imul: PF,
        log: PF,
        log10: PF,
        log1p: PF,
        log2: PF,
        max: PF,
        min: PF,
        pow: PF,
        random: PF,
        round: PF,
        sign: PF,
        sin: PF,
        sinh: PF,
        sqrt: PF,
        tan: PF,
        tanh: PF,
        trunc: PF
    },
    NaN: O,
    Number: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        isFinite: PF,
        isInteger: PF,
        isNaN: PF,
        isSafeInteger: PF,
        parseFloat: PF,
        parseInt: PF,
        prototype: O
    },
    Object: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        create: PF,
        getNotifier: PF,
        getOwn: PF,
        getOwnPropertyDescriptor: PF,
        getOwnPropertyNames: PF,
        getOwnPropertySymbols: PF,
        getPrototypeOf: PF,
        is: PF,
        isExtensible: PF,
        isFrozen: PF,
        isSealed: PF,
        keys: PF,
        prototype: O
    },
    parseFloat: PF,
    parseInt: PF,
    Promise: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: IMPURE,
        all: PF,
        prototype: O,
        race: PF,
        resolve: PF
    },
    // @ts-ignore
    propertyIsEnumerable: O,
    Proxy: O,
    RangeError: PC,
    ReferenceError: PC,
    Reflect: O,
    RegExp: PC,
    Set: PC,
    SharedArrayBuffer: C,
    String: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        fromCharCode: PF,
        fromCodePoint: PF,
        prototype: O,
        raw: PF
    },
    Symbol: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: PURE,
        for: PF,
        keyFor: PF,
        prototype: O
    },
    SyntaxError: PC,
    // @ts-ignore
    toLocaleString: O,
    // @ts-ignore
    toString: O,
    TypeError: PC,
    Uint16Array: ARRAY_TYPE,
    Uint32Array: ARRAY_TYPE,
    Uint8Array: ARRAY_TYPE,
    Uint8ClampedArray: ARRAY_TYPE,
    // Technically, this is a global, but it needs special handling
    // undefined: ?,
    unescape: PF,
    URIError: PC,
    // @ts-ignore
    valueOf: O,
    WeakMap: PC,
    WeakSet: PC,
    // Additional globals shared by Node and Browser that are not strictly part of the language
    clearInterval: C,
    clearTimeout: C,
    console: O,
    Intl: {
        // @ts-ignore
        __proto__: null,
        [ValueProperties]: IMPURE,
        Collator: INTL_MEMBER,
        DateTimeFormat: INTL_MEMBER,
        ListFormat: INTL_MEMBER,
        NumberFormat: INTL_MEMBER,
        PluralRules: INTL_MEMBER,
        RelativeTimeFormat: INTL_MEMBER
    },
    setInterval: C,
    setTimeout: C,
    TextDecoder: C,
    TextEncoder: C,
    URL: C,
    URLSearchParams: C,
    // Browser specific globals
    AbortController: C,
    AbortSignal: C,
    addEventListener: O,
    alert: O,
    AnalyserNode: C,
    Animation: C,
    AnimationEvent: C,
    applicationCache: O,
    ApplicationCache: C,
    ApplicationCacheErrorEvent: C,
    atob: O,
    Attr: C,
    Audio: C,
    AudioBuffer: C,
    AudioBufferSourceNode: C,
    AudioContext: C,
    AudioDestinationNode: C,
    AudioListener: C,
    AudioNode: C,
    AudioParam: C,
    AudioProcessingEvent: C,
    AudioScheduledSourceNode: C,
    AudioWorkletNode: C,
    BarProp: C,
    BaseAudioContext: C,
    BatteryManager: C,
    BeforeUnloadEvent: C,
    BiquadFilterNode: C,
    Blob: C,
    BlobEvent: C,
    blur: O,
    BroadcastChannel: C,
    btoa: O,
    ByteLengthQueuingStrategy: C,
    Cache: C,
    caches: O,
    CacheStorage: C,
    cancelAnimationFrame: O,
    cancelIdleCallback: O,
    CanvasCaptureMediaStreamTrack: C,
    CanvasGradient: C,
    CanvasPattern: C,
    CanvasRenderingContext2D: C,
    ChannelMergerNode: C,
    ChannelSplitterNode: C,
    CharacterData: C,
    clientInformation: O,
    ClipboardEvent: C,
    close: O,
    closed: O,
    CloseEvent: C,
    Comment: C,
    CompositionEvent: C,
    confirm: O,
    ConstantSourceNode: C,
    ConvolverNode: C,
    CountQueuingStrategy: C,
    createImageBitmap: O,
    Credential: C,
    CredentialsContainer: C,
    crypto: O,
    Crypto: C,
    CryptoKey: C,
    CSS: C,
    CSSConditionRule: C,
    CSSFontFaceRule: C,
    CSSGroupingRule: C,
    CSSImportRule: C,
    CSSKeyframeRule: C,
    CSSKeyframesRule: C,
    CSSMediaRule: C,
    CSSNamespaceRule: C,
    CSSPageRule: C,
    CSSRule: C,
    CSSRuleList: C,
    CSSStyleDeclaration: C,
    CSSStyleRule: C,
    CSSStyleSheet: C,
    CSSSupportsRule: C,
    CustomElementRegistry: C,
    customElements: O,
    CustomEvent: C,
    DataTransfer: C,
    DataTransferItem: C,
    DataTransferItemList: C,
    defaultstatus: O,
    defaultStatus: O,
    DelayNode: C,
    DeviceMotionEvent: C,
    DeviceOrientationEvent: C,
    devicePixelRatio: O,
    dispatchEvent: O,
    document: O,
    Document: C,
    DocumentFragment: C,
    DocumentType: C,
    DOMError: C,
    DOMException: C,
    DOMImplementation: C,
    DOMMatrix: C,
    DOMMatrixReadOnly: C,
    DOMParser: C,
    DOMPoint: C,
    DOMPointReadOnly: C,
    DOMQuad: C,
    DOMRect: C,
    DOMRectReadOnly: C,
    DOMStringList: C,
    DOMStringMap: C,
    DOMTokenList: C,
    DragEvent: C,
    DynamicsCompressorNode: C,
    Element: C,
    ErrorEvent: C,
    Event: C,
    EventSource: C,
    EventTarget: C,
    external: O,
    fetch: O,
    File: C,
    FileList: C,
    FileReader: C,
    find: O,
    focus: O,
    FocusEvent: C,
    FontFace: C,
    FontFaceSetLoadEvent: C,
    FormData: C,
    frames: O,
    GainNode: C,
    Gamepad: C,
    GamepadButton: C,
    GamepadEvent: C,
    getComputedStyle: O,
    getSelection: O,
    HashChangeEvent: C,
    Headers: C,
    history: O,
    History: C,
    HTMLAllCollection: C,
    HTMLAnchorElement: C,
    HTMLAreaElement: C,
    HTMLAudioElement: C,
    HTMLBaseElement: C,
    HTMLBodyElement: C,
    HTMLBRElement: C,
    HTMLButtonElement: C,
    HTMLCanvasElement: C,
    HTMLCollection: C,
    HTMLContentElement: C,
    HTMLDataElement: C,
    HTMLDataListElement: C,
    HTMLDetailsElement: C,
    HTMLDialogElement: C,
    HTMLDirectoryElement: C,
    HTMLDivElement: C,
    HTMLDListElement: C,
    HTMLDocument: C,
    HTMLElement: C,
    HTMLEmbedElement: C,
    HTMLFieldSetElement: C,
    HTMLFontElement: C,
    HTMLFormControlsCollection: C,
    HTMLFormElement: C,
    HTMLFrameElement: C,
    HTMLFrameSetElement: C,
    HTMLHeadElement: C,
    HTMLHeadingElement: C,
    HTMLHRElement: C,
    HTMLHtmlElement: C,
    HTMLIFrameElement: C,
    HTMLImageElement: C,
    HTMLInputElement: C,
    HTMLLabelElement: C,
    HTMLLegendElement: C,
    HTMLLIElement: C,
    HTMLLinkElement: C,
    HTMLMapElement: C,
    HTMLMarqueeElement: C,
    HTMLMediaElement: C,
    HTMLMenuElement: C,
    HTMLMetaElement: C,
    HTMLMeterElement: C,
    HTMLModElement: C,
    HTMLObjectElement: C,
    HTMLOListElement: C,
    HTMLOptGroupElement: C,
    HTMLOptionElement: C,
    HTMLOptionsCollection: C,
    HTMLOutputElement: C,
    HTMLParagraphElement: C,
    HTMLParamElement: C,
    HTMLPictureElement: C,
    HTMLPreElement: C,
    HTMLProgressElement: C,
    HTMLQuoteElement: C,
    HTMLScriptElement: C,
    HTMLSelectElement: C,
    HTMLShadowElement: C,
    HTMLSlotElement: C,
    HTMLSourceElement: C,
    HTMLSpanElement: C,
    HTMLStyleElement: C,
    HTMLTableCaptionElement: C,
    HTMLTableCellElement: C,
    HTMLTableColElement: C,
    HTMLTableElement: C,
    HTMLTableRowElement: C,
    HTMLTableSectionElement: C,
    HTMLTemplateElement: C,
    HTMLTextAreaElement: C,
    HTMLTimeElement: C,
    HTMLTitleElement: C,
    HTMLTrackElement: C,
    HTMLUListElement: C,
    HTMLUnknownElement: C,
    HTMLVideoElement: C,
    IDBCursor: C,
    IDBCursorWithValue: C,
    IDBDatabase: C,
    IDBFactory: C,
    IDBIndex: C,
    IDBKeyRange: C,
    IDBObjectStore: C,
    IDBOpenDBRequest: C,
    IDBRequest: C,
    IDBTransaction: C,
    IDBVersionChangeEvent: C,
    IdleDeadline: C,
    IIRFilterNode: C,
    Image: C,
    ImageBitmap: C,
    ImageBitmapRenderingContext: C,
    ImageCapture: C,
    ImageData: C,
    indexedDB: O,
    innerHeight: O,
    innerWidth: O,
    InputEvent: C,
    IntersectionObserver: C,
    IntersectionObserverEntry: C,
    isSecureContext: O,
    KeyboardEvent: C,
    KeyframeEffect: C,
    length: O,
    localStorage: O,
    location: O,
    Location: C,
    locationbar: O,
    matchMedia: O,
    MediaDeviceInfo: C,
    MediaDevices: C,
    MediaElementAudioSourceNode: C,
    MediaEncryptedEvent: C,
    MediaError: C,
    MediaKeyMessageEvent: C,
    MediaKeySession: C,
    MediaKeyStatusMap: C,
    MediaKeySystemAccess: C,
    MediaList: C,
    MediaQueryList: C,
    MediaQueryListEvent: C,
    MediaRecorder: C,
    MediaSettingsRange: C,
    MediaSource: C,
    MediaStream: C,
    MediaStreamAudioDestinationNode: C,
    MediaStreamAudioSourceNode: C,
    MediaStreamEvent: C,
    MediaStreamTrack: C,
    MediaStreamTrackEvent: C,
    menubar: O,
    MessageChannel: C,
    MessageEvent: C,
    MessagePort: C,
    MIDIAccess: C,
    MIDIConnectionEvent: C,
    MIDIInput: C,
    MIDIInputMap: C,
    MIDIMessageEvent: C,
    MIDIOutput: C,
    MIDIOutputMap: C,
    MIDIPort: C,
    MimeType: C,
    MimeTypeArray: C,
    MouseEvent: C,
    moveBy: O,
    moveTo: O,
    MutationEvent: C,
    MutationObserver: C,
    MutationRecord: C,
    name: O,
    NamedNodeMap: C,
    NavigationPreloadManager: C,
    navigator: O,
    Navigator: C,
    NetworkInformation: C,
    Node: C,
    NodeFilter: O,
    NodeIterator: C,
    NodeList: C,
    Notification: C,
    OfflineAudioCompletionEvent: C,
    OfflineAudioContext: C,
    offscreenBuffering: O,
    OffscreenCanvas: C,
    open: O,
    openDatabase: O,
    Option: C,
    origin: O,
    OscillatorNode: C,
    outerHeight: O,
    outerWidth: O,
    PageTransitionEvent: C,
    pageXOffset: O,
    pageYOffset: O,
    PannerNode: C,
    parent: O,
    Path2D: C,
    PaymentAddress: C,
    PaymentRequest: C,
    PaymentRequestUpdateEvent: C,
    PaymentResponse: C,
    performance: O,
    Performance: C,
    PerformanceEntry: C,
    PerformanceLongTaskTiming: C,
    PerformanceMark: C,
    PerformanceMeasure: C,
    PerformanceNavigation: C,
    PerformanceNavigationTiming: C,
    PerformanceObserver: C,
    PerformanceObserverEntryList: C,
    PerformancePaintTiming: C,
    PerformanceResourceTiming: C,
    PerformanceTiming: C,
    PeriodicWave: C,
    Permissions: C,
    PermissionStatus: C,
    personalbar: O,
    PhotoCapabilities: C,
    Plugin: C,
    PluginArray: C,
    PointerEvent: C,
    PopStateEvent: C,
    postMessage: O,
    Presentation: C,
    PresentationAvailability: C,
    PresentationConnection: C,
    PresentationConnectionAvailableEvent: C,
    PresentationConnectionCloseEvent: C,
    PresentationConnectionList: C,
    PresentationReceiver: C,
    PresentationRequest: C,
    print: O,
    ProcessingInstruction: C,
    ProgressEvent: C,
    PromiseRejectionEvent: C,
    prompt: O,
    PushManager: C,
    PushSubscription: C,
    PushSubscriptionOptions: C,
    queueMicrotask: O,
    RadioNodeList: C,
    Range: C,
    ReadableStream: C,
    RemotePlayback: C,
    removeEventListener: O,
    Request: C,
    requestAnimationFrame: O,
    requestIdleCallback: O,
    resizeBy: O,
    ResizeObserver: C,
    ResizeObserverEntry: C,
    resizeTo: O,
    Response: C,
    RTCCertificate: C,
    RTCDataChannel: C,
    RTCDataChannelEvent: C,
    RTCDtlsTransport: C,
    RTCIceCandidate: C,
    RTCIceTransport: C,
    RTCPeerConnection: C,
    RTCPeerConnectionIceEvent: C,
    RTCRtpReceiver: C,
    RTCRtpSender: C,
    RTCSctpTransport: C,
    RTCSessionDescription: C,
    RTCStatsReport: C,
    RTCTrackEvent: C,
    screen: O,
    Screen: C,
    screenLeft: O,
    ScreenOrientation: C,
    screenTop: O,
    screenX: O,
    screenY: O,
    ScriptProcessorNode: C,
    scroll: O,
    scrollbars: O,
    scrollBy: O,
    scrollTo: O,
    scrollX: O,
    scrollY: O,
    SecurityPolicyViolationEvent: C,
    Selection: C,
    ServiceWorker: C,
    ServiceWorkerContainer: C,
    ServiceWorkerRegistration: C,
    sessionStorage: O,
    ShadowRoot: C,
    SharedWorker: C,
    SourceBuffer: C,
    SourceBufferList: C,
    speechSynthesis: O,
    SpeechSynthesisEvent: C,
    SpeechSynthesisUtterance: C,
    StaticRange: C,
    status: O,
    statusbar: O,
    StereoPannerNode: C,
    stop: O,
    Storage: C,
    StorageEvent: C,
    StorageManager: C,
    styleMedia: O,
    StyleSheet: C,
    StyleSheetList: C,
    SubtleCrypto: C,
    SVGAElement: C,
    SVGAngle: C,
    SVGAnimatedAngle: C,
    SVGAnimatedBoolean: C,
    SVGAnimatedEnumeration: C,
    SVGAnimatedInteger: C,
    SVGAnimatedLength: C,
    SVGAnimatedLengthList: C,
    SVGAnimatedNumber: C,
    SVGAnimatedNumberList: C,
    SVGAnimatedPreserveAspectRatio: C,
    SVGAnimatedRect: C,
    SVGAnimatedString: C,
    SVGAnimatedTransformList: C,
    SVGAnimateElement: C,
    SVGAnimateMotionElement: C,
    SVGAnimateTransformElement: C,
    SVGAnimationElement: C,
    SVGCircleElement: C,
    SVGClipPathElement: C,
    SVGComponentTransferFunctionElement: C,
    SVGDefsElement: C,
    SVGDescElement: C,
    SVGDiscardElement: C,
    SVGElement: C,
    SVGEllipseElement: C,
    SVGFEBlendElement: C,
    SVGFEColorMatrixElement: C,
    SVGFEComponentTransferElement: C,
    SVGFECompositeElement: C,
    SVGFEConvolveMatrixElement: C,
    SVGFEDiffuseLightingElement: C,
    SVGFEDisplacementMapElement: C,
    SVGFEDistantLightElement: C,
    SVGFEDropShadowElement: C,
    SVGFEFloodElement: C,
    SVGFEFuncAElement: C,
    SVGFEFuncBElement: C,
    SVGFEFuncGElement: C,
    SVGFEFuncRElement: C,
    SVGFEGaussianBlurElement: C,
    SVGFEImageElement: C,
    SVGFEMergeElement: C,
    SVGFEMergeNodeElement: C,
    SVGFEMorphologyElement: C,
    SVGFEOffsetElement: C,
    SVGFEPointLightElement: C,
    SVGFESpecularLightingElement: C,
    SVGFESpotLightElement: C,
    SVGFETileElement: C,
    SVGFETurbulenceElement: C,
    SVGFilterElement: C,
    SVGForeignObjectElement: C,
    SVGGElement: C,
    SVGGeometryElement: C,
    SVGGradientElement: C,
    SVGGraphicsElement: C,
    SVGImageElement: C,
    SVGLength: C,
    SVGLengthList: C,
    SVGLinearGradientElement: C,
    SVGLineElement: C,
    SVGMarkerElement: C,
    SVGMaskElement: C,
    SVGMatrix: C,
    SVGMetadataElement: C,
    SVGMPathElement: C,
    SVGNumber: C,
    SVGNumberList: C,
    SVGPathElement: C,
    SVGPatternElement: C,
    SVGPoint: C,
    SVGPointList: C,
    SVGPolygonElement: C,
    SVGPolylineElement: C,
    SVGPreserveAspectRatio: C,
    SVGRadialGradientElement: C,
    SVGRect: C,
    SVGRectElement: C,
    SVGScriptElement: C,
    SVGSetElement: C,
    SVGStopElement: C,
    SVGStringList: C,
    SVGStyleElement: C,
    SVGSVGElement: C,
    SVGSwitchElement: C,
    SVGSymbolElement: C,
    SVGTextContentElement: C,
    SVGTextElement: C,
    SVGTextPathElement: C,
    SVGTextPositioningElement: C,
    SVGTitleElement: C,
    SVGTransform: C,
    SVGTransformList: C,
    SVGTSpanElement: C,
    SVGUnitTypes: C,
    SVGUseElement: C,
    SVGViewElement: C,
    TaskAttributionTiming: C,
    Text: C,
    TextEvent: C,
    TextMetrics: C,
    TextTrack: C,
    TextTrackCue: C,
    TextTrackCueList: C,
    TextTrackList: C,
    TimeRanges: C,
    toolbar: O,
    top: O,
    Touch: C,
    TouchEvent: C,
    TouchList: C,
    TrackEvent: C,
    TransitionEvent: C,
    TreeWalker: C,
    UIEvent: C,
    ValidityState: C,
    visualViewport: O,
    VisualViewport: C,
    VTTCue: C,
    WaveShaperNode: C,
    WebAssembly: O,
    WebGL2RenderingContext: C,
    WebGLActiveInfo: C,
    WebGLBuffer: C,
    WebGLContextEvent: C,
    WebGLFramebuffer: C,
    WebGLProgram: C,
    WebGLQuery: C,
    WebGLRenderbuffer: C,
    WebGLRenderingContext: C,
    WebGLSampler: C,
    WebGLShader: C,
    WebGLShaderPrecisionFormat: C,
    WebGLSync: C,
    WebGLTexture: C,
    WebGLTransformFeedback: C,
    WebGLUniformLocation: C,
    WebGLVertexArrayObject: C,
    WebSocket: C,
    WheelEvent: C,
    Window: C,
    Worker: C,
    WritableStream: C,
    XMLDocument: C,
    XMLHttpRequest: C,
    XMLHttpRequestEventTarget: C,
    XMLHttpRequestUpload: C,
    XMLSerializer: C,
    XPathEvaluator: C,
    XPathExpression: C,
    XPathResult: C,
    XSLTProcessor: C
};
for (const global of ['window', 'global', 'self', 'globalThis']) {
    knownGlobals[global] = knownGlobals;
}
function getGlobalAtPath(path) {
    let currentGlobal = knownGlobals;
    for (const pathSegment of path) {
        if (typeof pathSegment !== 'string') {
            return null;
        }
        currentGlobal = currentGlobal[pathSegment];
        if (!currentGlobal) {
            return null;
        }
    }
    return currentGlobal[ValueProperties];
}
function isPureGlobal(path) {
    const globalAtPath = getGlobalAtPath(path);
    return globalAtPath !== null && globalAtPath.pure;
}
function isGlobalMember(path) {
    if (path.length === 1) {
        return path[0] === 'undefined' || getGlobalAtPath(path) !== null;
    }
    return getGlobalAtPath(path.slice(0, -1)) !== null;
}

class GlobalVariable extends Variable {
    constructor() {
        super(...arguments);
        this.isReassigned = true;
    }
    hasEffectsWhenAccessedAtPath(path) {
        return !isGlobalMember([this.name, ...path]);
    }
    hasEffectsWhenCalledAtPath(path) {
        return !isPureGlobal([this.name, ...path]);
    }
}

class Identifier$1 extends NodeBase {
    constructor() {
        super(...arguments);
        this.variable = null;
        this.bound = false;
    }
    addExportedVariables(variables, exportNamesByVariable) {
        if (this.variable !== null && exportNamesByVariable.has(this.variable)) {
            variables.push(this.variable);
        }
    }
    bind() {
        if (this.bound)
            return;
        this.bound = true;
        if (this.variable === null && isReference(this, this.parent)) {
            this.variable = this.scope.findVariable(this.name);
            this.variable.addReference(this);
        }
        if (this.variable !== null &&
            this.variable instanceof LocalVariable &&
            this.variable.additionalInitializers !== null) {
            this.variable.consolidateInitializers();
        }
    }
    declare(kind, init) {
        let variable;
        switch (kind) {
            case 'var':
                variable = this.scope.addDeclaration(this, this.context, init, true);
                break;
            case 'function':
                // in strict mode, functions are only hoisted within a scope but not across block scopes
                variable = this.scope.addDeclaration(this, this.context, init, false);
                break;
            case 'let':
            case 'const':
            case 'class':
                variable = this.scope.addDeclaration(this, this.context, init, false);
                break;
            case 'parameter':
                variable = this.scope.addParameterDeclaration(this);
                break;
            /* istanbul ignore next */
            default:
                /* istanbul ignore next */
                throw new Error(`Internal Error: Unexpected identifier kind ${kind}.`);
        }
        return [(this.variable = variable)];
    }
    deoptimizePath(path) {
        if (!this.bound)
            this.bind();
        if (path.length === 0 && !this.scope.contains(this.name)) {
            this.disallowImportReassignment();
        }
        this.variable.deoptimizePath(path);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (!this.bound)
            this.bind();
        return this.variable.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        if (!this.bound)
            this.bind();
        return this.variable.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
    }
    hasEffects() {
        return (this.context.options.treeshake.unknownGlobalSideEffects &&
            this.variable instanceof GlobalVariable &&
            this.variable.hasEffectsWhenAccessedAtPath(EMPTY_PATH));
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        return this.variable !== null && this.variable.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return !this.variable || this.variable.hasEffectsWhenAssignedAtPath(path, context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        return !this.variable || this.variable.hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (this.variable !== null) {
                this.context.includeVariable(this.variable);
            }
        }
    }
    includeCallArguments(context, args) {
        this.variable.includeCallArguments(context, args);
    }
    render(code, _options, { renderedParentType, isCalleeOfRenderedParent, isShorthandProperty } = BLANK) {
        if (this.variable) {
            const name = this.variable.getName();
            if (name !== this.name) {
                code.overwrite(this.start, this.end, name, {
                    contentOnly: true,
                    storeName: true
                });
                if (isShorthandProperty) {
                    code.prependRight(this.start, `${this.name}: `);
                }
            }
            // In strict mode, any variable named "eval" must be the actual "eval" function
            if (name === 'eval' &&
                renderedParentType === CallExpression &&
                isCalleeOfRenderedParent) {
                code.appendRight(this.start, '0, ');
            }
        }
    }
    disallowImportReassignment() {
        return this.context.error({
            code: 'ILLEGAL_REASSIGNMENT',
            message: `Illegal reassignment to import '${this.name}'`
        }, this.start);
    }
}

class RestElement extends NodeBase {
    constructor() {
        super(...arguments);
        this.declarationInit = null;
    }
    addExportedVariables(variables, exportNamesByVariable) {
        this.argument.addExportedVariables(variables, exportNamesByVariable);
    }
    bind() {
        super.bind();
        if (this.declarationInit !== null) {
            this.declarationInit.deoptimizePath([UnknownKey, UnknownKey]);
        }
    }
    declare(kind, init) {
        this.declarationInit = init;
        return this.argument.declare(kind, UNKNOWN_EXPRESSION);
    }
    deoptimizePath(path) {
        path.length === 0 && this.argument.deoptimizePath(EMPTY_PATH);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return path.length > 0 || this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context);
    }
}

class FunctionNode extends NodeBase {
    constructor() {
        super(...arguments);
        this.isPrototypeDeoptimized = false;
    }
    createScope(parentScope) {
        this.scope = new FunctionScope(parentScope, this.context);
    }
    deoptimizePath(path) {
        if (path.length === 1) {
            if (path[0] === 'prototype') {
                this.isPrototypeDeoptimized = true;
            }
            else if (path[0] === UnknownKey) {
                this.isPrototypeDeoptimized = true;
                // A reassignment of UNKNOWN_PATH is considered equivalent to having lost track
                // which means the return expression needs to be reassigned as well
                this.scope.getReturnExpression().deoptimizePath(UNKNOWN_PATH);
            }
        }
    }
    getReturnExpressionWhenCalledAtPath(path) {
        return path.length === 0 ? this.scope.getReturnExpression() : UNKNOWN_EXPRESSION;
    }
    hasEffects() {
        return this.id !== null && this.id.hasEffects();
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (path.length <= 1)
            return false;
        return path.length > 2 || path[0] !== 'prototype' || this.isPrototypeDeoptimized;
    }
    hasEffectsWhenAssignedAtPath(path) {
        if (path.length <= 1) {
            return false;
        }
        return path.length > 2 || path[0] !== 'prototype' || this.isPrototypeDeoptimized;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length > 0)
            return true;
        for (const param of this.params) {
            if (param.hasEffects(context))
                return true;
        }
        const thisInit = context.replacedVariableInits.get(this.scope.thisVariable);
        context.replacedVariableInits.set(this.scope.thisVariable, callOptions.withNew ? new UnknownObjectExpression() : UNKNOWN_EXPRESSION);
        const { brokenFlow, ignore } = context;
        context.ignore = {
            breaks: false,
            continues: false,
            labels: new Set(),
            returnAwaitYield: true
        };
        if (this.body.hasEffects(context))
            return true;
        context.brokenFlow = brokenFlow;
        if (thisInit) {
            context.replacedVariableInits.set(this.scope.thisVariable, thisInit);
        }
        else {
            context.replacedVariableInits.delete(this.scope.thisVariable);
        }
        context.ignore = ignore;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (this.id)
            this.id.include();
        const hasArguments = this.scope.argumentsVariable.included;
        for (const param of this.params) {
            if (!(param instanceof Identifier$1) || hasArguments) {
                param.include(context, includeChildrenRecursively);
            }
        }
        const { brokenFlow } = context;
        context.brokenFlow = BROKEN_FLOW_NONE;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    includeCallArguments(context, args) {
        this.scope.includeCallArguments(context, args);
    }
    initialise() {
        if (this.id !== null) {
            this.id.declare('function', this);
        }
        this.scope.addParameterVariables(this.params.map(param => param.declare('parameter', UNKNOWN_EXPRESSION)), this.params[this.params.length - 1] instanceof RestElement);
        this.body.addImplicitReturnExpressionToScope();
    }
    parseNode(esTreeNode) {
        this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, this.scope.hoistedBodyVarScope);
        super.parseNode(esTreeNode);
    }
}
FunctionNode.prototype.preventChildBlockScope = true;

class FunctionDeclaration extends FunctionNode {
    initialise() {
        super.initialise();
        if (this.id !== null) {
            this.id.variable.isId = true;
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.id !== null) {
            this.id = new this.context.nodeConstructors.Identifier(esTreeNode.id, this, this.scope
                .parent);
        }
        super.parseNode(esTreeNode);
    }
}

// The header ends at the first non-white-space after "default"
function getDeclarationStart(code, start) {
    return findNonWhiteSpace(code, findFirstOccurrenceOutsideComment(code, 'default', start) + 7);
}
function getIdInsertPosition(code, declarationKeyword, endMarker, start) {
    const declarationEnd = findFirstOccurrenceOutsideComment(code, declarationKeyword, start) + declarationKeyword.length;
    code = code.slice(declarationEnd, findFirstOccurrenceOutsideComment(code, endMarker, declarationEnd));
    const generatorStarPos = findFirstOccurrenceOutsideComment(code, '*');
    if (generatorStarPos === -1) {
        return declarationEnd;
    }
    return declarationEnd + generatorStarPos + 1;
}
class ExportDefaultDeclaration extends NodeBase {
    include(context, includeChildrenRecursively) {
        super.include(context, includeChildrenRecursively);
        if (includeChildrenRecursively) {
            this.context.includeVariable(this.variable);
        }
    }
    initialise() {
        const declaration = this.declaration;
        this.declarationName =
            (declaration.id && declaration.id.name) || this.declaration.name;
        this.variable = this.scope.addExportDefaultDeclaration(this.declarationName || this.context.getModuleName(), this, this.context);
        this.context.addExport(this);
    }
    render(code, options, nodeRenderOptions) {
        const { start, end } = nodeRenderOptions;
        const declarationStart = getDeclarationStart(code.original, this.start);
        if (this.declaration instanceof FunctionDeclaration) {
            this.renderNamedDeclaration(code, declarationStart, 'function', '(', this.declaration.id === null, options);
        }
        else if (this.declaration instanceof ClassDeclaration) {
            this.renderNamedDeclaration(code, declarationStart, 'class', '{', this.declaration.id === null, options);
        }
        else if (this.variable.getOriginalVariable() !== this.variable) {
            // Remove altogether to prevent re-declaring the same variable
            treeshakeNode(this, code, start, end);
            return;
        }
        else if (this.variable.included) {
            this.renderVariableDeclaration(code, declarationStart, options);
        }
        else {
            code.remove(this.start, declarationStart);
            this.declaration.render(code, options, {
                isCalleeOfRenderedParent: false,
                renderedParentType: ExpressionStatement
            });
            if (code.original[this.end - 1] !== ';') {
                code.appendLeft(this.end, ';');
            }
            return;
        }
        this.declaration.render(code, options);
    }
    renderNamedDeclaration(code, declarationStart, declarationKeyword, endMarker, needsId, options) {
        const name = this.variable.getName();
        // Remove `export default`
        code.remove(this.start, declarationStart);
        if (needsId) {
            code.appendLeft(getIdInsertPosition(code.original, declarationKeyword, endMarker, declarationStart), ` ${name}`);
        }
        if (options.format === 'system' &&
            this.declaration instanceof ClassDeclaration &&
            options.exportNamesByVariable.has(this.variable)) {
            code.appendLeft(this.end, ` ${getSystemExportStatement([this.variable], options)};`);
        }
    }
    renderVariableDeclaration(code, declarationStart, options) {
        const hasTrailingSemicolon = code.original.charCodeAt(this.end - 1) === 59; /*";"*/
        const systemExportNames = options.format === 'system' && options.exportNamesByVariable.get(this.variable);
        if (systemExportNames) {
            code.overwrite(this.start, declarationStart, `${options.varOrConst} ${this.variable.getName()} = exports('${systemExportNames[0]}', `);
            code.appendRight(hasTrailingSemicolon ? this.end - 1 : this.end, ')' + (hasTrailingSemicolon ? '' : ';'));
        }
        else {
            code.overwrite(this.start, declarationStart, `${options.varOrConst} ${this.variable.getName()} = `);
            if (!hasTrailingSemicolon) {
                code.appendLeft(this.end, ';');
            }
        }
    }
}
ExportDefaultDeclaration.prototype.needsBoundaries = true;

class UndefinedVariable extends Variable {
    constructor() {
        super('undefined');
    }
    getLiteralValueAtPath() {
        return undefined;
    }
}

class ExportDefaultVariable extends LocalVariable {
    constructor(name, exportDefaultDeclaration, context) {
        super(name, exportDefaultDeclaration, exportDefaultDeclaration.declaration, context);
        this.hasId = false;
        // Not initialised during construction
        this.originalId = null;
        this.originalVariableAndDeclarationModules = null;
        const declaration = exportDefaultDeclaration.declaration;
        if ((declaration instanceof FunctionDeclaration || declaration instanceof ClassDeclaration) &&
            declaration.id) {
            this.hasId = true;
            this.originalId = declaration.id;
        }
        else if (declaration instanceof Identifier$1) {
            this.originalId = declaration;
        }
    }
    addReference(identifier) {
        if (!this.hasId) {
            this.name = identifier.name;
        }
    }
    getAssignedVariableName() {
        return (this.originalId && this.originalId.name) || null;
    }
    getBaseVariableName() {
        const original = this.getOriginalVariable();
        if (original === this) {
            return super.getBaseVariableName();
        }
        else {
            return original.getBaseVariableName();
        }
    }
    getName() {
        const original = this.getOriginalVariable();
        if (original === this) {
            return super.getName();
        }
        else {
            return original.getName();
        }
    }
    getOriginalVariable() {
        return this.getOriginalVariableAndDeclarationModules().original;
    }
    getOriginalVariableAndDeclarationModules() {
        if (this.originalVariableAndDeclarationModules === null) {
            if (!this.originalId ||
                (!this.hasId &&
                    (this.originalId.variable.isReassigned ||
                        this.originalId.variable instanceof UndefinedVariable))) {
                this.originalVariableAndDeclarationModules = { modules: [], original: this };
            }
            else {
                const assignedOriginal = this.originalId.variable;
                if (assignedOriginal instanceof ExportDefaultVariable) {
                    const { modules, original } = assignedOriginal.getOriginalVariableAndDeclarationModules();
                    this.originalVariableAndDeclarationModules = {
                        modules: modules.concat(this.module),
                        original
                    };
                }
                else {
                    this.originalVariableAndDeclarationModules = {
                        modules: [this.module],
                        original: assignedOriginal
                    };
                }
            }
        }
        return this.originalVariableAndDeclarationModules;
    }
}

const MISSING_EXPORT_SHIM_VARIABLE = '_missingExportShim';

class ExportShimVariable extends Variable {
    constructor(module) {
        super(MISSING_EXPORT_SHIM_VARIABLE);
        this.module = module;
    }
}

class NamespaceVariable extends Variable {
    constructor(context, syntheticNamedExports) {
        super(context.getModuleName());
        this.memberVariables = null;
        this.mergedNamespaces = [];
        this.referencedEarly = false;
        this.references = [];
        this.context = context;
        this.module = context.module;
        this.syntheticNamedExports = syntheticNamedExports;
    }
    addReference(identifier) {
        this.references.push(identifier);
        this.name = identifier.name;
    }
    // This is only called if "UNKNOWN_PATH" is reassigned as in all other situations, either the
    // build fails due to an illegal namespace reassignment or MemberExpression already forwards
    // the reassignment to the right variable. This means we lost track of this variable and thus
    // need to reassign all exports.
    deoptimizePath() {
        const memberVariables = this.getMemberVariables();
        for (const key of Object.keys(memberVariables)) {
            memberVariables[key].deoptimizePath(UNKNOWN_PATH);
        }
    }
    getMemberVariables() {
        if (this.memberVariables) {
            return this.memberVariables;
        }
        const memberVariables = Object.create(null);
        for (const name of this.context.getExports().concat(this.context.getReexports())) {
            if (name[0] !== '*' && name !== this.module.info.syntheticNamedExports) {
                memberVariables[name] = this.context.traceExport(name);
            }
        }
        return (this.memberVariables = memberVariables);
    }
    include() {
        this.included = true;
        this.context.includeAllExports();
    }
    prepareNamespace(mergedNamespaces) {
        this.mergedNamespaces = mergedNamespaces;
        const moduleExecIndex = this.context.getModuleExecIndex();
        for (const identifier of this.references) {
            if (identifier.context.getModuleExecIndex() <= moduleExecIndex) {
                this.referencedEarly = true;
                break;
            }
        }
    }
    renderBlock(options) {
        const _ = options.compact ? '' : ' ';
        const n = options.compact ? '' : '\n';
        const t = options.indent;
        const memberVariables = this.getMemberVariables();
        const members = Object.keys(memberVariables).map(name => {
            const original = memberVariables[name];
            if (this.referencedEarly || original.isReassigned) {
                return `${t}get ${name}${_}()${_}{${_}return ${original.getName()}${options.compact ? '' : ';'}${_}}`;
            }
            const safeName = RESERVED_NAMES[name] ? `'${name}'` : name;
            return `${t}${safeName}: ${original.getName()}`;
        });
        if (options.namespaceToStringTag) {
            members.unshift(`${t}[Symbol.toStringTag]:${_}'Module'`);
        }
        const needsObjectAssign = this.mergedNamespaces.length > 0 || this.syntheticNamedExports;
        if (!needsObjectAssign)
            members.unshift(`${t}__proto__:${_}null`);
        let output = `{${n}${members.join(`,${n}`)}${n}}`;
        if (needsObjectAssign) {
            const assignmentArgs = ['/*#__PURE__*/Object.create(null)'];
            if (this.mergedNamespaces.length > 0) {
                assignmentArgs.push(...this.mergedNamespaces.map(variable => variable.getName()));
            }
            if (this.syntheticNamedExports) {
                assignmentArgs.push(this.module.getSyntheticNamespace().getName());
            }
            if (members.length > 0) {
                assignmentArgs.push(output);
            }
            output = `/*#__PURE__*/Object.assign(${assignmentArgs.join(`,${_}`)})`;
        }
        if (options.freeze) {
            output = `/*#__PURE__*/Object.freeze(${output})`;
        }
        const name = this.getName();
        output = `${options.varOrConst} ${name}${_}=${_}${output};`;
        if (options.format === 'system' && options.exportNamesByVariable.has(this)) {
            output += `${n}${getSystemExportStatement([this], options)};`;
        }
        return output;
    }
    renderFirst() {
        return this.referencedEarly;
    }
}
NamespaceVariable.prototype.isNamespace = true;

class SyntheticNamedExportVariable extends Variable {
    constructor(context, name, syntheticNamespace) {
        super(name);
        this.context = context;
        this.module = context.module;
        this.syntheticNamespace = syntheticNamespace;
    }
    getBaseVariable() {
        let baseVariable = this.syntheticNamespace;
        if (baseVariable instanceof ExportDefaultVariable) {
            baseVariable = baseVariable.getOriginalVariable();
        }
        if (baseVariable instanceof SyntheticNamedExportVariable) {
            baseVariable = baseVariable.getBaseVariable();
        }
        return baseVariable;
    }
    getBaseVariableName() {
        return this.syntheticNamespace.getBaseVariableName();
    }
    getName() {
        const name = this.name;
        return `${this.syntheticNamespace.getName()}${getPropertyAccess(name)}`;
    }
    include() {
        if (!this.included) {
            this.included = true;
            this.context.includeVariable(this.syntheticNamespace);
        }
    }
    setRenderNames(baseName, name) {
        super.setRenderNames(baseName, name);
    }
}
const getPropertyAccess = (name) => {
    return !RESERVED_NAMES[name] && /^(?!\d)[\w$]+$/.test(name)
        ? `.${name}`
        : `[${JSON.stringify(name)}]`;
};

function removeJsExtension(name) {
    return name.endsWith('.js') ? name.slice(0, -3) : name;
}

function getCompleteAmdId(options, chunkId) {
    if (!options.autoId) {
        return options.id || '';
    }
    else {
        return `${options.basePath ? options.basePath + '/' : ''}${removeJsExtension(chunkId)}`;
    }
}

const INTEROP_DEFAULT_VARIABLE = '_interopDefault';
const INTEROP_DEFAULT_LEGACY_VARIABLE = '_interopDefaultLegacy';
const INTEROP_NAMESPACE_VARIABLE = '_interopNamespace';
const INTEROP_NAMESPACE_DEFAULT_VARIABLE = '_interopNamespaceDefault';
const INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE = '_interopNamespaceDefaultOnly';
const defaultInteropHelpersByInteropType = {
    auto: INTEROP_DEFAULT_VARIABLE,
    default: null,
    defaultOnly: null,
    esModule: null,
    false: null,
    true: INTEROP_DEFAULT_LEGACY_VARIABLE
};
function isDefaultAProperty(interopType, externalLiveBindings) {
    return (interopType === 'esModule' ||
        (externalLiveBindings && (interopType === 'auto' || interopType === 'true')));
}
const namespaceInteropHelpersByInteropType = {
    auto: INTEROP_NAMESPACE_VARIABLE,
    default: INTEROP_NAMESPACE_DEFAULT_VARIABLE,
    defaultOnly: INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE,
    esModule: null,
    false: null,
    true: INTEROP_NAMESPACE_VARIABLE
};
function canDefaultBeTakenFromNamespace(interopType, externalLiveBindings) {
    return (isDefaultAProperty(interopType, externalLiveBindings) &&
        defaultInteropHelpersByInteropType[interopType] === INTEROP_DEFAULT_VARIABLE);
}
function getDefaultOnlyHelper() {
    return INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE;
}
function getHelpersBlock(usedHelpers, accessedGlobals, _, n, s, t, liveBindings, freeze, namespaceToStringTag) {
    return HELPER_NAMES.map(variable => usedHelpers.has(variable) || accessedGlobals.has(variable)
        ? HELPER_GENERATORS[variable](_, n, s, t, liveBindings, freeze, namespaceToStringTag, usedHelpers)
        : '').join('');
}
const HELPER_GENERATORS = {
    [INTEROP_DEFAULT_VARIABLE]: (_, n, s, _t, liveBindings) => `function ${INTEROP_DEFAULT_VARIABLE}${_}(e)${_}{${_}return ` +
        `e${_}&&${_}e.__esModule${_}?${_}` +
        `${liveBindings ? getDefaultLiveBinding(_) : getDefaultStatic(_)}${s}${_}}${n}${n}`,
    [INTEROP_DEFAULT_LEGACY_VARIABLE]: (_, n, s, _t, liveBindings) => `function ${INTEROP_DEFAULT_LEGACY_VARIABLE}${_}(e)${_}{${_}return ` +
        `e${_}&&${_}typeof e${_}===${_}'object'${_}&&${_}'default'${_}in e${_}?${_}` +
        `${liveBindings ? getDefaultLiveBinding(_) : getDefaultStatic(_)}${s}${_}}${n}${n}`,
    [INTEROP_NAMESPACE_VARIABLE]: (_, n, s, t, liveBindings, freeze, namespaceToStringTag, usedHelpers) => `function ${INTEROP_NAMESPACE_VARIABLE}(e)${_}{${n}` +
        (usedHelpers.has(INTEROP_NAMESPACE_DEFAULT_VARIABLE)
            ? `${t}return e${_}&&${_}e.__esModule${_}?${_}e${_}:${_}${INTEROP_NAMESPACE_DEFAULT_VARIABLE}(e)${s}${n}`
            : `${t}if${_}(e${_}&&${_}e.__esModule)${_}return e;${n}` +
                createNamespaceObject(_, n, t, t, liveBindings, freeze, namespaceToStringTag)) +
        `}${n}${n}`,
    [INTEROP_NAMESPACE_DEFAULT_VARIABLE]: (_, n, _s, t, liveBindings, freeze, namespaceToStringTag) => `function ${INTEROP_NAMESPACE_DEFAULT_VARIABLE}(e)${_}{${n}` +
        createNamespaceObject(_, n, t, t, liveBindings, freeze, namespaceToStringTag) +
        `}${n}${n}`,
    [INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE]: (_, n, _s, t, _liveBindings, freeze, namespaceToStringTag) => `function ${INTEROP_NAMESPACE_DEFAULT_ONLY_VARIABLE}(e)${_}{${n}` +
        `${t}return ${getFrozen(`{__proto__: null,${namespaceToStringTag ? `${_}[Symbol.toStringTag]:${_}'Module',` : ''}${_}'default':${_}e}`, freeze)};${n}` +
        `}${n}${n}`
};
function getDefaultLiveBinding(_) {
    return `e${_}:${_}{${_}'default':${_}e${_}}`;
}
function getDefaultStatic(_) {
    return `e['default']${_}:${_}e`;
}
function createNamespaceObject(_, n, t, i, liveBindings, freeze, namespaceToStringTag) {
    return (`${i}var n${_}=${_}${namespaceToStringTag
        ? `{__proto__:${_}null,${_}[Symbol.toStringTag]:${_}'Module'}`
        : 'Object.create(null)'};${n}` +
        `${i}if${_}(e)${_}{${n}` +
        `${i}${t}Object.keys(e).forEach(function${_}(k)${_}{${n}` +
        (liveBindings ? copyPropertyLiveBinding : copyPropertyStatic)(_, n, t, i + t + t) +
        `${i}${t}});${n}` +
        `${i}}${n}` +
        `${i}n['default']${_}=${_}e;${n}` +
        `${i}return ${getFrozen('n', freeze)};${n}`);
}
function copyPropertyLiveBinding(_, n, t, i) {
    return (`${i}if${_}(k${_}!==${_}'default')${_}{${n}` +
        `${i}${t}var d${_}=${_}Object.getOwnPropertyDescriptor(e,${_}k);${n}` +
        `${i}${t}Object.defineProperty(n,${_}k,${_}d.get${_}?${_}d${_}:${_}{${n}` +
        `${i}${t}${t}enumerable:${_}true,${n}` +
        `${i}${t}${t}get:${_}function${_}()${_}{${n}` +
        `${i}${t}${t}${t}return e[k];${n}` +
        `${i}${t}${t}}${n}` +
        `${i}${t}});${n}` +
        `${i}}${n}`);
}
function copyPropertyStatic(_, n, _t, i) {
    return `${i}n[k]${_}=${_}e[k];${n}`;
}
function getFrozen(fragment, freeze) {
    return freeze ? `Object.freeze(${fragment})` : fragment;
}
const HELPER_NAMES = Object.keys(HELPER_GENERATORS);

function getExportBlock(exports, dependencies, namedExportsMode, interop, compact, t, externalLiveBindings, mechanism = 'return ') {
    const _ = compact ? '' : ' ';
    const n = compact ? '' : '\n';
    if (!namedExportsMode) {
        return `${n}${n}${mechanism}${getSingleDefaultExport(exports, dependencies, interop, externalLiveBindings)};`;
    }
    let exportBlock = '';
    // star exports must always output first for precedence
    for (const { name, reexports } of dependencies) {
        if (reexports && namedExportsMode) {
            for (const specifier of reexports) {
                if (specifier.reexported === '*') {
                    if (exportBlock)
                        exportBlock += n;
                    if (specifier.needsLiveBinding) {
                        exportBlock +=
                            `Object.keys(${name}).forEach(function${_}(k)${_}{${n}` +
                                `${t}if${_}(k${_}!==${_}'default')${_}Object.defineProperty(exports,${_}k,${_}{${n}` +
                                `${t}${t}enumerable:${_}true,${n}` +
                                `${t}${t}get:${_}function${_}()${_}{${n}` +
                                `${t}${t}${t}return ${name}[k];${n}` +
                                `${t}${t}}${n}${t}});${n}});`;
                    }
                    else {
                        exportBlock +=
                            `Object.keys(${name}).forEach(function${_}(k)${_}{${n}` +
                                `${t}if${_}(k${_}!==${_}'default')${_}exports[k]${_}=${_}${name}[k];${n}});`;
                    }
                }
            }
        }
    }
    for (const { defaultVariableName, id, isChunk, name, namedExportsMode: depNamedExportsMode, namespaceVariableName, reexports } of dependencies) {
        if (reexports && namedExportsMode) {
            for (const specifier of reexports) {
                if (specifier.reexported !== '*') {
                    const importName = getReexportedImportName(name, specifier.imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, id, externalLiveBindings);
                    if (exportBlock)
                        exportBlock += n;
                    exportBlock +=
                        specifier.imported !== '*' && specifier.needsLiveBinding
                            ? `Object.defineProperty(exports,${_}'${specifier.reexported}',${_}{${n}` +
                                `${t}enumerable:${_}true,${n}` +
                                `${t}get:${_}function${_}()${_}{${n}` +
                                `${t}${t}return ${importName};${n}${t}}${n}});`
                            : `exports.${specifier.reexported}${_}=${_}${importName};`;
                }
            }
        }
    }
    for (const chunkExport of exports) {
        const lhs = `exports.${chunkExport.exported}`;
        const rhs = chunkExport.local;
        if (lhs !== rhs) {
            if (exportBlock)
                exportBlock += n;
            exportBlock += `${lhs}${_}=${_}${rhs};`;
        }
    }
    if (exportBlock) {
        return `${n}${n}${exportBlock}`;
    }
    return '';
}
function getSingleDefaultExport(exports, dependencies, interop, externalLiveBindings) {
    if (exports.length > 0) {
        return exports[0].local;
    }
    else {
        for (const { defaultVariableName, id, isChunk, name, namedExportsMode: depNamedExportsMode, namespaceVariableName, reexports } of dependencies) {
            if (reexports) {
                return getReexportedImportName(name, reexports[0].imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, id, externalLiveBindings);
            }
        }
    }
}
function getReexportedImportName(moduleVariableName, imported, depNamedExportsMode, isChunk, defaultVariableName, namespaceVariableName, interop, moduleId, externalLiveBindings) {
    if (imported === 'default') {
        if (!isChunk) {
            const moduleInterop = String(interop(moduleId));
            const variableName = defaultInteropHelpersByInteropType[moduleInterop]
                ? defaultVariableName
                : moduleVariableName;
            return isDefaultAProperty(moduleInterop, externalLiveBindings)
                ? `${variableName}['default']`
                : variableName;
        }
        return depNamedExportsMode ? `${moduleVariableName}['default']` : moduleVariableName;
    }
    if (imported === '*') {
        return (isChunk
            ? !depNamedExportsMode
            : namespaceInteropHelpersByInteropType[String(interop(moduleId))])
            ? namespaceVariableName
            : moduleVariableName;
    }
    return `${moduleVariableName}.${imported}`;
}
function getEsModuleExport(_) {
    return `Object.defineProperty(exports,${_}'__esModule',${_}{${_}value:${_}true${_}});`;
}
function getNamespaceToStringExport(_) {
    return `exports[Symbol.toStringTag]${_}=${_}'Module';`;
}
function getNamespaceMarkers(hasNamedExports, addEsModule, addNamespaceToStringTag, _, n) {
    let namespaceMarkers = '';
    if (hasNamedExports) {
        if (addEsModule) {
            namespaceMarkers += getEsModuleExport(_);
        }
        if (addNamespaceToStringTag) {
            if (namespaceMarkers) {
                namespaceMarkers += n;
            }
            namespaceMarkers += getNamespaceToStringExport(_);
        }
    }
    return namespaceMarkers;
}

function getInteropBlock(dependencies, varOrConst, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, _, n, s, t) {
    const neededInteropHelpers = new Set();
    const interopStatements = [];
    const addInteropStatement = (helperVariableName, helper, dependencyVariableName) => {
        neededInteropHelpers.add(helper);
        interopStatements.push(`${varOrConst} ${helperVariableName}${_}=${_}/*#__PURE__*/${helper}(${dependencyVariableName});`);
    };
    for (const { defaultVariableName, imports, id, isChunk, name, namedExportsMode, namespaceVariableName, reexports } of dependencies) {
        if (isChunk) {
            for (const { imported, reexported } of [
                ...(imports || []),
                ...(reexports || [])
            ]) {
                if (imported === '*' && reexported !== '*') {
                    if (!namedExportsMode) {
                        addInteropStatement(namespaceVariableName, getDefaultOnlyHelper(), name);
                    }
                    break;
                }
            }
        }
        else {
            const moduleInterop = String(interop(id));
            let hasDefault = false;
            let hasNamespace = false;
            for (const { imported, reexported } of [
                ...(imports || []),
                ...(reexports || [])
            ]) {
                let helper;
                let variableName;
                if (imported === 'default') {
                    if (!hasDefault) {
                        hasDefault = true;
                        if (defaultVariableName !== namespaceVariableName) {
                            variableName = defaultVariableName;
                            helper = defaultInteropHelpersByInteropType[moduleInterop];
                        }
                    }
                }
                else if (imported === '*' && reexported !== '*') {
                    if (!hasNamespace) {
                        hasNamespace = true;
                        helper = namespaceInteropHelpersByInteropType[moduleInterop];
                        variableName = namespaceVariableName;
                    }
                }
                if (helper) {
                    addInteropStatement(variableName, helper, name);
                }
            }
        }
    }
    return `${getHelpersBlock(neededInteropHelpers, accessedGlobals, _, n, s, t, externalLiveBindings, freeze, namespaceToStringTag)}${interopStatements.length > 0 ? `${interopStatements.join(n)}${n}${n}` : ''}`;
}

// AMD resolution will only respect the AMD baseUrl if the .js extension is omitted.
// The assumption is that this makes sense for all relative ids:
// https://requirejs.org/docs/api.html#jsfiles
function removeExtensionFromRelativeAmdId(id) {
    return id[0] === '.' ? removeJsExtension(id) : id;
}

const builtins$1 = {
    assert: true,
    buffer: true,
    console: true,
    constants: true,
    domain: true,
    events: true,
    http: true,
    https: true,
    os: true,
    path: true,
    process: true,
    punycode: true,
    querystring: true,
    stream: true,
    string_decoder: true,
    timers: true,
    tty: true,
    url: true,
    util: true,
    vm: true,
    zlib: true
};
function warnOnBuiltins(warn, dependencies) {
    const externalBuiltins = dependencies.map(({ id }) => id).filter(id => id in builtins$1);
    if (!externalBuiltins.length)
        return;
    const detail = externalBuiltins.length === 1
        ? `module ('${externalBuiltins[0]}')`
        : `modules (${externalBuiltins
            .slice(0, -1)
            .map(name => `'${name}'`)
            .join(', ')} and '${externalBuiltins.slice(-1)}')`;
    warn({
        code: 'MISSING_NODE_BUILTINS',
        message: `Creating a browser bundle that depends on Node.js built-in ${detail}. You might need to include https://github.com/ionic-team/rollup-plugin-node-polyfills`,
        modules: externalBuiltins
    });
}

function amd(magicString, { accessedGlobals, dependencies, exports, hasExports, id, indentString: t, intro, isEntryFacade, isModuleFacade, namedExportsMode, outro, varOrConst, warn }, { amd, compact, esModule, externalLiveBindings, freeze, interop, namespaceToStringTag, strict }) {
    warnOnBuiltins(warn, dependencies);
    const deps = dependencies.map(m => `'${removeExtensionFromRelativeAmdId(m.id)}'`);
    const args = dependencies.map(m => m.name);
    const n = compact ? '' : '\n';
    const s = compact ? '' : ';';
    const _ = compact ? '' : ' ';
    if (namedExportsMode && hasExports) {
        args.unshift(`exports`);
        deps.unshift(`'exports'`);
    }
    if (accessedGlobals.has('require')) {
        args.unshift('require');
        deps.unshift(`'require'`);
    }
    if (accessedGlobals.has('module')) {
        args.unshift('module');
        deps.unshift(`'module'`);
    }
    const completeAmdId = getCompleteAmdId(amd, id);
    const params = (completeAmdId ? `'${completeAmdId}',${_}` : ``) +
        (deps.length ? `[${deps.join(`,${_}`)}],${_}` : ``);
    const useStrict = strict ? `${_}'use strict';` : '';
    magicString.prepend(`${intro}${getInteropBlock(dependencies, varOrConst, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, _, n, s, t)}`);
    const exportBlock = getExportBlock(exports, dependencies, namedExportsMode, interop, compact, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, isEntryFacade && esModule, isModuleFacade && namespaceToStringTag, _, n);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return magicString
        .indent(t)
        .prepend(`${amd.define}(${params}function${_}(${args.join(`,${_}`)})${_}{${useStrict}${n}${n}`)
        .append(`${n}${n}});`);
}

function cjs(magicString, { accessedGlobals, dependencies, exports, hasExports, indentString: t, intro, isEntryFacade, isModuleFacade, namedExportsMode, outro, varOrConst }, { compact, esModule, externalLiveBindings, freeze, interop, namespaceToStringTag, strict }) {
    const n = compact ? '' : '\n';
    const s = compact ? '' : ';';
    const _ = compact ? '' : ' ';
    const useStrict = strict ? `'use strict';${n}${n}` : '';
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, isEntryFacade && esModule, isModuleFacade && namespaceToStringTag, _, n);
    if (namespaceMarkers) {
        namespaceMarkers += n + n;
    }
    const importBlock = getImportBlock(dependencies, compact, varOrConst, n, _);
    const interopBlock = getInteropBlock(dependencies, varOrConst, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, _, n, s, t);
    magicString.prepend(`${useStrict}${intro}${namespaceMarkers}${importBlock}${interopBlock}`);
    const exportBlock = getExportBlock(exports, dependencies, namedExportsMode, interop, compact, t, externalLiveBindings, `module.exports${_}=${_}`);
    return magicString.append(`${exportBlock}${outro}`);
}
function getImportBlock(dependencies, compact, varOrConst, n, _) {
    let importBlock = '';
    let definingVariable = false;
    for (const { id, name, reexports, imports } of dependencies) {
        if (!reexports && !imports) {
            if (importBlock) {
                importBlock += !compact || definingVariable ? `;${n}` : ',';
            }
            definingVariable = false;
            importBlock += `require('${id}')`;
        }
        else {
            importBlock +=
                compact && definingVariable ? ',' : `${importBlock ? `;${n}` : ''}${varOrConst} `;
            definingVariable = true;
            importBlock += `${name}${_}=${_}require('${id}')`;
        }
    }
    if (importBlock) {
        return `${importBlock};${n}${n}`;
    }
    return '';
}

function es(magicString, { intro, outro, dependencies, exports, varOrConst }, { compact }) {
    const _ = compact ? '' : ' ';
    const n = compact ? '' : '\n';
    const importBlock = getImportBlock$1(dependencies, _);
    if (importBlock.length > 0)
        intro += importBlock.join(n) + n + n;
    if (intro)
        magicString.prepend(intro);
    const exportBlock = getExportBlock$1(exports, _, varOrConst);
    if (exportBlock.length)
        magicString.append(n + n + exportBlock.join(n).trim());
    if (outro)
        magicString.append(outro);
    return magicString.trim();
}
function getImportBlock$1(dependencies, _) {
    const importBlock = [];
    for (const { id, reexports, imports, name } of dependencies) {
        if (!reexports && !imports) {
            importBlock.push(`import${_}'${id}';`);
            continue;
        }
        if (imports) {
            let defaultImport = null;
            let starImport = null;
            const importedNames = [];
            for (const specifier of imports) {
                if (specifier.imported === 'default') {
                    defaultImport = specifier;
                }
                else if (specifier.imported === '*') {
                    starImport = specifier;
                }
                else {
                    importedNames.push(specifier);
                }
            }
            if (starImport) {
                importBlock.push(`import${_}*${_}as ${starImport.local} from${_}'${id}';`);
            }
            if (defaultImport && importedNames.length === 0) {
                importBlock.push(`import ${defaultImport.local} from${_}'${id}';`);
            }
            else if (importedNames.length > 0) {
                importBlock.push(`import ${defaultImport ? `${defaultImport.local},${_}` : ''}{${_}${importedNames
                    .map(specifier => {
                    if (specifier.imported === specifier.local) {
                        return specifier.imported;
                    }
                    else {
                        return `${specifier.imported} as ${specifier.local}`;
                    }
                })
                    .join(`,${_}`)}${_}}${_}from${_}'${id}';`);
            }
        }
        if (reexports) {
            let starExport = null;
            const namespaceReexports = [];
            const namedReexports = [];
            for (const specifier of reexports) {
                if (specifier.reexported === '*') {
                    starExport = specifier;
                }
                else if (specifier.imported === '*') {
                    namespaceReexports.push(specifier);
                }
                else {
                    namedReexports.push(specifier);
                }
            }
            if (starExport) {
                importBlock.push(`export${_}*${_}from${_}'${id}';`);
            }
            if (namespaceReexports.length > 0) {
                if (!imports ||
                    !imports.some(specifier => specifier.imported === '*' && specifier.local === name)) {
                    importBlock.push(`import${_}*${_}as ${name} from${_}'${id}';`);
                }
                for (const specifier of namespaceReexports) {
                    importBlock.push(`export${_}{${_}${name === specifier.reexported ? name : `${name} as ${specifier.reexported}`} };`);
                }
            }
            if (namedReexports.length > 0) {
                importBlock.push(`export${_}{${_}${namedReexports
                    .map(specifier => {
                    if (specifier.imported === specifier.reexported) {
                        return specifier.imported;
                    }
                    else {
                        return `${specifier.imported} as ${specifier.reexported}`;
                    }
                })
                    .join(`,${_}`)}${_}}${_}from${_}'${id}';`);
            }
        }
    }
    return importBlock;
}
function getExportBlock$1(exports, _, varOrConst) {
    const exportBlock = [];
    const exportDeclaration = [];
    for (const specifier of exports) {
        if (specifier.exported === 'default') {
            exportBlock.push(`export default ${specifier.local};`);
        }
        else {
            if (specifier.expression) {
                exportBlock.push(`${varOrConst} ${specifier.local}${_}=${_}${specifier.expression};`);
            }
            exportDeclaration.push(specifier.exported === specifier.local
                ? specifier.local
                : `${specifier.local} as ${specifier.exported}`);
        }
    }
    if (exportDeclaration.length) {
        exportBlock.push(`export${_}{${_}${exportDeclaration.join(`,${_}`)}${_}};`);
    }
    return exportBlock;
}

function spaces(i) {
    let result = '';
    while (i--)
        result += ' ';
    return result;
}
function tabsToSpaces(str) {
    return str.replace(/^\t+/, match => match.split('\t').join('  '));
}
function getCodeFrame(source, line, column) {
    let lines = source.split('\n');
    const frameStart = Math.max(0, line - 3);
    let frameEnd = Math.min(line + 2, lines.length);
    lines = lines.slice(frameStart, frameEnd);
    while (!/\S/.test(lines[lines.length - 1])) {
        lines.pop();
        frameEnd -= 1;
    }
    const digits = String(frameEnd).length;
    return lines
        .map((str, i) => {
        const isErrorLine = frameStart + i + 1 === line;
        let lineNum = String(i + frameStart + 1);
        while (lineNum.length < digits)
            lineNum = ` ${lineNum}`;
        if (isErrorLine) {
            const indicator = spaces(digits + 2 + tabsToSpaces(str.slice(0, column)).length) + '^';
            return `${lineNum}: ${tabsToSpaces(str)}\n${indicator}`;
        }
        return `${lineNum}: ${tabsToSpaces(str)}`;
    })
        .join('\n');
}

function sanitizeFileName(name) {
    return name.replace(/[\0?*]/g, '_');
}

function getAliasName(id) {
    const base = basename(id);
    return base.substr(0, base.length - extname(id).length);
}
function relativeId(id) {
    if (typeof process === 'undefined' || !isAbsolute(id))
        return id;
    return relative$1(process.cwd(), id);
}
function isPlainPathFragment(name) {
    // not starting with "/", "./", "../"
    return (name[0] !== '/' &&
        !(name[0] === '.' && (name[1] === '/' || name[1] === '.')) &&
        sanitizeFileName(name) === name &&
        !isAbsolute(name));
}

function error(base) {
    if (!(base instanceof Error))
        base = Object.assign(new Error(base.message), base);
    throw base;
}
function augmentCodeLocation(props, pos, source, id) {
    if (typeof pos === 'object') {
        const { line, column } = pos;
        props.loc = { file: id, line, column };
    }
    else {
        props.pos = pos;
        const { line, column } = locate(source, pos, { offsetLine: 1 });
        props.loc = { file: id, line, column };
    }
    if (props.frame === undefined) {
        const { line, column } = props.loc;
        props.frame = getCodeFrame(source, line, column);
    }
}
var Errors;
(function (Errors) {
    Errors["ASSET_NOT_FINALISED"] = "ASSET_NOT_FINALISED";
    Errors["ASSET_NOT_FOUND"] = "ASSET_NOT_FOUND";
    Errors["ASSET_SOURCE_ALREADY_SET"] = "ASSET_SOURCE_ALREADY_SET";
    Errors["ASSET_SOURCE_MISSING"] = "ASSET_SOURCE_MISSING";
    Errors["BAD_LOADER"] = "BAD_LOADER";
    Errors["CANNOT_EMIT_FROM_OPTIONS_HOOK"] = "CANNOT_EMIT_FROM_OPTIONS_HOOK";
    Errors["CHUNK_NOT_GENERATED"] = "CHUNK_NOT_GENERATED";
    Errors["DEPRECATED_FEATURE"] = "DEPRECATED_FEATURE";
    Errors["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    Errors["FILE_NAME_CONFLICT"] = "FILE_NAME_CONFLICT";
    Errors["INPUT_HOOK_IN_OUTPUT_PLUGIN"] = "INPUT_HOOK_IN_OUTPUT_PLUGIN";
    Errors["INVALID_CHUNK"] = "INVALID_CHUNK";
    Errors["INVALID_EXPORT_OPTION"] = "INVALID_EXPORT_OPTION";
    Errors["INVALID_EXTERNAL_ID"] = "INVALID_EXTERNAL_ID";
    Errors["INVALID_OPTION"] = "INVALID_OPTION";
    Errors["INVALID_PLUGIN_HOOK"] = "INVALID_PLUGIN_HOOK";
    Errors["INVALID_ROLLUP_PHASE"] = "INVALID_ROLLUP_PHASE";
    Errors["MISSING_IMPLICIT_DEPENDANT"] = "MISSING_IMPLICIT_DEPENDANT";
    Errors["MIXED_EXPORTS"] = "MIXED_EXPORTS";
    Errors["NAMESPACE_CONFLICT"] = "NAMESPACE_CONFLICT";
    Errors["NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE"] = "NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE";
    Errors["PLUGIN_ERROR"] = "PLUGIN_ERROR";
    Errors["PREFER_NAMED_EXPORTS"] = "PREFER_NAMED_EXPORTS";
    Errors["UNEXPECTED_NAMED_IMPORT"] = "UNEXPECTED_NAMED_IMPORT";
    Errors["UNRESOLVED_ENTRY"] = "UNRESOLVED_ENTRY";
    Errors["UNRESOLVED_IMPORT"] = "UNRESOLVED_IMPORT";
    Errors["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    Errors["EXTERNAL_SYNTHETIC_EXPORTS"] = "EXTERNAL_SYNTHETIC_EXPORTS";
    Errors["SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT"] = "SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT";
})(Errors || (Errors = {}));
function errAssetNotFinalisedForFileName(name) {
    return {
        code: Errors.ASSET_NOT_FINALISED,
        message: `Plugin error - Unable to get file name for asset "${name}". Ensure that the source is set and that generate is called first.`
    };
}
function errCannotEmitFromOptionsHook() {
    return {
        code: Errors.CANNOT_EMIT_FROM_OPTIONS_HOOK,
        message: `Cannot emit files or set asset sources in the "outputOptions" hook, use the "renderStart" hook instead.`
    };
}
function errChunkNotGeneratedForFileName(name) {
    return {
        code: Errors.CHUNK_NOT_GENERATED,
        message: `Plugin error - Unable to get file name for chunk "${name}". Ensure that generate is called first.`
    };
}
function errAssetReferenceIdNotFoundForSetSource(assetReferenceId) {
    return {
        code: Errors.ASSET_NOT_FOUND,
        message: `Plugin error - Unable to set the source for unknown asset "${assetReferenceId}".`
    };
}
function errAssetSourceAlreadySet(name) {
    return {
        code: Errors.ASSET_SOURCE_ALREADY_SET,
        message: `Unable to set the source for asset "${name}", source already set.`
    };
}
function errNoAssetSourceSet(assetName) {
    return {
        code: Errors.ASSET_SOURCE_MISSING,
        message: `Plugin error creating asset "${assetName}" - no asset source set.`
    };
}
function errBadLoader(id) {
    return {
        code: Errors.BAD_LOADER,
        message: `Error loading ${relativeId(id)}: plugin load hook should return a string, a { code, map } object, or nothing/null`
    };
}
function errDeprecation(deprecation) {
    return {
        code: Errors.DEPRECATED_FEATURE,
        ...(typeof deprecation === 'string' ? { message: deprecation } : deprecation)
    };
}
function errFileReferenceIdNotFoundForFilename(assetReferenceId) {
    return {
        code: Errors.FILE_NOT_FOUND,
        message: `Plugin error - Unable to get file name for unknown file "${assetReferenceId}".`
    };
}
function errFileNameConflict(fileName) {
    return {
        code: Errors.FILE_NAME_CONFLICT,
        message: `The emitted file "${fileName}" overwrites a previously emitted file of the same name.`
    };
}
function errInputHookInOutputPlugin(pluginName, hookName) {
    return {
        code: Errors.INPUT_HOOK_IN_OUTPUT_PLUGIN,
        message: `The "${hookName}" hook used by the output plugin ${pluginName} is a build time hook and will not be run for that plugin. Either this plugin cannot be used as an output plugin, or it should have an option to configure it as an output plugin.`
    };
}
function errCannotAssignModuleToChunk(moduleId, assignToAlias, currentAlias) {
    return {
        code: Errors.INVALID_CHUNK,
        message: `Cannot assign ${relativeId(moduleId)} to the "${assignToAlias}" chunk as it is already in the "${currentAlias}" chunk.`
    };
}
function errInvalidExportOptionValue(optionValue) {
    return {
        code: Errors.INVALID_EXPORT_OPTION,
        message: `"output.exports" must be "default", "named", "none", "auto", or left unspecified (defaults to "auto"), received "${optionValue}"`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errIncompatibleExportOptionValue(optionValue, keys, entryModule) {
    return {
        code: 'INVALID_EXPORT_OPTION',
        message: `"${optionValue}" was specified for "output.exports", but entry module "${relativeId(entryModule)}" has the following exports: ${keys.join(', ')}`
    };
}
function errInternalIdCannotBeExternal(source, importer) {
    return {
        code: Errors.INVALID_EXTERNAL_ID,
        message: `'${source}' is imported as an external by ${relativeId(importer)}, but is already an existing non-external module id.`
    };
}
function errInvalidOption(option, explanation) {
    return {
        code: Errors.INVALID_OPTION,
        message: `Invalid value for option "${option}" - ${explanation}.`
    };
}
function errInvalidRollupPhaseForAddWatchFile() {
    return {
        code: Errors.INVALID_ROLLUP_PHASE,
        message: `Cannot call addWatchFile after the build has finished.`
    };
}
function errInvalidRollupPhaseForChunkEmission() {
    return {
        code: Errors.INVALID_ROLLUP_PHASE,
        message: `Cannot emit chunks after module loading has finished.`
    };
}
function errImplicitDependantCannotBeExternal(unresolvedId, implicitlyLoadedBefore) {
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(unresolvedId)}" that should be implicitly loaded before "${relativeId(implicitlyLoadedBefore)}" cannot be external.`
    };
}
function errUnresolvedImplicitDependant(unresolvedId, implicitlyLoadedBefore) {
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(unresolvedId)}" that should be implicitly loaded before "${relativeId(implicitlyLoadedBefore)}" could not be resolved.`
    };
}
function errImplicitDependantIsNotIncluded(module) {
    const implicitDependencies = Array.from(module.implicitlyLoadedBefore, dependency => relativeId(dependency.id)).sort();
    return {
        code: Errors.MISSING_IMPLICIT_DEPENDANT,
        message: `Module "${relativeId(module.id)}" that should be implicitly loaded before "${implicitDependencies.length === 1
            ? implicitDependencies[0]
            : `${implicitDependencies.slice(0, -1).join('", "')}" and "${implicitDependencies.slice(-1)[0]}`}" is not included in the module graph. Either it was not imported by an included module or only via a tree-shaken dynamic import, or no imported bindings were used and it had otherwise no side-effects.`
    };
}
function errMixedExport(facadeModuleId, name) {
    return {
        code: Errors.MIXED_EXPORTS,
        id: facadeModuleId,
        message: `Entry module "${relativeId(facadeModuleId)}" is using named and default exports together. Consumers of your bundle will have to use \`${name || 'chunk'}["default"]\` to access the default export, which may not be what you want. Use \`output.exports: "named"\` to disable this warning`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errNamespaceConflict(name, reexportingModule, additionalExportAllModule) {
    return {
        code: Errors.NAMESPACE_CONFLICT,
        message: `Conflicting namespaces: ${relativeId(reexportingModule.id)} re-exports '${name}' from both ${relativeId(reexportingModule.exportsAll[name])} and ${relativeId(additionalExportAllModule.exportsAll[name])} (will be ignored)`,
        name,
        reexporter: reexportingModule.id,
        sources: [reexportingModule.exportsAll[name], additionalExportAllModule.exportsAll[name]]
    };
}
function errNoTransformMapOrAstWithoutCode(pluginName) {
    return {
        code: Errors.NO_TRANSFORM_MAP_OR_AST_WITHOUT_CODE,
        message: `The plugin "${pluginName}" returned a "map" or "ast" without returning ` +
            'a "code". This will be ignored.'
    };
}
function errPreferNamedExports(facadeModuleId) {
    const file = relativeId(facadeModuleId);
    return {
        code: Errors.PREFER_NAMED_EXPORTS,
        id: facadeModuleId,
        message: `Entry module "${file}" is implicitly using "default" export mode, which means for CommonJS output that its default export is assigned to "module.exports". For many tools, such CommonJS output will not be interchangeable with the original ES module. If this is intended, explicitly set "output.exports" to either "auto" or "default", otherwise you might want to consider changing the signature of "${file}" to use named exports only.`,
        url: `https://rollupjs.org/guide/en/#outputexports`
    };
}
function errUnexpectedNamedImport(id, imported, isReexport) {
    const importType = isReexport ? 'reexport' : 'import';
    return {
        code: Errors.UNEXPECTED_NAMED_IMPORT,
        id,
        message: `The named export "${imported}" was ${importType}ed from the external module ${relativeId(id)} even though its interop type is "defaultOnly". Either remove or change this ${importType} or change the value of the "output.interop" option.`,
        url: 'https://rollupjs.org/guide/en/#outputinterop'
    };
}
function errUnexpectedNamespaceReexport(id) {
    return {
        code: Errors.UNEXPECTED_NAMED_IMPORT,
        id,
        message: `There was a namespace "*" reexport from the external module ${relativeId(id)} even though its interop type is "defaultOnly". This will be ignored as namespace reexports only reexport named exports. If this is not intended, either remove or change this reexport or change the value of the "output.interop" option.`,
        url: 'https://rollupjs.org/guide/en/#outputinterop'
    };
}
function errEntryCannotBeExternal(unresolvedId) {
    return {
        code: Errors.UNRESOLVED_ENTRY,
        message: `Entry module cannot be external (${relativeId(unresolvedId)}).`
    };
}
function errUnresolvedEntry(unresolvedId) {
    return {
        code: Errors.UNRESOLVED_ENTRY,
        message: `Could not resolve entry module (${relativeId(unresolvedId)}).`
    };
}
function errUnresolvedImport(source, importer) {
    return {
        code: Errors.UNRESOLVED_IMPORT,
        message: `Could not resolve '${source}' from ${relativeId(importer)}`
    };
}
function errUnresolvedImportTreatedAsExternal(source, importer) {
    return {
        code: Errors.UNRESOLVED_IMPORT,
        importer: relativeId(importer),
        message: `'${source}' is imported by ${relativeId(importer)}, but could not be resolved – treating it as an external dependency`,
        source,
        url: 'https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency'
    };
}
function errExternalSyntheticExports(source, importer) {
    return {
        code: Errors.EXTERNAL_SYNTHETIC_EXPORTS,
        importer: relativeId(importer),
        message: `External '${source}' can not have 'syntheticNamedExports' enabled.`,
        source
    };
}
function errFailedValidation(message) {
    return {
        code: Errors.VALIDATION_ERROR,
        message
    };
}
function warnDeprecation(deprecation, activeDeprecation, options) {
    warnDeprecationWithOptions(deprecation, activeDeprecation, options.onwarn, options.strictDeprecations);
}
function warnDeprecationWithOptions(deprecation, activeDeprecation, warn, strictDeprecations) {
    if (activeDeprecation || strictDeprecations) {
        const warning = errDeprecation(deprecation);
        if (strictDeprecations) {
            return error(warning);
        }
        warn(warning);
    }
}

// Generate strings which dereference dotted properties, but use array notation `['prop-deref']`
// if the property name isn't trivial
const shouldUseDot = /^[a-zA-Z$_][a-zA-Z0-9$_]*$/;
function property(prop) {
    return shouldUseDot.test(prop) ? `.${prop}` : `['${prop}']`;
}
function keypath(keypath) {
    return keypath
        .split('.')
        .map(property)
        .join('');
}

function setupNamespace(name, root, globals, compact) {
    const _ = compact ? '' : ' ';
    const parts = name.split('.');
    parts[0] = (typeof globals === 'function' ? globals(parts[0]) : globals[parts[0]]) || parts[0];
    parts.pop();
    let acc = root;
    return (parts
        .map(part => ((acc += property(part)), `${acc}${_}=${_}${acc}${_}||${_}{}${compact ? '' : ';'}`))
        .join(compact ? ',' : '\n') + (compact && parts.length ? ';' : '\n'));
}
function assignToDeepVariable(deepName, root, globals, compact, assignment) {
    const _ = compact ? '' : ' ';
    const parts = deepName.split('.');
    parts[0] = (typeof globals === 'function' ? globals(parts[0]) : globals[parts[0]]) || parts[0];
    const last = parts.pop();
    let acc = root;
    let deepAssignment = parts
        .map(part => ((acc += property(part)), `${acc}${_}=${_}${acc}${_}||${_}{}`))
        .concat(`${acc}${property(last)}`)
        .join(`,${_}`)
        .concat(`${_}=${_}${assignment}`);
    if (parts.length > 0) {
        deepAssignment = `(${deepAssignment})`;
    }
    return deepAssignment;
}

function trimEmptyImports(dependencies) {
    let i = dependencies.length;
    while (i--) {
        const { imports, reexports } = dependencies[i];
        if (imports || reexports) {
            return dependencies.slice(0, i + 1);
        }
    }
    return [];
}

const thisProp = (name) => `this${keypath(name)}`;
function iife(magicString, { accessedGlobals, dependencies, exports, hasExports, indentString: t, intro, namedExportsMode, outro, varOrConst, warn }, { compact, esModule, extend, freeze, externalLiveBindings, globals, interop, name, namespaceToStringTag, strict }) {
    const _ = compact ? '' : ' ';
    const s = compact ? '' : ';';
    const n = compact ? '' : '\n';
    const isNamespaced = name && name.indexOf('.') !== -1;
    const useVariableAssignment = !extend && !isNamespaced;
    if (name && useVariableAssignment && !isLegal(name)) {
        return error({
            code: 'ILLEGAL_IDENTIFIER_AS_NAME',
            message: `Given name "${name}" is not a legal JS identifier. If you need this, you can try "output.extend: true".`
        });
    }
    warnOnBuiltins(warn, dependencies);
    const external = trimEmptyImports(dependencies);
    const deps = external.map(dep => dep.globalName || 'null');
    const args = external.map(m => m.name);
    if (hasExports && !name) {
        warn({
            code: 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT',
            message: `If you do not supply "output.name", you may not be able to access the exports of an IIFE bundle.`
        });
    }
    if (namedExportsMode && hasExports) {
        if (extend) {
            deps.unshift(`${thisProp(name)}${_}=${_}${thisProp(name)}${_}||${_}{}`);
            args.unshift('exports');
        }
        else {
            deps.unshift('{}');
            args.unshift('exports');
        }
    }
    const useStrict = strict ? `${t}'use strict';${n}` : '';
    const interopBlock = getInteropBlock(dependencies, varOrConst, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, _, n, s, t);
    magicString.prepend(`${intro}${interopBlock}`);
    let wrapperIntro = `(function${_}(${args.join(`,${_}`)})${_}{${n}${useStrict}${n}`;
    if (hasExports) {
        if (name && !(extend && namedExportsMode)) {
            wrapperIntro =
                (useVariableAssignment ? `${varOrConst} ${name}` : thisProp(name)) +
                    `${_}=${_}${wrapperIntro}`;
        }
        if (isNamespaced) {
            wrapperIntro = setupNamespace(name, 'this', globals, compact) + wrapperIntro;
        }
    }
    let wrapperOutro = `${n}${n}}(${deps.join(`,${_}`)}));`;
    if (hasExports && !extend && namedExportsMode) {
        wrapperOutro = `${n}${n}${t}return exports;${wrapperOutro}`;
    }
    const exportBlock = getExportBlock(exports, dependencies, namedExportsMode, interop, compact, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, esModule, namespaceToStringTag, _, n);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return magicString.indent(t).prepend(wrapperIntro).append(wrapperOutro);
}

function getStarExcludes({ dependencies, exports }) {
    const starExcludes = new Set(exports.map(expt => expt.exported));
    if (!starExcludes.has('default'))
        starExcludes.add('default');
    // also include reexport names
    for (const { reexports } of dependencies) {
        if (reexports) {
            for (const reexport of reexports) {
                if (reexport.imported !== '*' && !starExcludes.has(reexport.reexported))
                    starExcludes.add(reexport.reexported);
            }
        }
    }
    return starExcludes;
}
const getStarExcludesBlock = (starExcludes, varOrConst, _, t, n) => starExcludes
    ? `${n}${t}${varOrConst} _starExcludes${_}=${_}{${_}${[...starExcludes]
        .map(prop => `${prop}:${_}1`)
        .join(`,${_}`)}${_}};`
    : '';
const getImportBindingsBlock = (importBindings, _, t, n) => (importBindings.length ? `${n}${t}var ${importBindings.join(`,${_}`)};` : '');
function getExportsBlock(exports, _, t, n) {
    if (exports.length === 0) {
        return '';
    }
    if (exports.length === 1) {
        return `${t}${t}${t}exports('${exports[0].name}',${_}${exports[0].value});${n}${n}`;
    }
    return (`${t}${t}${t}exports({${n}` +
        exports.map(({ name, value }) => `${t}${t}${t}${t}${name}:${_}${value}`).join(`,${n}`) +
        `${n}${t}${t}${t}});${n}${n}`);
}
const getHoistedExportsBlock = (exports, _, t, n) => getExportsBlock(exports
    .filter(expt => expt.hoisted || expt.uninitialized)
    .map(expt => ({ name: expt.exported, value: expt.uninitialized ? 'void 0' : expt.local })), _, t, n);
const getMissingExportsBlock = (exports, _, t, n) => getExportsBlock(exports
    .filter(expt => expt.local === MISSING_EXPORT_SHIM_VARIABLE)
    .map(expt => ({ name: expt.exported, value: MISSING_EXPORT_SHIM_VARIABLE })), _, t, n);
const getSyntheticExportsBlock = (exports, _, t, n) => getExportsBlock(exports
    .filter(expt => expt.expression)
    .map(expt => ({ name: expt.exported, value: expt.local })), _, t, n);
function system(magicString, { accessedGlobals, dependencies, exports, hasExports, indentString: t, intro, outro, usesTopLevelAwait, varOrConst }, options) {
    const n = options.compact ? '' : '\n';
    const _ = options.compact ? '' : ' ';
    const dependencyIds = dependencies.map(m => `'${m.id}'`);
    const importBindings = [];
    let starExcludes;
    const setters = [];
    for (const { imports, reexports } of dependencies) {
        const setter = [];
        if (imports) {
            for (const specifier of imports) {
                importBindings.push(specifier.local);
                if (specifier.imported === '*') {
                    setter.push(`${specifier.local}${_}=${_}module;`);
                }
                else {
                    setter.push(`${specifier.local}${_}=${_}module.${specifier.imported};`);
                }
            }
        }
        if (reexports) {
            let createdSetter = false;
            // bulk-reexport form
            if (reexports.length > 1 ||
                (reexports.length === 1 &&
                    (reexports[0].reexported === '*' || reexports[0].imported === '*'))) {
                // star reexports
                for (const specifier of reexports) {
                    if (specifier.reexported !== '*')
                        continue;
                    // need own exports list for deduping in star export case
                    if (!starExcludes) {
                        starExcludes = getStarExcludes({ dependencies, exports });
                    }
                    if (!createdSetter) {
                        setter.push(`${varOrConst} _setter${_}=${_}{};`);
                        createdSetter = true;
                    }
                    setter.push(`for${_}(var _$p${_}in${_}module)${_}{`);
                    setter.push(`${t}if${_}(!_starExcludes[_$p])${_}_setter[_$p]${_}=${_}module[_$p];`);
                    setter.push('}');
                }
                // star import reexport
                for (const specifier of reexports) {
                    if (specifier.imported !== '*' || specifier.reexported === '*')
                        continue;
                    setter.push(`exports('${specifier.reexported}',${_}module);`);
                }
                // reexports
                for (const specifier of reexports) {
                    if (specifier.reexported === '*' || specifier.imported === '*')
                        continue;
                    if (!createdSetter) {
                        setter.push(`${varOrConst} _setter${_}=${_}{};`);
                        createdSetter = true;
                    }
                    setter.push(`_setter.${specifier.reexported}${_}=${_}module.${specifier.imported};`);
                }
                if (createdSetter) {
                    setter.push('exports(_setter);');
                }
            }
            else {
                // single reexport
                for (const specifier of reexports) {
                    setter.push(`exports('${specifier.reexported}',${_}module.${specifier.imported});`);
                }
            }
        }
        setters.push(setter.join(`${n}${t}${t}${t}`));
    }
    const registeredName = options.name ? `'${options.name}',${_}` : '';
    const wrapperParams = accessedGlobals.has('module')
        ? `exports,${_}module`
        : hasExports
            ? 'exports'
            : '';
    let wrapperStart = `System.register(${registeredName}[` +
        dependencyIds.join(`,${_}`) +
        `],${_}function${_}(${wrapperParams})${_}{${n}${t}${options.strict ? "'use strict';" : ''}` +
        getStarExcludesBlock(starExcludes, varOrConst, _, t, n) +
        getImportBindingsBlock(importBindings, _, t, n) +
        `${n}${t}return${_}{${setters.length
            ? `${n}${t}${t}setters:${_}[${setters
                .map(s => s
                ? `function${_}(module)${_}{${n}${t}${t}${t}${s}${n}${t}${t}}`
                : options.systemNullSetters
                    ? `null`
                    : `function${_}()${_}{}`)
                .join(`,${_}`)}],`
            : ''}${n}`;
    wrapperStart +=
        `${t}${t}execute:${_}${usesTopLevelAwait ? `async${_}` : ''}function${_}()${_}{${n}${n}` +
            getHoistedExportsBlock(exports, _, t, n);
    const wrapperEnd = `${n}${n}` +
        getSyntheticExportsBlock(exports, _, t, n) +
        getMissingExportsBlock(exports, _, t, n) +
        `${t}${t}}${n}${t}}${options.compact ? '' : ';'}${n}});`;
    if (intro)
        magicString.prepend(intro);
    if (outro)
        magicString.append(outro);
    return magicString.indent(`${t}${t}${t}`).append(wrapperEnd).prepend(wrapperStart);
}

function globalProp(name, globalVar) {
    if (!name)
        return 'null';
    return `${globalVar}${keypath(name)}`;
}
function safeAccess(name, globalVar, _) {
    const parts = name.split('.');
    let acc = globalVar;
    return parts.map(part => (acc += property(part))).join(`${_}&&${_}`);
}
function umd(magicString, { accessedGlobals, dependencies, exports, hasExports, id, indentString: t, intro, namedExportsMode, outro, varOrConst, warn }, { amd, compact, esModule, extend, externalLiveBindings, freeze, interop, name, namespaceToStringTag, globals, noConflict, strict }) {
    const _ = compact ? '' : ' ';
    const n = compact ? '' : '\n';
    const s = compact ? '' : ';';
    const factoryVar = compact ? 'f' : 'factory';
    const globalVar = compact ? 'g' : 'global';
    if (hasExports && !name) {
        return error({
            code: 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT',
            message: 'You must supply "output.name" for UMD bundles that have exports so that the exports are accessible in environments without a module loader.'
        });
    }
    warnOnBuiltins(warn, dependencies);
    const amdDeps = dependencies.map(m => `'${removeExtensionFromRelativeAmdId(m.id)}'`);
    const cjsDeps = dependencies.map(m => `require('${m.id}')`);
    const trimmedImports = trimEmptyImports(dependencies);
    const globalDeps = trimmedImports.map(module => globalProp(module.globalName, globalVar));
    const factoryArgs = trimmedImports.map(m => m.name);
    if (namedExportsMode && (hasExports || noConflict)) {
        amdDeps.unshift(`'exports'`);
        cjsDeps.unshift(`exports`);
        globalDeps.unshift(assignToDeepVariable(name, globalVar, globals, compact, `${extend ? `${globalProp(name, globalVar)}${_}||${_}` : ''}{}`));
        factoryArgs.unshift('exports');
    }
    const completeAmdId = getCompleteAmdId(amd, id);
    const amdParams = (completeAmdId ? `'${completeAmdId}',${_}` : ``) +
        (amdDeps.length ? `[${amdDeps.join(`,${_}`)}],${_}` : ``);
    const define = amd.define;
    const cjsExport = !namedExportsMode && hasExports ? `module.exports${_}=${_}` : ``;
    const useStrict = strict ? `${_}'use strict';${n}` : ``;
    let iifeExport;
    if (noConflict) {
        const noConflictExportsVar = compact ? 'e' : 'exports';
        let factory;
        if (!namedExportsMode && hasExports) {
            factory = `var ${noConflictExportsVar}${_}=${_}${assignToDeepVariable(name, globalVar, globals, compact, `${factoryVar}(${globalDeps.join(`,${_}`)})`)};`;
        }
        else {
            const module = globalDeps.shift();
            factory =
                `var ${noConflictExportsVar}${_}=${_}${module};${n}` +
                    `${t}${t}${factoryVar}(${[noConflictExportsVar].concat(globalDeps).join(`,${_}`)});`;
        }
        iifeExport =
            `(function${_}()${_}{${n}` +
                `${t}${t}var current${_}=${_}${safeAccess(name, globalVar, _)};${n}` +
                `${t}${t}${factory}${n}` +
                `${t}${t}${noConflictExportsVar}.noConflict${_}=${_}function${_}()${_}{${_}` +
                `${globalProp(name, globalVar)}${_}=${_}current;${_}return ${noConflictExportsVar}${compact ? '' : '; '}};${n}` +
                `${t}}())`;
    }
    else {
        iifeExport = `${factoryVar}(${globalDeps.join(`,${_}`)})`;
        if (!namedExportsMode && hasExports) {
            iifeExport = assignToDeepVariable(name, globalVar, globals, compact, iifeExport);
        }
    }
    const iifeNeedsGlobal = hasExports || (noConflict && namedExportsMode) || globalDeps.length > 0;
    const globalParam = iifeNeedsGlobal ? `${globalVar},${_}` : '';
    const globalArg = iifeNeedsGlobal ? `this,${_}` : '';
    const iifeStart = iifeNeedsGlobal
        ? `(${globalVar}${_}=${_}typeof globalThis${_}!==${_}'undefined'${_}?${_}globalThis${_}:${_}${globalVar}${_}||${_}self,${_}`
        : '';
    const iifeEnd = iifeNeedsGlobal ? ')' : '';
    const cjsIntro = iifeNeedsGlobal
        ? `${t}typeof exports${_}===${_}'object'${_}&&${_}typeof module${_}!==${_}'undefined'${_}?` +
            `${_}${cjsExport}${factoryVar}(${cjsDeps.join(`,${_}`)})${_}:${n}`
        : '';
    // factory function should be wrapped by parentheses to avoid lazy parsing
    const wrapperIntro = `(function${_}(${globalParam}${factoryVar})${_}{${n}` +
        cjsIntro +
        `${t}typeof ${define}${_}===${_}'function'${_}&&${_}${define}.amd${_}?${_}${define}(${amdParams}${factoryVar})${_}:${n}` +
        `${t}${iifeStart}${iifeExport}${iifeEnd};${n}` +
        `}(${globalArg}(function${_}(${factoryArgs.join(', ')})${_}{${useStrict}${n}`;
    const wrapperOutro = n + n + '})));';
    magicString.prepend(`${intro}${getInteropBlock(dependencies, varOrConst, interop, externalLiveBindings, freeze, namespaceToStringTag, accessedGlobals, _, n, s, t)}`);
    const exportBlock = getExportBlock(exports, dependencies, namedExportsMode, interop, compact, t, externalLiveBindings);
    let namespaceMarkers = getNamespaceMarkers(namedExportsMode && hasExports, esModule, namespaceToStringTag, _, n);
    if (namespaceMarkers) {
        namespaceMarkers = n + n + namespaceMarkers;
    }
    magicString.append(`${exportBlock}${namespaceMarkers}${outro}`);
    return magicString.trim().indent(t).append(wrapperOutro).prepend(wrapperIntro);
}

var finalisers = { system, amd, cjs, es, iife, umd };

const extractors = {
    ArrayPattern(names, param) {
        for (const element of param.elements) {
            if (element)
                extractors[element.type](names, element);
        }
    },
    AssignmentPattern(names, param) {
        extractors[param.left.type](names, param.left);
    },
    Identifier(names, param) {
        names.push(param.name);
    },
    MemberExpression() { },
    ObjectPattern(names, param) {
        for (const prop of param.properties) {
            if (prop.type === 'RestElement') {
                extractors.RestElement(names, prop);
            }
            else {
                extractors[prop.value.type](names, prop.value);
            }
        }
    },
    RestElement(names, param) {
        extractors[param.argument.type](names, param.argument);
    }
};
const extractAssignedNames = function extractAssignedNames(param) {
    const names = [];
    extractors[param.type](names, param);
    return names;
};

class ExportAllDeclaration extends NodeBase {
    hasEffects() {
        return false;
    }
    initialise() {
        this.context.addExport(this);
    }
    render(code, _options, nodeRenderOptions) {
        code.remove(nodeRenderOptions.start, nodeRenderOptions.end);
    }
}
ExportAllDeclaration.prototype.needsBoundaries = true;

class ArrayExpression extends NodeBase {
    bind() {
        super.bind();
        for (const element of this.elements) {
            if (element !== null)
                element.deoptimizePath(UNKNOWN_PATH);
        }
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length !== 1)
            return UNKNOWN_EXPRESSION;
        return getMemberReturnExpressionWhenCalled(arrayMembers, path[0]);
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(arrayMembers, path[0], this.included, callOptions, context);
        }
        return true;
    }
}

class ArrayPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        for (const element of this.elements) {
            if (element !== null) {
                element.addExportedVariables(variables, exportNamesByVariable);
            }
        }
    }
    declare(kind) {
        const variables = [];
        for (const element of this.elements) {
            if (element !== null) {
                variables.push(...element.declare(kind, UNKNOWN_EXPRESSION));
            }
        }
        return variables;
    }
    deoptimizePath(path) {
        if (path.length === 0) {
            for (const element of this.elements) {
                if (element !== null) {
                    element.deoptimizePath(path);
                }
            }
        }
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (path.length > 0)
            return true;
        for (const element of this.elements) {
            if (element !== null && element.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context))
                return true;
        }
        return false;
    }
}

class BlockScope extends ChildScope {
    addDeclaration(identifier, context, init, isHoisted) {
        if (isHoisted) {
            return this.parent.addDeclaration(identifier, context, UNKNOWN_EXPRESSION, isHoisted);
        }
        else {
            return super.addDeclaration(identifier, context, init, false);
        }
    }
}

class ExpressionStatement$1 extends NodeBase {
    initialise() {
        if (this.directive &&
            this.directive !== 'use strict' &&
            this.parent.type === Program) {
            this.context.warn(
            // This is necessary, because either way (deleting or not) can lead to errors.
            {
                code: 'MODULE_LEVEL_DIRECTIVE',
                message: `Module level directives cause errors when bundled, '${this.directive}' was ignored.`
            }, this.start);
        }
    }
    render(code, options) {
        super.render(code, options);
        if (this.included)
            this.insertSemicolon(code);
    }
    shouldBeIncluded(context) {
        if (this.directive && this.directive !== 'use strict')
            return this.parent.type !== Program;
        return super.shouldBeIncluded(context);
    }
}

class BlockStatement$1 extends NodeBase {
    constructor() {
        super(...arguments);
        this.directlyIncluded = false;
    }
    addImplicitReturnExpressionToScope() {
        const lastStatement = this.body[this.body.length - 1];
        if (!lastStatement || lastStatement.type !== ReturnStatement) {
            this.scope.addReturnExpression(UNKNOWN_EXPRESSION);
        }
    }
    createScope(parentScope) {
        this.scope = this.parent.preventChildBlockScope
            ? parentScope
            : new BlockScope(parentScope);
    }
    hasEffects(context) {
        if (this.deoptimizeBody)
            return true;
        for (const node of this.body) {
            if (node.hasEffects(context))
                return true;
            if (context.brokenFlow)
                break;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimizeBody || !this.directlyIncluded) {
            this.included = true;
            this.directlyIncluded = true;
            if (this.deoptimizeBody)
                includeChildrenRecursively = true;
            for (const node of this.body) {
                if (includeChildrenRecursively || node.shouldBeIncluded(context))
                    node.include(context, includeChildrenRecursively);
            }
        }
    }
    initialise() {
        const firstBodyStatement = this.body[0];
        this.deoptimizeBody =
            firstBodyStatement instanceof ExpressionStatement$1 &&
                firstBodyStatement.directive === 'use asm';
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start + 1, this.end - 1, options);
        }
        else {
            super.render(code, options);
        }
    }
}

class ArrowFunctionExpression$1 extends NodeBase {
    createScope(parentScope) {
        this.scope = new ReturnValueScope(parentScope, this.context);
    }
    deoptimizePath(path) {
        // A reassignment of UNKNOWN_PATH is considered equivalent to having lost track
        // which means the return expression needs to be reassigned
        if (path.length === 1 && path[0] === UnknownKey) {
            this.scope.getReturnExpression().deoptimizePath(UNKNOWN_PATH);
        }
    }
    getReturnExpressionWhenCalledAtPath(path) {
        return path.length === 0 ? this.scope.getReturnExpression() : UNKNOWN_EXPRESSION;
    }
    hasEffects() {
        return false;
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path) {
        return path.length > 1;
    }
    hasEffectsWhenCalledAtPath(path, _callOptions, context) {
        if (path.length > 0)
            return true;
        for (const param of this.params) {
            if (param.hasEffects(context))
                return true;
        }
        const { ignore, brokenFlow } = context;
        context.ignore = {
            breaks: false,
            continues: false,
            labels: new Set(),
            returnAwaitYield: true
        };
        if (this.body.hasEffects(context))
            return true;
        context.ignore = ignore;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const param of this.params) {
            if (!(param instanceof Identifier$1)) {
                param.include(context, includeChildrenRecursively);
            }
        }
        const { brokenFlow } = context;
        context.brokenFlow = BROKEN_FLOW_NONE;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    includeCallArguments(context, args) {
        this.scope.includeCallArguments(context, args);
    }
    initialise() {
        this.scope.addParameterVariables(this.params.map(param => param.declare('parameter', UNKNOWN_EXPRESSION)), this.params[this.params.length - 1] instanceof RestElement);
        if (this.body instanceof BlockStatement$1) {
            this.body.addImplicitReturnExpressionToScope();
        }
        else {
            this.scope.addReturnExpression(this.body);
        }
    }
    parseNode(esTreeNode) {
        if (esTreeNode.body.type === BlockStatement) {
            this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, this.scope.hoistedBodyVarScope);
        }
        super.parseNode(esTreeNode);
    }
}
ArrowFunctionExpression$1.prototype.preventChildBlockScope = true;

class AssignmentExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.deoptimized = false;
    }
    hasEffects(context) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        return (this.right.hasEffects(context) ||
            this.left.hasEffects(context) ||
            this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context));
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        return path.length > 0 && this.right.hasEffectsWhenAccessedAtPath(path, context);
    }
    include(context, includeChildrenRecursively) {
        if (!this.deoptimized)
            this.applyDeoptimizations();
        this.included = true;
        this.left.include(context, includeChildrenRecursively);
        this.right.include(context, includeChildrenRecursively);
    }
    render(code, options) {
        this.left.render(code, options);
        this.right.render(code, options);
        if (options.format === 'system') {
            const exportNames = this.left.variable && options.exportNamesByVariable.get(this.left.variable);
            if (this.left.type === 'Identifier' && exportNames) {
                const _ = options.compact ? '' : ' ';
                const operatorPos = findFirstOccurrenceOutsideComment(code.original, this.operator, this.left.end);
                const operation = this.operator.length > 1 ? `${exportNames[0]}${_}${this.operator.slice(0, -1)}${_}` : '';
                code.overwrite(operatorPos, findNonWhiteSpace(code.original, operatorPos + this.operator.length), `=${_}${exportNames.length === 1
                    ? `exports('${exportNames[0]}',${_}`
                    : getSystemExportFunctionLeft([this.left.variable], false, options)}${operation}`);
                code.appendLeft(this.right.end, ')');
            }
            else {
                const systemPatternExports = [];
                this.left.addExportedVariables(systemPatternExports, options.exportNamesByVariable);
                if (systemPatternExports.length > 0) {
                    code.prependRight(this.start, getSystemExportFunctionLeft(systemPatternExports, true, options));
                    code.appendLeft(this.end, ')');
                }
            }
        }
    }
    applyDeoptimizations() {
        this.deoptimized = true;
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.deoptimizePath(UNKNOWN_PATH);
    }
}

class AssignmentPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        this.left.addExportedVariables(variables, exportNamesByVariable);
    }
    bind() {
        super.bind();
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.deoptimizePath(UNKNOWN_PATH);
    }
    declare(kind, init) {
        return this.left.declare(kind, init);
    }
    deoptimizePath(path) {
        path.length === 0 && this.left.deoptimizePath(path);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return path.length > 0 || this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context);
    }
    render(code, options, { isShorthandProperty } = BLANK) {
        this.left.render(code, options, { isShorthandProperty });
        this.right.render(code, options);
    }
}

class AwaitExpression extends NodeBase {
    hasEffects(context) {
        return !context.ignore.returnAwaitYield || this.argument.hasEffects(context);
    }
    include(context, includeChildrenRecursively) {
        if (!this.included) {
            this.included = true;
            checkTopLevelAwait: if (!this.context.usesTopLevelAwait) {
                let parent = this.parent;
                do {
                    if (parent instanceof FunctionNode || parent instanceof ArrowFunctionExpression$1)
                        break checkTopLevelAwait;
                } while ((parent = parent.parent));
                this.context.usesTopLevelAwait = true;
            }
        }
        this.argument.include(context, includeChildrenRecursively);
    }
}

const binaryOperators = {
    '!=': (left, right) => left != right,
    '!==': (left, right) => left !== right,
    '%': (left, right) => left % right,
    '&': (left, right) => left & right,
    '*': (left, right) => left * right,
    // At the moment, "**" will be transpiled to Math.pow
    '**': (left, right) => left ** right,
    '+': (left, right) => left + right,
    '-': (left, right) => left - right,
    '/': (left, right) => left / right,
    '<': (left, right) => left < right,
    '<<': (left, right) => left << right,
    '<=': (left, right) => left <= right,
    '==': (left, right) => left == right,
    '===': (left, right) => left === right,
    '>': (left, right) => left > right,
    '>=': (left, right) => left >= right,
    '>>': (left, right) => left >> right,
    '>>>': (left, right) => left >>> right,
    '^': (left, right) => left ^ right,
    in: () => UnknownValue,
    instanceof: () => UnknownValue,
    '|': (left, right) => left | right
};
class BinaryExpression extends NodeBase {
    deoptimizeCache() { }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (path.length > 0)
            return UnknownValue;
        const leftValue = this.left.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (leftValue === UnknownValue)
            return UnknownValue;
        const rightValue = this.right.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (rightValue === UnknownValue)
            return UnknownValue;
        const operatorFn = binaryOperators[this.operator];
        if (!operatorFn)
            return UnknownValue;
        return operatorFn(leftValue, rightValue);
    }
    hasEffects(context) {
        // support some implicit type coercion runtime errors
        if (this.operator === '+' &&
            this.parent instanceof ExpressionStatement$1 &&
            this.left.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this) === '')
            return true;
        return super.hasEffects(context);
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
}

class BreakStatement extends NodeBase {
    hasEffects(context) {
        if (this.label) {
            if (!context.ignore.labels.has(this.label.name))
                return true;
            context.includedLabels.add(this.label.name);
            context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        }
        else {
            if (!context.ignore.breaks)
                return true;
            context.brokenFlow = BROKEN_FLOW_BREAK_CONTINUE;
        }
        return false;
    }
    include(context) {
        this.included = true;
        if (this.label) {
            this.label.include();
            context.includedLabels.add(this.label.name);
        }
        context.brokenFlow = this.label ? BROKEN_FLOW_ERROR_RETURN_LABEL : BROKEN_FLOW_BREAK_CONTINUE;
    }
}

class Literal extends NodeBase {
    getLiteralValueAtPath(path) {
        if (path.length > 0 ||
            // unknown literals can also be null but do not start with an "n"
            (this.value === null && this.context.code.charCodeAt(this.start) !== 110) ||
            typeof this.value === 'bigint' ||
            // to support shims for regular expressions
            this.context.code.charCodeAt(this.start) === 47) {
            return UnknownValue;
        }
        return this.value;
    }
    getReturnExpressionWhenCalledAtPath(path) {
        if (path.length !== 1)
            return UNKNOWN_EXPRESSION;
        return getMemberReturnExpressionWhenCalled(this.members, path[0]);
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (this.value === null) {
            return path.length > 0;
        }
        return path.length > 1;
    }
    hasEffectsWhenAssignedAtPath(path) {
        return path.length > 0;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length === 1) {
            return hasMemberEffectWhenCalled(this.members, path[0], this.included, callOptions, context);
        }
        return true;
    }
    initialise() {
        this.members = getLiteralMembersForValue(this.value);
    }
    parseNode(esTreeNode) {
        this.value = esTreeNode.value;
        this.regex = esTreeNode.regex;
        super.parseNode(esTreeNode);
    }
    render(code) {
        if (typeof this.value === 'string') {
            code.indentExclusionRanges.push([this.start + 1, this.end - 1]);
        }
    }
}

function getResolvablePropertyKey(memberExpression) {
    return memberExpression.computed
        ? getResolvableComputedPropertyKey(memberExpression.property)
        : memberExpression.property.name;
}
function getResolvableComputedPropertyKey(propertyKey) {
    if (propertyKey instanceof Literal) {
        return String(propertyKey.value);
    }
    return null;
}
function getPathIfNotComputed(memberExpression) {
    const nextPathKey = memberExpression.propertyKey;
    const object = memberExpression.object;
    if (typeof nextPathKey === 'string') {
        if (object instanceof Identifier$1) {
            return [
                { key: object.name, pos: object.start },
                { key: nextPathKey, pos: memberExpression.property.start }
            ];
        }
        if (object instanceof MemberExpression) {
            const parentPath = getPathIfNotComputed(object);
            return (parentPath && [...parentPath, { key: nextPathKey, pos: memberExpression.property.start }]);
        }
    }
    return null;
}
function getStringFromPath(path) {
    let pathString = path[0].key;
    for (let index = 1; index < path.length; index++) {
        pathString += '.' + path[index].key;
    }
    return pathString;
}
class MemberExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.variable = null;
        this.bound = false;
        this.expressionsToBeDeoptimized = [];
        this.replacement = null;
        this.wasPathDeoptimizedWhileOptimized = false;
    }
    addExportedVariables() { }
    bind() {
        if (this.bound)
            return;
        this.bound = true;
        const path = getPathIfNotComputed(this);
        const baseVariable = path && this.scope.findVariable(path[0].key);
        if (baseVariable && baseVariable.isNamespace) {
            const resolvedVariable = this.resolveNamespaceVariables(baseVariable, path.slice(1));
            if (!resolvedVariable) {
                super.bind();
            }
            else if (typeof resolvedVariable === 'string') {
                this.replacement = resolvedVariable;
            }
            else {
                if (resolvedVariable instanceof ExternalVariable && resolvedVariable.module) {
                    resolvedVariable.module.suggestName(path[0].key);
                }
                this.variable = resolvedVariable;
                this.scope.addNamespaceMemberAccess(getStringFromPath(path), resolvedVariable);
            }
        }
        else {
            super.bind();
            // ensure the propertyKey is set for the tree-shaking passes
            this.getPropertyKey();
        }
    }
    deoptimizeCache() {
        const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
        this.expressionsToBeDeoptimized = [];
        this.propertyKey = UnknownKey;
        if (this.wasPathDeoptimizedWhileOptimized) {
            this.object.deoptimizePath(UNKNOWN_PATH);
        }
        for (const expression of expressionsToBeDeoptimized) {
            expression.deoptimizeCache();
        }
    }
    deoptimizePath(path) {
        if (!this.bound)
            this.bind();
        if (path.length === 0)
            this.disallowNamespaceReassignment();
        if (this.variable) {
            this.variable.deoptimizePath(path);
        }
        else {
            const propertyKey = this.getPropertyKey();
            if (propertyKey === UnknownKey) {
                this.object.deoptimizePath(UNKNOWN_PATH);
            }
            else {
                this.wasPathDeoptimizedWhileOptimized = true;
                this.object.deoptimizePath([propertyKey, ...path]);
            }
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (!this.bound)
            this.bind();
        if (this.variable !== null) {
            return this.variable.getLiteralValueAtPath(path, recursionTracker, origin);
        }
        this.expressionsToBeDeoptimized.push(origin);
        return this.object.getLiteralValueAtPath([this.getPropertyKey(), ...path], recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        if (!this.bound)
            this.bind();
        if (this.variable !== null) {
            return this.variable.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
        }
        this.expressionsToBeDeoptimized.push(origin);
        return this.object.getReturnExpressionWhenCalledAtPath([this.getPropertyKey(), ...path], recursionTracker, origin);
    }
    hasEffects(context) {
        return (this.property.hasEffects(context) ||
            this.object.hasEffects(context) ||
            (this.context.options.treeshake.propertyReadSideEffects &&
                this.object.hasEffectsWhenAccessedAtPath([this.propertyKey], context)));
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenAccessedAtPath(path, context);
        }
        return this.object.hasEffectsWhenAccessedAtPath([this.propertyKey, ...path], context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenAssignedAtPath(path, context);
        }
        return this.object.hasEffectsWhenAssignedAtPath([this.propertyKey, ...path], context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (this.variable !== null) {
            return this.variable.hasEffectsWhenCalledAtPath(path, callOptions, context);
        }
        return this.object.hasEffectsWhenCalledAtPath([this.propertyKey, ...path], callOptions, context);
    }
    include(context, includeChildrenRecursively) {
        if (!this.included) {
            this.included = true;
            if (this.variable !== null) {
                this.context.includeVariable(this.variable);
            }
        }
        this.object.include(context, includeChildrenRecursively);
        this.property.include(context, includeChildrenRecursively);
    }
    includeCallArguments(context, args) {
        if (this.variable) {
            this.variable.includeCallArguments(context, args);
        }
        else {
            super.includeCallArguments(context, args);
        }
    }
    initialise() {
        this.propertyKey = getResolvablePropertyKey(this);
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent } = BLANK) {
        const isCalleeOfDifferentParent = renderedParentType === CallExpression && isCalleeOfRenderedParent;
        if (this.variable || this.replacement) {
            let replacement = this.variable ? this.variable.getName() : this.replacement;
            if (isCalleeOfDifferentParent)
                replacement = '0, ' + replacement;
            code.overwrite(this.start, this.end, replacement, {
                contentOnly: true,
                storeName: true
            });
        }
        else {
            if (isCalleeOfDifferentParent) {
                code.appendRight(this.start, '0, ');
            }
            super.render(code, options);
        }
    }
    disallowNamespaceReassignment() {
        if (this.object instanceof Identifier$1) {
            const variable = this.scope.findVariable(this.object.name);
            if (variable.isNamespace) {
                if (this.variable) {
                    this.context.includeVariable(this.variable);
                }
                this.context.warn({
                    code: 'ILLEGAL_NAMESPACE_REASSIGNMENT',
                    message: `Illegal reassignment to import '${this.object.name}'`
                }, this.start);
            }
        }
    }
    getPropertyKey() {
        if (this.propertyKey === null) {
            this.propertyKey = UnknownKey;
            const value = this.property.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
            return (this.propertyKey = value === UnknownValue ? UnknownKey : String(value));
        }
        return this.propertyKey;
    }
    resolveNamespaceVariables(baseVariable, path) {
        if (path.length === 0)
            return baseVariable;
        if (!baseVariable.isNamespace)
            return null;
        const exportName = path[0].key;
        const variable = baseVariable instanceof ExternalVariable
            ? baseVariable.module.getVariableForExportName(exportName)
            : baseVariable.context.traceExport(exportName);
        if (!variable) {
            const fileName = baseVariable instanceof ExternalVariable
                ? baseVariable.module.id
                : baseVariable.context.fileName;
            this.context.warn({
                code: 'MISSING_EXPORT',
                exporter: relativeId(fileName),
                importer: relativeId(this.context.fileName),
                message: `'${exportName}' is not exported by '${relativeId(fileName)}'`,
                missing: exportName,
                url: `https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module`
            }, path[0].pos);
            return 'undefined';
        }
        return this.resolveNamespaceVariables(variable, path.slice(1));
    }
}

class CallExpression$1 extends NodeBase {
    constructor() {
        super(...arguments);
        this.expressionsToBeDeoptimized = [];
        this.returnExpression = null;
        this.wasPathDeoptmizedWhileOptimized = false;
    }
    bind() {
        super.bind();
        if (this.callee instanceof Identifier$1) {
            const variable = this.scope.findVariable(this.callee.name);
            if (variable.isNamespace) {
                this.context.warn({
                    code: 'CANNOT_CALL_NAMESPACE',
                    message: `Cannot call a namespace ('${this.callee.name}')`
                }, this.start);
            }
            if (this.callee.name === 'eval') {
                this.context.warn({
                    code: 'EVAL',
                    message: `Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification`,
                    url: 'https://rollupjs.org/guide/en/#avoiding-eval'
                }, this.start);
            }
        }
        // ensure the returnExpression is set for the tree-shaking passes
        this.getReturnExpression(SHARED_RECURSION_TRACKER);
        // This deoptimizes "this" for non-namespace calls until we have a better solution
        if (this.callee instanceof MemberExpression && !this.callee.variable) {
            this.callee.object.deoptimizePath(UNKNOWN_PATH);
        }
        for (const argument of this.arguments) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.deoptimizePath(UNKNOWN_PATH);
        }
    }
    deoptimizeCache() {
        if (this.returnExpression !== UNKNOWN_EXPRESSION) {
            this.returnExpression = null;
            const returnExpression = this.getReturnExpression(SHARED_RECURSION_TRACKER);
            const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
            if (returnExpression !== UNKNOWN_EXPRESSION) {
                // We need to replace here because is possible new expressions are added
                // while we are deoptimizing the old ones
                this.expressionsToBeDeoptimized = [];
                if (this.wasPathDeoptmizedWhileOptimized) {
                    returnExpression.deoptimizePath(UNKNOWN_PATH);
                    this.wasPathDeoptmizedWhileOptimized = false;
                }
            }
            for (const expression of expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
    }
    deoptimizePath(path) {
        if (path.length === 0)
            return;
        const trackedEntities = this.context.deoptimizationTracker.getEntities(path);
        if (trackedEntities.has(this))
            return;
        trackedEntities.add(this);
        const returnExpression = this.getReturnExpression(SHARED_RECURSION_TRACKER);
        if (returnExpression !== UNKNOWN_EXPRESSION) {
            this.wasPathDeoptmizedWhileOptimized = true;
            returnExpression.deoptimizePath(path);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const returnExpression = this.getReturnExpression(recursionTracker);
        if (returnExpression === UNKNOWN_EXPRESSION) {
            return UnknownValue;
        }
        const trackedEntities = recursionTracker.getEntities(path);
        if (trackedEntities.has(returnExpression)) {
            return UnknownValue;
        }
        this.expressionsToBeDeoptimized.push(origin);
        trackedEntities.add(returnExpression);
        const value = returnExpression.getLiteralValueAtPath(path, recursionTracker, origin);
        trackedEntities.delete(returnExpression);
        return value;
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        const returnExpression = this.getReturnExpression(recursionTracker);
        if (this.returnExpression === UNKNOWN_EXPRESSION) {
            return UNKNOWN_EXPRESSION;
        }
        const trackedEntities = recursionTracker.getEntities(path);
        if (trackedEntities.has(returnExpression)) {
            return UNKNOWN_EXPRESSION;
        }
        this.expressionsToBeDeoptimized.push(origin);
        trackedEntities.add(returnExpression);
        const value = returnExpression.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
        trackedEntities.delete(returnExpression);
        return value;
    }
    hasEffects(context) {
        for (const argument of this.arguments) {
            if (argument.hasEffects(context))
                return true;
        }
        if (this.context.options.treeshake.annotations &&
            this.annotatedPure)
            return false;
        return (this.callee.hasEffects(context) ||
            this.callee.hasEffectsWhenCalledAtPath(EMPTY_PATH, this.callOptions, context));
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        const trackedExpressions = context.accessed.getEntities(path);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return this.returnExpression.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (path.length === 0)
            return true;
        const trackedExpressions = context.assigned.getEntities(path);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return this.returnExpression.hasEffectsWhenAssignedAtPath(path, context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        const trackedExpressions = (callOptions.withNew
            ? context.instantiated
            : context.called).getEntities(path, callOptions);
        if (trackedExpressions.has(this))
            return false;
        trackedExpressions.add(this);
        return this.returnExpression.hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    include(context, includeChildrenRecursively) {
        if (includeChildrenRecursively) {
            super.include(context, includeChildrenRecursively);
            if (includeChildrenRecursively === INCLUDE_PARAMETERS &&
                this.callee instanceof Identifier$1 &&
                this.callee.variable) {
                this.callee.variable.markCalledFromTryStatement();
            }
        }
        else {
            this.included = true;
            this.callee.include(context, false);
        }
        this.callee.includeCallArguments(context, this.arguments);
        if (!this.returnExpression.included) {
            this.returnExpression.include(context, false);
        }
    }
    initialise() {
        this.callOptions = {
            args: this.arguments,
            withNew: false
        };
    }
    render(code, options, { renderedParentType } = BLANK) {
        this.callee.render(code, options);
        if (this.arguments.length > 0) {
            if (this.arguments[this.arguments.length - 1].included) {
                for (const arg of this.arguments) {
                    arg.render(code, options);
                }
            }
            else {
                let lastIncludedIndex = this.arguments.length - 2;
                while (lastIncludedIndex >= 0 && !this.arguments[lastIncludedIndex].included) {
                    lastIncludedIndex--;
                }
                if (lastIncludedIndex >= 0) {
                    for (let index = 0; index <= lastIncludedIndex; index++) {
                        this.arguments[index].render(code, options);
                    }
                    code.remove(findFirstOccurrenceOutsideComment(code.original, ',', this.arguments[lastIncludedIndex].end), this.end - 1);
                }
                else {
                    code.remove(findFirstOccurrenceOutsideComment(code.original, '(', this.callee.end) + 1, this.end - 1);
                }
            }
        }
        if (renderedParentType === ExpressionStatement &&
            this.callee.type === FunctionExpression) {
            code.appendRight(this.start, '(');
            code.prependLeft(this.end, ')');
        }
    }
    getReturnExpression(recursionTracker) {
        if (this.returnExpression === null) {
            this.returnExpression = UNKNOWN_EXPRESSION;
            return (this.returnExpression = this.callee.getReturnExpressionWhenCalledAtPath(EMPTY_PATH, recursionTracker, this));
        }
        return this.returnExpression;
    }
}

class CatchScope extends ParameterScope {
    addDeclaration(identifier, context, init, isHoisted) {
        if (isHoisted) {
            return this.parent.addDeclaration(identifier, context, init, isHoisted);
        }
        else {
            return super.addDeclaration(identifier, context, init, false);
        }
    }
}

class CatchClause extends NodeBase {
    createScope(parentScope) {
        this.scope = new CatchScope(parentScope, this.context);
    }
    initialise() {
        if (this.param) {
            this.param.declare('parameter', UNKNOWN_EXPRESSION);
        }
    }
    parseNode(esTreeNode) {
        this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, this.scope);
        super.parseNode(esTreeNode);
    }
}
CatchClause.prototype.preventChildBlockScope = true;

class ChainExpression extends NodeBase {
}

class ClassBodyScope extends ChildScope {
    findLexicalBoundary() {
        return this;
    }
}

class MethodDefinition extends NodeBase {
    hasEffects(context) {
        return this.key.hasEffects(context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        return (path.length > 0 || this.value.hasEffectsWhenCalledAtPath(EMPTY_PATH, callOptions, context));
    }
}

class ClassBody extends NodeBase {
    createScope(parentScope) {
        this.scope = new ClassBodyScope(parentScope);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (path.length > 0)
            return true;
        return (this.classConstructor !== null &&
            this.classConstructor.hasEffectsWhenCalledAtPath(EMPTY_PATH, callOptions, context));
    }
    initialise() {
        for (const method of this.body) {
            if (method instanceof MethodDefinition && method.kind === 'constructor') {
                this.classConstructor = method;
                return;
            }
        }
        this.classConstructor = null;
    }
}

class ClassExpression extends ClassNode {
}

class MultiExpression {
    constructor(expressions) {
        this.included = false;
        this.expressions = expressions;
    }
    deoptimizePath(path) {
        for (const expression of this.expressions) {
            expression.deoptimizePath(path);
        }
    }
    getLiteralValueAtPath() {
        return UnknownValue;
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        return new MultiExpression(this.expressions.map(expression => expression.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin)));
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        for (const expression of this.expressions) {
            if (expression.hasEffectsWhenAccessedAtPath(path, context))
                return true;
        }
        return false;
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        for (const expression of this.expressions) {
            if (expression.hasEffectsWhenAssignedAtPath(path, context))
                return true;
        }
        return false;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        for (const expression of this.expressions) {
            if (expression.hasEffectsWhenCalledAtPath(path, callOptions, context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        // This is only relevant to include values that do not have an AST representation,
        // such as UnknownArrayExpression. Thus we only need to include them once.
        for (const expression of this.expressions) {
            if (!expression.included) {
                expression.include(context, includeChildrenRecursively);
            }
        }
    }
    includeCallArguments() { }
}

class ConditionalExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.expressionsToBeDeoptimized = [];
        this.isBranchResolutionAnalysed = false;
        this.usedBranch = null;
        this.wasPathDeoptimizedWhileOptimized = false;
    }
    bind() {
        super.bind();
        // ensure the usedBranch is set for the tree-shaking passes
        this.getUsedBranch();
    }
    deoptimizeCache() {
        if (this.usedBranch !== null) {
            const unusedBranch = this.usedBranch === this.consequent ? this.alternate : this.consequent;
            this.usedBranch = null;
            const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
            this.expressionsToBeDeoptimized = [];
            if (this.wasPathDeoptimizedWhileOptimized) {
                unusedBranch.deoptimizePath(UNKNOWN_PATH);
            }
            for (const expression of expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
    }
    deoptimizePath(path) {
        if (path.length > 0) {
            const usedBranch = this.getUsedBranch();
            if (usedBranch === null) {
                this.consequent.deoptimizePath(path);
                this.alternate.deoptimizePath(path);
            }
            else {
                this.wasPathDeoptimizedWhileOptimized = true;
                usedBranch.deoptimizePath(path);
            }
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (usedBranch === null)
            return UnknownValue;
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (usedBranch === null)
            return new MultiExpression([
                this.consequent.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin),
                this.alternate.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin)
            ]);
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
    }
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        if (this.usedBranch === null) {
            return this.consequent.hasEffects(context) || this.alternate.hasEffects(context);
        }
        return this.usedBranch.hasEffects(context);
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        if (this.usedBranch === null) {
            return (this.consequent.hasEffectsWhenAccessedAtPath(path, context) ||
                this.alternate.hasEffectsWhenAccessedAtPath(path, context));
        }
        return this.usedBranch.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (path.length === 0)
            return true;
        if (this.usedBranch === null) {
            return (this.consequent.hasEffectsWhenAssignedAtPath(path, context) ||
                this.alternate.hasEffectsWhenAssignedAtPath(path, context));
        }
        return this.usedBranch.hasEffectsWhenAssignedAtPath(path, context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (this.usedBranch === null) {
            return (this.consequent.hasEffectsWhenCalledAtPath(path, callOptions, context) ||
                this.alternate.hasEffectsWhenCalledAtPath(path, callOptions, context));
        }
        return this.usedBranch.hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (includeChildrenRecursively ||
            this.test.shouldBeIncluded(context) ||
            this.usedBranch === null) {
            this.test.include(context, includeChildrenRecursively);
            this.consequent.include(context, includeChildrenRecursively);
            this.alternate.include(context, includeChildrenRecursively);
        }
        else {
            this.usedBranch.include(context, includeChildrenRecursively);
        }
    }
    includeCallArguments(context, args) {
        if (this.usedBranch === null) {
            this.consequent.includeCallArguments(context, args);
            this.alternate.includeCallArguments(context, args);
        }
        else {
            this.usedBranch.includeCallArguments(context, args);
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent, preventASI } = BLANK) {
        if (!this.test.included) {
            const colonPos = findFirstOccurrenceOutsideComment(code.original, ':', this.consequent.end);
            const inclusionStart = (this.consequent.included
                ? findFirstOccurrenceOutsideComment(code.original, '?', this.test.end)
                : colonPos) + 1;
            if (preventASI) {
                removeLineBreaks(code, inclusionStart, this.usedBranch.start);
            }
            code.remove(this.start, inclusionStart);
            if (this.consequent.included) {
                code.remove(colonPos, this.end);
            }
            removeAnnotations(this, code);
            this.usedBranch.render(code, options, {
                isCalleeOfRenderedParent: renderedParentType
                    ? isCalleeOfRenderedParent
                    : this.parent.callee === this,
                preventASI: true,
                renderedParentType: renderedParentType || this.parent.type
            });
        }
        else {
            super.render(code, options);
        }
    }
    getUsedBranch() {
        if (this.isBranchResolutionAnalysed) {
            return this.usedBranch;
        }
        this.isBranchResolutionAnalysed = true;
        const testValue = this.test.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
        return testValue === UnknownValue
            ? null
            : (this.usedBranch = testValue ? this.consequent : this.alternate);
    }
}

class ContinueStatement extends NodeBase {
    hasEffects(context) {
        if (this.label) {
            if (!context.ignore.labels.has(this.label.name))
                return true;
            context.includedLabels.add(this.label.name);
            context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        }
        else {
            if (!context.ignore.continues)
                return true;
            context.brokenFlow = BROKEN_FLOW_BREAK_CONTINUE;
        }
        return false;
    }
    include(context) {
        this.included = true;
        if (this.label) {
            this.label.include();
            context.includedLabels.add(this.label.name);
        }
        context.brokenFlow = this.label ? BROKEN_FLOW_ERROR_RETURN_LABEL : BROKEN_FLOW_BREAK_CONTINUE;
    }
}

class DoWhileStatement extends NodeBase {
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.test.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
}

class EmptyStatement extends NodeBase {
    hasEffects() {
        return false;
    }
}

class ExportNamedDeclaration extends NodeBase {
    bind() {
        // Do not bind specifiers
        if (this.declaration !== null)
            this.declaration.bind();
    }
    hasEffects(context) {
        return this.declaration !== null && this.declaration.hasEffects(context);
    }
    initialise() {
        this.context.addExport(this);
    }
    render(code, options, nodeRenderOptions) {
        const { start, end } = nodeRenderOptions;
        if (this.declaration === null) {
            code.remove(start, end);
        }
        else {
            code.remove(this.start, this.declaration.start);
            this.declaration.render(code, options, { start, end });
        }
    }
}
ExportNamedDeclaration.prototype.needsBoundaries = true;

class ExportSpecifier extends NodeBase {
}

class FieldDefinition extends NodeBase {
    hasEffects(context) {
        return (this.key.hasEffects(context) ||
            (this.static && this.value !== null && this.value.hasEffects(context)));
    }
}

class ForInStatement extends NodeBase {
    bind() {
        this.left.bind();
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.bind();
        this.body.bind();
    }
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        if ((this.left &&
            (this.left.hasEffects(context) ||
                this.left.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context))) ||
            (this.right && this.right.hasEffects(context)))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.left.includeWithAllDeclaredVariables(includeChildrenRecursively, context);
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        // handle no space between "in" and the right side
        if (code.original.charCodeAt(this.right.start - 1) === 110 /* n */) {
            code.prependLeft(this.right.start, ' ');
        }
        this.body.render(code, options);
    }
}

class ForOfStatement extends NodeBase {
    bind() {
        this.left.bind();
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.bind();
        this.body.bind();
    }
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects() {
        // Placeholder until proper Symbol.Iterator support
        return true;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.left.includeWithAllDeclaredVariables(includeChildrenRecursively, context);
        this.left.deoptimizePath(EMPTY_PATH);
        this.right.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    render(code, options) {
        this.left.render(code, options, NO_SEMICOLON);
        this.right.render(code, options, NO_SEMICOLON);
        // handle no space between "of" and the right side
        if (code.original.charCodeAt(this.right.start - 1) === 102 /* f */) {
            code.prependLeft(this.right.start, ' ');
        }
        this.body.render(code, options);
    }
}

class ForStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        if ((this.init && this.init.hasEffects(context)) ||
            (this.test && this.test.hasEffects(context)) ||
            (this.update && this.update.hasEffects(context)))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (this.init)
            this.init.include(context, includeChildrenRecursively);
        if (this.test)
            this.test.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        if (this.update)
            this.update.include(context, includeChildrenRecursively);
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
    render(code, options) {
        if (this.init)
            this.init.render(code, options, NO_SEMICOLON);
        if (this.test)
            this.test.render(code, options, NO_SEMICOLON);
        if (this.update)
            this.update.render(code, options, NO_SEMICOLON);
        this.body.render(code, options);
    }
}

class FunctionExpression$1 extends FunctionNode {
}

class TrackingScope extends BlockScope {
    constructor() {
        super(...arguments);
        this.hoistedDeclarations = [];
    }
    addDeclaration(identifier, context, init, isHoisted) {
        this.hoistedDeclarations.push(identifier);
        return this.parent.addDeclaration(identifier, context, init, isHoisted);
    }
}

const unset = Symbol('unset');
class IfStatement extends NodeBase {
    constructor() {
        super(...arguments);
        this.testValue = unset;
    }
    deoptimizeCache() {
        this.testValue = UnknownValue;
    }
    hasEffects(context) {
        if (this.test.hasEffects(context)) {
            return true;
        }
        const testValue = this.getTestValue();
        if (testValue === UnknownValue) {
            const { brokenFlow } = context;
            if (this.consequent.hasEffects(context))
                return true;
            const consequentBrokenFlow = context.brokenFlow;
            context.brokenFlow = brokenFlow;
            if (this.alternate === null)
                return false;
            if (this.alternate.hasEffects(context))
                return true;
            context.brokenFlow =
                context.brokenFlow < consequentBrokenFlow ? context.brokenFlow : consequentBrokenFlow;
            return false;
        }
        return testValue
            ? this.consequent.hasEffects(context)
            : this.alternate !== null && this.alternate.hasEffects(context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (includeChildrenRecursively) {
            this.includeRecursively(includeChildrenRecursively, context);
        }
        else {
            const testValue = this.getTestValue();
            if (testValue === UnknownValue) {
                this.includeUnknownTest(context);
            }
            else {
                this.includeKnownTest(context, testValue);
            }
        }
    }
    parseNode(esTreeNode) {
        this.consequentScope = new TrackingScope(this.scope);
        this.consequent = new (this.context.nodeConstructors[esTreeNode.consequent.type] ||
            this.context.nodeConstructors.UnknownNode)(esTreeNode.consequent, this, this.consequentScope);
        if (esTreeNode.alternate) {
            this.alternateScope = new TrackingScope(this.scope);
            this.alternate = new (this.context.nodeConstructors[esTreeNode.alternate.type] ||
                this.context.nodeConstructors.UnknownNode)(esTreeNode.alternate, this, this.alternateScope);
        }
        super.parseNode(esTreeNode);
    }
    render(code, options) {
        // Note that unknown test values are always included
        const testValue = this.getTestValue();
        const hoistedDeclarations = [];
        const includesIfElse = this.test.included;
        const noTreeshake = !this.context.options.treeshake;
        if (includesIfElse) {
            this.test.render(code, options);
        }
        else {
            removeAnnotations(this, code);
            code.remove(this.start, this.consequent.start);
        }
        if (this.consequent.included && (noTreeshake || testValue === UnknownValue || testValue)) {
            this.consequent.render(code, options);
        }
        else {
            code.overwrite(this.consequent.start, this.consequent.end, includesIfElse ? ';' : '');
            hoistedDeclarations.push(...this.consequentScope.hoistedDeclarations);
        }
        if (this.alternate) {
            if (this.alternate.included && (noTreeshake || testValue === UnknownValue || !testValue)) {
                if (includesIfElse) {
                    if (code.original.charCodeAt(this.alternate.start - 1) === 101) {
                        code.prependLeft(this.alternate.start, ' ');
                    }
                }
                else {
                    code.remove(this.consequent.end, this.alternate.start);
                }
                this.alternate.render(code, options);
            }
            else {
                if (includesIfElse && this.shouldKeepAlternateBranch()) {
                    code.overwrite(this.alternate.start, this.end, ';');
                }
                else {
                    code.remove(this.consequent.end, this.end);
                }
                hoistedDeclarations.push(...this.alternateScope.hoistedDeclarations);
            }
        }
        this.renderHoistedDeclarations(hoistedDeclarations, code);
    }
    getTestValue() {
        if (this.testValue === unset) {
            return (this.testValue = this.test.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this));
        }
        return this.testValue;
    }
    includeKnownTest(context, testValue) {
        if (this.test.shouldBeIncluded(context)) {
            this.test.include(context, false);
        }
        if (testValue && this.consequent.shouldBeIncluded(context)) {
            this.consequent.include(context, false);
        }
        if (this.alternate !== null && !testValue && this.alternate.shouldBeIncluded(context)) {
            this.alternate.include(context, false);
        }
    }
    includeRecursively(includeChildrenRecursively, context) {
        this.test.include(context, includeChildrenRecursively);
        this.consequent.include(context, includeChildrenRecursively);
        if (this.alternate !== null) {
            this.alternate.include(context, includeChildrenRecursively);
        }
    }
    includeUnknownTest(context) {
        this.test.include(context, false);
        const { brokenFlow } = context;
        let consequentBrokenFlow = BROKEN_FLOW_NONE;
        if (this.consequent.shouldBeIncluded(context)) {
            this.consequent.include(context, false);
            consequentBrokenFlow = context.brokenFlow;
            context.brokenFlow = brokenFlow;
        }
        if (this.alternate !== null && this.alternate.shouldBeIncluded(context)) {
            this.alternate.include(context, false);
            context.brokenFlow =
                context.brokenFlow < consequentBrokenFlow ? context.brokenFlow : consequentBrokenFlow;
        }
    }
    renderHoistedDeclarations(hoistedDeclarations, code) {
        const hoistedVars = [
            ...new Set(hoistedDeclarations.map(identifier => {
                const variable = identifier.variable;
                return variable.included ? variable.getName() : '';
            }))
        ]
            .filter(Boolean)
            .join(', ');
        if (hoistedVars) {
            const parentType = this.parent.type;
            const needsBraces = parentType !== Program && parentType !== BlockStatement;
            code.prependRight(this.start, `${needsBraces ? '{ ' : ''}var ${hoistedVars}; `);
            if (needsBraces) {
                code.appendLeft(this.end, ` }`);
            }
        }
    }
    shouldKeepAlternateBranch() {
        let currentParent = this.parent;
        do {
            if (currentParent instanceof IfStatement && currentParent.alternate) {
                return true;
            }
            if (currentParent instanceof BlockStatement$1) {
                return false;
            }
            currentParent = currentParent.parent;
        } while (currentParent);
        return false;
    }
}

class ImportDeclaration extends NodeBase {
    bind() { }
    hasEffects() {
        return false;
    }
    initialise() {
        this.context.addImport(this);
    }
    render(code, _options, nodeRenderOptions) {
        code.remove(nodeRenderOptions.start, nodeRenderOptions.end);
    }
}
ImportDeclaration.prototype.needsBoundaries = true;

class ImportDefaultSpecifier$1 extends NodeBase {
}

class ImportExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.inlineNamespace = null;
        this.mechanism = null;
        this.resolution = null;
    }
    hasEffects() {
        return true;
    }
    include(context, includeChildrenRecursively) {
        if (!this.included) {
            this.included = true;
            this.context.includeDynamicImport(this);
            this.scope.addAccessedDynamicImport(this);
        }
        this.source.include(context, includeChildrenRecursively);
    }
    initialise() {
        this.context.addDynamicImport(this);
    }
    render(code, options) {
        if (this.inlineNamespace) {
            const _ = options.compact ? '' : ' ';
            const s = options.compact ? '' : ';';
            code.overwrite(this.start, this.end, `Promise.resolve().then(function${_}()${_}{${_}return ${this.inlineNamespace.getName()}${s}${_}})`);
            return;
        }
        if (this.mechanism) {
            code.overwrite(this.start, findFirstOccurrenceOutsideComment(code.original, '(', this.start + 6) + 1, this.mechanism.left);
            code.overwrite(this.end - 1, this.end, this.mechanism.right);
        }
        this.source.render(code, options);
    }
    renderFinalResolution(code, resolution, namespaceExportName, options) {
        code.overwrite(this.source.start, this.source.end, resolution);
        if (namespaceExportName) {
            const _ = options.compact ? '' : ' ';
            const s = options.compact ? '' : ';';
            code.prependLeft(this.end, `.then(function${_}(n)${_}{${_}return n.${namespaceExportName}${s}${_}})`);
        }
    }
    setExternalResolution(exportMode, resolution, options, pluginDriver, accessedGlobalsByScope) {
        this.resolution = resolution;
        const accessedGlobals = [...(accessedImportGlobals[options.format] || [])];
        let helper;
        ({ helper, mechanism: this.mechanism } = this.getDynamicImportMechanismAndHelper(resolution, exportMode, options, pluginDriver));
        if (helper) {
            accessedGlobals.push(helper);
        }
        if (accessedGlobals.length > 0) {
            this.scope.addAccessedGlobals(accessedGlobals, accessedGlobalsByScope);
        }
    }
    setInternalResolution(inlineNamespace) {
        this.inlineNamespace = inlineNamespace;
    }
    getDynamicImportMechanismAndHelper(resolution, exportMode, options, pluginDriver) {
        const mechanism = pluginDriver.hookFirstSync('renderDynamicImport', [
            {
                customResolution: typeof this.resolution === 'string' ? this.resolution : null,
                format: options.format,
                moduleId: this.context.module.id,
                targetModuleId: this.resolution && typeof this.resolution !== 'string' ? this.resolution.id : null
            }
        ]);
        if (mechanism) {
            return { helper: null, mechanism };
        }
        switch (options.format) {
            case 'cjs': {
                const _ = options.compact ? '' : ' ';
                const s = options.compact ? '' : ';';
                const leftStart = `Promise.resolve().then(function${_}()${_}{${_}return`;
                const helper = this.getInteropHelper(resolution, exportMode, options.interop);
                return {
                    helper,
                    mechanism: helper
                        ? {
                            left: `${leftStart} /*#__PURE__*/${helper}(require(`,
                            right: `))${s}${_}})`
                        }
                        : {
                            left: `${leftStart} require(`,
                            right: `)${s}${_}})`
                        }
                };
            }
            case 'amd': {
                const _ = options.compact ? '' : ' ';
                const resolve = options.compact ? 'c' : 'resolve';
                const reject = options.compact ? 'e' : 'reject';
                const helper = this.getInteropHelper(resolution, exportMode, options.interop);
                const resolveNamespace = helper
                    ? `function${_}(m)${_}{${_}${resolve}(/*#__PURE__*/${helper}(m));${_}}`
                    : resolve;
                return {
                    helper,
                    mechanism: {
                        left: `new Promise(function${_}(${resolve},${_}${reject})${_}{${_}require([`,
                        right: `],${_}${resolveNamespace},${_}${reject})${_}})`
                    }
                };
            }
            case 'system':
                return {
                    helper: null,
                    mechanism: {
                        left: 'module.import(',
                        right: ')'
                    }
                };
            case 'es':
                if (options.dynamicImportFunction) {
                    return {
                        helper: null,
                        mechanism: {
                            left: `${options.dynamicImportFunction}(`,
                            right: ')'
                        }
                    };
                }
        }
        return { helper: null, mechanism: null };
    }
    getInteropHelper(resolution, exportMode, interop) {
        return exportMode === 'external'
            ? namespaceInteropHelpersByInteropType[String(interop(resolution instanceof ExternalModule ? resolution.id : null))]
            : exportMode === 'default'
                ? getDefaultOnlyHelper()
                : null;
    }
}
const accessedImportGlobals = {
    amd: ['require'],
    cjs: ['require'],
    system: ['module']
};

class ImportNamespaceSpecifier$1 extends NodeBase {
}

class ImportSpecifier extends NodeBase {
}

class LabeledStatement extends NodeBase {
    hasEffects(context) {
        const brokenFlow = context.brokenFlow;
        context.ignore.labels.add(this.label.name);
        if (this.body.hasEffects(context))
            return true;
        context.ignore.labels.delete(this.label.name);
        if (context.includedLabels.has(this.label.name)) {
            context.includedLabels.delete(this.label.name);
            context.brokenFlow = brokenFlow;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        const brokenFlow = context.brokenFlow;
        this.body.include(context, includeChildrenRecursively);
        if (includeChildrenRecursively || context.includedLabels.has(this.label.name)) {
            this.label.include();
            context.includedLabels.delete(this.label.name);
            context.brokenFlow = brokenFlow;
        }
    }
    render(code, options) {
        if (this.label.included) {
            this.label.render(code, options);
        }
        else {
            code.remove(this.start, findFirstOccurrenceOutsideComment(code.original, ':', this.label.end) + 1);
        }
        this.body.render(code, options);
    }
}

class LogicalExpression extends NodeBase {
    constructor() {
        super(...arguments);
        // We collect deoptimization information if usedBranch !== null
        this.expressionsToBeDeoptimized = [];
        this.isBranchResolutionAnalysed = false;
        this.unusedBranch = null;
        this.usedBranch = null;
        this.wasPathDeoptimizedWhileOptimized = false;
    }
    bind() {
        super.bind();
        // ensure the usedBranch is set for the tree-shaking passes
        this.getUsedBranch();
    }
    deoptimizeCache() {
        if (this.usedBranch !== null) {
            this.usedBranch = null;
            const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized;
            this.expressionsToBeDeoptimized = [];
            if (this.wasPathDeoptimizedWhileOptimized) {
                this.unusedBranch.deoptimizePath(UNKNOWN_PATH);
            }
            for (const expression of expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
    }
    deoptimizePath(path) {
        const usedBranch = this.getUsedBranch();
        if (usedBranch === null) {
            this.left.deoptimizePath(path);
            this.right.deoptimizePath(path);
        }
        else {
            this.wasPathDeoptimizedWhileOptimized = true;
            usedBranch.deoptimizePath(path);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (usedBranch === null)
            return UnknownValue;
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        const usedBranch = this.getUsedBranch();
        if (usedBranch === null)
            return new MultiExpression([
                this.left.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin),
                this.right.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin)
            ]);
        this.expressionsToBeDeoptimized.push(origin);
        return usedBranch.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
    }
    hasEffects(context) {
        if (this.left.hasEffects(context)) {
            return true;
        }
        if (this.usedBranch !== this.left) {
            return this.right.hasEffects(context);
        }
        return false;
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        if (this.usedBranch === null) {
            return (this.left.hasEffectsWhenAccessedAtPath(path, context) ||
                this.right.hasEffectsWhenAccessedAtPath(path, context));
        }
        return this.usedBranch.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (path.length === 0)
            return true;
        if (this.usedBranch === null) {
            return (this.left.hasEffectsWhenAssignedAtPath(path, context) ||
                this.right.hasEffectsWhenAssignedAtPath(path, context));
        }
        return this.usedBranch.hasEffectsWhenAssignedAtPath(path, context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (this.usedBranch === null) {
            return (this.left.hasEffectsWhenCalledAtPath(path, callOptions, context) ||
                this.right.hasEffectsWhenCalledAtPath(path, callOptions, context));
        }
        return this.usedBranch.hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (includeChildrenRecursively ||
            (this.usedBranch === this.right && this.left.shouldBeIncluded(context)) ||
            this.usedBranch === null) {
            this.left.include(context, includeChildrenRecursively);
            this.right.include(context, includeChildrenRecursively);
        }
        else {
            this.usedBranch.include(context, includeChildrenRecursively);
        }
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent, preventASI } = BLANK) {
        if (!this.left.included || !this.right.included) {
            const operatorPos = findFirstOccurrenceOutsideComment(code.original, this.operator, this.left.end);
            if (this.right.included) {
                code.remove(this.start, operatorPos + 2);
                if (preventASI) {
                    removeLineBreaks(code, operatorPos + 2, this.right.start);
                }
            }
            else {
                code.remove(operatorPos, this.end);
            }
            removeAnnotations(this, code);
            this.usedBranch.render(code, options, {
                isCalleeOfRenderedParent: renderedParentType
                    ? isCalleeOfRenderedParent
                    : this.parent.callee === this,
                preventASI,
                renderedParentType: renderedParentType || this.parent.type
            });
        }
        else {
            this.left.render(code, options, { preventASI });
            this.right.render(code, options);
        }
    }
    getUsedBranch() {
        if (!this.isBranchResolutionAnalysed) {
            this.isBranchResolutionAnalysed = true;
            const leftValue = this.left.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
            if (leftValue === UnknownValue) {
                return null;
            }
            else {
                if ((this.operator === '||' && leftValue) ||
                    (this.operator === '&&' && !leftValue) ||
                    (this.operator === '??' && leftValue != null)) {
                    this.usedBranch = this.left;
                    this.unusedBranch = this.right;
                }
                else {
                    this.usedBranch = this.right;
                    this.unusedBranch = this.left;
                }
            }
        }
        return this.usedBranch;
    }
}

const ASSET_PREFIX = 'ROLLUP_ASSET_URL_';
const CHUNK_PREFIX = 'ROLLUP_CHUNK_URL_';
const FILE_PREFIX = 'ROLLUP_FILE_URL_';
class MetaProperty extends NodeBase {
    addAccessedGlobals(format, accessedGlobalsByScope) {
        const metaProperty = this.metaProperty;
        const accessedGlobals = (metaProperty &&
            (metaProperty.startsWith(FILE_PREFIX) ||
                metaProperty.startsWith(ASSET_PREFIX) ||
                metaProperty.startsWith(CHUNK_PREFIX))
            ? accessedFileUrlGlobals
            : accessedMetaUrlGlobals)[format];
        if (accessedGlobals.length > 0) {
            this.scope.addAccessedGlobals(accessedGlobals, accessedGlobalsByScope);
        }
    }
    getReferencedFileName(outputPluginDriver) {
        const metaProperty = this.metaProperty;
        if (metaProperty && metaProperty.startsWith(FILE_PREFIX)) {
            return outputPluginDriver.getFileName(metaProperty.substr(FILE_PREFIX.length));
        }
        return null;
    }
    hasEffects() {
        return false;
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    include() {
        if (!this.included) {
            this.included = true;
            if (this.meta.name === 'import') {
                this.context.addImportMeta(this);
                const parent = this.parent;
                this.metaProperty =
                    parent instanceof MemberExpression && typeof parent.propertyKey === 'string'
                        ? parent.propertyKey
                        : null;
            }
        }
    }
    renderFinalMechanism(code, chunkId, format, outputPluginDriver) {
        var _a;
        const parent = this.parent;
        const metaProperty = this.metaProperty;
        if (metaProperty &&
            (metaProperty.startsWith(FILE_PREFIX) ||
                metaProperty.startsWith(ASSET_PREFIX) ||
                metaProperty.startsWith(CHUNK_PREFIX))) {
            let referenceId = null;
            let assetReferenceId = null;
            let chunkReferenceId = null;
            let fileName;
            if (metaProperty.startsWith(FILE_PREFIX)) {
                referenceId = metaProperty.substr(FILE_PREFIX.length);
                fileName = outputPluginDriver.getFileName(referenceId);
            }
            else if (metaProperty.startsWith(ASSET_PREFIX)) {
                warnDeprecation(`Using the "${ASSET_PREFIX}" prefix to reference files is deprecated. Use the "${FILE_PREFIX}" prefix instead.`, true, this.context.options);
                assetReferenceId = metaProperty.substr(ASSET_PREFIX.length);
                fileName = outputPluginDriver.getFileName(assetReferenceId);
            }
            else {
                warnDeprecation(`Using the "${CHUNK_PREFIX}" prefix to reference files is deprecated. Use the "${FILE_PREFIX}" prefix instead.`, true, this.context.options);
                chunkReferenceId = metaProperty.substr(CHUNK_PREFIX.length);
                fileName = outputPluginDriver.getFileName(chunkReferenceId);
            }
            const relativePath = normalize(relative$1(dirname(chunkId), fileName));
            let replacement;
            if (assetReferenceId !== null) {
                replacement = outputPluginDriver.hookFirstSync('resolveAssetUrl', [
                    {
                        assetFileName: fileName,
                        chunkId,
                        format,
                        moduleId: this.context.module.id,
                        relativeAssetPath: relativePath
                    }
                ]);
            }
            if (!replacement) {
                replacement =
                    outputPluginDriver.hookFirstSync('resolveFileUrl', [
                        {
                            assetReferenceId,
                            chunkId,
                            chunkReferenceId,
                            fileName,
                            format,
                            moduleId: this.context.module.id,
                            referenceId: referenceId || assetReferenceId || chunkReferenceId,
                            relativePath
                        }
                    ]) || relativeUrlMechanisms[format](relativePath);
            }
            code.overwrite(parent.start, parent.end, replacement, { contentOnly: true });
            return;
        }
        const replacement = outputPluginDriver.hookFirstSync('resolveImportMeta', [
            metaProperty,
            {
                chunkId,
                format,
                moduleId: this.context.module.id
            }
        ]) || ((_a = importMetaMechanisms[format]) === null || _a === void 0 ? void 0 : _a.call(importMetaMechanisms, metaProperty, chunkId));
        if (typeof replacement === 'string') {
            if (parent instanceof MemberExpression) {
                code.overwrite(parent.start, parent.end, replacement, { contentOnly: true });
            }
            else {
                code.overwrite(this.start, this.end, replacement, { contentOnly: true });
            }
        }
    }
}
const accessedMetaUrlGlobals = {
    amd: ['document', 'module', 'URL'],
    cjs: ['document', 'require', 'URL'],
    es: [],
    iife: ['document', 'URL'],
    system: ['module'],
    umd: ['document', 'require', 'URL']
};
const accessedFileUrlGlobals = {
    amd: ['document', 'require', 'URL'],
    cjs: ['document', 'require', 'URL'],
    es: [],
    iife: ['document', 'URL'],
    system: ['module', 'URL'],
    umd: ['document', 'require', 'URL']
};
const getResolveUrl = (path, URL = 'URL') => `new ${URL}(${path}).href`;
const getRelativeUrlFromDocument = (relativePath) => getResolveUrl(`'${relativePath}', document.currentScript && document.currentScript.src || document.baseURI`);
const getGenericImportMetaMechanism = (getUrl) => (prop, chunkId) => {
    const urlMechanism = getUrl(chunkId);
    return prop === null ? `({ url: ${urlMechanism} })` : prop === 'url' ? urlMechanism : 'undefined';
};
const getUrlFromDocument = (chunkId) => `(document.currentScript && document.currentScript.src || new URL('${chunkId}', document.baseURI).href)`;
const relativeUrlMechanisms = {
    amd: relativePath => {
        if (relativePath[0] !== '.')
            relativePath = './' + relativePath;
        return getResolveUrl(`require.toUrl('${relativePath}'), document.baseURI`);
    },
    cjs: relativePath => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __dirname + '/${relativePath}'`, `(require('u' + 'rl').URL)`)} : ${getRelativeUrlFromDocument(relativePath)})`,
    es: relativePath => getResolveUrl(`'${relativePath}', import.meta.url`),
    iife: relativePath => getRelativeUrlFromDocument(relativePath),
    system: relativePath => getResolveUrl(`'${relativePath}', module.meta.url`),
    umd: relativePath => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __dirname + '/${relativePath}'`, `(require('u' + 'rl').URL)`)} : ${getRelativeUrlFromDocument(relativePath)})`
};
const importMetaMechanisms = {
    amd: getGenericImportMetaMechanism(() => getResolveUrl(`module.uri, document.baseURI`)),
    cjs: getGenericImportMetaMechanism(chunkId => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __filename`, `(require('u' + 'rl').URL)`)} : ${getUrlFromDocument(chunkId)})`),
    iife: getGenericImportMetaMechanism(chunkId => getUrlFromDocument(chunkId)),
    system: prop => (prop === null ? `module.meta` : `module.meta.${prop}`),
    umd: getGenericImportMetaMechanism(chunkId => `(typeof document === 'undefined' ? ${getResolveUrl(`'file:' + __filename`, `(require('u' + 'rl').URL)`)} : ${getUrlFromDocument(chunkId)})`)
};

class NewExpression extends NodeBase {
    bind() {
        super.bind();
        for (const argument of this.arguments) {
            // This will make sure all properties of parameters behave as "unknown"
            argument.deoptimizePath(UNKNOWN_PATH);
        }
    }
    hasEffects(context) {
        for (const argument of this.arguments) {
            if (argument.hasEffects(context))
                return true;
        }
        if (this.context.options.treeshake.annotations &&
            this.annotatedPure)
            return false;
        return (this.callee.hasEffects(context) ||
            this.callee.hasEffectsWhenCalledAtPath(EMPTY_PATH, this.callOptions, context));
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    initialise() {
        this.callOptions = {
            args: this.arguments,
            withNew: true
        };
    }
}

class ObjectExpression extends NodeBase {
    constructor() {
        super(...arguments);
        this.deoptimizedPaths = new Set();
        // We collect deoptimization information if we can resolve a computed property access
        this.expressionsToBeDeoptimized = new Map();
        this.hasUnknownDeoptimizedProperty = false;
        this.propertyMap = null;
        this.unmatchablePropertiesRead = [];
        this.unmatchablePropertiesWrite = [];
    }
    bind() {
        super.bind();
        // ensure the propertyMap is set for the tree-shaking passes
        this.getPropertyMap();
    }
    // We could also track this per-property but this would quickly become much more complex
    deoptimizeCache() {
        if (!this.hasUnknownDeoptimizedProperty)
            this.deoptimizeAllProperties();
    }
    deoptimizePath(path) {
        if (this.hasUnknownDeoptimizedProperty)
            return;
        const propertyMap = this.getPropertyMap();
        const key = path[0];
        if (path.length === 1) {
            if (typeof key !== 'string') {
                this.deoptimizeAllProperties();
                return;
            }
            if (!this.deoptimizedPaths.has(key)) {
                this.deoptimizedPaths.add(key);
                // we only deoptimizeCache exact matches as in all other cases,
                // we do not return a literal value or return expression
                const expressionsToBeDeoptimized = this.expressionsToBeDeoptimized.get(key);
                if (expressionsToBeDeoptimized) {
                    for (const expression of expressionsToBeDeoptimized) {
                        expression.deoptimizeCache();
                    }
                }
            }
        }
        const subPath = path.length === 1 ? UNKNOWN_PATH : path.slice(1);
        for (const property of typeof key === 'string'
            ? propertyMap[key]
                ? propertyMap[key].propertiesRead
                : []
            : this.properties) {
            property.deoptimizePath(subPath);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        const propertyMap = this.getPropertyMap();
        const key = path[0];
        if (path.length === 0 ||
            this.hasUnknownDeoptimizedProperty ||
            typeof key !== 'string' ||
            this.deoptimizedPaths.has(key)) {
            return UnknownValue;
        }
        if (path.length === 1 &&
            !propertyMap[key] &&
            !objectMembers[key] &&
            this.unmatchablePropertiesRead.length === 0) {
            getOrCreate(this.expressionsToBeDeoptimized, key, () => []).push(origin);
            return undefined;
        }
        if (!propertyMap[key] ||
            propertyMap[key].exactMatchRead === null ||
            propertyMap[key].propertiesRead.length > 1) {
            return UnknownValue;
        }
        getOrCreate(this.expressionsToBeDeoptimized, key, () => []).push(origin);
        return propertyMap[key].exactMatchRead.getLiteralValueAtPath(path.slice(1), recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        const propertyMap = this.getPropertyMap();
        const key = path[0];
        if (path.length === 0 ||
            this.hasUnknownDeoptimizedProperty ||
            typeof key !== 'string' ||
            this.deoptimizedPaths.has(key)) {
            return UNKNOWN_EXPRESSION;
        }
        if (path.length === 1 &&
            objectMembers[key] &&
            this.unmatchablePropertiesRead.length === 0 &&
            (!propertyMap[key] || propertyMap[key].exactMatchRead === null)) {
            return getMemberReturnExpressionWhenCalled(objectMembers, key);
        }
        if (!propertyMap[key] ||
            propertyMap[key].exactMatchRead === null ||
            propertyMap[key].propertiesRead.length > 1) {
            return UNKNOWN_EXPRESSION;
        }
        getOrCreate(this.expressionsToBeDeoptimized, key, () => []).push(origin);
        return propertyMap[key].exactMatchRead.getReturnExpressionWhenCalledAtPath(path.slice(1), recursionTracker, origin);
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (path.length === 0)
            return false;
        const key = path[0];
        const propertyMap = this.propertyMap;
        if (path.length > 1 &&
            (this.hasUnknownDeoptimizedProperty ||
                typeof key !== 'string' ||
                this.deoptimizedPaths.has(key) ||
                !propertyMap[key] ||
                propertyMap[key].exactMatchRead === null))
            return true;
        const subPath = path.slice(1);
        for (const property of typeof key !== 'string'
            ? this.properties
            : propertyMap[key]
                ? propertyMap[key].propertiesRead
                : []) {
            if (property.hasEffectsWhenAccessedAtPath(subPath, context))
                return true;
        }
        return false;
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        const key = path[0];
        const propertyMap = this.propertyMap;
        if (path.length > 1 &&
            (this.hasUnknownDeoptimizedProperty ||
                this.deoptimizedPaths.has(key) ||
                !propertyMap[key] ||
                propertyMap[key].exactMatchRead === null)) {
            return true;
        }
        const subPath = path.slice(1);
        for (const property of typeof key !== 'string'
            ? this.properties
            : path.length > 1
                ? propertyMap[key].propertiesRead
                : propertyMap[key]
                    ? propertyMap[key].propertiesWrite
                    : []) {
            if (property.hasEffectsWhenAssignedAtPath(subPath, context))
                return true;
        }
        return false;
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        const key = path[0];
        if (typeof key !== 'string' ||
            this.hasUnknownDeoptimizedProperty ||
            this.deoptimizedPaths.has(key) ||
            (this.propertyMap[key]
                ? !this.propertyMap[key].exactMatchRead
                : path.length > 1 || !objectMembers[key])) {
            return true;
        }
        const subPath = path.slice(1);
        if (this.propertyMap[key]) {
            for (const property of this.propertyMap[key].propertiesRead) {
                if (property.hasEffectsWhenCalledAtPath(subPath, callOptions, context))
                    return true;
            }
        }
        if (path.length === 1 && objectMembers[key])
            return hasMemberEffectWhenCalled(objectMembers, key, this.included, callOptions, context);
        return false;
    }
    render(code, options, { renderedParentType } = BLANK) {
        super.render(code, options);
        if (renderedParentType === ExpressionStatement ||
            renderedParentType === ArrowFunctionExpression) {
            code.appendRight(this.start, '(');
            code.prependLeft(this.end, ')');
        }
    }
    deoptimizeAllProperties() {
        this.hasUnknownDeoptimizedProperty = true;
        for (const property of this.properties) {
            property.deoptimizePath(UNKNOWN_PATH);
        }
        for (const expressionsToBeDeoptimized of this.expressionsToBeDeoptimized.values()) {
            for (const expression of expressionsToBeDeoptimized) {
                expression.deoptimizeCache();
            }
        }
    }
    getPropertyMap() {
        if (this.propertyMap !== null) {
            return this.propertyMap;
        }
        const propertyMap = (this.propertyMap = Object.create(null));
        for (let index = this.properties.length - 1; index >= 0; index--) {
            const property = this.properties[index];
            if (property instanceof SpreadElement) {
                this.unmatchablePropertiesRead.push(property);
                continue;
            }
            const isWrite = property.kind !== 'get';
            const isRead = property.kind !== 'set';
            let key;
            if (property.computed) {
                const keyValue = property.key.getLiteralValueAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this);
                if (keyValue === UnknownValue) {
                    if (isRead) {
                        this.unmatchablePropertiesRead.push(property);
                    }
                    else {
                        this.unmatchablePropertiesWrite.push(property);
                    }
                    continue;
                }
                key = String(keyValue);
            }
            else if (property.key instanceof Identifier$1) {
                key = property.key.name;
            }
            else {
                key = String(property.key.value);
            }
            const propertyMapProperty = propertyMap[key];
            if (!propertyMapProperty) {
                propertyMap[key] = {
                    exactMatchRead: isRead ? property : null,
                    exactMatchWrite: isWrite ? property : null,
                    propertiesRead: isRead ? [property, ...this.unmatchablePropertiesRead] : [],
                    propertiesWrite: isWrite && !isRead ? [property, ...this.unmatchablePropertiesWrite] : []
                };
                continue;
            }
            if (isRead && propertyMapProperty.exactMatchRead === null) {
                propertyMapProperty.exactMatchRead = property;
                propertyMapProperty.propertiesRead.push(property, ...this.unmatchablePropertiesRead);
            }
            if (isWrite && !isRead && propertyMapProperty.exactMatchWrite === null) {
                propertyMapProperty.exactMatchWrite = property;
                propertyMapProperty.propertiesWrite.push(property, ...this.unmatchablePropertiesWrite);
            }
        }
        return propertyMap;
    }
}

class ObjectPattern extends NodeBase {
    addExportedVariables(variables, exportNamesByVariable) {
        for (const property of this.properties) {
            if (property.type === Property) {
                property.value.addExportedVariables(variables, exportNamesByVariable);
            }
            else {
                property.argument.addExportedVariables(variables, exportNamesByVariable);
            }
        }
    }
    declare(kind, init) {
        const variables = [];
        for (const property of this.properties) {
            variables.push(...property.declare(kind, init));
        }
        return variables;
    }
    deoptimizePath(path) {
        if (path.length === 0) {
            for (const property of this.properties) {
                property.deoptimizePath(path);
            }
        }
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (path.length > 0)
            return true;
        for (const property of this.properties) {
            if (property.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context))
                return true;
        }
        return false;
    }
}

class PrivateName extends NodeBase {
}

class Program$1 extends NodeBase {
    constructor() {
        super(...arguments);
        this.hasCachedEffect = false;
    }
    hasEffects(context) {
        // We are caching here to later more efficiently identify side-effect-free modules
        if (this.hasCachedEffect)
            return true;
        for (const node of this.body) {
            if (node.hasEffects(context)) {
                return (this.hasCachedEffect = true);
            }
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const node of this.body) {
            if (includeChildrenRecursively || node.shouldBeIncluded(context)) {
                node.include(context, includeChildrenRecursively);
            }
        }
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start, this.end, options);
        }
        else {
            super.render(code, options);
        }
    }
}

class Property$1 extends NodeBase {
    constructor() {
        super(...arguments);
        this.declarationInit = null;
        this.returnExpression = null;
    }
    bind() {
        super.bind();
        if (this.kind === 'get') {
            // ensure the returnExpression is set for the tree-shaking passes
            this.getReturnExpression();
        }
        if (this.declarationInit !== null) {
            this.declarationInit.deoptimizePath([UnknownKey, UnknownKey]);
        }
    }
    declare(kind, init) {
        this.declarationInit = init;
        return this.value.declare(kind, UNKNOWN_EXPRESSION);
    }
    // As getter properties directly receive their values from function expressions that always
    // have a fixed return value, there is no known situation where a getter is deoptimized.
    deoptimizeCache() { }
    deoptimizePath(path) {
        if (this.kind === 'get') {
            this.getReturnExpression().deoptimizePath(path);
        }
        else {
            this.value.deoptimizePath(path);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (this.kind === 'get') {
            return this.getReturnExpression().getLiteralValueAtPath(path, recursionTracker, origin);
        }
        return this.value.getLiteralValueAtPath(path, recursionTracker, origin);
    }
    getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin) {
        if (this.kind === 'get') {
            return this.getReturnExpression().getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
        }
        return this.value.getReturnExpressionWhenCalledAtPath(path, recursionTracker, origin);
    }
    hasEffects(context) {
        return this.key.hasEffects(context) || this.value.hasEffects(context);
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        if (this.kind === 'get') {
            const trackedExpressions = context.accessed.getEntities(path);
            if (trackedExpressions.has(this))
                return false;
            trackedExpressions.add(this);
            return (this.value.hasEffectsWhenCalledAtPath(EMPTY_PATH, this.accessorCallOptions, context) ||
                (path.length > 0 && this.returnExpression.hasEffectsWhenAccessedAtPath(path, context)));
        }
        return this.value.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        if (this.kind === 'get') {
            const trackedExpressions = context.assigned.getEntities(path);
            if (trackedExpressions.has(this))
                return false;
            trackedExpressions.add(this);
            return this.returnExpression.hasEffectsWhenAssignedAtPath(path, context);
        }
        if (this.kind === 'set') {
            const trackedExpressions = context.assigned.getEntities(path);
            if (trackedExpressions.has(this))
                return false;
            trackedExpressions.add(this);
            return this.value.hasEffectsWhenCalledAtPath(EMPTY_PATH, this.accessorCallOptions, context);
        }
        return this.value.hasEffectsWhenAssignedAtPath(path, context);
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        if (this.kind === 'get') {
            const trackedExpressions = (callOptions.withNew
                ? context.instantiated
                : context.called).getEntities(path, callOptions);
            if (trackedExpressions.has(this))
                return false;
            trackedExpressions.add(this);
            return this.returnExpression.hasEffectsWhenCalledAtPath(path, callOptions, context);
        }
        return this.value.hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    initialise() {
        this.accessorCallOptions = {
            args: NO_ARGS,
            withNew: false
        };
    }
    render(code, options) {
        if (!this.shorthand) {
            this.key.render(code, options);
        }
        this.value.render(code, options, { isShorthandProperty: this.shorthand });
    }
    getReturnExpression() {
        if (this.returnExpression === null) {
            this.returnExpression = UNKNOWN_EXPRESSION;
            return (this.returnExpression = this.value.getReturnExpressionWhenCalledAtPath(EMPTY_PATH, SHARED_RECURSION_TRACKER, this));
        }
        return this.returnExpression;
    }
}

class ReturnStatement$1 extends NodeBase {
    hasEffects(context) {
        if (!context.ignore.returnAwaitYield ||
            (this.argument !== null && this.argument.hasEffects(context)))
            return true;
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (this.argument) {
            this.argument.include(context, includeChildrenRecursively);
        }
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
    }
    initialise() {
        this.scope.addReturnExpression(this.argument || UNKNOWN_EXPRESSION);
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options, { preventASI: true });
            if (this.argument.start === this.start + 6 /* 'return'.length */) {
                code.prependLeft(this.start + 6, ' ');
            }
        }
    }
}

class SequenceExpression extends NodeBase {
    deoptimizePath(path) {
        if (path.length > 0)
            this.expressions[this.expressions.length - 1].deoptimizePath(path);
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        return this.expressions[this.expressions.length - 1].getLiteralValueAtPath(path, recursionTracker, origin);
    }
    hasEffects(context) {
        for (const expression of this.expressions) {
            if (expression.hasEffects(context))
                return true;
        }
        return false;
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        return (path.length > 0 &&
            this.expressions[this.expressions.length - 1].hasEffectsWhenAccessedAtPath(path, context));
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return (path.length === 0 ||
            this.expressions[this.expressions.length - 1].hasEffectsWhenAssignedAtPath(path, context));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, context) {
        return this.expressions[this.expressions.length - 1].hasEffectsWhenCalledAtPath(path, callOptions, context);
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (let i = 0; i < this.expressions.length - 1; i++) {
            const node = this.expressions[i];
            if (includeChildrenRecursively || node.shouldBeIncluded(context))
                node.include(context, includeChildrenRecursively);
        }
        this.expressions[this.expressions.length - 1].include(context, includeChildrenRecursively);
    }
    render(code, options, { renderedParentType, isCalleeOfRenderedParent, preventASI } = BLANK) {
        let includedNodes = 0;
        for (const { node, start, end } of getCommaSeparatedNodesWithBoundaries(this.expressions, code, this.start, this.end)) {
            if (!node.included) {
                treeshakeNode(node, code, start, end);
                continue;
            }
            includedNodes++;
            if (includedNodes === 1 && preventASI) {
                removeLineBreaks(code, start, node.start);
            }
            if (node === this.expressions[this.expressions.length - 1] && includedNodes === 1) {
                node.render(code, options, {
                    isCalleeOfRenderedParent: renderedParentType
                        ? isCalleeOfRenderedParent
                        : this.parent.callee === this,
                    renderedParentType: renderedParentType || this.parent.type
                });
            }
            else {
                node.render(code, options);
            }
        }
    }
}

class Super extends NodeBase {
}

class SwitchCase extends NodeBase {
    hasEffects(context) {
        if (this.test && this.test.hasEffects(context))
            return true;
        for (const node of this.consequent) {
            if (context.brokenFlow)
                break;
            if (node.hasEffects(context))
                return true;
        }
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        if (this.test)
            this.test.include(context, includeChildrenRecursively);
        for (const node of this.consequent) {
            if (includeChildrenRecursively || node.shouldBeIncluded(context))
                node.include(context, includeChildrenRecursively);
        }
    }
    render(code, options, nodeRenderOptions) {
        if (this.consequent.length) {
            this.test && this.test.render(code, options);
            const testEnd = this.test
                ? this.test.end
                : findFirstOccurrenceOutsideComment(code.original, 'default', this.start) + 7;
            const consequentStart = findFirstOccurrenceOutsideComment(code.original, ':', testEnd) + 1;
            renderStatementList(this.consequent, code, consequentStart, nodeRenderOptions.end, options);
        }
        else {
            super.render(code, options);
        }
    }
}
SwitchCase.prototype.needsBoundaries = true;

class SwitchStatement extends NodeBase {
    createScope(parentScope) {
        this.scope = new BlockScope(parentScope);
    }
    hasEffects(context) {
        if (this.discriminant.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks } } = context;
        let minBrokenFlow = Infinity;
        context.ignore.breaks = true;
        for (const switchCase of this.cases) {
            if (switchCase.hasEffects(context))
                return true;
            minBrokenFlow = context.brokenFlow < minBrokenFlow ? context.brokenFlow : minBrokenFlow;
            context.brokenFlow = brokenFlow;
        }
        if (this.defaultCase !== null && !(minBrokenFlow === BROKEN_FLOW_BREAK_CONTINUE)) {
            context.brokenFlow = minBrokenFlow;
        }
        context.ignore.breaks = breaks;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.discriminant.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        let minBrokenFlow = Infinity;
        let isCaseIncluded = includeChildrenRecursively ||
            (this.defaultCase !== null && this.defaultCase < this.cases.length - 1);
        for (let caseIndex = this.cases.length - 1; caseIndex >= 0; caseIndex--) {
            const switchCase = this.cases[caseIndex];
            if (switchCase.included) {
                isCaseIncluded = true;
            }
            if (!isCaseIncluded) {
                const hasEffectsContext = createHasEffectsContext();
                hasEffectsContext.ignore.breaks = true;
                isCaseIncluded = switchCase.hasEffects(hasEffectsContext);
            }
            if (isCaseIncluded) {
                switchCase.include(context, includeChildrenRecursively);
                minBrokenFlow = minBrokenFlow < context.brokenFlow ? minBrokenFlow : context.brokenFlow;
                context.brokenFlow = brokenFlow;
            }
            else {
                minBrokenFlow = brokenFlow;
            }
        }
        if (isCaseIncluded &&
            this.defaultCase !== null &&
            !(minBrokenFlow === BROKEN_FLOW_BREAK_CONTINUE)) {
            context.brokenFlow = minBrokenFlow;
        }
    }
    initialise() {
        for (let caseIndex = 0; caseIndex < this.cases.length; caseIndex++) {
            if (this.cases[caseIndex].test === null) {
                this.defaultCase = caseIndex;
                return;
            }
        }
        this.defaultCase = null;
    }
    render(code, options) {
        this.discriminant.render(code, options);
        if (this.cases.length > 0) {
            renderStatementList(this.cases, code, this.cases[0].start, this.end - 1, options);
        }
    }
}

class TaggedTemplateExpression extends NodeBase {
    bind() {
        super.bind();
        if (this.tag.type === Identifier) {
            const name = this.tag.name;
            const variable = this.scope.findVariable(name);
            if (variable.isNamespace) {
                this.context.warn({
                    code: 'CANNOT_CALL_NAMESPACE',
                    message: `Cannot call a namespace ('${name}')`,
                }, this.start);
            }
            if (name === 'eval') {
                this.context.warn({
                    code: 'EVAL',
                    message: `Use of eval is strongly discouraged, as it poses security risks and may cause issues with minification`,
                    url: 'https://rollupjs.org/guide/en/#avoiding-eval',
                }, this.start);
            }
        }
    }
    hasEffects(context) {
        return (super.hasEffects(context) ||
            this.tag.hasEffectsWhenCalledAtPath(EMPTY_PATH, this.callOptions, context));
    }
    initialise() {
        this.callOptions = {
            args: NO_ARGS,
            withNew: false,
        };
    }
}

class TemplateElement extends NodeBase {
    bind() { }
    hasEffects() {
        return false;
    }
    include() {
        this.included = true;
    }
    parseNode(esTreeNode) {
        this.value = esTreeNode.value;
        super.parseNode(esTreeNode);
    }
    render() { }
}

class TemplateLiteral extends NodeBase {
    getLiteralValueAtPath(path) {
        if (path.length > 0 || this.quasis.length !== 1) {
            return UnknownValue;
        }
        return this.quasis[0].value.cooked;
    }
    render(code, options) {
        code.indentExclusionRanges.push([this.start, this.end]);
        super.render(code, options);
    }
}

class ModuleScope extends ChildScope {
    constructor(parent, context) {
        super(parent);
        this.context = context;
        this.variables.set('this', new LocalVariable('this', null, UNDEFINED_EXPRESSION, context));
    }
    addExportDefaultDeclaration(name, exportDefaultDeclaration, context) {
        const variable = new ExportDefaultVariable(name, exportDefaultDeclaration, context);
        this.variables.set('default', variable);
        return variable;
    }
    addNamespaceMemberAccess() { }
    deconflict(format, exportNamesByVariable, accessedGlobalsByScope) {
        // all module level variables are already deconflicted when deconflicting the chunk
        for (const scope of this.children)
            scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
    }
    findLexicalBoundary() {
        return this;
    }
    findVariable(name) {
        const knownVariable = this.variables.get(name) || this.accessedOutsideVariables.get(name);
        if (knownVariable) {
            return knownVariable;
        }
        const variable = this.context.traceVariable(name) || this.parent.findVariable(name);
        if (variable instanceof GlobalVariable) {
            this.accessedOutsideVariables.set(name, variable);
        }
        return variable;
    }
}

class ThisExpression extends NodeBase {
    bind() {
        super.bind();
        this.variable = this.scope.findVariable('this');
    }
    hasEffectsWhenAccessedAtPath(path, context) {
        return path.length > 0 && this.variable.hasEffectsWhenAccessedAtPath(path, context);
    }
    hasEffectsWhenAssignedAtPath(path, context) {
        return this.variable.hasEffectsWhenAssignedAtPath(path, context);
    }
    initialise() {
        this.alias =
            this.scope.findLexicalBoundary() instanceof ModuleScope ? this.context.moduleContext : null;
        if (this.alias === 'undefined') {
            this.context.warn({
                code: 'THIS_IS_UNDEFINED',
                message: `The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten`,
                url: `https://rollupjs.org/guide/en/#error-this-is-undefined`
            }, this.start);
        }
    }
    render(code) {
        if (this.alias !== null) {
            code.overwrite(this.start, this.end, this.alias, {
                contentOnly: false,
                storeName: true
            });
        }
    }
}

class ThrowStatement extends NodeBase {
    hasEffects() {
        return true;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.argument.include(context, includeChildrenRecursively);
        context.brokenFlow = BROKEN_FLOW_ERROR_RETURN_LABEL;
    }
    render(code, options) {
        this.argument.render(code, options, { preventASI: true });
        if (this.argument.start === this.start + 5 /* 'throw'.length */) {
            code.prependLeft(this.start + 5, ' ');
        }
    }
}

class TryStatement extends NodeBase {
    constructor() {
        super(...arguments);
        this.directlyIncluded = false;
        this.includedLabelsAfterBlock = null;
    }
    hasEffects(context) {
        return ((this.context.options.treeshake.tryCatchDeoptimization
            ? this.block.body.length > 0
            : this.block.hasEffects(context)) ||
            (this.finalizer !== null && this.finalizer.hasEffects(context)));
    }
    include(context, includeChildrenRecursively) {
        var _a;
        const tryCatchDeoptimization = (_a = this.context.options.treeshake) === null || _a === void 0 ? void 0 : _a.tryCatchDeoptimization;
        const { brokenFlow } = context;
        if (!this.directlyIncluded || !tryCatchDeoptimization) {
            this.included = true;
            this.directlyIncluded = true;
            this.block.include(context, tryCatchDeoptimization ? INCLUDE_PARAMETERS : includeChildrenRecursively);
            if (context.includedLabels.size > 0) {
                this.includedLabelsAfterBlock = [...context.includedLabels];
            }
            context.brokenFlow = brokenFlow;
        }
        else if (this.includedLabelsAfterBlock) {
            for (const label of this.includedLabelsAfterBlock) {
                context.includedLabels.add(label);
            }
        }
        if (this.handler !== null) {
            this.handler.include(context, includeChildrenRecursively);
            context.brokenFlow = brokenFlow;
        }
        if (this.finalizer !== null) {
            this.finalizer.include(context, includeChildrenRecursively);
        }
    }
}

const unaryOperators = {
    '!': value => !value,
    '+': value => +value,
    '-': value => -value,
    delete: () => UnknownValue,
    typeof: value => typeof value,
    void: () => undefined,
    '~': value => ~value
};
class UnaryExpression extends NodeBase {
    bind() {
        super.bind();
        if (this.operator === 'delete') {
            this.argument.deoptimizePath(EMPTY_PATH);
        }
    }
    getLiteralValueAtPath(path, recursionTracker, origin) {
        if (path.length > 0)
            return UnknownValue;
        const argumentValue = this.argument.getLiteralValueAtPath(EMPTY_PATH, recursionTracker, origin);
        if (argumentValue === UnknownValue)
            return UnknownValue;
        return unaryOperators[this.operator](argumentValue);
    }
    hasEffects(context) {
        if (this.operator === 'typeof' && this.argument instanceof Identifier$1)
            return false;
        return (this.argument.hasEffects(context) ||
            (this.operator === 'delete' &&
                this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context)));
    }
    hasEffectsWhenAccessedAtPath(path) {
        if (this.operator === 'void') {
            return path.length > 0;
        }
        return path.length > 1;
    }
}

class UnknownNode extends NodeBase {
    hasEffects() {
        return true;
    }
    include(context) {
        super.include(context, true);
    }
}

class UpdateExpression extends NodeBase {
    bind() {
        super.bind();
        this.argument.deoptimizePath(EMPTY_PATH);
        if (this.argument instanceof Identifier$1) {
            const variable = this.scope.findVariable(this.argument.name);
            variable.isReassigned = true;
        }
    }
    hasEffects(context) {
        return (this.argument.hasEffects(context) ||
            this.argument.hasEffectsWhenAssignedAtPath(EMPTY_PATH, context));
    }
    hasEffectsWhenAccessedAtPath(path) {
        return path.length > 1;
    }
    render(code, options) {
        this.argument.render(code, options);
        if (options.format === 'system') {
            const variable = this.argument.variable;
            const exportNames = options.exportNamesByVariable.get(variable);
            if (exportNames && exportNames.length) {
                const _ = options.compact ? '' : ' ';
                const name = variable.getName();
                if (this.prefix) {
                    if (exportNames.length === 1) {
                        code.overwrite(this.start, this.end, `exports('${exportNames[0]}',${_}${this.operator}${name})`);
                    }
                    else {
                        code.overwrite(this.start, this.end, `(${this.operator}${name},${_}${getSystemExportStatement([variable], options)},${_}${name})`);
                    }
                }
                else if (exportNames.length > 1) {
                    code.overwrite(this.start, this.end, `${getSystemExportFunctionLeft([variable], false, options)}${this.operator}${name})`);
                }
                else {
                    let op;
                    switch (this.operator) {
                        case '++':
                            op = `${name}${_}+${_}1`;
                            break;
                        case '--':
                            op = `${name}${_}-${_}1`;
                            break;
                    }
                    code.overwrite(this.start, this.end, `(exports('${exportNames[0]}',${_}${op}),${_}${name}${this.operator})`);
                }
            }
        }
    }
}

function isReassignedExportsMember(variable, exportNamesByVariable) {
    return (variable.renderBaseName !== null && exportNamesByVariable.has(variable) && variable.isReassigned);
}
function areAllDeclarationsIncludedAndNotExported(declarations, exportNamesByVariable) {
    for (const declarator of declarations) {
        if (!declarator.included)
            return false;
        if (declarator.id.type === Identifier) {
            if (exportNamesByVariable.has(declarator.id.variable))
                return false;
        }
        else {
            const exportedVariables = [];
            declarator.id.addExportedVariables(exportedVariables, exportNamesByVariable);
            if (exportedVariables.length > 0)
                return false;
        }
    }
    return true;
}
class VariableDeclaration extends NodeBase {
    deoptimizePath() {
        for (const declarator of this.declarations) {
            declarator.deoptimizePath(EMPTY_PATH);
        }
    }
    hasEffectsWhenAssignedAtPath() {
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        for (const declarator of this.declarations) {
            if (includeChildrenRecursively || declarator.shouldBeIncluded(context))
                declarator.include(context, includeChildrenRecursively);
        }
    }
    includeWithAllDeclaredVariables(includeChildrenRecursively, context) {
        this.included = true;
        for (const declarator of this.declarations) {
            declarator.include(context, includeChildrenRecursively);
        }
    }
    initialise() {
        for (const declarator of this.declarations) {
            declarator.declareDeclarator(this.kind);
        }
    }
    render(code, options, nodeRenderOptions = BLANK) {
        if (areAllDeclarationsIncludedAndNotExported(this.declarations, options.exportNamesByVariable)) {
            for (const declarator of this.declarations) {
                declarator.render(code, options);
            }
            if (!nodeRenderOptions.isNoStatement &&
                code.original.charCodeAt(this.end - 1) !== 59 /*";"*/) {
                code.appendLeft(this.end, ';');
            }
        }
        else {
            this.renderReplacedDeclarations(code, options, nodeRenderOptions);
        }
    }
    renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, addSemicolon, systemPatternExports, options) {
        if (code.original.charCodeAt(this.end - 1) === 59 /*";"*/) {
            code.remove(this.end - 1, this.end);
        }
        if (addSemicolon) {
            separatorString += ';';
        }
        if (lastSeparatorPos !== null) {
            if (code.original.charCodeAt(actualContentEnd - 1) === 10 /*"\n"*/ &&
                (code.original.charCodeAt(this.end) === 10 /*"\n"*/ ||
                    code.original.charCodeAt(this.end) === 13) /*"\r"*/) {
                actualContentEnd--;
                if (code.original.charCodeAt(actualContentEnd) === 13 /*"\r"*/) {
                    actualContentEnd--;
                }
            }
            if (actualContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString);
            }
            else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.remove(actualContentEnd, renderedContentEnd);
            }
        }
        else {
            code.appendLeft(renderedContentEnd, separatorString);
        }
        if (systemPatternExports.length > 0) {
            code.appendLeft(renderedContentEnd, ` ${getSystemExportStatement(systemPatternExports, options)};`);
        }
    }
    renderReplacedDeclarations(code, options, { start = this.start, end = this.end, isNoStatement }) {
        const separatedNodes = getCommaSeparatedNodesWithBoundaries(this.declarations, code, this.start + this.kind.length, this.end - (code.original.charCodeAt(this.end - 1) === 59 /*";"*/ ? 1 : 0));
        let actualContentEnd, renderedContentEnd;
        if (/\n\s*$/.test(code.slice(this.start, separatedNodes[0].start))) {
            renderedContentEnd = this.start + this.kind.length;
        }
        else {
            renderedContentEnd = separatedNodes[0].start;
        }
        let lastSeparatorPos = renderedContentEnd - 1;
        code.remove(this.start, lastSeparatorPos);
        let isInDeclaration = false;
        let hasRenderedContent = false;
        let separatorString = '', leadingString, nextSeparatorString;
        const systemPatternExports = [];
        for (const { node, start, separator, contentEnd, end } of separatedNodes) {
            if (!node.included ||
                (node.id instanceof Identifier$1 &&
                    isReassignedExportsMember(node.id.variable, options.exportNamesByVariable) &&
                    node.init === null)) {
                code.remove(start, end);
                continue;
            }
            leadingString = '';
            nextSeparatorString = '';
            if (node.id instanceof Identifier$1 &&
                isReassignedExportsMember(node.id.variable, options.exportNamesByVariable)) {
                if (hasRenderedContent) {
                    separatorString += ';';
                }
                isInDeclaration = false;
            }
            else {
                if (options.format === 'system' && node.init !== null) {
                    if (node.id.type !== Identifier) {
                        node.id.addExportedVariables(systemPatternExports, options.exportNamesByVariable);
                    }
                    else {
                        const exportNames = options.exportNamesByVariable.get(node.id.variable);
                        if (exportNames) {
                            const _ = options.compact ? '' : ' ';
                            const operatorPos = findFirstOccurrenceOutsideComment(code.original, '=', node.id.end);
                            code.prependLeft(findNonWhiteSpace(code.original, operatorPos + 1), exportNames.length === 1
                                ? `exports('${exportNames[0]}',${_}`
                                : getSystemExportFunctionLeft([node.id.variable], false, options));
                            nextSeparatorString += ')';
                        }
                    }
                }
                if (isInDeclaration) {
                    separatorString += ',';
                }
                else {
                    if (hasRenderedContent) {
                        separatorString += ';';
                    }
                    leadingString += `${this.kind} `;
                    isInDeclaration = true;
                }
            }
            if (renderedContentEnd === lastSeparatorPos + 1) {
                code.overwrite(lastSeparatorPos, renderedContentEnd, separatorString + leadingString);
            }
            else {
                code.overwrite(lastSeparatorPos, lastSeparatorPos + 1, separatorString);
                code.appendLeft(renderedContentEnd, leadingString);
            }
            node.render(code, options);
            actualContentEnd = contentEnd;
            renderedContentEnd = end;
            hasRenderedContent = true;
            lastSeparatorPos = separator;
            separatorString = nextSeparatorString;
        }
        if (hasRenderedContent) {
            this.renderDeclarationEnd(code, separatorString, lastSeparatorPos, actualContentEnd, renderedContentEnd, !isNoStatement, systemPatternExports, options);
        }
        else {
            code.remove(start, end);
        }
    }
}

class VariableDeclarator extends NodeBase {
    declareDeclarator(kind) {
        this.id.declare(kind, this.init || UNDEFINED_EXPRESSION);
    }
    deoptimizePath(path) {
        this.id.deoptimizePath(path);
    }
}

class WhileStatement extends NodeBase {
    hasEffects(context) {
        if (this.test.hasEffects(context))
            return true;
        const { brokenFlow, ignore: { breaks, continues } } = context;
        context.ignore.breaks = true;
        context.ignore.continues = true;
        if (this.body.hasEffects(context))
            return true;
        context.ignore.breaks = breaks;
        context.ignore.continues = continues;
        context.brokenFlow = brokenFlow;
        return false;
    }
    include(context, includeChildrenRecursively) {
        this.included = true;
        this.test.include(context, includeChildrenRecursively);
        const { brokenFlow } = context;
        this.body.include(context, includeChildrenRecursively);
        context.brokenFlow = brokenFlow;
    }
}

class YieldExpression extends NodeBase {
    bind() {
        super.bind();
        if (this.argument !== null) {
            this.argument.deoptimizePath(UNKNOWN_PATH);
        }
    }
    hasEffects(context) {
        return (!context.ignore.returnAwaitYield ||
            (this.argument !== null && this.argument.hasEffects(context)));
    }
    render(code, options) {
        if (this.argument) {
            this.argument.render(code, options, { preventASI: true });
            if (this.argument.start === this.start + 5 /* 'yield'.length */) {
                code.prependLeft(this.start + 5, ' ');
            }
        }
    }
}

const nodeConstructors = {
    ArrayExpression,
    ArrayPattern,
    ArrowFunctionExpression: ArrowFunctionExpression$1,
    AssignmentExpression,
    AssignmentPattern,
    AwaitExpression,
    BinaryExpression,
    BlockStatement: BlockStatement$1,
    BreakStatement,
    CallExpression: CallExpression$1,
    CatchClause,
    ChainExpression,
    ClassBody,
    ClassDeclaration,
    ClassExpression,
    ConditionalExpression,
    ContinueStatement,
    DoWhileStatement,
    EmptyStatement,
    ExportAllDeclaration,
    ExportDefaultDeclaration,
    ExportNamedDeclaration,
    ExportSpecifier,
    ExpressionStatement: ExpressionStatement$1,
    FieldDefinition,
    ForInStatement,
    ForOfStatement,
    ForStatement,
    FunctionDeclaration,
    FunctionExpression: FunctionExpression$1,
    Identifier: Identifier$1,
    IfStatement,
    ImportDeclaration,
    ImportDefaultSpecifier: ImportDefaultSpecifier$1,
    ImportExpression,
    ImportNamespaceSpecifier: ImportNamespaceSpecifier$1,
    ImportSpecifier,
    LabeledStatement,
    Literal,
    LogicalExpression,
    MemberExpression,
    MetaProperty,
    MethodDefinition,
    NewExpression,
    ObjectExpression,
    ObjectPattern,
    PrivateName,
    Program: Program$1,
    Property: Property$1,
    RestElement,
    ReturnStatement: ReturnStatement$1,
    SequenceExpression,
    SpreadElement,
    Super,
    SwitchCase,
    SwitchStatement,
    TaggedTemplateExpression,
    TemplateElement,
    TemplateLiteral,
    ThisExpression,
    ThrowStatement,
    TryStatement,
    UnaryExpression,
    UnknownNode,
    UpdateExpression,
    VariableDeclaration,
    VariableDeclarator,
    WhileStatement,
    YieldExpression
};

function getId(m) {
    return m.id;
}

function getOriginalLocation(sourcemapChain, location) {
    // This cast is guaranteed. If it were a missing Map, it wouldn't have a mappings.
    const filteredSourcemapChain = sourcemapChain.filter(sourcemap => sourcemap.mappings);
    while (filteredSourcemapChain.length > 0) {
        const sourcemap = filteredSourcemapChain.pop();
        const line = sourcemap.mappings[location.line - 1];
        let locationFound = false;
        if (line !== undefined) {
            for (const segment of line) {
                if (segment[0] >= location.column) {
                    if (segment.length === 1)
                        break;
                    location = {
                        column: segment[3],
                        line: segment[2] + 1,
                        name: segment.length === 5 ? sourcemap.names[segment[4]] : undefined,
                        source: sourcemap.sources[segment[1]]
                    };
                    locationFound = true;
                    break;
                }
            }
        }
        if (!locationFound) {
            throw new Error("Can't resolve original location of error.");
        }
    }
    return location;
}

// AST walker module for Mozilla Parser API compatible trees

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

// Node walkers.

var base$1 = {};

base$1.Program = base$1.BlockStatement = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base$1.Statement = skipThrough;
base$1.EmptyStatement = ignore;
base$1.ExpressionStatement = base$1.ParenthesizedExpression = base$1.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base$1.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base$1.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base$1.BreakStatement = base$1.ContinueStatement = ignore;
base$1.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i$1 = 0, list$1 = node.cases; i$1 < list$1.length; i$1 += 1) {
    var cs = list$1[i$1];

    if (cs.test) { c(cs.test, st, "Expression"); }
    for (var i = 0, list = cs.consequent; i < list.length; i += 1)
      {
      var cons = list[i];

      c(cons, st, "Statement");
    }
  }
};
base$1.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base$1.ReturnStatement = base$1.YieldExpression = base$1.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base$1.ThrowStatement = base$1.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base$1.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base$1.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base$1.WhileStatement = base$1.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base$1.ForInStatement = base$1.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base$1.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base$1.DebuggerStatement = ignore;

base$1.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base$1.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base$1.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base$1.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base$1.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base$1.VariablePattern = ignore;
base$1.MemberPattern = skipThrough;
base$1.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base$1.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base$1.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base$1.Expression = skipThrough;
base$1.ThisExpression = base$1.Super = base$1.MetaProperty = ignore;
base$1.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base$1.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base$1.FunctionExpression = base$1.ArrowFunctionExpression = base$1.FunctionDeclaration;
base$1.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base$1.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base$1.TemplateElement = ignore;
base$1.UnaryExpression = base$1.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base$1.BinaryExpression = base$1.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base$1.AssignmentExpression = base$1.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base$1.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base$1.NewExpression = base$1.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base$1.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base$1.ExportNamedDeclaration = base$1.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
};
base$1.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
};
base$1.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
};
base$1.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
};
base$1.ImportSpecifier = base$1.ImportDefaultSpecifier = base$1.ImportNamespaceSpecifier = base$1.Identifier = base$1.Literal = ignore;

base$1.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base$1.ClassDeclaration = base$1.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base$1.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base$1.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base$1.MethodDefinition = base$1.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  c(node.value, st, "Expression");
};

// @ts-ignore
// patch up acorn-walk until class-fields are officially supported
base$1.FieldDefinition = function (node, st, c) {
    if (node.computed) {
        c(node.key, st, 'Expression');
    }
    if (node.value) {
        c(node.value, st, 'Expression');
    }
};
function handlePureAnnotationsOfNode(node, state, type = node.type) {
    let commentNode = state.commentNodes[state.commentIndex];
    while (commentNode && node.start >= commentNode.end) {
        markPureNode(node, commentNode);
        commentNode = state.commentNodes[++state.commentIndex];
    }
    if (commentNode && commentNode.end <= node.end) {
        base$1[type](node, state, handlePureAnnotationsOfNode);
    }
}
function markPureNode(node, comment) {
    if (node.annotations) {
        node.annotations.push(comment);
    }
    else {
        node.annotations = [comment];
    }
    if (node.type === 'ExpressionStatement') {
        node = node.expression;
    }
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
        node.annotatedPure = true;
    }
}
const pureCommentRegex = /[@#]__PURE__/;
const isPureComment = (comment) => pureCommentRegex.test(comment.text);
function markPureCallExpressions(comments, esTreeAst) {
    handlePureAnnotationsOfNode(esTreeAst, {
        commentIndex: 0,
        commentNodes: comments.filter(isPureComment)
    });
}

// this looks ridiculous, but it prevents sourcemap tooling from mistaking
// this for an actual sourceMappingURL
let SOURCEMAPPING_URL = 'sourceMa';
SOURCEMAPPING_URL += 'ppingURL';
const SOURCEMAPPING_URL_RE = new RegExp(`^#\\s+${SOURCEMAPPING_URL}=.+\\n?`);

const NOOP = () => { };
let getStartTime = () => [0, 0];
let getElapsedTime = () => 0;
let getMemory = () => 0;
let timers = {};
const normalizeHrTime = (time) => time[0] * 1e3 + time[1] / 1e6;
function setTimeHelpers() {
    if (typeof process !== 'undefined' && typeof process.hrtime === 'function') {
        getStartTime = process.hrtime.bind(process);
        getElapsedTime = previous => normalizeHrTime(process.hrtime(previous));
    }
    else if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        getStartTime = () => [performance.now(), 0];
        getElapsedTime = previous => performance.now() - previous[0];
    }
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
        getMemory = () => process.memoryUsage().heapUsed;
    }
}
function getPersistedLabel(label, level) {
    switch (level) {
        case 1:
            return `# ${label}`;
        case 2:
            return `## ${label}`;
        case 3:
            return label;
        default:
            return `${'  '.repeat(level - 4)}- ${label}`;
    }
}
function timeStartImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    if (!timers.hasOwnProperty(label)) {
        timers[label] = {
            memory: 0,
            startMemory: undefined,
            startTime: undefined,
            time: 0,
            totalMemory: 0
        };
    }
    const currentMemory = getMemory();
    timers[label].startTime = getStartTime();
    timers[label].startMemory = currentMemory;
}
function timeEndImpl(label, level = 3) {
    label = getPersistedLabel(label, level);
    if (timers.hasOwnProperty(label)) {
        const currentMemory = getMemory();
        timers[label].time += getElapsedTime(timers[label].startTime);
        timers[label].totalMemory = Math.max(timers[label].totalMemory, currentMemory);
        timers[label].memory += currentMemory - timers[label].startMemory;
    }
}
function getTimings() {
    const newTimings = {};
    for (const label of Object.keys(timers)) {
        newTimings[label] = [timers[label].time, timers[label].memory, timers[label].totalMemory];
    }
    return newTimings;
}
let timeStart = NOOP, timeEnd = NOOP;
const TIMED_PLUGIN_HOOKS = {
    load: true,
    resolveDynamicImport: true,
    resolveId: true,
    transform: true
};
function getPluginWithTimers(plugin, index) {
    const timedPlugin = {};
    for (const hook of Object.keys(plugin)) {
        if (TIMED_PLUGIN_HOOKS[hook] === true) {
            let timerLabel = `plugin ${index}`;
            if (plugin.name) {
                timerLabel += ` (${plugin.name})`;
            }
            timerLabel += ` - ${hook}`;
            timedPlugin[hook] = function () {
                timeStart(timerLabel, 4);
                const result = plugin[hook].apply(this === timedPlugin ? plugin : this, arguments);
                timeEnd(timerLabel, 4);
                if (result && typeof result.then === 'function') {
                    timeStart(`${timerLabel} (async)`, 4);
                    result.then(() => timeEnd(`${timerLabel} (async)`, 4));
                }
                return result;
            };
        }
        else {
            timedPlugin[hook] = plugin[hook];
        }
    }
    return timedPlugin;
}
function initialiseTimers(inputOptions) {
    if (inputOptions.perf) {
        timers = {};
        setTimeHelpers();
        timeStart = timeStartImpl;
        timeEnd = timeEndImpl;
        inputOptions.plugins = inputOptions.plugins.map(getPluginWithTimers);
    }
    else {
        timeStart = NOOP;
        timeEnd = NOOP;
    }
}

function tryParse(module, Parser, acornOptions) {
    try {
        return Parser.parse(module.info.code, {
            ...acornOptions,
            onComment: (block, text, start, end) => module.comments.push({ block, text, start, end })
        });
    }
    catch (err) {
        let message = err.message.replace(/ \(\d+:\d+\)$/, '');
        if (module.id.endsWith('.json')) {
            message += ' (Note that you need @rollup/plugin-json to import JSON files)';
        }
        else if (!module.id.endsWith('.js')) {
            message += ' (Note that you need plugins to import files that are not JavaScript)';
        }
        return module.error({
            code: 'PARSE_ERROR',
            message,
            parserError: err
        }, err.pos);
    }
}
function handleMissingExport(exportName, importingModule, importedModule, importerStart) {
    return importingModule.error({
        code: 'MISSING_EXPORT',
        message: `'${exportName}' is not exported by ${relativeId(importedModule)}, imported by ${relativeId(importingModule.id)}`,
        url: `https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module`
    }, importerStart);
}
const MISSING_EXPORT_SHIM_DESCRIPTION = {
    identifier: null,
    localName: MISSING_EXPORT_SHIM_VARIABLE
};
function getVariableForExportNameRecursive(target, name, isExportAllSearch, searchedNamesAndModules = new Map()) {
    const searchedModules = searchedNamesAndModules.get(name);
    if (searchedModules) {
        if (searchedModules.has(target)) {
            return null;
        }
        searchedModules.add(target);
    }
    else {
        searchedNamesAndModules.set(name, new Set([target]));
    }
    return target.getVariableForExportName(name, isExportAllSearch, searchedNamesAndModules);
}
class Module {
    constructor(graph, id, options, isEntry, hasModuleSideEffects, syntheticNamedExports, meta) {
        this.graph = graph;
        this.id = id;
        this.options = options;
        this.ast = null;
        this.chunkFileNames = new Set();
        this.chunkName = null;
        this.comments = [];
        this.dependencies = new Set();
        this.dynamicDependencies = new Set();
        this.dynamicImporters = [];
        this.dynamicImports = [];
        this.execIndex = Infinity;
        this.exportAllSources = new Set();
        this.exports = Object.create(null);
        this.exportsAll = Object.create(null);
        this.implicitlyLoadedAfter = new Set();
        this.implicitlyLoadedBefore = new Set();
        this.importDescriptions = Object.create(null);
        this.importers = [];
        this.importMetas = [];
        this.imports = new Set();
        this.includedDynamicImporters = [];
        this.isExecuted = false;
        this.isUserDefinedEntryPoint = false;
        this.preserveSignature = this.options.preserveEntrySignatures;
        this.reexportDescriptions = Object.create(null);
        this.sources = new Set();
        this.userChunkNames = new Set();
        this.usesTopLevelAwait = false;
        this.allExportNames = null;
        this.exportAllModules = [];
        this.exportNamesByVariable = null;
        this.exportShimVariable = new ExportShimVariable(this);
        this.relevantDependencies = null;
        this.syntheticExports = new Map();
        this.syntheticNamespace = null;
        this.transformDependencies = [];
        this.transitiveReexports = null;
        this.excludeFromSourcemap = /\0/.test(id);
        this.context = options.moduleContext(id);
        const module = this;
        this.info = {
            ast: null,
            code: null,
            get dynamicallyImportedIds() {
                const dynamicallyImportedIds = [];
                for (const { resolution } of module.dynamicImports) {
                    if (resolution instanceof Module || resolution instanceof ExternalModule) {
                        dynamicallyImportedIds.push(resolution.id);
                    }
                }
                return dynamicallyImportedIds;
            },
            get dynamicImporters() {
                return module.dynamicImporters.sort();
            },
            hasModuleSideEffects,
            id,
            get implicitlyLoadedAfterOneOf() {
                return Array.from(module.implicitlyLoadedAfter, getId);
            },
            get implicitlyLoadedBefore() {
                return Array.from(module.implicitlyLoadedBefore, getId);
            },
            get importedIds() {
                return Array.from(module.sources, source => module.resolvedIds[source].id);
            },
            get importers() {
                return module.importers.sort();
            },
            isEntry,
            isExternal: false,
            meta,
            syntheticNamedExports
        };
    }
    basename() {
        const base = basename(this.id);
        const ext = extname(this.id);
        return makeLegal(ext ? base.slice(0, -ext.length) : base);
    }
    bindReferences() {
        this.ast.bind();
    }
    error(props, pos) {
        this.addLocationToLogProps(props, pos);
        return error(props);
    }
    getAllExportNames() {
        if (this.allExportNames) {
            return this.allExportNames;
        }
        const allExportNames = (this.allExportNames = new Set());
        for (const name of Object.keys(this.exports)) {
            allExportNames.add(name);
        }
        for (const name of Object.keys(this.reexportDescriptions)) {
            allExportNames.add(name);
        }
        for (const module of this.exportAllModules) {
            if (module instanceof ExternalModule) {
                allExportNames.add(`*${module.id}`);
                continue;
            }
            for (const name of module.getAllExportNames()) {
                if (name !== 'default')
                    allExportNames.add(name);
            }
        }
        return allExportNames;
    }
    getDependenciesToBeIncluded() {
        if (this.relevantDependencies)
            return this.relevantDependencies;
        const relevantDependencies = new Set();
        const additionalSideEffectModules = new Set();
        const possibleDependencies = new Set(this.dependencies);
        let dependencyVariables = this.imports;
        if (this.info.isEntry ||
            this.includedDynamicImporters.length > 0 ||
            this.namespace.included ||
            this.implicitlyLoadedAfter.size > 0) {
            dependencyVariables = new Set(dependencyVariables);
            for (const exportName of [...this.getReexports(), ...this.getExports()]) {
                dependencyVariables.add(this.getVariableForExportName(exportName));
            }
        }
        for (let variable of dependencyVariables) {
            if (variable instanceof SyntheticNamedExportVariable) {
                variable = variable.getBaseVariable();
            }
            else if (variable instanceof ExportDefaultVariable) {
                const { modules, original } = variable.getOriginalVariableAndDeclarationModules();
                variable = original;
                for (const module of modules) {
                    additionalSideEffectModules.add(module);
                    possibleDependencies.add(module);
                }
            }
            relevantDependencies.add(variable.module);
        }
        if (this.options.treeshake && this.info.hasModuleSideEffects !== 'no-treeshake') {
            for (const dependency of possibleDependencies) {
                if (!(dependency.info.hasModuleSideEffects ||
                    additionalSideEffectModules.has(dependency)) ||
                    relevantDependencies.has(dependency)) {
                    continue;
                }
                if (dependency instanceof ExternalModule || dependency.hasEffects()) {
                    relevantDependencies.add(dependency);
                }
                else {
                    for (const transitiveDependency of dependency.dependencies) {
                        possibleDependencies.add(transitiveDependency);
                    }
                }
            }
        }
        else {
            for (const dependency of this.dependencies) {
                relevantDependencies.add(dependency);
            }
        }
        return (this.relevantDependencies = relevantDependencies);
    }
    getExportNamesByVariable() {
        if (this.exportNamesByVariable) {
            return this.exportNamesByVariable;
        }
        const exportNamesByVariable = new Map();
        for (const exportName of this.getAllExportNames()) {
            if (exportName === this.info.syntheticNamedExports)
                continue;
            let tracedVariable = this.getVariableForExportName(exportName);
            if (tracedVariable instanceof ExportDefaultVariable) {
                tracedVariable = tracedVariable.getOriginalVariable();
            }
            if (!tracedVariable ||
                !(tracedVariable.included || tracedVariable instanceof ExternalVariable)) {
                continue;
            }
            const existingExportNames = exportNamesByVariable.get(tracedVariable);
            if (existingExportNames) {
                existingExportNames.push(exportName);
            }
            else {
                exportNamesByVariable.set(tracedVariable, [exportName]);
            }
        }
        return (this.exportNamesByVariable = exportNamesByVariable);
    }
    getExports() {
        return Object.keys(this.exports);
    }
    getReexports() {
        if (this.transitiveReexports) {
            return this.transitiveReexports;
        }
        // to avoid infinite recursion when using circular `export * from X`
        this.transitiveReexports = [];
        const reexports = new Set();
        for (const name in this.reexportDescriptions) {
            reexports.add(name);
        }
        for (const module of this.exportAllModules) {
            if (module instanceof ExternalModule) {
                reexports.add(`*${module.id}`);
            }
            else {
                for (const name of [...module.getReexports(), ...module.getExports()]) {
                    if (name !== 'default')
                        reexports.add(name);
                }
            }
        }
        return (this.transitiveReexports = [...reexports]);
    }
    getRenderedExports() {
        // only direct exports are counted here, not reexports at all
        const renderedExports = [];
        const removedExports = [];
        for (const exportName in this.exports) {
            const variable = this.getVariableForExportName(exportName);
            (variable && variable.included ? renderedExports : removedExports).push(exportName);
        }
        return { renderedExports, removedExports };
    }
    getSyntheticNamespace() {
        if (this.syntheticNamespace === null) {
            this.syntheticNamespace = undefined;
            this.syntheticNamespace = this.getVariableForExportName(typeof this.info.syntheticNamedExports === 'string'
                ? this.info.syntheticNamedExports
                : 'default');
        }
        if (!this.syntheticNamespace) {
            return error({
                code: Errors.SYNTHETIC_NAMED_EXPORTS_NEED_NAMESPACE_EXPORT,
                id: this.id,
                message: `Module "${relativeId(this.id)}" that is marked with 'syntheticNamedExports: ${JSON.stringify(this.info.syntheticNamedExports)}' needs ${typeof this.info.syntheticNamedExports === 'string' &&
                    this.info.syntheticNamedExports !== 'default'
                    ? `an export named "${this.info.syntheticNamedExports}"`
                    : 'a default export'}.`
            });
        }
        return this.syntheticNamespace;
    }
    getVariableForExportName(name, isExportAllSearch, searchedNamesAndModules) {
        if (name[0] === '*') {
            if (name.length === 1) {
                return this.namespace;
            }
            else {
                // export * from 'external'
                const module = this.graph.modulesById.get(name.slice(1));
                return module.getVariableForExportName('*');
            }
        }
        // export { foo } from './other'
        const reexportDeclaration = this.reexportDescriptions[name];
        if (reexportDeclaration) {
            const declaration = getVariableForExportNameRecursive(reexportDeclaration.module, reexportDeclaration.localName, false, searchedNamesAndModules);
            if (!declaration) {
                return handleMissingExport(reexportDeclaration.localName, this, reexportDeclaration.module.id, reexportDeclaration.start);
            }
            return declaration;
        }
        const exportDeclaration = this.exports[name];
        if (exportDeclaration) {
            if (exportDeclaration === MISSING_EXPORT_SHIM_DESCRIPTION) {
                return this.exportShimVariable;
            }
            const name = exportDeclaration.localName;
            return this.traceVariable(name);
        }
        if (name !== 'default') {
            for (const module of this.exportAllModules) {
                const declaration = getVariableForExportNameRecursive(module, name, true, searchedNamesAndModules);
                if (declaration)
                    return declaration;
            }
        }
        // we don't want to create shims when we are just
        // probing export * modules for exports
        if (!isExportAllSearch) {
            if (this.info.syntheticNamedExports) {
                let syntheticExport = this.syntheticExports.get(name);
                if (!syntheticExport) {
                    const syntheticNamespace = this.getSyntheticNamespace();
                    syntheticExport = new SyntheticNamedExportVariable(this.astContext, name, syntheticNamespace);
                    this.syntheticExports.set(name, syntheticExport);
                    return syntheticExport;
                }
                return syntheticExport;
            }
            if (this.options.shimMissingExports) {
                this.shimMissingExport(name);
                return this.exportShimVariable;
            }
        }
        return null;
    }
    hasEffects() {
        return (this.info.hasModuleSideEffects === 'no-treeshake' ||
            (this.ast.included && this.ast.hasEffects(createHasEffectsContext())));
    }
    include() {
        const context = createInclusionContext();
        if (this.ast.shouldBeIncluded(context))
            this.ast.include(context, false);
    }
    includeAllExports(includeNamespaceMembers) {
        if (!this.isExecuted) {
            this.graph.needsTreeshakingPass = true;
            markModuleAndImpureDependenciesAsExecuted(this);
        }
        for (const exportName of this.getExports()) {
            if (includeNamespaceMembers || exportName !== this.info.syntheticNamedExports) {
                const variable = this.getVariableForExportName(exportName);
                variable.deoptimizePath(UNKNOWN_PATH);
                if (!variable.included) {
                    variable.include();
                    this.graph.needsTreeshakingPass = true;
                }
            }
        }
        for (const name of this.getReexports()) {
            const variable = this.getVariableForExportName(name);
            variable.deoptimizePath(UNKNOWN_PATH);
            if (!variable.included) {
                variable.include();
                this.graph.needsTreeshakingPass = true;
            }
            if (variable instanceof ExternalVariable) {
                variable.module.reexported = true;
            }
        }
        if (includeNamespaceMembers) {
            this.namespace.prepareNamespace(this.includeAndGetAdditionalMergedNamespaces());
        }
    }
    includeAllInBundle() {
        this.ast.include(createInclusionContext(), true);
    }
    isIncluded() {
        return this.ast.included || this.namespace.included;
    }
    linkImports() {
        this.addModulesToImportDescriptions(this.importDescriptions);
        this.addModulesToImportDescriptions(this.reexportDescriptions);
        for (const name in this.exports) {
            if (name !== 'default') {
                this.exportsAll[name] = this.id;
            }
        }
        const externalExportAllModules = [];
        for (const source of this.exportAllSources) {
            const module = this.graph.modulesById.get(this.resolvedIds[source].id);
            if (module instanceof ExternalModule) {
                externalExportAllModules.push(module);
                continue;
            }
            this.exportAllModules.push(module);
            for (const name in module.exportsAll) {
                if (name in this.exportsAll) {
                    this.options.onwarn(errNamespaceConflict(name, this, module));
                }
                else {
                    this.exportsAll[name] = module.exportsAll[name];
                }
            }
        }
        this.exportAllModules.push(...externalExportAllModules);
    }
    render(options) {
        const magicString = this.magicString.clone();
        this.ast.render(magicString, options);
        this.usesTopLevelAwait = this.astContext.usesTopLevelAwait;
        return magicString;
    }
    setSource({ alwaysRemovedCode, ast, code, customTransformCache, originalCode, originalSourcemap, resolvedIds, sourcemapChain, transformDependencies, transformFiles, ...moduleOptions }) {
        this.info.code = code;
        this.originalCode = originalCode;
        this.originalSourcemap = originalSourcemap;
        this.sourcemapChain = sourcemapChain;
        if (transformFiles) {
            this.transformFiles = transformFiles;
        }
        this.transformDependencies = transformDependencies;
        this.customTransformCache = customTransformCache;
        this.updateOptions(moduleOptions);
        timeStart('generate ast', 3);
        this.alwaysRemovedCode = alwaysRemovedCode || [];
        if (!ast) {
            ast = tryParse(this, this.graph.acornParser, this.options.acorn);
            for (const comment of this.comments) {
                if (!comment.block && SOURCEMAPPING_URL_RE.test(comment.text)) {
                    this.alwaysRemovedCode.push([comment.start, comment.end]);
                }
            }
            markPureCallExpressions(this.comments, ast);
        }
        timeEnd('generate ast', 3);
        this.resolvedIds = resolvedIds || Object.create(null);
        // By default, `id` is the file name. Custom resolvers and loaders
        // can change that, but it makes sense to use it for the source file name
        const fileName = this.id;
        this.magicString = new MagicString(code, {
            filename: (this.excludeFromSourcemap ? null : fileName),
            indentExclusionRanges: []
        });
        for (const [start, end] of this.alwaysRemovedCode) {
            this.magicString.remove(start, end);
        }
        timeStart('analyse ast', 3);
        this.astContext = {
            addDynamicImport: this.addDynamicImport.bind(this),
            addExport: this.addExport.bind(this),
            addImport: this.addImport.bind(this),
            addImportMeta: this.addImportMeta.bind(this),
            code,
            deoptimizationTracker: this.graph.deoptimizationTracker,
            error: this.error.bind(this),
            fileName,
            getExports: this.getExports.bind(this),
            getModuleExecIndex: () => this.execIndex,
            getModuleName: this.basename.bind(this),
            getReexports: this.getReexports.bind(this),
            importDescriptions: this.importDescriptions,
            includeAllExports: () => this.includeAllExports(true),
            includeDynamicImport: this.includeDynamicImport.bind(this),
            includeVariable: this.includeVariable.bind(this),
            magicString: this.magicString,
            module: this,
            moduleContext: this.context,
            nodeConstructors,
            options: this.options,
            traceExport: this.getVariableForExportName.bind(this),
            traceVariable: this.traceVariable.bind(this),
            usesTopLevelAwait: false,
            warn: this.warn.bind(this)
        };
        this.scope = new ModuleScope(this.graph.scope, this.astContext);
        this.namespace = new NamespaceVariable(this.astContext, this.info.syntheticNamedExports);
        this.ast = new Program$1(ast, { type: 'Module', context: this.astContext }, this.scope);
        this.info.ast = ast;
        timeEnd('analyse ast', 3);
    }
    toJSON() {
        return {
            alwaysRemovedCode: this.alwaysRemovedCode,
            ast: this.ast.esTreeNode,
            code: this.info.code,
            customTransformCache: this.customTransformCache,
            dependencies: Array.from(this.dependencies, getId),
            id: this.id,
            meta: this.info.meta,
            moduleSideEffects: this.info.hasModuleSideEffects,
            originalCode: this.originalCode,
            originalSourcemap: this.originalSourcemap,
            resolvedIds: this.resolvedIds,
            sourcemapChain: this.sourcemapChain,
            syntheticNamedExports: this.info.syntheticNamedExports,
            transformDependencies: this.transformDependencies,
            transformFiles: this.transformFiles
        };
    }
    traceVariable(name) {
        const localVariable = this.scope.variables.get(name);
        if (localVariable) {
            return localVariable;
        }
        if (name in this.importDescriptions) {
            const importDeclaration = this.importDescriptions[name];
            const otherModule = importDeclaration.module;
            if (otherModule instanceof Module && importDeclaration.name === '*') {
                return otherModule.namespace;
            }
            const declaration = otherModule.getVariableForExportName(importDeclaration.name);
            if (!declaration) {
                return handleMissingExport(importDeclaration.name, this, otherModule.id, importDeclaration.start);
            }
            return declaration;
        }
        return null;
    }
    updateOptions({ meta, moduleSideEffects, syntheticNamedExports }) {
        if (moduleSideEffects != null) {
            this.info.hasModuleSideEffects = moduleSideEffects;
        }
        if (syntheticNamedExports != null) {
            this.info.syntheticNamedExports = syntheticNamedExports;
        }
        if (meta != null) {
            this.info.meta = { ...this.info.meta, ...meta };
        }
    }
    warn(props, pos) {
        this.addLocationToLogProps(props, pos);
        this.options.onwarn(props);
    }
    addDynamicImport(node) {
        let argument = node.source;
        if (argument instanceof TemplateLiteral) {
            if (argument.quasis.length === 1 && argument.quasis[0].value.cooked) {
                argument = argument.quasis[0].value.cooked;
            }
        }
        else if (argument instanceof Literal && typeof argument.value === 'string') {
            argument = argument.value;
        }
        this.dynamicImports.push({ node, resolution: null, argument });
    }
    addExport(node) {
        if (node instanceof ExportDefaultDeclaration) {
            // export default foo;
            this.exports.default = {
                identifier: node.variable.getAssignedVariableName(),
                localName: 'default'
            };
        }
        else if (node instanceof ExportAllDeclaration) {
            const source = node.source.value;
            this.sources.add(source);
            if (node.exported) {
                // export * as name from './other'
                const name = node.exported.name;
                this.reexportDescriptions[name] = {
                    localName: '*',
                    module: null,
                    source,
                    start: node.start
                };
            }
            else {
                // export * from './other'
                this.exportAllSources.add(source);
            }
        }
        else if (node.source instanceof Literal) {
            // export { name } from './other'
            const source = node.source.value;
            this.sources.add(source);
            for (const specifier of node.specifiers) {
                const name = specifier.exported.name;
                this.reexportDescriptions[name] = {
                    localName: specifier.local.name,
                    module: null,
                    source,
                    start: specifier.start
                };
            }
        }
        else if (node.declaration) {
            const declaration = node.declaration;
            if (declaration instanceof VariableDeclaration) {
                // export var { foo, bar } = ...
                // export var foo = 1, bar = 2;
                for (const declarator of declaration.declarations) {
                    for (const localName of extractAssignedNames(declarator.id)) {
                        this.exports[localName] = { identifier: null, localName };
                    }
                }
            }
            else {
                // export function foo () {}
                const localName = declaration.id.name;
                this.exports[localName] = { identifier: null, localName };
            }
        }
        else {
            // export { foo, bar, baz }
            for (const specifier of node.specifiers) {
                const localName = specifier.local.name;
                const exportedName = specifier.exported.name;
                this.exports[exportedName] = { identifier: null, localName };
            }
        }
    }
    addImport(node) {
        const source = node.source.value;
        this.sources.add(source);
        for (const specifier of node.specifiers) {
            const isDefault = specifier.type === ImportDefaultSpecifier;
            const isNamespace = specifier.type === ImportNamespaceSpecifier;
            const name = isDefault
                ? 'default'
                : isNamespace
                    ? '*'
                    : specifier.imported.name;
            this.importDescriptions[specifier.local.name] = {
                module: null,
                name,
                source,
                start: specifier.start
            };
        }
    }
    addImportMeta(node) {
        this.importMetas.push(node);
    }
    addLocationToLogProps(props, pos) {
        props.id = this.id;
        props.pos = pos;
        let code = this.info.code;
        let { column, line } = locate(code, pos, { offsetLine: 1 });
        try {
            ({ column, line } = getOriginalLocation(this.sourcemapChain, { column, line }));
            code = this.originalCode;
        }
        catch (e) {
            this.options.onwarn({
                code: 'SOURCEMAP_ERROR',
                id: this.id,
                loc: {
                    column,
                    file: this.id,
                    line
                },
                message: `Error when using sourcemap for reporting an error: ${e.message}`,
                pos
            });
        }
        augmentCodeLocation(props, { column, line }, code, this.id);
    }
    addModulesToImportDescriptions(importDescription) {
        for (const name of Object.keys(importDescription)) {
            const specifier = importDescription[name];
            const id = this.resolvedIds[specifier.source].id;
            specifier.module = this.graph.modulesById.get(id);
        }
    }
    includeAndGetAdditionalMergedNamespaces() {
        const mergedNamespaces = [];
        for (const module of this.exportAllModules) {
            if (module instanceof ExternalModule) {
                const externalVariable = module.getVariableForExportName('*');
                externalVariable.include();
                this.imports.add(externalVariable);
                mergedNamespaces.push(externalVariable);
            }
            else if (module.info.syntheticNamedExports) {
                const syntheticNamespace = module.getSyntheticNamespace();
                syntheticNamespace.include();
                this.imports.add(syntheticNamespace);
                mergedNamespaces.push(syntheticNamespace);
            }
        }
        return mergedNamespaces;
    }
    includeDynamicImport(node) {
        const resolution = this.dynamicImports.find(dynamicImport => dynamicImport.node === node).resolution;
        if (resolution instanceof Module) {
            resolution.includedDynamicImporters.push(this);
            resolution.includeAllExports(true);
        }
    }
    includeVariable(variable) {
        const variableModule = variable.module;
        if (!variable.included) {
            variable.include();
            this.graph.needsTreeshakingPass = true;
        }
        if (variableModule && variableModule !== this) {
            this.imports.add(variable);
        }
    }
    shimMissingExport(name) {
        this.options.onwarn({
            code: 'SHIMMED_EXPORT',
            exporter: relativeId(this.id),
            exportName: name,
            message: `Missing export "${name}" has been shimmed in module ${relativeId(this.id)}.`
        });
        this.exports[name] = MISSING_EXPORT_SHIM_DESCRIPTION;
    }
}

class Source {
    constructor(filename, content) {
        this.isOriginal = true;
        this.filename = filename;
        this.content = content;
    }
    traceSegment(line, column, name) {
        return { line, column, name, source: this };
    }
}
class Link {
    constructor(map, sources) {
        this.sources = sources;
        this.names = map.names;
        this.mappings = map.mappings;
    }
    traceMappings() {
        const sources = [];
        const sourcesContent = [];
        const names = [];
        const mappings = [];
        for (const line of this.mappings) {
            const tracedLine = [];
            for (const segment of line) {
                if (segment.length == 1)
                    continue;
                const source = this.sources[segment[1]];
                if (!source)
                    continue;
                const traced = source.traceSegment(segment[2], segment[3], segment.length === 5 ? this.names[segment[4]] : '');
                if (traced) {
                    // newer sources are more likely to be used, so search backwards.
                    let sourceIndex = sources.lastIndexOf(traced.source.filename);
                    if (sourceIndex === -1) {
                        sourceIndex = sources.length;
                        sources.push(traced.source.filename);
                        sourcesContent[sourceIndex] = traced.source.content;
                    }
                    else if (sourcesContent[sourceIndex] == null) {
                        sourcesContent[sourceIndex] = traced.source.content;
                    }
                    else if (traced.source.content != null &&
                        sourcesContent[sourceIndex] !== traced.source.content) {
                        return error({
                            message: `Multiple conflicting contents for sourcemap source ${traced.source.filename}`
                        });
                    }
                    const tracedSegment = [
                        segment[0],
                        sourceIndex,
                        traced.line,
                        traced.column
                    ];
                    if (traced.name) {
                        let nameIndex = names.indexOf(traced.name);
                        if (nameIndex === -1) {
                            nameIndex = names.length;
                            names.push(traced.name);
                        }
                        tracedSegment[4] = nameIndex;
                    }
                    tracedLine.push(tracedSegment);
                }
            }
            mappings.push(tracedLine);
        }
        return { sources, sourcesContent, names, mappings };
    }
    traceSegment(line, column, name) {
        const segments = this.mappings[line];
        if (!segments)
            return null;
        // binary search through segments for the given column
        let i = 0;
        let j = segments.length - 1;
        while (i <= j) {
            const m = (i + j) >> 1;
            const segment = segments[m];
            if (segment[0] === column) {
                if (segment.length == 1)
                    return null;
                const source = this.sources[segment[1]];
                if (!source)
                    return null;
                return source.traceSegment(segment[2], segment[3], segment.length === 5 ? this.names[segment[4]] : name);
            }
            if (segment[0] > column) {
                j = m - 1;
            }
            else {
                i = m + 1;
            }
        }
        return null;
    }
}
function getLinkMap(warn) {
    return function linkMap(source, map) {
        if (map.mappings) {
            return new Link(map, [source]);
        }
        warn({
            code: 'SOURCEMAP_BROKEN',
            message: `Sourcemap is likely to be incorrect: a plugin (${map.plugin}) was used to transform ` +
                "files, but didn't generate a sourcemap for the transformation. Consult the plugin " +
                'documentation for help',
            plugin: map.plugin,
            url: `https://rollupjs.org/guide/en/#warning-sourcemap-is-likely-to-be-incorrect`
        });
        return new Link({
            mappings: [],
            names: []
        }, [source]);
    };
}
function getCollapsedSourcemap(id, originalCode, originalSourcemap, sourcemapChain, linkMap) {
    let source;
    if (!originalSourcemap) {
        source = new Source(id, originalCode);
    }
    else {
        const sources = originalSourcemap.sources;
        const sourcesContent = originalSourcemap.sourcesContent || [];
        const directory = dirname(id) || '.';
        const sourceRoot = originalSourcemap.sourceRoot || '.';
        const baseSources = sources.map((source, i) => new Source(resolve(directory, sourceRoot, source), sourcesContent[i]));
        source = new Link(originalSourcemap, baseSources);
    }
    return sourcemapChain.reduce(linkMap, source);
}
function collapseSourcemaps(file, map, modules, bundleSourcemapChain, excludeContent, warn) {
    const linkMap = getLinkMap(warn);
    const moduleSources = modules
        .filter(module => !module.excludeFromSourcemap)
        .map(module => getCollapsedSourcemap(module.id, module.originalCode, module.originalSourcemap, module.sourcemapChain, linkMap));
    // DecodedSourceMap (from magic-string) uses a number[] instead of the more
    // correct SourceMapSegment tuples. Cast it here to gain type safety.
    let source = new Link(map, moduleSources);
    source = bundleSourcemapChain.reduce(linkMap, source);
    let { sources, sourcesContent, names, mappings } = source.traceMappings();
    if (file) {
        const directory = dirname(file);
        sources = sources.map((source) => relative$1(directory, source));
        file = basename(file);
    }
    sourcesContent = (excludeContent ? null : sourcesContent);
    return new SourceMap({ file, sources, sourcesContent, names, mappings });
}
function collapseSourcemap(id, originalCode, originalSourcemap, sourcemapChain, warn) {
    if (!sourcemapChain.length) {
        return originalSourcemap;
    }
    const source = getCollapsedSourcemap(id, originalCode, originalSourcemap, sourcemapChain, getLinkMap(warn));
    const map = source.traceMappings();
    return { version: 3, ...map };
}

const createHash = () => createHash$1('sha256');

const DECONFLICT_IMPORTED_VARIABLES_BY_FORMAT = {
    amd: deconflictImportsOther,
    cjs: deconflictImportsOther,
    es: deconflictImportsEsmOrSystem,
    iife: deconflictImportsOther,
    system: deconflictImportsEsmOrSystem,
    umd: deconflictImportsOther
};
function deconflictChunk(modules, dependenciesToBeDeconflicted, imports, usedNames, format, interop, preserveModules, externalLiveBindings, chunkByModule, syntheticExports, exportNamesByVariable, accessedGlobalsByScope, includedNamespaces) {
    for (const module of modules) {
        module.scope.addUsedOutsideNames(usedNames, format, exportNamesByVariable, accessedGlobalsByScope);
    }
    deconflictTopLevelVariables(usedNames, modules, includedNamespaces);
    DECONFLICT_IMPORTED_VARIABLES_BY_FORMAT[format](usedNames, imports, dependenciesToBeDeconflicted, interop, preserveModules, externalLiveBindings, chunkByModule, syntheticExports);
    for (const module of modules) {
        module.scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
    }
}
function deconflictImportsEsmOrSystem(usedNames, imports, dependenciesToBeDeconflicted, _interop, preserveModules, _externalLiveBindings, chunkByModule, syntheticExports) {
    // This is needed for namespace reexports
    for (const dependency of dependenciesToBeDeconflicted.dependencies) {
        if (preserveModules || dependency instanceof ExternalModule) {
            dependency.variableName = getSafeName(dependency.suggestedVariableName, usedNames);
        }
    }
    for (const variable of imports) {
        const module = variable.module;
        const name = variable.name;
        if (variable.isNamespace && (preserveModules || module instanceof ExternalModule)) {
            variable.setRenderNames(null, (module instanceof ExternalModule ? module : chunkByModule.get(module)).variableName);
        }
        else if (module instanceof ExternalModule && name === 'default') {
            variable.setRenderNames(null, getSafeName([...module.exportedVariables].some(([exportedVariable, exportedName]) => exportedName === '*' && exportedVariable.included)
                ? module.suggestedVariableName + '__default'
                : module.suggestedVariableName, usedNames));
        }
        else {
            variable.setRenderNames(null, getSafeName(name, usedNames));
        }
    }
    for (const variable of syntheticExports) {
        variable.setRenderNames(null, getSafeName(variable.name, usedNames));
    }
}
function deconflictImportsOther(usedNames, imports, { deconflictedDefault, deconflictedNamespace, dependencies }, interop, preserveModules, externalLiveBindings, chunkByModule) {
    for (const chunkOrExternalModule of dependencies) {
        chunkOrExternalModule.variableName = getSafeName(chunkOrExternalModule.suggestedVariableName, usedNames);
    }
    for (const externalModuleOrChunk of deconflictedNamespace) {
        externalModuleOrChunk.namespaceVariableName = getSafeName(`${externalModuleOrChunk.suggestedVariableName}__namespace`, usedNames);
    }
    for (const externalModule of deconflictedDefault) {
        if (deconflictedNamespace.has(externalModule) &&
            canDefaultBeTakenFromNamespace(String(interop(externalModule.id)), externalLiveBindings)) {
            externalModule.defaultVariableName = externalModule.namespaceVariableName;
        }
        else {
            externalModule.defaultVariableName = getSafeName(`${externalModule.suggestedVariableName}__default`, usedNames);
        }
    }
    for (const variable of imports) {
        const module = variable.module;
        if (module instanceof ExternalModule) {
            const name = variable.name;
            if (name === 'default') {
                const moduleInterop = String(interop(module.id));
                const variableName = defaultInteropHelpersByInteropType[moduleInterop]
                    ? module.defaultVariableName
                    : module.variableName;
                if (isDefaultAProperty(moduleInterop, externalLiveBindings)) {
                    variable.setRenderNames(variableName, 'default');
                }
                else {
                    variable.setRenderNames(null, variableName);
                }
            }
            else if (name === '*') {
                variable.setRenderNames(null, namespaceInteropHelpersByInteropType[String(interop(module.id))]
                    ? module.namespaceVariableName
                    : module.variableName);
            }
            else {
                // if the second parameter is `null`, it uses its "name" for the property name
                variable.setRenderNames(module.variableName, null);
            }
        }
        else {
            const chunk = chunkByModule.get(module);
            if (preserveModules && variable.isNamespace) {
                variable.setRenderNames(null, chunk.exportMode === 'default' ? chunk.namespaceVariableName : chunk.variableName);
            }
            else if (chunk.exportMode === 'default') {
                variable.setRenderNames(null, chunk.variableName);
            }
            else {
                variable.setRenderNames(chunk.variableName, chunk.getVariableExportName(variable));
            }
        }
    }
}
function deconflictTopLevelVariables(usedNames, modules, includedNamespaces) {
    for (const module of modules) {
        for (const variable of module.scope.variables.values()) {
            if (variable.included &&
                // this will only happen for exports in some formats
                !(variable.renderBaseName ||
                    (variable instanceof ExportDefaultVariable && variable.getOriginalVariable() !== variable))) {
                variable.setRenderNames(null, getSafeName(variable.name, usedNames));
            }
        }
        if (includedNamespaces.has(module)) {
            const namespace = module.namespace;
            namespace.setRenderNames(null, getSafeName(namespace.name, usedNames));
        }
    }
}

const needsEscapeRegEx = /[\\'\r\n\u2028\u2029]/;
const quoteNewlineRegEx = /(['\r\n\u2028\u2029])/g;
const backSlashRegEx = /\\/g;
function escapeId(id) {
    if (!id.match(needsEscapeRegEx))
        return id;
    return id.replace(backSlashRegEx, '\\\\').replace(quoteNewlineRegEx, '\\$1');
}

const compareExecIndex = (unitA, unitB) => unitA.execIndex > unitB.execIndex ? 1 : -1;
function sortByExecutionOrder(units) {
    units.sort(compareExecIndex);
}
function analyseModuleExecution(entryModules) {
    let nextExecIndex = 0;
    const cyclePaths = [];
    const analysedModules = new Set();
    const dynamicImports = new Set();
    const parents = new Map();
    const orderedModules = [];
    const analyseModule = (module) => {
        if (module instanceof Module) {
            for (const dependency of module.dependencies) {
                if (parents.has(dependency)) {
                    if (!analysedModules.has(dependency)) {
                        cyclePaths.push(getCyclePath(dependency, module, parents));
                    }
                    continue;
                }
                parents.set(dependency, module);
                analyseModule(dependency);
            }
            for (const dependency of module.implicitlyLoadedBefore) {
                dynamicImports.add(dependency);
            }
            for (const { resolution } of module.dynamicImports) {
                if (resolution instanceof Module) {
                    dynamicImports.add(resolution);
                }
            }
            orderedModules.push(module);
        }
        module.execIndex = nextExecIndex++;
        analysedModules.add(module);
    };
    for (const curEntry of entryModules) {
        if (!parents.has(curEntry)) {
            parents.set(curEntry, null);
            analyseModule(curEntry);
        }
    }
    for (const curEntry of dynamicImports) {
        if (!parents.has(curEntry)) {
            parents.set(curEntry, null);
            analyseModule(curEntry);
        }
    }
    return { orderedModules, cyclePaths };
}
function getCyclePath(module, parent, parents) {
    const path = [relativeId(module.id)];
    let nextModule = parent;
    while (nextModule !== module) {
        path.push(relativeId(nextModule.id));
        nextModule = parents.get(nextModule);
    }
    path.push(path[0]);
    path.reverse();
    return path;
}

function assignExportsToMangledNames(exports, exportsByName, exportNamesByVariable) {
    let nameIndex = 0;
    for (const variable of exports) {
        let exportName = variable.name[0];
        if (exportsByName[exportName]) {
            do {
                exportName = toBase64(++nameIndex);
                // skip past leading number identifiers
                if (exportName.charCodeAt(0) === 49 /* '1' */) {
                    nameIndex += 9 * 64 ** (exportName.length - 1);
                    exportName = toBase64(nameIndex);
                }
            } while (RESERVED_NAMES[exportName] || exportsByName[exportName]);
        }
        exportsByName[exportName] = variable;
        exportNamesByVariable.set(variable, [exportName]);
    }
}
function assignExportsToNames(exports, exportsByName, exportNamesByVariable) {
    for (const variable of exports) {
        let nameIndex = 0;
        let exportName = variable.name;
        while (exportsByName[exportName]) {
            exportName = variable.name + '$' + ++nameIndex;
        }
        exportsByName[exportName] = variable;
        exportNamesByVariable.set(variable, [exportName]);
    }
}

function getExportMode(chunk, { exports: exportMode, name, format }, unsetOptions, facadeModuleId, warn) {
    const exportKeys = chunk.getExportNames();
    if (exportMode === 'default') {
        if (exportKeys.length !== 1 || exportKeys[0] !== 'default') {
            return error(errIncompatibleExportOptionValue('default', exportKeys, facadeModuleId));
        }
    }
    else if (exportMode === 'none' && exportKeys.length) {
        return error(errIncompatibleExportOptionValue('none', exportKeys, facadeModuleId));
    }
    if (exportMode === 'auto') {
        if (exportKeys.length === 0) {
            exportMode = 'none';
        }
        else if (exportKeys.length === 1 && exportKeys[0] === 'default') {
            if (format === 'cjs' && unsetOptions.has('exports')) {
                warn(errPreferNamedExports(facadeModuleId));
            }
            exportMode = 'default';
        }
        else {
            if (format !== 'es' && exportKeys.indexOf('default') !== -1) {
                warn(errMixedExport(facadeModuleId, name));
            }
            exportMode = 'named';
        }
    }
    return exportMode;
}

function guessIndentString(code) {
    const lines = code.split('\n');
    const tabbed = lines.filter(line => /^\t+/.test(line));
    const spaced = lines.filter(line => /^ {2,}/.test(line));
    if (tabbed.length === 0 && spaced.length === 0) {
        return null;
    }
    // More lines tabbed than spaced? Assume tabs, and
    // default to tabs in the case of a tie (or nothing
    // to go on)
    if (tabbed.length >= spaced.length) {
        return '\t';
    }
    // Otherwise, we need to guess the multiple
    const min = spaced.reduce((previous, current) => {
        const numSpaces = /^ +/.exec(current)[0].length;
        return Math.min(numSpaces, previous);
    }, Infinity);
    return new Array(min + 1).join(' ');
}
function getIndentString(modules, options) {
    if (options.indent !== true)
        return options.indent;
    for (let i = 0; i < modules.length; i++) {
        const indent = guessIndentString(modules[i].originalCode);
        if (indent !== null)
            return indent;
    }
    return '\t';
}

function decodedSourcemap(map) {
    if (!map)
        return null;
    if (typeof map === 'string') {
        map = JSON.parse(map);
    }
    if (map.mappings === '') {
        return {
            mappings: [],
            names: [],
            sources: [],
            version: 3
        };
    }
    let mappings;
    if (typeof map.mappings === 'string') {
        mappings = decode(map.mappings);
    }
    else {
        mappings = map.mappings;
    }
    return { ...map, mappings };
}

function renderChunk({ code, options, outputPluginDriver, renderChunk, sourcemapChain }) {
    const renderChunkReducer = (code, result, plugin) => {
        if (result == null)
            return code;
        if (typeof result === 'string')
            result = {
                code: result,
                map: undefined
            };
        // strict null check allows 'null' maps to not be pushed to the chain, while 'undefined' gets the missing map warning
        if (result.map !== null) {
            const map = decodedSourcemap(result.map);
            sourcemapChain.push(map || { missing: true, plugin: plugin.name });
        }
        return result.code;
    };
    return outputPluginDriver.hookReduceArg0('renderChunk', [code, renderChunk, options], renderChunkReducer);
}

function renderNamePattern(pattern, patternName, replacements) {
    if (!isPlainPathFragment(pattern))
        return error(errFailedValidation(`Invalid pattern "${pattern}" for "${patternName}", patterns can be neither absolute nor relative paths and must not contain invalid characters.`));
    return pattern.replace(/\[(\w+)\]/g, (_match, type) => {
        if (!replacements.hasOwnProperty(type)) {
            return error(errFailedValidation(`"[${type}]" is not a valid placeholder in "${patternName}" pattern.`));
        }
        const replacement = replacements[type]();
        if (!isPlainPathFragment(replacement))
            return error(errFailedValidation(`Invalid substitution "${replacement}" for placeholder "[${type}]" in "${patternName}" pattern, can be neither absolute nor relative path.`));
        return replacement;
    });
}
function makeUnique(name, existingNames) {
    const existingNamesLowercase = new Set(Object.keys(existingNames).map(key => key.toLowerCase()));
    if (!existingNamesLowercase.has(name.toLocaleLowerCase()))
        return name;
    const ext = extname(name);
    name = name.substr(0, name.length - ext.length);
    let uniqueName, uniqueIndex = 1;
    while (existingNamesLowercase.has((uniqueName = name + ++uniqueIndex + ext).toLowerCase()))
        ;
    return uniqueName;
}

const NON_ASSET_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
function getGlobalName(module, globals, hasExports, warn) {
    const globalName = typeof globals === 'function' ? globals(module.id) : globals[module.id];
    if (globalName) {
        return globalName;
    }
    if (hasExports) {
        warn({
            code: 'MISSING_GLOBAL_NAME',
            guess: module.variableName,
            message: `No name was provided for external module '${module.id}' in output.globals – guessing '${module.variableName}'`,
            source: module.id
        });
        return module.variableName;
    }
}
class Chunk$1 {
    constructor(orderedModules, inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, manualChunkAlias) {
        this.orderedModules = orderedModules;
        this.inputOptions = inputOptions;
        this.outputOptions = outputOptions;
        this.unsetOptions = unsetOptions;
        this.pluginDriver = pluginDriver;
        this.modulesById = modulesById;
        this.chunkByModule = chunkByModule;
        this.facadeChunkByModule = facadeChunkByModule;
        this.includedNamespaces = includedNamespaces;
        this.manualChunkAlias = manualChunkAlias;
        this.entryModules = [];
        this.exportMode = 'named';
        this.facadeModule = null;
        this.id = null;
        this.namespaceVariableName = '';
        this.variableName = '';
        this.accessedGlobalsByScope = new Map();
        this.dependencies = new Set();
        this.dynamicDependencies = new Set();
        this.dynamicEntryModules = [];
        this.exportNamesByVariable = new Map();
        this.exports = new Set();
        this.exportsByName = Object.create(null);
        this.fileName = null;
        this.implicitEntryModules = [];
        this.implicitlyLoadedBefore = new Set();
        this.imports = new Set();
        this.indentString = undefined;
        this.isEmpty = true;
        this.name = null;
        this.needsExportsShim = false;
        this.renderedDependencies = null;
        this.renderedExports = null;
        this.renderedHash = undefined;
        this.renderedModules = Object.create(null);
        this.renderedModuleSources = new Map();
        this.renderedSource = null;
        this.sortedExportNames = null;
        this.strictFacade = false;
        this.usedModules = undefined;
        this.execIndex = orderedModules.length > 0 ? orderedModules[0].execIndex : Infinity;
        const chunkModules = new Set(orderedModules);
        for (const module of orderedModules) {
            if (module.namespace.included) {
                includedNamespaces.add(module);
            }
            if (this.isEmpty && module.isIncluded()) {
                this.isEmpty = false;
            }
            if (module.info.isEntry || outputOptions.preserveModules) {
                this.entryModules.push(module);
            }
            for (const importer of module.includedDynamicImporters) {
                if (!chunkModules.has(importer)) {
                    this.dynamicEntryModules.push(module);
                    // Modules with synthetic exports need an artificial namespace for dynamic imports
                    if (module.info.syntheticNamedExports && !outputOptions.preserveModules) {
                        includedNamespaces.add(module);
                        this.exports.add(module.namespace);
                    }
                }
            }
            if (module.implicitlyLoadedAfter.size > 0) {
                this.implicitEntryModules.push(module);
            }
        }
        this.suggestedVariableName = makeLegal(this.generateVariableName());
    }
    static generateFacade(inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, facadedModule, facadeName) {
        const chunk = new Chunk$1([], inputOptions, outputOptions, unsetOptions, pluginDriver, modulesById, chunkByModule, facadeChunkByModule, includedNamespaces, null);
        chunk.assignFacadeName(facadeName, facadedModule);
        if (!facadeChunkByModule.has(facadedModule)) {
            facadeChunkByModule.set(facadedModule, chunk);
        }
        for (const dependency of facadedModule.getDependenciesToBeIncluded()) {
            chunk.dependencies.add(dependency instanceof Module ? chunkByModule.get(dependency) : dependency);
        }
        if (!chunk.dependencies.has(chunkByModule.get(facadedModule)) &&
            facadedModule.info.hasModuleSideEffects &&
            facadedModule.hasEffects()) {
            chunk.dependencies.add(chunkByModule.get(facadedModule));
        }
        chunk.ensureReexportsAreAvailableForModule(facadedModule);
        chunk.facadeModule = facadedModule;
        chunk.strictFacade = true;
        return chunk;
    }
    canModuleBeFacade(module, exposedVariables) {
        const moduleExportNamesByVariable = module.getExportNamesByVariable();
        for (const exposedVariable of this.exports) {
            if (!moduleExportNamesByVariable.has(exposedVariable)) {
                if (moduleExportNamesByVariable.size === 0 &&
                    module.isUserDefinedEntryPoint &&
                    module.preserveSignature === 'strict' &&
                    this.unsetOptions.has('preserveEntrySignatures')) {
                    this.inputOptions.onwarn({
                        code: 'EMPTY_FACADE',
                        id: module.id,
                        message: `To preserve the export signature of the entry module "${relativeId(module.id)}", an empty facade chunk was created. This often happens when creating a bundle for a web app where chunks are placed in script tags and exports are ignored. In this case it is recommended to set "preserveEntrySignatures: false" to avoid this and reduce the number of chunks. Otherwise if this is intentional, set "preserveEntrySignatures: 'strict'" explicitly to silence this warning.`,
                        url: 'https://rollupjs.org/guide/en/#preserveentrysignatures'
                    });
                }
                return false;
            }
        }
        for (const exposedVariable of exposedVariables) {
            if (!(moduleExportNamesByVariable.has(exposedVariable) || exposedVariable.module === module)) {
                return false;
            }
        }
        return true;
    }
    generateExports() {
        this.sortedExportNames = null;
        const remainingExports = new Set(this.exports);
        if (this.facadeModule !== null &&
            (this.facadeModule.preserveSignature !== false || this.strictFacade)) {
            const exportNamesByVariable = this.facadeModule.getExportNamesByVariable();
            for (const [variable, exportNames] of exportNamesByVariable) {
                this.exportNamesByVariable.set(variable, [...exportNames]);
                for (const exportName of exportNames) {
                    this.exportsByName[exportName] = variable;
                }
                remainingExports.delete(variable);
            }
        }
        if (this.outputOptions.minifyInternalExports) {
            assignExportsToMangledNames(remainingExports, this.exportsByName, this.exportNamesByVariable);
        }
        else {
            assignExportsToNames(remainingExports, this.exportsByName, this.exportNamesByVariable);
        }
        if (this.outputOptions.preserveModules || (this.facadeModule && this.facadeModule.info.isEntry))
            this.exportMode = getExportMode(this, this.outputOptions, this.unsetOptions, this.facadeModule.id, this.inputOptions.onwarn);
    }
    generateFacades() {
        var _a;
        const facades = [];
        const entryModules = new Set([...this.entryModules, ...this.implicitEntryModules]);
        const exposedVariables = new Set(this.dynamicEntryModules.map(module => module.namespace));
        for (const module of entryModules) {
            if (module.preserveSignature) {
                for (const exportedVariable of module.getExportNamesByVariable().keys()) {
                    exposedVariables.add(exportedVariable);
                }
            }
        }
        for (const module of entryModules) {
            const requiredFacades = Array.from(module.userChunkNames, name => ({
                name
            }));
            if (requiredFacades.length === 0 && module.isUserDefinedEntryPoint) {
                requiredFacades.push({});
            }
            requiredFacades.push(...Array.from(module.chunkFileNames, fileName => ({ fileName })));
            if (requiredFacades.length === 0) {
                requiredFacades.push({});
            }
            if (!this.facadeModule) {
                const needsStrictFacade = module.preserveSignature === 'strict' ||
                    (module.preserveSignature === 'exports-only' &&
                        module.getExportNamesByVariable().size !== 0);
                if (!needsStrictFacade ||
                    this.outputOptions.preserveModules ||
                    this.canModuleBeFacade(module, exposedVariables)) {
                    this.facadeModule = module;
                    this.facadeChunkByModule.set(module, this);
                    if (module.preserveSignature) {
                        this.strictFacade = needsStrictFacade;
                        this.ensureReexportsAreAvailableForModule(module);
                    }
                    this.assignFacadeName(requiredFacades.shift(), module);
                }
            }
            for (const facadeName of requiredFacades) {
                facades.push(Chunk$1.generateFacade(this.inputOptions, this.outputOptions, this.unsetOptions, this.pluginDriver, this.modulesById, this.chunkByModule, this.facadeChunkByModule, this.includedNamespaces, module, facadeName));
            }
        }
        for (const module of this.dynamicEntryModules) {
            if (module.info.syntheticNamedExports)
                continue;
            if (!this.facadeModule && this.canModuleBeFacade(module, exposedVariables)) {
                this.facadeModule = module;
                this.facadeChunkByModule.set(module, this);
                this.strictFacade = true;
                this.assignFacadeName({}, module);
            }
            else if (this.facadeModule === module &&
                !this.strictFacade &&
                this.canModuleBeFacade(module, exposedVariables)) {
                this.strictFacade = true;
            }
            else if (!((_a = this.facadeChunkByModule.get(module)) === null || _a === void 0 ? void 0 : _a.strictFacade)) {
                this.includedNamespaces.add(module);
                this.exports.add(module.namespace);
            }
        }
        return facades;
    }
    generateId(addons, options, existingNames, includeHash) {
        if (this.fileName !== null) {
            return this.fileName;
        }
        const [pattern, patternName] = this.facadeModule && this.facadeModule.isUserDefinedEntryPoint
            ? [options.entryFileNames, 'output.entryFileNames']
            : [options.chunkFileNames, 'output.chunkFileNames'];
        return makeUnique(renderNamePattern(typeof pattern === 'function' ? pattern(this.getChunkInfo()) : pattern, patternName, {
            format: () => options.format,
            hash: () => includeHash
                ? this.computeContentHashWithDependencies(addons, options, existingNames)
                : '[hash]',
            name: () => this.getChunkName()
        }), existingNames);
    }
    generateIdPreserveModules(preserveModulesRelativeDir, options, existingNames, unsetOptions) {
        const id = this.orderedModules[0].id;
        const sanitizedId = sanitizeFileName(id);
        let path;
        if (isAbsolute(id)) {
            const extension = extname(id);
            const pattern = unsetOptions.has('entryFileNames')
                ? NON_ASSET_EXTENSIONS.includes(extension)
                    ? '[name].js'
                    : '[name][extname].js'
                : options.entryFileNames;
            const currentDir = dirname(sanitizedId);
            const fileName = renderNamePattern(typeof pattern === 'function' ? pattern(this.getChunkInfo()) : pattern, 'output.entryFileNames', {
                ext: () => extension.substr(1),
                extname: () => extension,
                format: () => options.format,
                name: () => this.getChunkName()
            });
            const currentPath = `${currentDir}/${fileName}`;
            const { preserveModulesRoot } = options;
            if (preserveModulesRoot && currentPath.startsWith(preserveModulesRoot)) {
                path = currentPath.slice(preserveModulesRoot.length).replace(/^[\\/]/, '');
            }
            else {
                path = relative(preserveModulesRelativeDir, currentPath);
            }
        }
        else {
            path = `_virtual/${basename(sanitizedId)}`;
        }
        return makeUnique(normalize(path), existingNames);
    }
    getChunkInfo() {
        const facadeModule = this.facadeModule;
        const getChunkName = this.getChunkName.bind(this);
        return {
            exports: this.getExportNames(),
            facadeModuleId: facadeModule && facadeModule.id,
            isDynamicEntry: this.dynamicEntryModules.length > 0,
            isEntry: facadeModule !== null && facadeModule.info.isEntry,
            isImplicitEntry: this.implicitEntryModules.length > 0,
            modules: this.renderedModules,
            get name() {
                return getChunkName();
            },
            type: 'chunk'
        };
    }
    getChunkInfoWithFileNames() {
        return Object.assign(this.getChunkInfo(), {
            code: undefined,
            dynamicImports: Array.from(this.dynamicDependencies, getId),
            fileName: this.id,
            implicitlyLoadedBefore: Array.from(this.implicitlyLoadedBefore, getId),
            importedBindings: this.getImportedBindingsPerDependency(),
            imports: Array.from(this.dependencies, getId),
            map: undefined,
            referencedFiles: this.getReferencedFiles()
        });
    }
    getChunkName() {
        return this.name || (this.name = sanitizeFileName(this.getFallbackChunkName()));
    }
    getExportNames() {
        return (this.sortedExportNames || (this.sortedExportNames = Object.keys(this.exportsByName).sort()));
    }
    getRenderedHash() {
        if (this.renderedHash)
            return this.renderedHash;
        const hash = createHash();
        const hashAugmentation = this.pluginDriver.hookReduceValueSync('augmentChunkHash', '', [this.getChunkInfo()], (augmentation, pluginHash) => {
            if (pluginHash) {
                augmentation += pluginHash;
            }
            return augmentation;
        });
        hash.update(hashAugmentation);
        hash.update(this.renderedSource.toString());
        hash.update(this.getExportNames()
            .map(exportName => {
            const variable = this.exportsByName[exportName];
            return `${relativeId(variable.module.id).replace(/\\/g, '/')}:${variable.name}:${exportName}`;
        })
            .join(','));
        return (this.renderedHash = hash.digest('hex'));
    }
    getVariableExportName(variable) {
        if (this.outputOptions.preserveModules && variable instanceof NamespaceVariable) {
            return '*';
        }
        return this.exportNamesByVariable.get(variable)[0];
    }
    link() {
        for (const module of this.orderedModules) {
            this.addDependenciesToChunk(module.getDependenciesToBeIncluded(), this.dependencies);
            this.addDependenciesToChunk(module.dynamicDependencies, this.dynamicDependencies);
            this.addDependenciesToChunk(module.implicitlyLoadedBefore, this.implicitlyLoadedBefore);
            this.setUpChunkImportsAndExportsForModule(module);
        }
    }
    // prerender allows chunk hashes and names to be generated before finalizing
    preRender(options, inputBase) {
        const magicString = new Bundle({ separator: options.compact ? '' : '\n\n' });
        this.usedModules = [];
        this.indentString = getIndentString(this.orderedModules, options);
        const n = options.compact ? '' : '\n';
        const _ = options.compact ? '' : ' ';
        const renderOptions = {
            compact: options.compact,
            dynamicImportFunction: options.dynamicImportFunction,
            exportNamesByVariable: this.exportNamesByVariable,
            format: options.format,
            freeze: options.freeze,
            indent: this.indentString,
            namespaceToStringTag: options.namespaceToStringTag,
            outputPluginDriver: this.pluginDriver,
            varOrConst: options.preferConst ? 'const' : 'var'
        };
        // for static and dynamic entry points, inline the execution list to avoid loading latency
        if (options.hoistTransitiveImports &&
            !this.outputOptions.preserveModules &&
            this.facadeModule !== null) {
            for (const dep of this.dependencies) {
                if (dep instanceof Chunk$1)
                    this.inlineChunkDependencies(dep);
            }
        }
        const sortedDependencies = [...this.dependencies];
        sortByExecutionOrder(sortedDependencies);
        this.dependencies = new Set(sortedDependencies);
        this.prepareDynamicImportsAndImportMetas();
        this.setIdentifierRenderResolutions(options);
        let hoistedSource = '';
        const renderedModules = this.renderedModules;
        for (const module of this.orderedModules) {
            let renderedLength = 0;
            if (module.isIncluded() || this.includedNamespaces.has(module)) {
                const source = module.render(renderOptions).trim();
                renderedLength = source.length();
                if (renderedLength) {
                    if (options.compact && source.lastLine().indexOf('//') !== -1)
                        source.append('\n');
                    this.renderedModuleSources.set(module, source);
                    magicString.addSource(source);
                    this.usedModules.push(module);
                }
                const namespace = module.namespace;
                if (this.includedNamespaces.has(module) && !this.outputOptions.preserveModules) {
                    const rendered = namespace.renderBlock(renderOptions);
                    if (namespace.renderFirst())
                        hoistedSource += n + rendered;
                    else
                        magicString.addSource(new MagicString(rendered));
                }
            }
            const { renderedExports, removedExports } = module.getRenderedExports();
            renderedModules[module.id] = {
                originalLength: module.originalCode.length,
                removedExports,
                renderedExports,
                renderedLength
            };
        }
        if (hoistedSource)
            magicString.prepend(hoistedSource + n + n);
        if (this.needsExportsShim) {
            magicString.prepend(`${n}${renderOptions.varOrConst} ${MISSING_EXPORT_SHIM_VARIABLE}${_}=${_}void 0;${n}${n}`);
        }
        if (options.compact) {
            this.renderedSource = magicString;
        }
        else {
            this.renderedSource = magicString.trim();
        }
        this.renderedHash = undefined;
        if (this.isEmpty && this.getExportNames().length === 0 && this.dependencies.size === 0) {
            const chunkName = this.getChunkName();
            this.inputOptions.onwarn({
                chunkName,
                code: 'EMPTY_BUNDLE',
                message: `Generated an empty chunk: "${chunkName}"`
            });
        }
        this.setExternalRenderPaths(options, inputBase);
        this.renderedDependencies = this.getChunkDependencyDeclarations(options);
        this.renderedExports =
            this.exportMode === 'none' ? [] : this.getChunkExportDeclarations(options.format);
    }
    async render(options, addons, outputChunk) {
        timeStart('render format', 2);
        const format = options.format;
        const finalise = finalisers[format];
        if (options.dynamicImportFunction && format !== 'es') {
            this.inputOptions.onwarn({
                code: 'INVALID_OPTION',
                message: '"output.dynamicImportFunction" is ignored for formats other than "es".'
            });
        }
        // populate ids in the rendered declarations only here
        // as chunk ids known only after prerender
        for (const dependency of this.dependencies) {
            const renderedDependency = this.renderedDependencies.get(dependency);
            if (dependency instanceof ExternalModule) {
                const originalId = dependency.renderPath;
                renderedDependency.id = escapeId(dependency.renormalizeRenderPath ? this.getRelativePath(originalId, false) : originalId);
            }
            else {
                renderedDependency.namedExportsMode = dependency.exportMode !== 'default';
                renderedDependency.id = escapeId(this.getRelativePath(dependency.id, false));
            }
        }
        this.finaliseDynamicImports(options);
        this.finaliseImportMetas(format);
        const hasExports = this.renderedExports.length !== 0 ||
            [...this.renderedDependencies.values()].some(dep => (dep.reexports && dep.reexports.length !== 0));
        let usesTopLevelAwait = false;
        const accessedGlobals = new Set();
        for (const module of this.orderedModules) {
            if (module.usesTopLevelAwait) {
                usesTopLevelAwait = true;
            }
            const accessedGlobalVariables = this.accessedGlobalsByScope.get(module.scope);
            if (accessedGlobalVariables) {
                for (const name of accessedGlobalVariables) {
                    accessedGlobals.add(name);
                }
            }
        }
        if (usesTopLevelAwait && format !== 'es' && format !== 'system') {
            return error({
                code: 'INVALID_TLA_FORMAT',
                message: `Module format ${format} does not support top-level await. Use the "es" or "system" output formats rather.`
            });
        }
        /* istanbul ignore next */
        if (!this.id) {
            throw new Error('Internal Error: expecting chunk id');
        }
        const magicString = finalise(this.renderedSource, {
            accessedGlobals,
            dependencies: [...this.renderedDependencies.values()],
            exports: this.renderedExports,
            hasExports,
            id: this.id,
            indentString: this.indentString,
            intro: addons.intro,
            isEntryFacade: this.outputOptions.preserveModules ||
                (this.facadeModule !== null && this.facadeModule.info.isEntry),
            isModuleFacade: this.facadeModule !== null,
            namedExportsMode: this.exportMode !== 'default',
            outro: addons.outro,
            usesTopLevelAwait,
            varOrConst: options.preferConst ? 'const' : 'var',
            warn: this.inputOptions.onwarn
        }, options);
        if (addons.banner)
            magicString.prepend(addons.banner);
        if (addons.footer)
            magicString.append(addons.footer);
        const prevCode = magicString.toString();
        timeEnd('render format', 2);
        let map = null;
        const chunkSourcemapChain = [];
        let code = await renderChunk({
            code: prevCode,
            options,
            outputPluginDriver: this.pluginDriver,
            renderChunk: outputChunk,
            sourcemapChain: chunkSourcemapChain
        });
        if (options.sourcemap) {
            timeStart('sourcemap', 2);
            let file;
            if (options.file)
                file = resolve(options.sourcemapFile || options.file);
            else if (options.dir)
                file = resolve(options.dir, this.id);
            else
                file = resolve(this.id);
            const decodedMap = magicString.generateDecodedMap({});
            map = collapseSourcemaps(file, decodedMap, this.usedModules, chunkSourcemapChain, options.sourcemapExcludeSources, this.inputOptions.onwarn);
            map.sources = map.sources
                .map(sourcePath => {
                const { sourcemapPathTransform } = options;
                if (sourcemapPathTransform) {
                    const newSourcePath = sourcemapPathTransform(sourcePath, `${file}.map`);
                    if (typeof newSourcePath !== 'string') {
                        error(errFailedValidation(`sourcemapPathTransform function must return a string.`));
                    }
                    return newSourcePath;
                }
                return sourcePath;
            })
                .map(normalize);
            timeEnd('sourcemap', 2);
        }
        if (!options.compact && code[code.length - 1] !== '\n')
            code += '\n';
        return { code, map };
    }
    addDependenciesToChunk(moduleDependencies, chunkDependencies) {
        for (const module of moduleDependencies) {
            if (module instanceof Module) {
                const chunk = this.chunkByModule.get(module);
                if (chunk && chunk !== this) {
                    chunkDependencies.add(chunk);
                }
            }
            else {
                chunkDependencies.add(module);
            }
        }
    }
    assignFacadeName({ fileName, name }, facadedModule) {
        if (fileName) {
            this.fileName = fileName;
        }
        else {
            this.name = sanitizeFileName(name || facadedModule.chunkName || getAliasName(facadedModule.id));
        }
    }
    computeContentHashWithDependencies(addons, options, existingNames) {
        const hash = createHash();
        hash.update([addons.intro, addons.outro, addons.banner, addons.footer].map(addon => addon || '').join(':'));
        hash.update(options.format);
        const dependenciesForHashing = new Set([this]);
        for (const current of dependenciesForHashing) {
            if (current instanceof ExternalModule) {
                hash.update(':' + current.renderPath);
            }
            else {
                hash.update(current.getRenderedHash());
                hash.update(current.generateId(addons, options, existingNames, false));
            }
            if (current instanceof ExternalModule)
                continue;
            for (const dependency of [...current.dependencies, ...current.dynamicDependencies]) {
                dependenciesForHashing.add(dependency);
            }
        }
        return hash.digest('hex').substr(0, 8);
    }
    ensureReexportsAreAvailableForModule(module) {
        const map = module.getExportNamesByVariable();
        for (const exportedVariable of map.keys()) {
            const isSynthetic = exportedVariable instanceof SyntheticNamedExportVariable;
            const importedVariable = isSynthetic
                ? exportedVariable.getBaseVariable()
                : exportedVariable;
            if (!(importedVariable instanceof NamespaceVariable && this.outputOptions.preserveModules)) {
                const exportingModule = importedVariable.module;
                if (exportingModule instanceof Module) {
                    const chunk = this.chunkByModule.get(exportingModule);
                    if (chunk && chunk !== this) {
                        chunk.exports.add(importedVariable);
                        if (isSynthetic) {
                            this.imports.add(importedVariable);
                        }
                    }
                }
            }
        }
    }
    finaliseDynamicImports(options) {
        const stripKnownJsExtensions = options.format === 'amd';
        for (const [module, code] of this.renderedModuleSources) {
            for (const { node, resolution } of module.dynamicImports) {
                const chunk = this.chunkByModule.get(resolution);
                const facadeChunk = this.facadeChunkByModule.get(resolution);
                if (!resolution || !node.included || chunk === this) {
                    continue;
                }
                const renderedResolution = resolution instanceof Module
                    ? `'${this.getRelativePath((facadeChunk || chunk).id, stripKnownJsExtensions)}'`
                    : resolution instanceof ExternalModule
                        ? `'${resolution.renormalizeRenderPath
                            ? this.getRelativePath(resolution.renderPath, stripKnownJsExtensions)
                            : resolution.renderPath}'`
                        : resolution;
                node.renderFinalResolution(code, renderedResolution, resolution instanceof Module &&
                    !(facadeChunk === null || facadeChunk === void 0 ? void 0 : facadeChunk.strictFacade) &&
                    chunk.exportNamesByVariable.get(resolution.namespace)[0], options);
            }
        }
    }
    finaliseImportMetas(format) {
        for (const [module, code] of this.renderedModuleSources) {
            for (const importMeta of module.importMetas) {
                importMeta.renderFinalMechanism(code, this.id, format, this.pluginDriver);
            }
        }
    }
    generateVariableName() {
        if (this.manualChunkAlias) {
            return this.manualChunkAlias;
        }
        const moduleForNaming = this.entryModules[0] ||
            this.implicitEntryModules[0] ||
            this.dynamicEntryModules[0] ||
            this.orderedModules[this.orderedModules.length - 1];
        if (moduleForNaming) {
            return moduleForNaming.chunkName || getAliasName(moduleForNaming.id);
        }
        return 'chunk';
    }
    getChunkDependencyDeclarations(options) {
        const importSpecifiers = this.getImportSpecifiers();
        const reexportSpecifiers = this.getReexportSpecifiers();
        const dependencyDeclaration = new Map();
        for (const dep of this.dependencies) {
            const imports = importSpecifiers.get(dep) || null;
            const reexports = reexportSpecifiers.get(dep) || null;
            const namedExportsMode = dep instanceof ExternalModule || dep.exportMode !== 'default';
            dependencyDeclaration.set(dep, {
                defaultVariableName: dep.defaultVariableName,
                globalName: (dep instanceof ExternalModule &&
                    (options.format === 'umd' || options.format === 'iife') &&
                    getGlobalName(dep, options.globals, (imports || reexports) !== null, this.inputOptions.onwarn)),
                id: undefined,
                imports,
                isChunk: dep instanceof Chunk$1,
                name: dep.variableName,
                namedExportsMode,
                namespaceVariableName: dep.namespaceVariableName,
                reexports
            });
        }
        return dependencyDeclaration;
    }
    getChunkExportDeclarations(format) {
        const exports = [];
        for (const exportName of this.getExportNames()) {
            if (exportName[0] === '*')
                continue;
            const variable = this.exportsByName[exportName];
            if (!(variable instanceof SyntheticNamedExportVariable)) {
                const module = variable.module;
                if (module && this.chunkByModule.get(module) !== this)
                    continue;
            }
            let expression = null;
            let hoisted = false;
            let uninitialized = false;
            let local = variable.getName();
            if (variable instanceof LocalVariable) {
                if (variable.init === UNDEFINED_EXPRESSION) {
                    uninitialized = true;
                }
                for (const declaration of variable.declarations) {
                    if (declaration.parent instanceof FunctionDeclaration ||
                        (declaration instanceof ExportDefaultDeclaration &&
                            declaration.declaration instanceof FunctionDeclaration)) {
                        hoisted = true;
                        break;
                    }
                }
            }
            else if (variable instanceof SyntheticNamedExportVariable) {
                expression = local;
                if (format === 'es' && exportName !== 'default') {
                    local = variable.renderName;
                }
            }
            exports.push({
                exported: exportName,
                expression,
                hoisted,
                local,
                uninitialized
            });
        }
        return exports;
    }
    getDependenciesToBeDeconflicted(addNonNamespacesAndInteropHelpers, addDependenciesWithoutBindings, interop) {
        const dependencies = new Set();
        const deconflictedDefault = new Set();
        const deconflictedNamespace = new Set();
        for (const variable of [...this.exportNamesByVariable.keys(), ...this.imports]) {
            if (addNonNamespacesAndInteropHelpers || variable.isNamespace) {
                const module = variable.module;
                if (module instanceof ExternalModule) {
                    dependencies.add(module);
                    if (addNonNamespacesAndInteropHelpers) {
                        if (variable.name === 'default') {
                            if (defaultInteropHelpersByInteropType[String(interop(module.id))]) {
                                deconflictedDefault.add(module);
                            }
                        }
                        else if (variable.name === '*') {
                            if (namespaceInteropHelpersByInteropType[String(interop(module.id))]) {
                                deconflictedNamespace.add(module);
                            }
                        }
                    }
                }
                else {
                    const chunk = this.chunkByModule.get(module);
                    if (chunk !== this) {
                        dependencies.add(chunk);
                        if (addNonNamespacesAndInteropHelpers &&
                            chunk.exportMode === 'default' &&
                            variable.isNamespace) {
                            deconflictedNamespace.add(chunk);
                        }
                    }
                }
            }
        }
        if (addDependenciesWithoutBindings) {
            for (const dependency of this.dependencies) {
                dependencies.add(dependency);
            }
        }
        return { deconflictedDefault, deconflictedNamespace, dependencies };
    }
    getFallbackChunkName() {
        if (this.manualChunkAlias) {
            return this.manualChunkAlias;
        }
        if (this.fileName) {
            return getAliasName(this.fileName);
        }
        return getAliasName(this.orderedModules[this.orderedModules.length - 1].id);
    }
    getImportedBindingsPerDependency() {
        const importSpecifiers = {};
        for (const [dependency, declaration] of this.renderedDependencies) {
            const specifiers = new Set();
            if (declaration.imports) {
                for (const { imported } of declaration.imports) {
                    specifiers.add(imported);
                }
            }
            if (declaration.reexports) {
                for (const { imported } of declaration.reexports) {
                    specifiers.add(imported);
                }
            }
            importSpecifiers[dependency.id] = [...specifiers];
        }
        return importSpecifiers;
    }
    getImportSpecifiers() {
        const { interop } = this.outputOptions;
        const importsByDependency = new Map();
        for (const variable of this.imports) {
            const module = variable.module;
            let dependency;
            let imported;
            if (module instanceof ExternalModule) {
                dependency = module;
                imported = variable.name;
                if (imported !== 'default' && imported !== '*' && interop(module.id) === 'defaultOnly') {
                    return error(errUnexpectedNamedImport(module.id, imported, false));
                }
            }
            else {
                dependency = this.chunkByModule.get(module);
                imported = dependency.getVariableExportName(variable);
            }
            getOrCreate(importsByDependency, dependency, () => []).push({
                imported,
                local: variable.getName()
            });
        }
        return importsByDependency;
    }
    getReexportSpecifiers() {
        const { externalLiveBindings, interop } = this.outputOptions;
        const reexportSpecifiers = new Map();
        for (let exportName of this.getExportNames()) {
            let dependency;
            let imported;
            let needsLiveBinding = false;
            if (exportName[0] === '*') {
                const id = exportName.substr(1);
                if (interop(id) === 'defaultOnly') {
                    this.inputOptions.onwarn(errUnexpectedNamespaceReexport(id));
                }
                needsLiveBinding = externalLiveBindings;
                dependency = this.modulesById.get(id);
                imported = exportName = '*';
            }
            else {
                const variable = this.exportsByName[exportName];
                if (variable instanceof SyntheticNamedExportVariable)
                    continue;
                const module = variable.module;
                if (module instanceof Module) {
                    dependency = this.chunkByModule.get(module);
                    if (dependency === this)
                        continue;
                    imported = dependency.getVariableExportName(variable);
                    needsLiveBinding = variable.isReassigned;
                }
                else {
                    dependency = module;
                    imported = variable.name;
                    if (imported !== 'default' && imported !== '*' && interop(module.id) === 'defaultOnly') {
                        return error(errUnexpectedNamedImport(module.id, imported, true));
                    }
                    needsLiveBinding =
                        externalLiveBindings &&
                            (imported !== 'default' || isDefaultAProperty(String(interop(module.id)), true));
                }
            }
            getOrCreate(reexportSpecifiers, dependency, () => []).push({
                imported,
                needsLiveBinding,
                reexported: exportName
            });
        }
        return reexportSpecifiers;
    }
    getReferencedFiles() {
        const referencedFiles = [];
        for (const module of this.orderedModules) {
            for (const meta of module.importMetas) {
                const fileName = meta.getReferencedFileName(this.pluginDriver);
                if (fileName) {
                    referencedFiles.push(fileName);
                }
            }
        }
        return referencedFiles;
    }
    getRelativePath(targetPath, stripJsExtension) {
        let relativePath = normalize(relative(dirname(this.id), targetPath));
        if (stripJsExtension && relativePath.endsWith('.js')) {
            relativePath = relativePath.slice(0, -3);
        }
        if (relativePath === '..')
            return '../../' + basename(targetPath);
        if (relativePath === '')
            return '../' + basename(targetPath);
        return relativePath.startsWith('../') ? relativePath : './' + relativePath;
    }
    inlineChunkDependencies(chunk) {
        for (const dep of chunk.dependencies) {
            if (this.dependencies.has(dep))
                continue;
            this.dependencies.add(dep);
            if (dep instanceof Chunk$1) {
                this.inlineChunkDependencies(dep);
            }
        }
    }
    prepareDynamicImportsAndImportMetas() {
        var _a;
        const accessedGlobalsByScope = this.accessedGlobalsByScope;
        for (const module of this.orderedModules) {
            for (const { node, resolution } of module.dynamicImports) {
                if (node.included) {
                    if (resolution instanceof Module) {
                        const chunk = this.chunkByModule.get(resolution);
                        if (chunk === this) {
                            node.setInternalResolution(resolution.namespace);
                        }
                        else {
                            node.setExternalResolution(((_a = this.facadeChunkByModule.get(resolution)) === null || _a === void 0 ? void 0 : _a.exportMode) || chunk.exportMode, resolution, this.outputOptions, this.pluginDriver, accessedGlobalsByScope);
                        }
                    }
                    else {
                        node.setExternalResolution('external', resolution, this.outputOptions, this.pluginDriver, accessedGlobalsByScope);
                    }
                }
            }
            for (const importMeta of module.importMetas) {
                importMeta.addAccessedGlobals(this.outputOptions.format, accessedGlobalsByScope);
            }
        }
    }
    setExternalRenderPaths(options, inputBase) {
        for (const dependency of [...this.dependencies, ...this.dynamicDependencies]) {
            if (dependency instanceof ExternalModule) {
                dependency.setRenderPath(options, inputBase);
            }
        }
    }
    setIdentifierRenderResolutions({ format, interop }) {
        const syntheticExports = new Set();
        for (const exportName of this.getExportNames()) {
            const exportVariable = this.exportsByName[exportName];
            if (exportVariable instanceof ExportShimVariable) {
                this.needsExportsShim = true;
            }
            if (format !== 'es' &&
                format !== 'system' &&
                exportVariable.isReassigned &&
                !exportVariable.isId) {
                exportVariable.setRenderNames('exports', exportName);
            }
            else if (exportVariable instanceof SyntheticNamedExportVariable) {
                syntheticExports.add(exportVariable);
            }
            else {
                exportVariable.setRenderNames(null, null);
            }
        }
        const usedNames = new Set();
        if (this.needsExportsShim) {
            usedNames.add(MISSING_EXPORT_SHIM_VARIABLE);
        }
        switch (format) {
            case 'system':
                usedNames.add('module').add('exports');
                break;
            case 'es':
                break;
            case 'cjs':
                usedNames.add('module').add('require').add('__filename').add('__dirname');
            // fallthrough
            default:
                usedNames.add('exports');
                for (const helper of HELPER_NAMES) {
                    usedNames.add(helper);
                }
        }
        deconflictChunk(this.orderedModules, this.getDependenciesToBeDeconflicted(format !== 'es' && format !== 'system', format === 'amd' || format === 'umd' || format === 'iife', interop), this.imports, usedNames, format, interop, this.outputOptions.preserveModules, this.outputOptions.externalLiveBindings, this.chunkByModule, syntheticExports, this.exportNamesByVariable, this.accessedGlobalsByScope, this.includedNamespaces);
    }
    setUpChunkImportsAndExportsForModule(module) {
        const moduleImports = new Set(module.imports);
        // when we are not preserving modules, we need to make all namespace variables available for
        // rendering the namespace object
        if (!this.outputOptions.preserveModules) {
            if (this.includedNamespaces.has(module)) {
                const memberVariables = module.namespace.getMemberVariables();
                for (const name of Object.keys(memberVariables)) {
                    moduleImports.add(memberVariables[name]);
                }
            }
        }
        for (let variable of moduleImports) {
            if (variable instanceof ExportDefaultVariable) {
                variable = variable.getOriginalVariable();
            }
            if (variable instanceof SyntheticNamedExportVariable) {
                variable = variable.getBaseVariable();
            }
            const chunk = this.chunkByModule.get(variable.module);
            if (chunk !== this) {
                this.imports.add(variable);
                if (!(variable instanceof NamespaceVariable && this.outputOptions.preserveModules) &&
                    variable.module instanceof Module) {
                    chunk.exports.add(variable);
                }
            }
        }
        if (this.includedNamespaces.has(module) ||
            (module.info.isEntry && module.preserveSignature !== false) ||
            module.includedDynamicImporters.some(importer => this.chunkByModule.get(importer) !== this)) {
            this.ensureReexportsAreAvailableForModule(module);
        }
        for (const { node, resolution } of module.dynamicImports) {
            if (node.included &&
                resolution instanceof Module &&
                this.chunkByModule.get(resolution) === this &&
                !this.includedNamespaces.has(resolution)) {
                this.includedNamespaces.add(resolution);
                this.ensureReexportsAreAvailableForModule(resolution);
            }
        }
    }
}

const concatSep = (out, next) => (next ? `${out}\n${next}` : out);
const concatDblSep = (out, next) => (next ? `${out}\n\n${next}` : out);
async function createAddons(options, outputPluginDriver) {
    try {
        let [banner, footer, intro, outro] = await Promise.all([
            outputPluginDriver.hookReduceValue('banner', options.banner(), [], concatSep),
            outputPluginDriver.hookReduceValue('footer', options.footer(), [], concatSep),
            outputPluginDriver.hookReduceValue('intro', options.intro(), [], concatDblSep),
            outputPluginDriver.hookReduceValue('outro', options.outro(), [], concatDblSep)
        ]);
        if (intro)
            intro += '\n\n';
        if (outro)
            outro = `\n\n${outro}`;
        if (banner.length)
            banner += '\n';
        if (footer.length)
            footer = '\n' + footer;
        return { intro, outro, banner, footer };
    }
    catch (err) {
        return error({
            code: 'ADDON_ERROR',
            message: `Could not retrieve ${err.hook}. Check configuration of plugin ${err.plugin}.
\tError Message: ${err.message}`
        });
    }
}

function getChunkAssignments(entryModules, manualChunkAliasByEntry) {
    const chunkDefinitions = [];
    const modulesInManualChunks = new Set(manualChunkAliasByEntry.keys());
    const manualChunkModulesByAlias = Object.create(null);
    for (const [entry, alias] of manualChunkAliasByEntry) {
        const chunkModules = (manualChunkModulesByAlias[alias] =
            manualChunkModulesByAlias[alias] || []);
        addStaticDependenciesToManualChunk(entry, chunkModules, modulesInManualChunks);
    }
    for (const [alias, modules] of Object.entries(manualChunkModulesByAlias)) {
        chunkDefinitions.push({ alias, modules });
    }
    const assignedEntryPointsByModule = new Map();
    const { dependentEntryPointsByModule, dynamicEntryModules } = analyzeModuleGraph(entryModules);
    const dynamicallyDependentEntryPointsByDynamicEntry = getDynamicDependentEntryPoints(dependentEntryPointsByModule, dynamicEntryModules);
    const staticEntries = new Set(entryModules);
    function assignEntryToStaticDependencies(entry, dynamicDependentEntryPoints) {
        const modulesToHandle = new Set([entry]);
        for (const module of modulesToHandle) {
            const assignedEntryPoints = getOrCreate(assignedEntryPointsByModule, module, () => new Set());
            if (dynamicDependentEntryPoints &&
                areEntryPointsContainedOrDynamicallyDependent(dynamicDependentEntryPoints, dependentEntryPointsByModule.get(module))) {
                continue;
            }
            else {
                assignedEntryPoints.add(entry);
            }
            for (const dependency of module.getDependenciesToBeIncluded()) {
                if (!(dependency instanceof ExternalModule || modulesInManualChunks.has(dependency))) {
                    modulesToHandle.add(dependency);
                }
            }
        }
    }
    function areEntryPointsContainedOrDynamicallyDependent(entryPoints, containedIn) {
        const entriesToCheck = new Set(entryPoints);
        for (const entry of entriesToCheck) {
            if (!containedIn.has(entry)) {
                if (staticEntries.has(entry))
                    return false;
                const dynamicallyDependentEntryPoints = dynamicallyDependentEntryPointsByDynamicEntry.get(entry);
                for (const dependentEntry of dynamicallyDependentEntryPoints) {
                    entriesToCheck.add(dependentEntry);
                }
            }
        }
        return true;
    }
    for (const entry of entryModules) {
        if (!modulesInManualChunks.has(entry)) {
            assignEntryToStaticDependencies(entry, null);
        }
    }
    for (const entry of dynamicEntryModules) {
        if (!modulesInManualChunks.has(entry)) {
            assignEntryToStaticDependencies(entry, dynamicallyDependentEntryPointsByDynamicEntry.get(entry));
        }
    }
    chunkDefinitions.push(...createChunks([...entryModules, ...dynamicEntryModules], assignedEntryPointsByModule));
    return chunkDefinitions;
}
function addStaticDependenciesToManualChunk(entry, manualChunkModules, modulesInManualChunks) {
    const modulesToHandle = new Set([entry]);
    for (const module of modulesToHandle) {
        modulesInManualChunks.add(module);
        manualChunkModules.push(module);
        for (const dependency of module.dependencies) {
            if (!(dependency instanceof ExternalModule || modulesInManualChunks.has(dependency))) {
                modulesToHandle.add(dependency);
            }
        }
    }
}
function analyzeModuleGraph(entryModules) {
    const dynamicEntryModules = new Set();
    const dependentEntryPointsByModule = new Map();
    const entriesToHandle = new Set(entryModules);
    for (const currentEntry of entriesToHandle) {
        const modulesToHandle = new Set([currentEntry]);
        for (const module of modulesToHandle) {
            getOrCreate(dependentEntryPointsByModule, module, () => new Set()).add(currentEntry);
            for (const dependency of module.getDependenciesToBeIncluded()) {
                if (!(dependency instanceof ExternalModule)) {
                    modulesToHandle.add(dependency);
                }
            }
            for (const { resolution } of module.dynamicImports) {
                if (resolution instanceof Module && resolution.includedDynamicImporters.length > 0) {
                    dynamicEntryModules.add(resolution);
                    entriesToHandle.add(resolution);
                }
            }
            for (const dependency of module.implicitlyLoadedBefore) {
                dynamicEntryModules.add(dependency);
                entriesToHandle.add(dependency);
            }
        }
    }
    return { dependentEntryPointsByModule, dynamicEntryModules };
}
function getDynamicDependentEntryPoints(dependentEntryPointsByModule, dynamicEntryModules) {
    const dynamicallyDependentEntryPointsByDynamicEntry = new Map();
    for (const dynamicEntry of dynamicEntryModules) {
        const dynamicDependentEntryPoints = getOrCreate(dynamicallyDependentEntryPointsByDynamicEntry, dynamicEntry, () => new Set());
        for (const importer of [
            ...dynamicEntry.includedDynamicImporters,
            ...dynamicEntry.implicitlyLoadedAfter
        ]) {
            for (const entryPoint of dependentEntryPointsByModule.get(importer)) {
                dynamicDependentEntryPoints.add(entryPoint);
            }
        }
    }
    return dynamicallyDependentEntryPointsByDynamicEntry;
}
function createChunks(allEntryPoints, assignedEntryPointsByModule) {
    const chunkModules = Object.create(null);
    for (const [module, assignedEntryPoints] of assignedEntryPointsByModule) {
        let chunkSignature = '';
        for (const entry of allEntryPoints) {
            chunkSignature += assignedEntryPoints.has(entry) ? 'X' : '_';
        }
        const chunk = chunkModules[chunkSignature];
        if (chunk) {
            chunk.push(module);
        }
        else {
            chunkModules[chunkSignature] = [module];
        }
    }
    return Object.keys(chunkModules).map(chunkSignature => ({
        alias: null,
        modules: chunkModules[chunkSignature]
    }));
}

// ported from https://github.com/substack/node-commondir
function commondir(files) {
    if (files.length === 0)
        return '/';
    if (files.length === 1)
        return dirname(files[0]);
    const commonSegments = files.slice(1).reduce((commonSegments, file) => {
        const pathSegements = file.split(/\/+|\\+/);
        let i;
        for (i = 0; commonSegments[i] === pathSegements[i] &&
            i < Math.min(commonSegments.length, pathSegements.length); i++)
            ;
        return commonSegments.slice(0, i);
    }, files[0].split(/\/+|\\+/));
    // Windows correctly handles paths with forward-slashes
    return commonSegments.length > 1 ? commonSegments.join('/') : '/';
}

var BuildPhase;
(function (BuildPhase) {
    BuildPhase[BuildPhase["LOAD_AND_PARSE"] = 0] = "LOAD_AND_PARSE";
    BuildPhase[BuildPhase["ANALYSE"] = 1] = "ANALYSE";
    BuildPhase[BuildPhase["GENERATE"] = 2] = "GENERATE";
})(BuildPhase || (BuildPhase = {}));

function generateAssetFileName(name, source, output) {
    const emittedName = name || 'asset';
    return makeUnique(renderNamePattern(typeof output.assetFileNames === 'function'
        ? output.assetFileNames({ name, source, type: 'asset' })
        : output.assetFileNames, 'output.assetFileNames', {
        hash() {
            const hash = createHash();
            hash.update(emittedName);
            hash.update(':');
            hash.update(source);
            return hash.digest('hex').substr(0, 8);
        },
        ext: () => extname(emittedName).substr(1),
        extname: () => extname(emittedName),
        name: () => emittedName.substr(0, emittedName.length - extname(emittedName).length)
    }), output.bundle);
}
function reserveFileNameInBundle(fileName, bundle, warn) {
    if (fileName in bundle) {
        warn(errFileNameConflict(fileName));
    }
    bundle[fileName] = FILE_PLACEHOLDER;
}
const FILE_PLACEHOLDER = {
    type: 'placeholder'
};
function hasValidType(emittedFile) {
    return Boolean(emittedFile &&
        (emittedFile.type === 'asset' ||
            emittedFile.type === 'chunk'));
}
function hasValidName(emittedFile) {
    const validatedName = emittedFile.fileName || emittedFile.name;
    return (!validatedName || (typeof validatedName === 'string' && isPlainPathFragment(validatedName)));
}
function getValidSource(source, emittedFile, fileReferenceId) {
    if (!(typeof source === 'string' || source instanceof Uint8Array)) {
        const assetName = emittedFile.fileName || emittedFile.name || fileReferenceId;
        return error(errFailedValidation(`Could not set source for ${typeof assetName === 'string' ? `asset "${assetName}"` : 'unnamed asset'}, asset source needs to be a string, Uint8Array or Buffer.`));
    }
    return source;
}
function getAssetFileName(file, referenceId) {
    if (typeof file.fileName !== 'string') {
        return error(errAssetNotFinalisedForFileName(file.name || referenceId));
    }
    return file.fileName;
}
function getChunkFileName(file, facadeChunkByModule) {
    var _a;
    const fileName = file.fileName || (file.module && ((_a = facadeChunkByModule === null || facadeChunkByModule === void 0 ? void 0 : facadeChunkByModule.get(file.module)) === null || _a === void 0 ? void 0 : _a.id));
    if (!fileName)
        return error(errChunkNotGeneratedForFileName(file.fileName || file.name));
    return fileName;
}
class FileEmitter {
    constructor(graph, options, baseFileEmitter) {
        this.graph = graph;
        this.options = options;
        this.facadeChunkByModule = null;
        this.output = null;
        this.assertAssetsFinalized = () => {
            for (const [referenceId, emittedFile] of this.filesByReferenceId.entries()) {
                if (emittedFile.type === 'asset' && typeof emittedFile.fileName !== 'string')
                    return error(errNoAssetSourceSet(emittedFile.name || referenceId));
            }
        };
        this.emitFile = (emittedFile) => {
            if (!hasValidType(emittedFile)) {
                return error(errFailedValidation(`Emitted files must be of type "asset" or "chunk", received "${emittedFile && emittedFile.type}".`));
            }
            if (!hasValidName(emittedFile)) {
                return error(errFailedValidation(`The "fileName" or "name" properties of emitted files must be strings that are neither absolute nor relative paths and do not contain invalid characters, received "${emittedFile.fileName || emittedFile.name}".`));
            }
            if (emittedFile.type === 'chunk') {
                return this.emitChunk(emittedFile);
            }
            else {
                return this.emitAsset(emittedFile);
            }
        };
        this.getFileName = (fileReferenceId) => {
            const emittedFile = this.filesByReferenceId.get(fileReferenceId);
            if (!emittedFile)
                return error(errFileReferenceIdNotFoundForFilename(fileReferenceId));
            if (emittedFile.type === 'chunk') {
                return getChunkFileName(emittedFile, this.facadeChunkByModule);
            }
            else {
                return getAssetFileName(emittedFile, fileReferenceId);
            }
        };
        this.setAssetSource = (referenceId, requestedSource) => {
            const consumedFile = this.filesByReferenceId.get(referenceId);
            if (!consumedFile)
                return error(errAssetReferenceIdNotFoundForSetSource(referenceId));
            if (consumedFile.type !== 'asset') {
                return error(errFailedValidation(`Asset sources can only be set for emitted assets but "${referenceId}" is an emitted chunk.`));
            }
            if (consumedFile.source !== undefined) {
                return error(errAssetSourceAlreadySet(consumedFile.name || referenceId));
            }
            const source = getValidSource(requestedSource, consumedFile, referenceId);
            if (this.output) {
                this.finalizeAsset(consumedFile, source, referenceId, this.output);
            }
            else {
                consumedFile.source = source;
            }
        };
        this.setOutputBundle = (outputBundle, assetFileNames, facadeChunkByModule) => {
            this.output = {
                assetFileNames,
                bundle: outputBundle
            };
            this.facadeChunkByModule = facadeChunkByModule;
            for (const emittedFile of this.filesByReferenceId.values()) {
                if (emittedFile.fileName) {
                    reserveFileNameInBundle(emittedFile.fileName, this.output.bundle, this.options.onwarn);
                }
            }
            for (const [referenceId, consumedFile] of this.filesByReferenceId.entries()) {
                if (consumedFile.type === 'asset' && consumedFile.source !== undefined) {
                    this.finalizeAsset(consumedFile, consumedFile.source, referenceId, this.output);
                }
            }
        };
        this.filesByReferenceId = baseFileEmitter
            ? new Map(baseFileEmitter.filesByReferenceId)
            : new Map();
    }
    assignReferenceId(file, idBase) {
        let referenceId;
        do {
            const hash = createHash();
            if (referenceId) {
                hash.update(referenceId);
            }
            else {
                hash.update(idBase);
            }
            referenceId = hash.digest('hex').substr(0, 8);
        } while (this.filesByReferenceId.has(referenceId));
        this.filesByReferenceId.set(referenceId, file);
        return referenceId;
    }
    emitAsset(emittedAsset) {
        const source = typeof emittedAsset.source !== 'undefined'
            ? getValidSource(emittedAsset.source, emittedAsset, null)
            : undefined;
        const consumedAsset = {
            fileName: emittedAsset.fileName,
            name: emittedAsset.name,
            source,
            type: 'asset'
        };
        const referenceId = this.assignReferenceId(consumedAsset, emittedAsset.fileName || emittedAsset.name || emittedAsset.type);
        if (this.output) {
            if (emittedAsset.fileName) {
                reserveFileNameInBundle(emittedAsset.fileName, this.output.bundle, this.options.onwarn);
            }
            if (source !== undefined) {
                this.finalizeAsset(consumedAsset, source, referenceId, this.output);
            }
        }
        return referenceId;
    }
    emitChunk(emittedChunk) {
        if (this.graph.phase > BuildPhase.LOAD_AND_PARSE) {
            return error(errInvalidRollupPhaseForChunkEmission());
        }
        if (typeof emittedChunk.id !== 'string') {
            return error(errFailedValidation(`Emitted chunks need to have a valid string id, received "${emittedChunk.id}"`));
        }
        const consumedChunk = {
            fileName: emittedChunk.fileName,
            module: null,
            name: emittedChunk.name || emittedChunk.id,
            type: 'chunk'
        };
        this.graph.moduleLoader
            .emitChunk(emittedChunk)
            .then(module => (consumedChunk.module = module))
            .catch(() => {
            // Avoid unhandled Promise rejection as the error will be thrown later
            // once module loading has finished
        });
        return this.assignReferenceId(consumedChunk, emittedChunk.id);
    }
    finalizeAsset(consumedFile, source, referenceId, output) {
        const fileName = consumedFile.fileName ||
            findExistingAssetFileNameWithSource(output.bundle, source) ||
            generateAssetFileName(consumedFile.name, source, output);
        // We must not modify the original assets to avoid interaction between outputs
        const assetWithFileName = { ...consumedFile, source, fileName };
        this.filesByReferenceId.set(referenceId, assetWithFileName);
        const options = this.options;
        output.bundle[fileName] = {
            fileName,
            name: consumedFile.name,
            get isAsset() {
                warnDeprecation('Accessing "isAsset" on files in the bundle is deprecated, please use "type === \'asset\'" instead', true, options);
                return true;
            },
            source,
            type: 'asset'
        };
    }
}
function findExistingAssetFileNameWithSource(bundle, source) {
    for (const fileName of Object.keys(bundle)) {
        const outputFile = bundle[fileName];
        if (outputFile.type === 'asset' && areSourcesEqual(source, outputFile.source))
            return fileName;
    }
    return null;
}
function areSourcesEqual(sourceA, sourceB) {
    if (typeof sourceA === 'string') {
        return sourceA === sourceB;
    }
    if (typeof sourceB === 'string') {
        return false;
    }
    if ('equals' in sourceA) {
        return sourceA.equals(sourceB);
    }
    if (sourceA.length !== sourceB.length) {
        return false;
    }
    for (let index = 0; index < sourceA.length; index++) {
        if (sourceA[index] !== sourceB[index]) {
            return false;
        }
    }
    return true;
}

class Bundle$1 {
    constructor(outputOptions, unsetOptions, inputOptions, pluginDriver, graph) {
        this.outputOptions = outputOptions;
        this.unsetOptions = unsetOptions;
        this.inputOptions = inputOptions;
        this.pluginDriver = pluginDriver;
        this.graph = graph;
        this.facadeChunkByModule = new Map();
        this.includedNamespaces = new Set();
    }
    async generate(isWrite) {
        timeStart('GENERATE', 1);
        const outputBundle = Object.create(null);
        this.pluginDriver.setOutputBundle(outputBundle, this.outputOptions.assetFileNames, this.facadeChunkByModule);
        try {
            await this.pluginDriver.hookParallel('renderStart', [this.outputOptions, this.inputOptions]);
            timeStart('generate chunks', 2);
            const chunks = await this.generateChunks();
            if (chunks.length > 1) {
                validateOptionsForMultiChunkOutput(this.outputOptions, this.inputOptions.onwarn);
            }
            const inputBase = commondir(getAbsoluteEntryModulePaths(chunks));
            timeEnd('generate chunks', 2);
            timeStart('render modules', 2);
            // We need to create addons before prerender because at the moment, there
            // can be no async code between prerender and render due to internal state
            const addons = await createAddons(this.outputOptions, this.pluginDriver);
            this.prerenderChunks(chunks, inputBase);
            timeEnd('render modules', 2);
            await this.addFinalizedChunksToBundle(chunks, inputBase, addons, outputBundle);
        }
        catch (error) {
            await this.pluginDriver.hookParallel('renderError', [error]);
            throw error;
        }
        await this.pluginDriver.hookSeq('generateBundle', [
            this.outputOptions,
            outputBundle,
            isWrite
        ]);
        this.finaliseAssets(outputBundle);
        timeEnd('GENERATE', 1);
        return outputBundle;
    }
    async addFinalizedChunksToBundle(chunks, inputBase, addons, outputBundle) {
        this.assignChunkIds(chunks, inputBase, addons, outputBundle);
        for (const chunk of chunks) {
            outputBundle[chunk.id] = chunk.getChunkInfoWithFileNames();
        }
        await Promise.all(chunks.map(async (chunk) => {
            const outputChunk = outputBundle[chunk.id];
            Object.assign(outputChunk, await chunk.render(this.outputOptions, addons, outputChunk));
        }));
    }
    async addManualChunks(manualChunks) {
        const manualChunkAliasByEntry = new Map();
        const chunkEntries = await Promise.all(Object.keys(manualChunks).map(async (alias) => ({
            alias,
            entries: await this.graph.moduleLoader.addAdditionalModules(manualChunks[alias])
        })));
        for (const { alias, entries } of chunkEntries) {
            for (const entry of entries) {
                addModuleToManualChunk(alias, entry, manualChunkAliasByEntry);
            }
        }
        return manualChunkAliasByEntry;
    }
    assignChunkIds(chunks, inputBase, addons, bundle) {
        const entryChunks = [];
        const otherChunks = [];
        for (const chunk of chunks) {
            (chunk.facadeModule && chunk.facadeModule.isUserDefinedEntryPoint
                ? entryChunks
                : otherChunks).push(chunk);
        }
        // make sure entry chunk names take precedence with regard to deconflicting
        const chunksForNaming = entryChunks.concat(otherChunks);
        for (const chunk of chunksForNaming) {
            if (this.outputOptions.file) {
                chunk.id = basename(this.outputOptions.file);
            }
            else if (this.outputOptions.preserveModules) {
                chunk.id = chunk.generateIdPreserveModules(inputBase, this.outputOptions, bundle, this.unsetOptions);
            }
            else {
                chunk.id = chunk.generateId(addons, this.outputOptions, bundle, true);
            }
            bundle[chunk.id] = FILE_PLACEHOLDER;
        }
    }
    assignManualChunks(getManualChunk) {
        const manualChunkAliasByEntry = new Map();
        const manualChunksApi = {
            getModuleIds: () => this.graph.modulesById.keys(),
            getModuleInfo: this.graph.getModuleInfo
        };
        for (const module of this.graph.modulesById.values()) {
            if (module instanceof Module) {
                const manualChunkAlias = getManualChunk(module.id, manualChunksApi);
                if (typeof manualChunkAlias === 'string') {
                    addModuleToManualChunk(manualChunkAlias, module, manualChunkAliasByEntry);
                }
            }
        }
        return manualChunkAliasByEntry;
    }
    finaliseAssets(outputBundle) {
        for (const key of Object.keys(outputBundle)) {
            const file = outputBundle[key];
            if (!file.type) {
                warnDeprecation('A plugin is directly adding properties to the bundle object in the "generateBundle" hook. This is deprecated and will be removed in a future Rollup version, please use "this.emitFile" instead.', true, this.inputOptions);
                file.type = 'asset';
            }
        }
        this.pluginDriver.finaliseAssets();
    }
    async generateChunks() {
        const { manualChunks } = this.outputOptions;
        const manualChunkAliasByEntry = typeof manualChunks === 'object'
            ? await this.addManualChunks(manualChunks)
            : this.assignManualChunks(manualChunks);
        const chunks = [];
        const chunkByModule = new Map();
        for (const { alias, modules } of this.outputOptions.inlineDynamicImports
            ? [{ alias: null, modules: getIncludedModules(this.graph.modulesById) }]
            : this.outputOptions.preserveModules
                ? getIncludedModules(this.graph.modulesById).map(module => ({
                    alias: null,
                    modules: [module]
                }))
                : getChunkAssignments(this.graph.entryModules, manualChunkAliasByEntry)) {
            sortByExecutionOrder(modules);
            const chunk = new Chunk$1(modules, this.inputOptions, this.outputOptions, this.unsetOptions, this.pluginDriver, this.graph.modulesById, chunkByModule, this.facadeChunkByModule, this.includedNamespaces, alias);
            chunks.push(chunk);
            for (const module of modules) {
                chunkByModule.set(module, chunk);
            }
        }
        for (const chunk of chunks) {
            chunk.link();
        }
        const facades = [];
        for (const chunk of chunks) {
            facades.push(...chunk.generateFacades());
        }
        return [...chunks, ...facades];
    }
    prerenderChunks(chunks, inputBase) {
        for (const chunk of chunks) {
            chunk.generateExports();
        }
        for (const chunk of chunks) {
            chunk.preRender(this.outputOptions, inputBase);
        }
    }
}
function getAbsoluteEntryModulePaths(chunks) {
    const absoluteEntryModulePaths = [];
    for (const chunk of chunks) {
        for (const entryModule of chunk.entryModules) {
            if (isAbsolute(entryModule.id)) {
                absoluteEntryModulePaths.push(entryModule.id);
            }
        }
    }
    return absoluteEntryModulePaths;
}
function validateOptionsForMultiChunkOutput(outputOptions, onWarn) {
    if (outputOptions.format === 'umd' || outputOptions.format === 'iife')
        return error({
            code: 'INVALID_OPTION',
            message: 'UMD and IIFE output formats are not supported for code-splitting builds.'
        });
    if (typeof outputOptions.file === 'string')
        return error({
            code: 'INVALID_OPTION',
            message: 'When building multiple chunks, the "output.dir" option must be used, not "output.file". ' +
                'To inline dynamic imports, set the "inlineDynamicImports" option.'
        });
    if (outputOptions.sourcemapFile)
        return error({
            code: 'INVALID_OPTION',
            message: '"output.sourcemapFile" is only supported for single-file builds.'
        });
    if (!outputOptions.amd.autoId && outputOptions.amd.id)
        onWarn({
            code: 'INVALID_OPTION',
            message: '"output.amd.id" is only properly supported for single-file builds. Use "output.amd.autoId" and "output.amd.basePath".'
        });
}
function getIncludedModules(modulesById) {
    return [...modulesById.values()].filter(module => module instanceof Module &&
        (module.isIncluded() || module.info.isEntry || module.includedDynamicImporters.length > 0));
}
function addModuleToManualChunk(alias, module, manualChunkAliasByEntry) {
    const existingAlias = manualChunkAliasByEntry.get(module);
    if (typeof existingAlias === 'string' && existingAlias !== alias) {
        return error(errCannotAssignModuleToChunk(module.id, alias, existingAlias));
    }
    manualChunkAliasByEntry.set(module, alias);
}

// Reserved word lists for various dialects of the language

var reservedWords$1 = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};

var keywordRelationalOperator = /^in(stanceof)?$/;

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.
var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08c7\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9ffc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7ca\ua7f5-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf\u1ac0\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by bin/generate-identifier-regex.js

// eslint-disable-next-line comma-spacing
var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,349,41,7,1,79,28,11,0,9,21,107,20,28,22,13,52,76,44,33,24,27,35,30,0,3,0,9,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,21,2,31,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,230,43,117,63,32,7,3,0,3,7,2,1,2,23,16,0,2,0,95,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,35,56,264,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,328,18,190,0,80,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,689,63,129,74,6,0,67,12,65,1,2,0,29,6135,9,1237,43,8,8952,286,50,2,18,3,9,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,2357,44,11,6,17,0,370,43,1301,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42717,35,4148,12,221,3,5761,15,7472,3104,541,1507,4938];

// eslint-disable-next-line comma-spacing
var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,370,1,154,10,176,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,2,11,83,11,7,0,161,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,243,14,166,9,71,5,2,1,3,3,2,0,2,1,13,9,120,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,406,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,330,3,19306,9,135,4,60,6,26,9,1014,0,2,54,8,3,82,0,12,1,19628,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,262,6,10,9,419,13,1495,6,110,6,6,9,4759,9,787719,239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords$1 = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords$1[name] = new TokenType(name, options)
}

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  questionDot: new TokenType("?."),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),
  coalesce: binop("??", 1),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code, ecma2019String) {
  return code === 10 || code === 13 || (!ecma2019String && (code === 0x2028 || code === 0x2029))
}

var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString$1 = ref.toString;

// Checks if an object has a property.

function has(obj, propName) {
  return hasOwnProperty.call(obj, propName)
}

var isArray = Array.isArray || (function (obj) { return (
  toString$1.call(obj) === "[object Array]"
); });

function wordsRegexp(words) {
  return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
}

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    lineBreakG.lastIndex = cur;
    var match = lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur)
    }
  }
}

// A second argument must be given to configure the parser process.
// These options are recognized (only `ecmaVersion` is required):

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
  // (2019), 11 (2020), 12 (2021), or `"latest"` (the latest version
  // the library supports). This influences support for strict mode,
  // the set of reserved words, and support for new syntax features.
  ecmaVersion: null,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"` or `"module"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // the position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};

// Interpret and default an options object

var warnedAboutEcmaVersion = false;

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion === "latest") {
    options.ecmaVersion = 1e8;
  } else if (options.ecmaVersion == null) {
    if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
      warnedAboutEcmaVersion = true;
      console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
    }
    options.ecmaVersion = 11;
  } else if (options.ecmaVersion >= 2015) {
    options.ecmaVersion -= 2009;
  }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Each scope gets a bitset that may contain these flags
var
    SCOPE_TOP = 1,
    SCOPE_FUNCTION = 2,
    SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION,
    SCOPE_ASYNC = 4,
    SCOPE_GENERATOR = 8,
    SCOPE_ARROW = 16,
    SCOPE_SIMPLE_CATCH = 32,
    SCOPE_SUPER = 64,
    SCOPE_DIRECT_SUPER = 128;

function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
}

// Used in checkLVal* and declareName to determine the type of a binding
var
    BIND_NONE = 0, // Not a binding
    BIND_VAR = 1, // Var-style binding
    BIND_LEXICAL = 2, // Let- or const-style binding
    BIND_FUNCTION = 3, // Function declaration
    BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
    BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    reserved = reservedWords$1[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
    if (options.sourceType === "module") { reserved += " await"; }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords$1.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords$1.strictBind);
  this.input = String(input);

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = types.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  // Labels in scope.
  this.labels = [];
  // Thus-far undefined exports.
  this.undefinedExports = {};

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterScope(SCOPE_TOP);

  // For RegExp validation
  this.regexpState = null;
};

var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true },inNonArrowFunction: { configurable: true } };

Parser.prototype.parse = function parse () {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node)
};

prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };
prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 };
prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 };
prototypeAccessors.allowSuper.get = function () { return (this.currentThisScope().flags & SCOPE_SUPER) > 0 };
prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };
prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };
prototypeAccessors.inNonArrowFunction.get = function () { return (this.currentThisScope().flags & SCOPE_FUNCTION) > 0 };

Parser.extend = function extend () {
    var plugins = [], len = arguments.length;
    while ( len-- ) plugins[ len ] = arguments[ len ];

  var cls = this;
  for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
  return cls
};

Parser.parse = function parse (input, options) {
  return new this(options, input).parse()
};

Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression()
};

Parser.tokenizer = function tokenizer (input, options) {
  return new this(options, input)
};

Object.defineProperties( Parser.prototype, prototypeAccessors );

var pp = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
pp.strictDirective = function(start) {
  for (;;) {
    // Try to find string literal.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    var match = literal.exec(this.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) === "use strict") {
      skipWhiteSpace.lastIndex = start + match[0].length;
      var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
      var next = this.input.charAt(end);
      return next === ";" || next === "}" ||
        (lineBreak.test(spaceAfter[0]) &&
         !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "="))
    }
    start += match[0].length;

    // Skip semicolon, if any.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start] === ";")
      { start++; }
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function(name) {
  return this.type === types.name && this.value === name && !this.containsEsc
};

// Consumes contextual keyword if possible.

pp.eatContextual = function(name) {
  if (!this.isContextual(name)) { return false }
  this.next();
  return true
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function() {
  return this.type === types.eof ||
    this.type === types.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function() {
  if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
  this.doubleProto =
    -1;
}

pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
};

pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) { return false }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
  if (shorthandAssign >= 0)
    { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
  if (doubleProto >= 0)
    { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
};

pp.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$1 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$1.parseTopLevel = function(node) {
  var exports = {};
  if (!node.body) { node.body = []; }
  while (this.type !== types.eof) {
    var stmt = this.parseStatement(null, true, exports);
    node.body.push(stmt);
  }
  if (this.inModule)
    { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
      {
        var name = list[i];

        this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
      } }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType;
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

pp$1.isLet = function(context) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
  // For ambiguous cases, determine if a LexicalDeclaration (or only a
  // Statement) is allowed here. If context is not empty then only a Statement
  // is allowed. However, `let [` is an explicit negative lookahead for
  // ExpressionStatement, so special-case it first.
  if (nextCh === 91) { return true } // '['
  if (context) { return false }

  if (nextCh === 123) { return true } // '{'
  if (isIdentifierStart(nextCh, true)) {
    var pos = next + 1;
    while (isIdentifierChar(this.input.charCodeAt(pos), true)) { ++pos; }
    var ident = this.input.slice(next, pos);
    if (!keywordRelationalOperator.test(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\n*/ function' is invalid.
pp$1.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 === this.input.length || !isIdentifierChar(this.input.charAt(next + 8)))
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp$1.parseStatement = function(context, topLevel, exports) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet(context)) {
    starttype = types._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types._debugger: return this.parseDebuggerStatement(node)
  case types._do: return this.parseDoStatement(node)
  case types._for: return this.parseForStatement(node)
  case types._function:
    // Function as sole body of either an if statement or a labeled statement
    // works, but not when it is part of a labeled statement that is the sole
    // body of an if statement.
    if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false, !context)
  case types._class:
    if (context) { this.unexpected(); }
    return this.parseClass(node, true)
  case types._if: return this.parseIfStatement(node)
  case types._return: return this.parseReturnStatement(node)
  case types._switch: return this.parseSwitchStatement(node)
  case types._throw: return this.parseThrowStatement(node)
  case types._try: return this.parseTryStatement(node)
  case types._const: case types._var:
    kind = kind || this.value;
    if (context && kind !== "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types._while: return this.parseWhileStatement(node)
  case types._with: return this.parseWithStatement(node)
  case types.braceL: return this.parseBlock(true, node)
  case types.semi: return this.parseEmptyStatement(node)
  case types._export:
  case types._import:
    if (this.options.ecmaVersion > 10 && starttype === types._import) {
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
      if (nextCh === 40 || nextCh === 46) // '(' or '.'
        { return this.parseExpressionStatement(node, this.parseExpression()) }
    }

    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction()) {
      if (context) { this.unexpected(); }
      this.next();
      return this.parseFunctionStatement(node, true, !context)
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
      { return this.parseLabeledStatement(node, maybeName, expr, context) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$1.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$1.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$1.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp$1.parseForStatement = function(node) {
  this.next();
  var awaitAt = (this.options.ecmaVersion >= 9 && (this.inAsync || (!this.inFunction && this.options.allowAwaitOutsideFunction)) && this.eatContextual("await")) ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types.parenL);
  if (this.type === types.semi) {
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, null)
  }
  var isLet = this.isLet();
  if (this.type === types._var || this.type === types._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === types._in) {
          if (awaitAt > -1) { this.unexpected(awaitAt); }
        } else { node.await = awaitAt > -1; }
      }
      return this.parseForIn(node, init$1)
    }
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, init$1)
  }
  var refDestructuringErrors = new DestructuringErrors;
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (this.options.ecmaVersion >= 9) {
      if (this.type === types._in) {
        if (awaitAt > -1) { this.unexpected(awaitAt); }
      } else { node.await = awaitAt > -1; }
    }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLValPattern(init);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) { this.unexpected(awaitAt); }
  return this.parseFor(node, init)
};

pp$1.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
};

pp$1.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement")
};

pp$1.parseReturnStatement = function(node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$1.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types.braceL);
  this.labels.push(switchLabel);
  this.enterScope(0);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type !== types.braceR;) {
    if (this.type === types._case || this.type === types._default) {
      var isCase = this.type === types._case;
      if (cur) { this.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types.colon);
    } else {
      if (!cur) { this.unexpected(); }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$1.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp$1.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types.parenL)) {
      clause.param = this.parseBindingAtom();
      var simple = clause.param.type === "Identifier";
      this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
      this.checkLValPattern(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
      this.expect(types.parenR);
    } else {
      if (this.options.ecmaVersion < 10) { this.unexpected(); }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$1.parseVarStatement = function(node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$1.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$1.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement")
};

pp$1.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$1.parseLabeledStatement = function(node, maybeName, expr, context) {
  for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      // Update information about previous labels on this node
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$1.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp$1.parseBlock = function(createNewLexicalScope, node, exitStrict) {
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
  if ( node === void 0 ) node = this.startNode();

  node.body = [];
  this.expect(types.braceL);
  if (createNewLexicalScope) { this.enterScope(0); }
  while (this.type !== types.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (exitStrict) { this.strict = false; }
  this.next();
  if (createNewLexicalScope) { this.exitScope(); }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp$1.parseFor = function(node, init) {
  node.init = init;
  this.expect(types.semi);
  node.test = this.type === types.semi ? null : this.parseExpression();
  this.expect(types.semi);
  node.update = this.type === types.parenR ? null : this.parseExpression();
  this.expect(types.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp$1.parseForIn = function(node, init) {
  var isForIn = this.type === types._in;
  this.next();

  if (
    init.type === "VariableDeclaration" &&
    init.declarations[0].init != null &&
    (
      !isForIn ||
      this.options.ecmaVersion < 8 ||
      this.strict ||
      init.kind !== "var" ||
      init.declarations[0].id.type !== "Identifier"
    )
  ) {
    this.raise(
      init.start,
      ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
    );
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
};

// Parse a list of variable declarations.

pp$1.parseVar = function(node, isFor, kind) {
  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (kind === "const" && !(this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
      this.unexpected();
    } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types.comma)) { break }
  }
  return node
};

pp$1.parseVarId = function(decl, kind) {
  decl.id = this.parseBindingAtom();
  this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};

var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

// Parse a function declaration or literal (depending on the
// `statement & FUNC_STATEMENT`).

// Remove `allowExpressionBody` for 7.0.0, as it is only called with false
pp$1.parseFunction = function(node, statement, allowExpressionBody, isAsync) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types.star && (statement & FUNC_HANGING_STATEMENT))
      { this.unexpected(); }
    node.generator = this.eat(types.star);
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (statement & FUNC_STATEMENT) {
    node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT))
      // If it is a regular function declaration in sloppy mode, then it is
      // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
      // mode depends on properties of the current scope (see
      // treatFunctionsAsVar).
      { this.checkLValSimple(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
  }

  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));

  if (!(statement & FUNC_STATEMENT))
    { node.id = this.type === types.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
};

pp$1.parseFunctionParams = function(node) {
  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp$1.parseClass = function(node, isStatement) {
  this.next();

  // ecma-262 14.6 Class Definitions
  // A class definition is always strict mode code.
  var oldStrict = this.strict;
  this.strict = true;

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types.braceL);
  while (this.type !== types.braceR) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) { this.raise(element.start, "Duplicate constructor in the same class"); }
        hadConstructor = true;
      }
    }
  }
  this.strict = oldStrict;
  this.next();
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$1.parseClassElement = function(constructorAllowsSuper) {
  var this$1 = this;

  if (this.eat(types.semi)) { return null }

  var method = this.startNode();
  var tryContextual = function (k, noLineBreak) {
    if ( noLineBreak === void 0 ) noLineBreak = false;

    var start = this$1.start, startLoc = this$1.startLoc;
    if (!this$1.eatContextual(k)) { return false }
    if (this$1.type !== types.parenL && (!noLineBreak || !this$1.canInsertSemicolon())) { return true }
    if (method.key) { this$1.unexpected(); }
    method.computed = false;
    method.key = this$1.startNodeAt(start, startLoc);
    method.key.name = k;
    this$1.finishNode(method.key, "Identifier");
    return false
  };

  method.kind = "method";
  method.static = tryContextual("static");
  var isGenerator = this.eat(types.star);
  var isAsync = false;
  if (!isGenerator) {
    if (this.options.ecmaVersion >= 8 && tryContextual("async", true)) {
      isAsync = true;
      isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
    } else if (tryContextual("get")) {
      method.kind = "get";
    } else if (tryContextual("set")) {
      method.kind = "set";
    }
  }
  if (!method.key) { this.parsePropertyName(method); }
  var key = method.key;
  var allowsDirectSuper = false;
  if (!method.computed && !method.static && (key.type === "Identifier" && key.name === "constructor" ||
      key.type === "Literal" && key.value === "constructor")) {
    if (method.kind !== "method") { this.raise(key.start, "Constructor can't have get/set modifier"); }
    if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
    if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
    method.kind = "constructor";
    allowsDirectSuper = constructorAllowsSuper;
  } else if (method.static && key.type === "Identifier" && key.name === "prototype") {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }
  this.parseClassMethod(method, isGenerator, isAsync, allowsDirectSuper);
  if (method.kind === "get" && method.value.params.length !== 0)
    { this.raiseRecoverable(method.value.start, "getter should have no params"); }
  if (method.kind === "set" && method.value.params.length !== 1)
    { this.raiseRecoverable(method.value.start, "setter should have exactly one param"); }
  if (method.kind === "set" && method.value.params[0].type === "RestElement")
    { this.raiseRecoverable(method.value.params[0].start, "Setter cannot use rest params"); }
  return method
};

pp$1.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
  return this.finishNode(method, "MethodDefinition")
};

pp$1.parseClassId = function(node, isStatement) {
  if (this.type === types.name) {
    node.id = this.parseIdent();
    if (isStatement)
      { this.checkLValSimple(node.id, BIND_LEXICAL, false); }
  } else {
    if (isStatement === true)
      { this.unexpected(); }
    node.id = null;
  }
};

pp$1.parseClassSuper = function(node) {
  node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp$1.parseExport = function(node, exports) {
  this.next();
  // export * from '...'
  if (this.eat(types.star)) {
    if (this.options.ecmaVersion >= 11) {
      if (this.eatContextual("as")) {
        node.exported = this.parseIdent(true);
        this.checkExport(exports, node.exported.name, this.lastTokStart);
      } else {
        node.exported = null;
      }
    }
    this.expectContextual("from");
    if (this.type !== types.string) { this.unexpected(); }
    node.source = this.parseExprAtom();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(types._default)) { // export default ...
    this.checkExport(exports, "default", this.lastTokStart);
    var isAsync;
    if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
      var fNode = this.startNode();
      this.next();
      if (isAsync) { this.next(); }
      node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
    } else if (this.type === types._class) {
      var cNode = this.startNode();
      node.declaration = this.parseClass(cNode, "nullableID");
    } else {
      node.declaration = this.parseMaybeAssign();
      this.semicolon();
    }
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(null);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports, node.declaration.declarations); }
    else
      { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports);
    if (this.eatContextual("from")) {
      if (this.type !== types.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
    } else {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        // check for keywords used as local names
        var spec = list[i];

        this.checkUnreserved(spec.local);
        // check if export is defined
        this.checkLocalExport(spec.local);
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$1.checkExport = function(exports, name, pos) {
  if (!exports) { return }
  if (has(exports, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports[name] = true;
};

pp$1.checkPatternExport = function(exports, pat) {
  var type = pat.type;
  if (type === "Identifier")
    { this.checkExport(exports, pat.name, pat.start); }
  else if (type === "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this.checkPatternExport(exports, prop);
      } }
  else if (type === "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this.checkPatternExport(exports, elt); }
    } }
  else if (type === "Property")
    { this.checkPatternExport(exports, pat.value); }
  else if (type === "AssignmentPattern")
    { this.checkPatternExport(exports, pat.left); }
  else if (type === "RestElement")
    { this.checkPatternExport(exports, pat.argument); }
  else if (type === "ParenthesizedExpression")
    { this.checkPatternExport(exports, pat.expression); }
};

pp$1.checkVariableExport = function(exports, decls) {
  if (!exports) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this.checkPatternExport(exports, decl.id);
  }
};

pp$1.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$1.parseExportSpecifiers = function(exports) {
  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node = this.startNode();
    node.local = this.parseIdent(true);
    node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
    this.checkExport(exports, node.exported.name, node.exported.start);
    nodes.push(this.finishNode(node, "ExportSpecifier"));
  }
  return nodes
};

// Parses import declaration.

pp$1.parseImport = function(node) {
  this.next();
  // import '...'
  if (this.type === types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$1.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLValSimple(node.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(types.comma)) { return nodes }
  }
  if (this.type === types.star) {
    var node$1 = this.startNode();
    this.next();
    this.expectContextual("as");
    node$1.local = this.parseIdent();
    this.checkLValSimple(node$1.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
    return nodes
  }
  this.expect(types.braceL);
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var node$2 = this.startNode();
    node$2.imported = this.parseIdent(true);
    if (this.eatContextual("as")) {
      node$2.local = this.parseIdent();
    } else {
      this.checkUnreserved(node$2.imported);
      node$2.local = node$2.imported;
    }
    this.checkLValSimple(node$2.local, BIND_LEXICAL);
    nodes.push(this.finishNode(node$2, "ImportSpecifier"));
  }
  return nodes
};

// Set `ExpressionStatement#directive` property for directive prologues.
pp$1.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$1.isDirectiveCandidate = function(statement) {
  return (
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "Literal" &&
    typeof statement.expression.value === "string" &&
    // Reject parenthesized strings.
    (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
  )
};

var pp$2 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$2.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
    case "AssignmentPattern":
    case "RestElement":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      this.toAssignable(prop, isBinding);
        // Early error:
        //   AssignmentRestProperty[Yield, Await] :
        //     `...` DestructuringAssignmentTarget[Yield, Await]
        //
        //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
        if (
          prop.type === "RestElement" &&
          (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
        ) {
          this.raise(prop.argument.start, "Unexpected token");
        }
      }
      break

    case "Property":
      // AssignmentProperty has type === "Property"
      if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
      this.toAssignable(node.value, isBinding);
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      this.toAssignableList(node.elements, isBinding);
      break

    case "SpreadElement":
      node.type = "RestElement";
      this.toAssignable(node.argument, isBinding);
      if (node.argument.type === "AssignmentPattern")
        { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
      break

    case "AssignmentExpression":
      if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
      node.type = "AssignmentPattern";
      delete node.operator;
      this.toAssignable(node.left, isBinding);
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding, refDestructuringErrors);
      break

    case "ChainExpression":
      this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
  return node
};

// Convert list of expression atoms to binding list.

pp$2.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this.toAssignable(elt, isBinding); }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  return exprList
};

// Parses spread element.

pp$2.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$2.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$2.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
    case types.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(types.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern")

    case types.braceL:
      return this.parseObj(true)
    }
  }
  return this.parseIdent()
};

pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this.expect(types.comma); }
    if (allowEmpty && this.type === types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break
    } else if (this.type === types.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
      this.expect(close);
      break
    } else {
      var elem = this.parseMaybeDefault(this.start, this.startLoc);
      this.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts
};

pp$2.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// The following three functions all verify that a node is an lvalue —
// something that can be bound, or assigned to. In order to do so, they perform
// a variety of checks:
//
// - Check that none of the bound/assigned-to identifiers are reserved words.
// - Record name declarations for bindings in the appropriate scope.
// - Check duplicate argument names, if checkClashes is set.
//
// If a complex binding pattern is encountered (e.g., object and array
// destructuring), the entire pattern is recursively checked.
//
// There are three versions of checkLVal*() appropriate for different
// circumstances:
//
// - checkLValSimple() shall be used if the syntactic construct supports
//   nothing other than identifiers and member expressions. Parenthesized
//   expressions are also correctly handled. This is generally appropriate for
//   constructs for which the spec says
//
//   > It is a Syntax Error if AssignmentTargetType of [the production] is not
//   > simple.
//
//   It is also appropriate for checking if an identifier is valid and not
//   defined elsewhere, like import declarations or function/class identifiers.
//
//   Examples where this is used include:
//     a += …;
//     import a from '…';
//   where a is the node to be checked.
//
// - checkLValPattern() shall be used if the syntactic construct supports
//   anything checkLValSimple() supports, as well as object and array
//   destructuring patterns. This is generally appropriate for constructs for
//   which the spec says
//
//   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
//   > an ArrayLiteral and AssignmentTargetType of [the production] is not
//   > simple.
//
//   Examples where this is used include:
//     (a = …);
//     const a = …;
//     try { … } catch (a) { … }
//   where a is the node to be checked.
//
// - checkLValInnerPattern() shall be used if the syntactic construct supports
//   anything checkLValPattern() supports, as well as default assignment
//   patterns, rest elements, and other constructs that may appear within an
//   object or array destructuring pattern.
//
//   As a special case, function parameters also use checkLValInnerPattern(),
//   as they also support defaults and rest constructs.
//
// These functions deliberately support both assignment and binding constructs,
// as the logic for both is exceedingly similar. If the node is the target of
// an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
// should be set to the appropriate BIND_* constant, like BIND_VAR or
// BIND_LEXICAL.
//
// If the function is called with a non-BIND_NONE bindingType, then
// additionally a checkClashes object may be specified to allow checking for
// duplicate argument names. checkClashes is ignored if the provided construct
// is an assignment (i.e., bindingType is BIND_NONE).

pp$2.checkLValSimple = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  var isBind = bindingType !== BIND_NONE;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (isBind) {
      if (bindingType === BIND_LEXICAL && expr.name === "let")
        { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
      if (checkClashes) {
        if (has(checkClashes, expr.name))
          { this.raiseRecoverable(expr.start, "Argument name clash"); }
        checkClashes[expr.name] = true;
      }
      if (bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
    }
    break

  case "ChainExpression":
    this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
    break

  case "MemberExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding member expression"); }
    break

  case "ParenthesizedExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding parenthesized expression"); }
    return this.checkLValSimple(expr.expression, bindingType, checkClashes)

  default:
    this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
  }
};

pp$2.checkLValPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1) {
      var prop = list[i];

    this.checkLValInnerPattern(prop, bindingType, checkClashes);
    }
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this.checkLValInnerPattern(elem, bindingType, checkClashes); }
    }
    break

  default:
    this.checkLValSimple(expr, bindingType, checkClashes);
  }
};

pp$2.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "Property":
    // AssignmentProperty has type === "Property"
    this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
    break

  case "AssignmentPattern":
    this.checkLValPattern(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLValPattern(expr.argument, bindingType, checkClashes);
    break

  default:
    this.checkLValPattern(expr, bindingType, checkClashes);
  }
};

// A recursive descent parser operates by defining functions for all

var pp$3 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$3.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
    { return }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0)
            { refDestructuringErrors.doubleProto = key.start; }
          // Backwards-compat kludge. Can be removed in version 6.0
        } else { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
      }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$3.parseExpression = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types.comma)) { node.expressions.push(this.parseMaybeAssign(noIn, refDestructuringErrors)); }
    return this.finishNode(node, "SequenceExpression")
  }
  return expr
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) { return this.parseYield(noIn) }
    // The tokenizer will assume an expression is allowed after
    // `yield`, but this isn't that kind of yield
    else { this.exprAllowed = false; }
  }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types.parenL || this.type === types.name)
    { this.potentialArrowAt = this.start; }
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    if (this.type === types.eq)
      { left = this.toAssignable(left, false, refDestructuringErrors); }
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= left.start)
      { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
    if (this.type === types.eq)
      { this.checkLValPattern(left); }
    else
      { this.checkLValSimple(left); }
    node.left = left;
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (`?:`) operator.

pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (this.eat(types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, noIn)
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== types._in)) {
    if (prec > minPrec) {
      var logical = this.type === types.logicalOR || this.type === types.logicalAND;
      var coalesce = this.type === types.coalesce;
      if (coalesce) {
        // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
        // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
        prec = types.logicalAND.binop;
      }
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
      if ((logical && this.type === types.coalesce) || (coalesce && (this.type === types.logicalOR || this.type === types.logicalAND))) {
        this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
      }
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn)
    }
  }
  return left
};

pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && (this.inAsync || (!this.inFunction && this.options.allowAwaitOutsideFunction))) {
    expr = this.parseAwait();
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLValSimple(node.argument); }
    else if (this.strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLValSimple(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!sawUnary && this.eat(types.starstar))
    { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
  else
    { return expr }
};

// Parse call, dot, and `[]`-subscript expressions.

pp$3.parseExprSubscripts = function(refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
    { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
  }
  return result
};

pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 &&
      this.potentialArrowAt === base.start;
  var optionalChained = false;

  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained);

    if (element.optional) { optionalChained = true; }
    if (element === base || element.type === "ArrowFunctionExpression") {
      if (optionalChained) {
        var chainNode = this.startNodeAt(startPos, startLoc);
        chainNode.expression = element;
        element = this.finishNode(chainNode, "ChainExpression");
      }
      return element
    }

    base = element;
  }
};

pp$3.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained) {
  var optionalSupported = this.options.ecmaVersion >= 11;
  var optional = optionalSupported && this.eat(types.questionDot);
  if (noCalls && optional) { this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions"); }

  var computed = this.eat(types.bracketL);
  if (computed || (optional && this.type !== types.parenL && this.type !== types.backQuote) || this.eat(types.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    node.property = computed ? this.parseExpression() : this.parseIdent(this.options.allowReserved !== "never");
    node.computed = !!computed;
    if (computed) { this.expect(types.bracketR); }
    if (optionalSupported) {
      node.optional = optional;
    }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types.parenL)) {
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !optional && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0)
        { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true)
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    if (optionalSupported) {
      node$1.optional = optional;
    }
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types.backQuote) {
    if (optional || optionalChained) {
      this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
    }
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({isTagged: true});
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp$3.parseExprAtom = function(refDestructuringErrors) {
  // If a division operator appears in an expression position, the
  // tokenizer got confused, and we force it to read a regexp instead.
  if (this.type === types.slash) { this.readRegexp(); }

  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
  case types._super:
    if (!this.allowSuper)
      { this.raise(this.start, "'super' keyword outside a method"); }
    node = this.startNode();
    this.next();
    if (this.type === types.parenL && !this.allowDirectSuper)
      { this.raise(node.start, "super() call outside constructor of a subclass"); }
    // The `super` keyword can appear at below:
    // SuperProperty:
    //     super [ Expression ]
    //     super . IdentifierName
    // SuperCall:
    //     super ( Arguments )
    if (this.type !== types.dot && this.type !== types.bracketL && this.type !== types.parenL)
      { this.unexpected(); }
    return this.finishNode(node, "Super")

  case types._this:
    node = this.startNode();
    this.next();
    return this.finishNode(node, "ThisExpression")

  case types.name:
    var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
    var id = this.parseIdent(false);
    if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
      { return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true) }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name && !containsEsc) {
        id = this.parseIdent(false);
        if (this.canInsertSemicolon() || !this.eat(types.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
      }
    }
    return id

  case types.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types.num: case types.string:
    return this.parseLiteral(this.value)

  case types._null: case types._true: case types._false:
    node = this.startNode();
    node.value = this.type === types._null ? null : this.type === types._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types.braceL:
    return this.parseObj(false, refDestructuringErrors)

  case types._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, 0)

  case types._class:
    return this.parseClass(this.startNode(), false)

  case types._new:
    return this.parseNew()

  case types.backQuote:
    return this.parseTemplate()

  case types._import:
    if (this.options.ecmaVersion >= 11) {
      return this.parseExprImport()
    } else {
      return this.unexpected()
    }

  default:
    this.unexpected();
  }
};

pp$3.parseExprImport = function() {
  var node = this.startNode();

  // Consume `import` as an identifier for `import.meta`.
  // Because `this.parseIdent(true)` doesn't check escape sequences, it needs the check of `this.containsEsc`.
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword import"); }
  var meta = this.parseIdent(true);

  switch (this.type) {
  case types.parenL:
    return this.parseDynamicImport(node)
  case types.dot:
    node.meta = meta;
    return this.parseImportMeta(node)
  default:
    this.unexpected();
  }
};

pp$3.parseDynamicImport = function(node) {
  this.next(); // skip `(`

  // Parse node.source.
  node.source = this.parseMaybeAssign();

  // Verify ending.
  if (!this.eat(types.parenR)) {
    var errorPos = this.start;
    if (this.eat(types.comma) && this.eat(types.parenR)) {
      this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
    } else {
      this.unexpected(errorPos);
    }
  }

  return this.finishNode(node, "ImportExpression")
};

pp$3.parseImportMeta = function(node) {
  this.next(); // skip `.`

  var containsEsc = this.containsEsc;
  node.property = this.parseIdent(true);

  if (node.property.name !== "meta")
    { this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'"); }
  if (containsEsc)
    { this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters"); }
  if (this.options.sourceType !== "module")
    { this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module"); }

  return this.finishNode(node, "MetaProperty")
};

pp$3.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110) { node.bigint = node.raw.slice(0, -1).replace(/_/g, ""); }
  this.next();
  return this.finishNode(node, "Literal")
};

pp$3.parseParenExpression = function() {
  this.expect(types.parenL);
  var val = this.parseExpression();
  this.expect(types.parenR);
  return val
};

pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    // Do not save awaitIdentPos to allow checking awaits nested in parameters
    while (this.type !== types.parenR) {
      first ? first = false : this.expect(types.comma);
      if (allowTrailingComma && this.afterTrailingComma(types.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this.type === types.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
        break
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.start, innerEndLoc = this.startLoc;
    this.expect(types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$3.parseParenItem = function(item) {
  return item
};

pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty$1 = [];

pp$3.parseNew = function() {
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
    node.meta = meta;
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'"); }
    if (containsEsc)
      { this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters"); }
    if (!this.inNonArrowFunction)
      { this.raiseRecoverable(node.start, "'new.target' can only be used in functions"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types._import;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (isImport && node.callee.type === "ImportExpression") {
    this.raise(startPos, "Cannot use new with import()");
  }
  if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty$1; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$3.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value,
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$3.parseTemplate = function(ref) {
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types.eof) { this.raise(this.pos, "Unterminated template literal"); }
    this.expect(types.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

pp$3.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types.star)) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

// Parse an object literal or binding pattern.

pp$3.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types.braceR)) {
    if (!first) {
      this.expect(types.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types.braceR)) { break }
    } else { first = false; }

    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$3.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types.comma) {
        this.raise(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement")
    }
    // To disallow parenthesized identifier via `this.toAssignable()`.
    if (this.type === types.parenL && refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0) {
        refDestructuringErrors.parenthesizedAssign = this.start;
      }
      if (refDestructuringErrors.parenthesizedBind < 0) {
        refDestructuringErrors.parenthesizedBind = this.start;
      }
    }
    // Parse argument.
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    // To disallow trailing comma via `this.toAssignable()`.
    if (this.type === types.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    // Finish
    return this.finishNode(prop, "SpreadElement")
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern)
      { isGenerator = this.eat(types.star); }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
    this.parsePropertyName(prop, refDestructuringErrors);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property")
};

pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types.colon)
    { this.unexpected(); }

  if (this.eat(types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
  } else if (!isPattern && !containsEsc &&
             this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type !== types.comma && this.type !== types.braceR && this.type !== types.eq)) {
    if (isGenerator || isAsync) { this.unexpected(); }
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get")
        { this.raiseRecoverable(start, "getter should have no params"); }
      else
        { this.raiseRecoverable(start, "setter should have exactly one param"); }
    } else {
      if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
        { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
    }
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) { this.unexpected(); }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = startPos; }
    prop.kind = "init";
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else if (this.type === types.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else {
      prop.value = this.copyNode(prop.key);
    }
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$3.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
};

// Initialize empty function node.

pp$3.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
  if (this.options.ecmaVersion >= 8) { node.async = false; }
};

// Parse object or class method.

pp$3.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

  this.expect(types.parenL);
  node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$3.parseArrowExpression = function(node, params, isAsync) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$3.parseFunctionBody = function(node, isArrowFunction, isMethod) {
  var isExpression = isArrowFunction && this.type !== types.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words `eval`
      // or `arguments`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    if (this.strict && node.id) { this.checkLValSimple(node.id, BIND_OUTSIDE); }
    node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();
};

pp$3.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$3.checkParams = function(node, allowDuplicates) {
  var nameHash = {};
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this.type === types.comma)
      { elt = null; }
    else if (this.type === types.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this.start; }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

pp$3.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
  if (this.keywords.test(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\") !== -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
    if (!this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
    this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
  }
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$3.parseIdent = function(liberal, isBinding) {
  var node = this.startNode();
  if (this.type === types.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;

    // To fix https://github.com/acornjs/acorn/issues/575
    // `class` and `function` keywords push new context into this.context.
    // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
    // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
    if ((node.name === "class" || node.name === "function") &&
        (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
  } else {
    this.unexpected();
  }
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = node.start; }
  }
  return node
};

// Parses yield expression inside generator.

pp$3.parseYield = function(noIn) {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type === types.semi || this.canInsertSemicolon() || (this.type !== types.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types.star);
    node.argument = this.parseMaybeAssign(noIn);
  }
  return this.finishNode(node, "YieldExpression")
};

pp$3.parseAwait = function() {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$5 = Parser.prototype;

var Scope$1 = function Scope(flags) {
  this.flags = flags;
  // A list of var-declared names in the current lexical scope
  this.var = [];
  // A list of lexically-declared names in the current lexical scope
  this.lexical = [];
  // A list of lexically-declared FunctionDeclaration names in the current lexical scope
  this.functions = [];
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$5.enterScope = function(flags) {
  this.scopeStack.push(new Scope$1(flags));
};

pp$5.exitScope = function() {
  this.scopeStack.pop();
};

// The spec says:
// > At the top level of a function, or script, function declarations are
// > treated like var declarations rather than like lexical declarations.
pp$5.treatFunctionsAsVarInScope = function(scope) {
  return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
};

pp$5.declareName = function(name, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
    scope.lexical.push(name);
    if (this.inModule && (scope.flags & SCOPE_TOP))
      { delete this.undefinedExports[name]; }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar)
      { redeclared = scope$2.lexical.indexOf(name) > -1; }
    else
      { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
    scope$2.functions.push(name);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
          !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
        redeclared = true;
        break
      }
      scope$3.var.push(name);
      if (this.inModule && (scope$3.flags & SCOPE_TOP))
        { delete this.undefinedExports[name]; }
      if (scope$3.flags & SCOPE_VAR) { break }
    }
  }
  if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
};

pp$5.checkLocalExport = function(id) {
  // scope.functions must be empty as Module code is always strict.
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
      this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};

pp$5.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1]
};

pp$5.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR) { return scope }
  }
};

// Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
pp$5.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) { return scope }
  }
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$6 = Parser.prototype;

pp$6.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$6.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$6.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$6.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

pp$6.copyNode = function(node) {
  var newNode = new Node(this, node.start, this.startLoc);
  for (var prop in node) { newNode[prop] = node[prop]; }
  return newNode
};

// The algorithm used to determine whether a regexp can appear at a

var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types$1 = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$7 = Parser.prototype;

pp$7.initialContext = function() {
  return [types$1.b_stat]
};

pp$7.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types$1.f_expr || parent === types$1.f_stat)
    { return true }
  if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
    { return !parent.isExpr }

  // The check for `tt.name && exprAllowed` detects whether we are
  // after a `yield` or `of` construct. See the `updateContext` for
  // `tt.name`.
  if (prevType === types._return || prevType === types.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType === types.arrow)
    { return true }
  if (prevType === types.braceL)
    { return parent === types$1.b_stat }
  if (prevType === types._var || prevType === types._const || prevType === types.name)
    { return false }
  return !this.exprAllowed
};

pp$7.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$7.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType === types.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Token-specific context update code

types.parenR.updateContext = types.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types$1.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
  this.exprAllowed = true;
};

types.dollarBraceL.updateContext = function() {
  this.context.push(types$1.b_tmpl);
  this.exprAllowed = true;
};

types.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
  this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
  this.exprAllowed = true;
};

types.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types._function.updateContext = types._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types._else &&
      !(prevType === types.semi && this.curContext() !== types$1.p_stat) &&
      !(prevType === types._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
      !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
    { this.context.push(types$1.f_expr); }
  else
    { this.context.push(types$1.f_stat); }
  this.exprAllowed = false;
};

types.backQuote.updateContext = function() {
  if (this.curContext() === types$1.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types$1.q_tmpl); }
  this.exprAllowed = false;
};

types.star.updateContext = function(prevType) {
  if (prevType === types._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types$1.f_expr)
      { this.context[index] = types$1.f_expr_gen; }
    else
      { this.context[index] = types$1.f_gen; }
  }
  this.exprAllowed = true;
};

types.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types.dot) {
    if (this.value === "of" && !this.exprAllowed ||
        this.value === "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// This file contains Unicode properties extracted from the ECMAScript
// specification. The lists are extracted like so:
// $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

// #table-binary-unicode-properties
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties,
  12: ecma12BinaryProperties
};

// #table-unicode-general-category-values
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

// #table-unicode-script-values
var ecma9ScriptValues = "Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues,
  12: ecma12ScriptValues
};

var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;

  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}
buildUnicodeData(9);
buildUnicodeData(10);
buildUnicodeData(11);
buildUnicodeData(12);

var pp$8 = Parser.prototype;

var RegExpValidationState = function RegExpValidationState(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 12 ? 12 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = [];
  this.backReferenceNames = [];
};

RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
  var unicode = flags.indexOf("u") !== -1;
  this.start = start | 0;
  this.source = pattern + "";
  this.flags = flags;
  this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
  this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
};

RegExpValidationState.prototype.raise = function raise (message) {
  this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
};

// If u flag is given, this returns the code point at the index (it combines a surrogate pair).
// Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
RegExpValidationState.prototype.at = function at (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1
  }
  var c = s.charCodeAt(i);
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
    return c
  }
  var next = s.charCodeAt(i + 1);
  return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
};

RegExpValidationState.prototype.nextIndex = function nextIndex (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l
  }
  var c = s.charCodeAt(i), next;
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
      (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
    return i + 1
  }
  return i + 2
};

RegExpValidationState.prototype.current = function current (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.pos, forceU)
};

RegExpValidationState.prototype.lookahead = function lookahead (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.nextIndex(this.pos, forceU), forceU)
};

RegExpValidationState.prototype.advance = function advance (forceU) {
    if ( forceU === void 0 ) forceU = false;

  this.pos = this.nextIndex(this.pos, forceU);
};

RegExpValidationState.prototype.eat = function eat (ch, forceU) {
    if ( forceU === void 0 ) forceU = false;

  if (this.current(forceU) === ch) {
    this.advance(forceU);
    return true
  }
  return false
};

function codePointToString(ch) {
  if (ch <= 0xFFFF) { return String.fromCharCode(ch) }
  ch -= 0x10000;
  return String.fromCharCode((ch >> 10) + 0xD800, (ch & 0x03FF) + 0xDC00)
}

/**
 * Validate the flags part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$8.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;

  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
  }
};

/**
 * Validate the pattern part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$8.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);

  // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
  // parsing contains a |GroupName|, reparse with the goal symbol
  // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
  // exception if _P_ did not conform to the grammar, if any elements of _P_
  // were not matched by the parse, or if any Early Error conditions exist.
  if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
pp$8.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames.length = 0;
  state.backReferenceNames.length = 0;

  this.regexp_disjunction(state);

  if (state.pos !== state.source.length) {
    // Make the same messages as V8.
    if (state.eat(0x29 /* ) */)) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
    var name = list[i];

    if (state.groupNames.indexOf(name) === -1) {
      state.raise("Invalid named capture referenced");
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
pp$8.regexp_disjunction = function(state) {
  this.regexp_alternative(state);
  while (state.eat(0x7C /* | */)) {
    this.regexp_alternative(state);
  }

  // Make the same message as V8.
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(0x7B /* { */)) {
    state.raise("Lone quantifier brackets");
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
pp$8.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state))
    { }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
pp$8.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    // Handle `QuantifiableAssertion Quantifier` alternative.
    // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
    // is a QuantifiableAssertion.
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      // Make the same message as V8.
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true
  }

  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
pp$8.regexp_eatAssertion = function(state) {
  var start = state.pos;
  state.lastAssertionIsQuantifiable = false;

  // ^, $
  if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
    return true
  }

  // \b \B
  if (state.eat(0x5C /* \ */)) {
    if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
      return true
    }
    state.pos = start;
  }

  // Lookahead / Lookbehind
  if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(0x3C /* < */);
    }
    if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
      this.regexp_disjunction(state);
      if (!state.eat(0x29 /* ) */)) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true
    }
  }

  state.pos = start;
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
pp$8.regexp_eatQuantifier = function(state, noError) {
  if ( noError === void 0 ) noError = false;

  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(0x3F /* ? */);
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
pp$8.regexp_eatQuantifierPrefix = function(state, noError) {
  return (
    state.eat(0x2A /* * */) ||
    state.eat(0x2B /* + */) ||
    state.eat(0x3F /* ? */) ||
    this.regexp_eatBracedQuantifier(state, noError)
  )
};
pp$8.regexp_eatBracedQuantifier = function(state, noError) {
  var start = state.pos;
  if (state.eat(0x7B /* { */)) {
    var min = 0, max = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min = state.lastIntValue;
      if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
        max = state.lastIntValue;
      }
      if (state.eat(0x7D /* } */)) {
        // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
        if (max !== -1 && max < min && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
pp$8.regexp_eatAtom = function(state) {
  return (
    this.regexp_eatPatternCharacters(state) ||
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state)
  )
};
pp$8.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start = state.pos;
  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatAtomEscape(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatUncapturingGroup = function(state) {
  var start = state.pos;
  if (state.eat(0x28 /* ( */)) {
    if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        return true
      }
      state.raise("Unterminated group");
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatCapturingGroup = function(state) {
  if (state.eat(0x28 /* ( */)) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 0x3F /* ? */) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(0x29 /* ) */)) {
      state.numCapturingParens += 1;
      return true
    }
    state.raise("Unterminated group");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
pp$8.regexp_eatExtendedAtom = function(state) {
  return (
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state) ||
    this.regexp_eatInvalidBracedQuantifier(state) ||
    this.regexp_eatExtendedPatternCharacter(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
pp$8.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
pp$8.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }
  return false
};
function isSyntaxCharacter(ch) {
  return (
    ch === 0x24 /* $ */ ||
    ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
    ch === 0x2E /* . */ ||
    ch === 0x3F /* ? */ ||
    ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
    ch >= 0x7B /* { */ && ch <= 0x7D /* } */
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
// But eat eager.
pp$8.regexp_eatPatternCharacters = function(state) {
  var start = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
pp$8.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (
    ch !== -1 &&
    ch !== 0x24 /* $ */ &&
    !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
    ch !== 0x2E /* . */ &&
    ch !== 0x3F /* ? */ &&
    ch !== 0x5B /* [ */ &&
    ch !== 0x5E /* ^ */ &&
    ch !== 0x7C /* | */
  ) {
    state.advance();
    return true
  }
  return false
};

// GroupSpecifier ::
//   [empty]
//   `?` GroupName
pp$8.regexp_groupSpecifier = function(state) {
  if (state.eat(0x3F /* ? */)) {
    if (this.regexp_eatGroupName(state)) {
      if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
        state.raise("Duplicate capture group name");
      }
      state.groupNames.push(state.lastStringValue);
      return
    }
    state.raise("Invalid group");
  }
};

// GroupName ::
//   `<` RegExpIdentifierName `>`
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$8.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(0x3C /* < */)) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
      return true
    }
    state.raise("Invalid capture group name");
  }
  return false
};

// RegExpIdentifierName ::
//   RegExpIdentifierStart
//   RegExpIdentifierName RegExpIdentifierPart
// Note: this updates `state.lastStringValue` property with the eaten name.
pp$8.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true
  }
  return false
};

// RegExpIdentifierStart ::
//   UnicodeIDStart
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[+U]
pp$8.regexp_eatRegExpIdentifierStart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
}

// RegExpIdentifierPart ::
//   UnicodeIDContinue
//   `$`
//   `_`
//   `\` RegExpUnicodeEscapeSequence[+U]
//   <ZWNJ>
//   <ZWJ>
pp$8.regexp_eatRegExpIdentifierPart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
pp$8.regexp_eatAtomEscape = function(state) {
  if (
    this.regexp_eatBackReference(state) ||
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state) ||
    (state.switchN && this.regexp_eatKGroupName(state))
  ) {
    return true
  }
  if (state.switchU) {
    // Make the same message as V8.
    if (state.current() === 0x63 /* c */) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false
};
pp$8.regexp_eatBackReference = function(state) {
  var start = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true
    }
    if (n <= state.numCapturingParens) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatKGroupName = function(state) {
  if (state.eat(0x6B /* k */)) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true
    }
    state.raise("Invalid named reference");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
pp$8.regexp_eatCharacterEscape = function(state) {
  return (
    this.regexp_eatControlEscape(state) ||
    this.regexp_eatCControlLetter(state) ||
    this.regexp_eatZero(state) ||
    this.regexp_eatHexEscapeSequence(state) ||
    this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
    (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
    this.regexp_eatIdentityEscape(state)
  )
};
pp$8.regexp_eatCControlLetter = function(state) {
  var start = state.pos;
  if (state.eat(0x63 /* c */)) {
    if (this.regexp_eatControlLetter(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$8.regexp_eatZero = function(state) {
  if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
pp$8.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 0x74 /* t */) {
    state.lastIntValue = 0x09; /* \t */
    state.advance();
    return true
  }
  if (ch === 0x6E /* n */) {
    state.lastIntValue = 0x0A; /* \n */
    state.advance();
    return true
  }
  if (ch === 0x76 /* v */) {
    state.lastIntValue = 0x0B; /* \v */
    state.advance();
    return true
  }
  if (ch === 0x66 /* f */) {
    state.lastIntValue = 0x0C; /* \f */
    state.advance();
    return true
  }
  if (ch === 0x72 /* r */) {
    state.lastIntValue = 0x0D; /* \r */
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
pp$8.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};
function isControlLetter(ch) {
  return (
    (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
    (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
pp$8.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
  if ( forceU === void 0 ) forceU = false;

  var start = state.pos;
  var switchU = forceU || state.switchU;

  if (state.eat(0x75 /* u */)) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 0xDC00 && trail <= 0xDFFF) {
            state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
            return true
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true
    }
    if (
      switchU &&
      state.eat(0x7B /* { */) &&
      this.regexp_eatHexDigits(state) &&
      state.eat(0x7D /* } */) &&
      isValidUnicode(state.lastIntValue)
    ) {
      return true
    }
    if (switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start;
  }

  return false
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 0x10FFFF
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
pp$8.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true
    }
    if (state.eat(0x2F /* / */)) {
      state.lastIntValue = 0x2F; /* / */
      return true
    }
    return false
  }

  var ch = state.current();
  if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
pp$8.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
pp$8.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();

  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return true
  }

  if (
    state.switchU &&
    this.options.ecmaVersion >= 9 &&
    (ch === 0x50 /* P */ || ch === 0x70 /* p */)
  ) {
    state.lastIntValue = -1;
    state.advance();
    if (
      state.eat(0x7B /* { */) &&
      this.regexp_eatUnicodePropertyValueExpression(state) &&
      state.eat(0x7D /* } */)
    ) {
      return true
    }
    state.raise("Invalid property name");
  }

  return false
};
function isCharacterClassEscape(ch) {
  return (
    ch === 0x64 /* d */ ||
    ch === 0x44 /* D */ ||
    ch === 0x73 /* s */ ||
    ch === 0x53 /* S */ ||
    ch === 0x77 /* w */ ||
    ch === 0x57 /* W */
  )
}

// UnicodePropertyValueExpression ::
//   UnicodePropertyName `=` UnicodePropertyValue
//   LoneUnicodePropertyNameOrValue
pp$8.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start = state.pos;

  // UnicodePropertyName `=` UnicodePropertyValue
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
    var name = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
      return true
    }
  }
  state.pos = start;

  // LoneUnicodePropertyNameOrValue
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
    return true
  }
  return false
};
pp$8.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
  if (!has(state.unicodeProperties.nonBinary, name))
    { state.raise("Invalid property name"); }
  if (!state.unicodeProperties.nonBinary[name].test(value))
    { state.raise("Invalid property value"); }
};
pp$8.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (!state.unicodeProperties.binary.test(nameOrValue))
    { state.raise("Invalid property name"); }
};

// UnicodePropertyName ::
//   UnicodePropertyNameCharacters
pp$8.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 0x5F /* _ */
}

// UnicodePropertyValue ::
//   UnicodePropertyValueCharacters
pp$8.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
}

// LoneUnicodePropertyNameOrValue ::
//   UnicodePropertyValueCharacters
pp$8.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state)
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
pp$8.regexp_eatCharacterClass = function(state) {
  if (state.eat(0x5B /* [ */)) {
    state.eat(0x5E /* ^ */);
    this.regexp_classRanges(state);
    if (state.eat(0x5D /* ] */)) {
      return true
    }
    // Unreachable since it threw "unterminated regular expression" error before.
    state.raise("Unterminated character class");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
pp$8.regexp_classRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
pp$8.regexp_eatClassAtom = function(state) {
  var start = state.pos;

  if (state.eat(0x5C /* \ */)) {
    if (this.regexp_eatClassEscape(state)) {
      return true
    }
    if (state.switchU) {
      // Make the same message as V8.
      var ch$1 = state.current();
      if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start;
  }

  var ch = state.current();
  if (ch !== 0x5D /* ] */) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
pp$8.regexp_eatClassEscape = function(state) {
  var start = state.pos;

  if (state.eat(0x62 /* b */)) {
    state.lastIntValue = 0x08; /* <BS> */
    return true
  }

  if (state.switchU && state.eat(0x2D /* - */)) {
    state.lastIntValue = 0x2D; /* - */
    return true
  }

  if (!state.switchU && state.eat(0x63 /* c */)) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true
    }
    state.pos = start;
  }

  return (
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
pp$8.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$8.regexp_eatHexEscapeSequence = function(state) {
  var start = state.pos;
  if (state.eat(0x78 /* x */)) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
pp$8.regexp_eatDecimalDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
    state.advance();
  }
  return state.pos !== start
};
function isDecimalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
pp$8.regexp_eatHexDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start
};
function isHexDigit(ch) {
  return (
    (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
    (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
    (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
  )
}
function hexToInt(ch) {
  if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
    return 10 + (ch - 0x41 /* A */)
  }
  if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
    return 10 + (ch - 0x61 /* a */)
  }
  return ch - 0x30 /* 0 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
// Allows only 0-377(octal) i.e. 0-255(decimal).
pp$8.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
pp$8.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 0x30; /* 0 */
    state.advance();
    return true
  }
  state.lastIntValue = 0;
  return false
};
function isOctalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
// And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$8.regexp_eatFixedHexDigits = function(state, length) {
  var start = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start;
      return false
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp$9 = Parser.prototype;

// Move to the next token

pp$9.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
    { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp$9.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp$9[Symbol.iterator] = function() {
    var this$1 = this;

    return {
      next: function () {
        var token = this$1.getToken();
        return {
          done: token.type === types.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp$9.curContext = function() {
  return this.context[this.context.length - 1]
};

// Read a single token, updating the parser object's token-related
// properties.

pp$9.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp$9.readToken = function(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp$9.fullCharCodeAtPos = function() {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) { return code }
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00
};

pp$9.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    lineBreakG.lastIndex = start;
    var match;
    while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this.curLine;
      this.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp$9.skipLineComment = function(startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp$9.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this.pos;
      break
    case 13:
      if (this.input.charCodeAt(this.pos + 1) === 10) {
        ++this.pos;
      }
    case 10: case 8232: case 8233:
      ++this.pos;
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      break
    case 47: // '/'
      switch (this.input.charCodeAt(this.pos + 1)) {
      case 42: // '*'
        this.skipBlockComment();
        break
      case 47:
        this.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp$9.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp$9.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types.dot)
  }
};

pp$9.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.slash, 1)
};

pp$9.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types.star : types.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp$9.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (this.options.ecmaVersion >= 12) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 === 61) { return this.finishOp(types.assign, 3) }
    }
    return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
};

pp$9.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.bitwiseXOR, 1)
};

pp$9.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types.assign, 2) }
  return this.finishOp(types.plusMin, 1)
};

pp$9.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
    return this.finishOp(types.bitShift, size)
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
      this.input.charCodeAt(this.pos + 3) === 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types.relational, size)
};

pp$9.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types.arrow)
  }
  return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
};

pp$9.readToken_question = function() { // '?'
  var ecmaVersion = this.options.ecmaVersion;
  if (ecmaVersion >= 11) {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 46) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 < 48 || next2 > 57) { return this.finishOp(types.questionDot, 2) }
    }
    if (next === 63) {
      if (ecmaVersion >= 12) {
        var next2$1 = this.input.charCodeAt(this.pos + 2);
        if (next2$1 === 61) { return this.finishOp(types.assign, 3) }
      }
      return this.finishOp(types.coalesce, 2)
    }
  }
  return this.finishOp(types.question, 1)
};

pp$9.getTokenFromCode = function(code) {
  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

  // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types.parenL)
  case 41: ++this.pos; return this.finishToken(types.parenR)
  case 59: ++this.pos; return this.finishToken(types.semi)
  case 44: ++this.pos; return this.finishToken(types.comma)
  case 91: ++this.pos; return this.finishToken(types.bracketL)
  case 93: ++this.pos; return this.finishToken(types.bracketR)
  case 123: ++this.pos; return this.finishToken(types.braceL)
  case 125: ++this.pos; return this.finishToken(types.braceR)
  case 58: ++this.pos; return this.finishToken(types.colon)

  case 96: // '`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }

  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. `finishOp` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.

  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 63: // '?'
    return this.readToken_question()

  case 126: // '~'
    return this.finishOp(types.prefix, 1)
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString$1(code) + "'");
};

pp$9.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

pp$9.readRegexp = function() {
  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\";
    } else { escaped = false; }
    ++this.pos;
  }
  var pattern = this.input.slice(start, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) { this.unexpected(flagsStart); }

  // Validate pattern
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);

  // Create Literal#value property value.
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
    // ESTree requires null if it failed to instantiate RegExp object.
    // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
  }

  return this.finishToken(types.regexp, {pattern: pattern, flags: flags, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp$9.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
  // `len` is used for character escape sequences. In that case, disallow separators.
  var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

  // `maybeLegacyOctalNumericLiteral` is true if it doesn't have prefix (0x,0o,0b)
  // and isn't fraction part nor exponent part. In that case, if the first digit
  // is zero then disallow separators.
  var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

  var start = this.pos, total = 0, lastCode = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
    var code = this.input.charCodeAt(this.pos), val = (void 0);

    if (allowSeparators && code === 95) {
      if (isLegacyOctalNumericLiteral) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"); }
      if (lastCode === 95) { this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"); }
      if (i === 0) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"); }
      lastCode = code;
      continue
    }

    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    lastCode = code;
    total = total * radix + val;
  }

  if (allowSeparators && lastCode === 95) { this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"); }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

function stringToNumber(str, isLegacyOctalNumericLiteral) {
  if (isLegacyOctalNumericLiteral) {
    return parseInt(str, 8)
  }

  // `parseFloat(value)` stops parsing at the first numeric separator then returns a wrong value.
  return parseFloat(str.replace(/_/g, ""))
}

function stringToBigInt(str) {
  if (typeof BigInt !== "function") {
    return null
  }

  // `BigInt(value)` throws syntax error if the string contains numeric separators.
  return BigInt(str.replace(/_/g, ""))
}

pp$9.readRadixNumber = function(radix) {
  var start = this.pos;
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp$9.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10, undefined, true) === null) { this.raise(start, "Invalid number"); }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) { this.raise(start, "Invalid number"); }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var val$1 = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
    return this.finishToken(types.num, val$1)
  }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var val = stringToNumber(this.input.slice(start, this.pos), octal);
  return this.finishToken(types.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp$9.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

function codePointToString$1(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

pp$9.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else {
      if (isNewLine(ch, this.options.ecmaVersion >= 10)) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp$9.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp$9.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp$9.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '`', '${'
      if (this.pos === this.start && (this.type === types.template || this.type === types.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types.dollarBraceL)
        } else {
          ++this.pos;
          return this.finishToken(types.backQuote)
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types.template, out)
    }
    if (ch === 92) { // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
      case 13:
        if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
      case 10:
        out += "\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp$9.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
    case "\\":
      ++this.pos;
      break

    case "$":
      if (this.input[this.pos + 1] !== "{") {
        break
      }
    // falls through

    case "`":
      return this.finishToken(types.invalidTemplate, this.input.slice(this.start, this.pos))

    // no default
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp$9.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\n" // 'n' -> '\n'
  case 114: return "\r" // 'r' -> '\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString$1(this.readCodePoint()) // 'u'
  case 116: return "\t" // 't' -> '\t'
  case 98: return "\b" // 'b' -> '\b'
  case 118: return "\u000b" // 'v' -> '\u000b'
  case 102: return "\f" // 'f' -> '\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
  case 10: // ' \n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  case 56:
  case 57:
    if (this.strict) {
      this.invalidStringToken(
        this.pos - 1,
        "Invalid escape sequence"
      );
    }
    if (inTemplate) {
      var codePos = this.pos - 1;

      this.invalidStringToken(
        codePos,
        "Invalid escape sequence in template string"
      );

      return null
    }
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      this.pos += octalStr.length - 1;
      ch = this.input.charCodeAt(this.pos);
      if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
        this.invalidStringToken(
          this.pos - 1 - octalStr.length,
          inTemplate
            ? "Octal literal in template string"
            : "Octal literal in strict mode"
        );
      }
      return String.fromCharCode(octal)
    }
    if (isNewLine(ch)) {
      // Unicode new line characters after \ get removed from output in both
      // template literals and strings
      return ""
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp$9.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp$9.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\"
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) // "u"
        { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"); }
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString$1(esc);
      chunkStart = this.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp$9.readWord = function() {
  var word = this.readWord1();
  var type = types.name;
  if (this.keywords.test(word)) {
    type = keywords$1[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.

var version$1 = "8.0.4";

Parser.acorn = {
  Parser: Parser,
  version: version$1,
  defaultOptions: defaultOptions,
  Position: Position,
  SourceLocation: SourceLocation,
  getLineInfo: getLineInfo,
  Node: Node,
  TokenType: TokenType,
  tokTypes: types,
  keywordTypes: keywords$1,
  TokContext: TokContext,
  tokContexts: types$1,
  isIdentifierChar: isIdentifierChar,
  isIdentifierStart: isIdentifierStart,
  Token: Token,
  isNewLine: isNewLine,
  lineBreak: lineBreak,
  lineBreakG: lineBreakG,
  nonASCIIwhitespace: nonASCIIwhitespace
};

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return Parser.parse(input, options)
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  return Parser.parseExpressionAt(input, pos, options)
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return Parser.tokenizer(input, options)
}

var acorn = {
  __proto__: null,
  Node: Node,
  Parser: Parser,
  Position: Position,
  SourceLocation: SourceLocation,
  TokContext: TokContext,
  Token: Token,
  TokenType: TokenType,
  defaultOptions: defaultOptions,
  getLineInfo: getLineInfo,
  isIdentifierChar: isIdentifierChar,
  isIdentifierStart: isIdentifierStart,
  isNewLine: isNewLine,
  keywordTypes: keywords$1,
  lineBreak: lineBreak,
  lineBreakG: lineBreakG,
  nonASCIIwhitespace: nonASCIIwhitespace,
  parse: parse,
  parseExpressionAt: parseExpressionAt,
  tokContexts: types$1,
  tokTypes: types,
  tokenizer: tokenizer,
  version: version$1
};

class GlobalScope extends Scope {
    constructor() {
        super();
        this.variables.set('undefined', new UndefinedVariable());
    }
    findVariable(name) {
        let variable = this.variables.get(name);
        if (!variable) {
            variable = new GlobalVariable(name);
            this.variables.set(name, variable);
        }
        return variable;
    }
}

const readFile = (file) => new Promise((fulfil, reject) => readFile$1(file, 'utf-8', (err, contents) => (err ? reject(err) : fulfil(contents))));
function mkdirpath(path) {
    const dir = dirname(path);
    try {
        readdirSync(dir);
    }
    catch (err) {
        mkdirpath(dir);
        try {
            mkdirSync(dir);
        }
        catch (err2) {
            if (err2.code !== 'EEXIST') {
                throw err2;
            }
        }
    }
}
function writeFile(dest, data) {
    return new Promise((fulfil, reject) => {
        mkdirpath(dest);
        writeFile$1(dest, data, err => {
            if (err) {
                reject(err);
            }
            else {
                fulfil();
            }
        });
    });
}

async function resolveId(source, importer, preserveSymlinks, pluginDriver, skip, customOptions) {
    const pluginResult = await pluginDriver.hookFirst('resolveId', [source, importer, { custom: customOptions }], null, skip);
    if (pluginResult != null)
        return pluginResult;
    // external modules (non-entry modules that start with neither '.' or '/')
    // are skipped at this stage.
    if (importer !== undefined && !isAbsolute(source) && source[0] !== '.')
        return null;
    // `resolve` processes paths from right to left, prepending them until an
    // absolute path is created. Absolute importees therefore shortcircuit the
    // resolve call and require no special handing on our part.
    // See https://nodejs.org/api/path.html#path_path_resolve_paths
    return addJsExtensionIfNecessary(resolve(importer ? dirname(importer) : resolve(), source), preserveSymlinks);
}
function addJsExtensionIfNecessary(file, preserveSymlinks) {
    let found = findFile(file, preserveSymlinks);
    if (found)
        return found;
    found = findFile(file + '.mjs', preserveSymlinks);
    if (found)
        return found;
    found = findFile(file + '.js', preserveSymlinks);
    return found;
}
function findFile(file, preserveSymlinks) {
    try {
        const stats = lstatSync(file);
        if (!preserveSymlinks && stats.isSymbolicLink())
            return findFile(realpathSync(file), preserveSymlinks);
        if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
            // check case
            const name = basename(file);
            const files = readdirSync(dirname(file));
            if (files.indexOf(name) !== -1)
                return file;
        }
    }
    catch (_a) {
        // suppress
    }
}

const ANONYMOUS_PLUGIN_PREFIX = 'at position ';
const ANONYMOUS_OUTPUT_PLUGIN_PREFIX = 'at output position ';
function throwPluginError(err, plugin, { hook, id } = {}) {
    if (typeof err === 'string')
        err = { message: err };
    if (err.code && err.code !== Errors.PLUGIN_ERROR) {
        err.pluginCode = err.code;
    }
    err.code = Errors.PLUGIN_ERROR;
    err.plugin = plugin;
    if (hook) {
        err.hook = hook;
    }
    if (id) {
        err.id = id;
    }
    return error(err);
}
const deprecatedHooks = [
    { active: true, deprecated: 'resolveAssetUrl', replacement: 'resolveFileUrl' }
];
function warnDeprecatedHooks(plugins, options) {
    for (const { active, deprecated, replacement } of deprecatedHooks) {
        for (const plugin of plugins) {
            if (deprecated in plugin) {
                warnDeprecation({
                    message: `The "${deprecated}" hook used by plugin ${plugin.name} is deprecated. The "${replacement}" hook should be used instead.`,
                    plugin: plugin.name
                }, active, options);
            }
        }
    }
}

function createPluginCache(cache) {
    return {
        has(id) {
            const item = cache[id];
            if (!item)
                return false;
            item[0] = 0;
            return true;
        },
        get(id) {
            const item = cache[id];
            if (!item)
                return undefined;
            item[0] = 0;
            return item[1];
        },
        set(id, value) {
            cache[id] = [0, value];
        },
        delete(id) {
            return delete cache[id];
        }
    };
}
function getTrackedPluginCache(pluginCache, onUse) {
    return {
        has(id) {
            onUse();
            return pluginCache.has(id);
        },
        get(id) {
            onUse();
            return pluginCache.get(id);
        },
        set(id, value) {
            onUse();
            return pluginCache.set(id, value);
        },
        delete(id) {
            onUse();
            return pluginCache.delete(id);
        }
    };
}
const NO_CACHE = {
    has() {
        return false;
    },
    get() {
        return undefined;
    },
    set() { },
    delete() {
        return false;
    }
};
function uncacheablePluginError(pluginName) {
    if (pluginName.startsWith(ANONYMOUS_PLUGIN_PREFIX) ||
        pluginName.startsWith(ANONYMOUS_OUTPUT_PLUGIN_PREFIX)) {
        return error({
            code: 'ANONYMOUS_PLUGIN_CACHE',
            message: 'A plugin is trying to use the Rollup cache but is not declaring a plugin name or cacheKey.'
        });
    }
    return error({
        code: 'DUPLICATE_PLUGIN_NAME',
        message: `The plugin name ${pluginName} is being used twice in the same build. Plugin names must be distinct or provide a cacheKey (please post an issue to the plugin if you are a plugin user).`
    });
}
function getCacheForUncacheablePlugin(pluginName) {
    return {
        has() {
            return uncacheablePluginError(pluginName);
        },
        get() {
            return uncacheablePluginError(pluginName);
        },
        set() {
            return uncacheablePluginError(pluginName);
        },
        delete() {
            return uncacheablePluginError(pluginName);
        }
    };
}

function transform(source, module, pluginDriver, warn) {
    const id = module.id;
    const sourcemapChain = [];
    let originalSourcemap = source.map === null ? null : decodedSourcemap(source.map);
    const originalCode = source.code;
    let ast = source.ast;
    const transformDependencies = [];
    const emittedFiles = [];
    let customTransformCache = false;
    const useCustomTransformCache = () => (customTransformCache = true);
    let curPlugin;
    const curSource = source.code;
    function transformReducer(previousCode, result, plugin) {
        let code;
        let map;
        if (typeof result === 'string') {
            code = result;
        }
        else if (result && typeof result === 'object') {
            module.updateOptions(result);
            if (result.code == null) {
                if (result.map || result.ast) {
                    warn(errNoTransformMapOrAstWithoutCode(plugin.name));
                }
                return previousCode;
            }
            ({ code, map, ast } = result);
        }
        else {
            return previousCode;
        }
        // strict null check allows 'null' maps to not be pushed to the chain,
        // while 'undefined' gets the missing map warning
        if (map !== null) {
            sourcemapChain.push(decodedSourcemap(typeof map === 'string' ? JSON.parse(map) : map) || {
                missing: true,
                plugin: plugin.name
            });
        }
        return code;
    }
    return pluginDriver
        .hookReduceArg0('transform', [curSource, id], transformReducer, (pluginContext, plugin) => {
        curPlugin = plugin;
        return {
            ...pluginContext,
            cache: customTransformCache
                ? pluginContext.cache
                : getTrackedPluginCache(pluginContext.cache, useCustomTransformCache),
            warn(warning, pos) {
                if (typeof warning === 'string')
                    warning = { message: warning };
                if (pos)
                    augmentCodeLocation(warning, pos, curSource, id);
                warning.id = id;
                warning.hook = 'transform';
                pluginContext.warn(warning);
            },
            error(err, pos) {
                if (typeof err === 'string')
                    err = { message: err };
                if (pos)
                    augmentCodeLocation(err, pos, curSource, id);
                err.id = id;
                err.hook = 'transform';
                return pluginContext.error(err);
            },
            emitAsset(name, source) {
                emittedFiles.push({ type: 'asset', name, source });
                return pluginContext.emitAsset(name, source);
            },
            emitChunk(id, options) {
                emittedFiles.push({ type: 'chunk', id, name: options && options.name });
                return pluginContext.emitChunk(id, options);
            },
            emitFile(emittedFile) {
                emittedFiles.push(emittedFile);
                return pluginDriver.emitFile(emittedFile);
            },
            addWatchFile(id) {
                transformDependencies.push(id);
                pluginContext.addWatchFile(id);
            },
            setAssetSource() {
                return this.error({
                    code: 'INVALID_SETASSETSOURCE',
                    message: `setAssetSource cannot be called in transform for caching reasons. Use emitFile with a source, or call setAssetSource in another hook.`
                });
            },
            getCombinedSourcemap() {
                const combinedMap = collapseSourcemap(id, originalCode, originalSourcemap, sourcemapChain, warn);
                if (!combinedMap) {
                    const magicString = new MagicString(originalCode);
                    return magicString.generateMap({ includeContent: true, hires: true, source: id });
                }
                if (originalSourcemap !== combinedMap) {
                    originalSourcemap = combinedMap;
                    sourcemapChain.length = 0;
                }
                return new SourceMap({
                    ...combinedMap,
                    file: null,
                    sourcesContent: combinedMap.sourcesContent
                });
            }
        };
    })
        .catch(err => throwPluginError(err, curPlugin.name, { hook: 'transform', id }))
        .then(code => {
        if (!customTransformCache) {
            // files emitted by a transform hook need to be emitted again if the hook is skipped
            if (emittedFiles.length)
                module.transformFiles = emittedFiles;
        }
        return {
            ast,
            code,
            customTransformCache,
            meta: module.info.meta,
            originalCode,
            originalSourcemap,
            sourcemapChain,
            transformDependencies
        };
    });
}

class ModuleLoader {
    constructor(graph, modulesById, options, pluginDriver) {
        this.graph = graph;
        this.modulesById = modulesById;
        this.options = options;
        this.pluginDriver = pluginDriver;
        this.implicitEntryModules = new Set();
        this.indexedEntryModules = [];
        this.latestLoadModulesPromise = Promise.resolve();
        this.nextEntryModuleIndex = 0;
        this.hasModuleSideEffects = options.treeshake
            ? options.treeshake.moduleSideEffects
            : () => true;
    }
    async addAdditionalModules(unresolvedModules) {
        const result = this.extendLoadModulesPromise(Promise.all(unresolvedModules.map(id => this.loadEntryModule(id, false, undefined, null))));
        await this.awaitLoadModulesPromise();
        return result;
    }
    async addEntryModules(unresolvedEntryModules, isUserDefined) {
        const firstEntryModuleIndex = this.nextEntryModuleIndex;
        this.nextEntryModuleIndex += unresolvedEntryModules.length;
        const newEntryModules = await this.extendLoadModulesPromise(Promise.all(unresolvedEntryModules.map(({ id, importer }) => this.loadEntryModule(id, true, importer, null))).then(entryModules => {
            let moduleIndex = firstEntryModuleIndex;
            for (let index = 0; index < entryModules.length; index++) {
                const entryModule = entryModules[index];
                entryModule.isUserDefinedEntryPoint =
                    entryModule.isUserDefinedEntryPoint || isUserDefined;
                addChunkNamesToModule(entryModule, unresolvedEntryModules[index], isUserDefined);
                const existingIndexedModule = this.indexedEntryModules.find(indexedModule => indexedModule.module === entryModule);
                if (!existingIndexedModule) {
                    this.indexedEntryModules.push({ module: entryModule, index: moduleIndex });
                }
                else {
                    existingIndexedModule.index = Math.min(existingIndexedModule.index, moduleIndex);
                }
                moduleIndex++;
            }
            this.indexedEntryModules.sort(({ index: indexA }, { index: indexB }) => indexA > indexB ? 1 : -1);
            return entryModules;
        }));
        await this.awaitLoadModulesPromise();
        return {
            entryModules: this.indexedEntryModules.map(({ module }) => module),
            implicitEntryModules: [...this.implicitEntryModules],
            newEntryModules
        };
    }
    async emitChunk({ fileName, id, importer, name, implicitlyLoadedAfterOneOf, preserveSignature }) {
        const unresolvedModule = {
            fileName: fileName || null,
            id,
            importer,
            name: name || null
        };
        const module = implicitlyLoadedAfterOneOf
            ? await this.addEntryWithImplicitDependants(unresolvedModule, implicitlyLoadedAfterOneOf)
            : (await this.addEntryModules([unresolvedModule], false)).newEntryModules[0];
        if (preserveSignature != null) {
            module.preserveSignature = preserveSignature;
        }
        return module;
    }
    async resolveId(source, importer, customOptions, skip = null) {
        return this.addDefaultsToResolvedId(this.getNormalizedResolvedIdWithoutDefaults(this.options.external(source, importer, false)
            ? false
            : await resolveId(source, importer, this.options.preserveSymlinks, this.pluginDriver, skip, customOptions), importer, source));
    }
    addDefaultsToResolvedId(resolvedId) {
        var _a, _b;
        if (!resolvedId) {
            return null;
        }
        const external = resolvedId.external || false;
        return {
            external,
            id: resolvedId.id,
            meta: resolvedId.meta || EMPTY_OBJECT,
            moduleSideEffects: (_a = resolvedId.moduleSideEffects) !== null && _a !== void 0 ? _a : this.hasModuleSideEffects(resolvedId.id, external),
            syntheticNamedExports: (_b = resolvedId.syntheticNamedExports) !== null && _b !== void 0 ? _b : false
        };
    }
    addEntryWithImplicitDependants(unresolvedModule, implicitlyLoadedAfter) {
        return this.extendLoadModulesPromise(this.loadEntryModule(unresolvedModule.id, false, unresolvedModule.importer, null).then(async (entryModule) => {
            addChunkNamesToModule(entryModule, unresolvedModule, false);
            if (!entryModule.info.isEntry) {
                this.implicitEntryModules.add(entryModule);
                const implicitlyLoadedAfterModules = await Promise.all(implicitlyLoadedAfter.map(id => this.loadEntryModule(id, false, unresolvedModule.importer, entryModule.id)));
                for (const module of implicitlyLoadedAfterModules) {
                    entryModule.implicitlyLoadedAfter.add(module);
                }
                for (const dependant of entryModule.implicitlyLoadedAfter) {
                    dependant.implicitlyLoadedBefore.add(entryModule);
                }
            }
            return entryModule;
        }));
    }
    async addModuleSource(id, importer, module) {
        var _a;
        timeStart('load modules', 3);
        let source;
        try {
            source = (_a = (await this.pluginDriver.hookFirst('load', [id]))) !== null && _a !== void 0 ? _a : (await readFile(id));
        }
        catch (err) {
            timeEnd('load modules', 3);
            let msg = `Could not load ${id}`;
            if (importer)
                msg += ` (imported by ${relativeId(importer)})`;
            msg += `: ${err.message}`;
            err.message = msg;
            throw err;
        }
        timeEnd('load modules', 3);
        const sourceDescription = typeof source === 'string'
            ? { code: source }
            : typeof source === 'object' && typeof source.code === 'string'
                ? source
                : error(errBadLoader(id));
        const cachedModule = this.graph.cachedModules.get(id);
        if (cachedModule &&
            !cachedModule.customTransformCache &&
            cachedModule.originalCode === sourceDescription.code) {
            if (cachedModule.transformFiles) {
                for (const emittedFile of cachedModule.transformFiles)
                    this.pluginDriver.emitFile(emittedFile);
            }
            module.setSource(cachedModule);
        }
        else {
            module.updateOptions(sourceDescription);
            module.setSource(await transform(sourceDescription, module, this.pluginDriver, this.options.onwarn));
        }
    }
    async awaitLoadModulesPromise() {
        let startingPromise;
        do {
            startingPromise = this.latestLoadModulesPromise;
            await startingPromise;
        } while (startingPromise !== this.latestLoadModulesPromise);
    }
    extendLoadModulesPromise(loadNewModulesPromise) {
        this.latestLoadModulesPromise = Promise.all([
            loadNewModulesPromise,
            this.latestLoadModulesPromise
        ]);
        this.latestLoadModulesPromise.catch(() => {
            /* Avoid unhandled Promise rejections */
        });
        return loadNewModulesPromise;
    }
    async fetchDynamicDependencies(module) {
        const dependencies = await Promise.all(module.dynamicImports.map(async (dynamicImport) => {
            const resolvedId = await this.resolveDynamicImport(module, typeof dynamicImport.argument === 'string'
                ? dynamicImport.argument
                : dynamicImport.argument.esTreeNode, module.id);
            if (resolvedId === null)
                return null;
            if (typeof resolvedId === 'string') {
                dynamicImport.resolution = resolvedId;
                return null;
            }
            return (dynamicImport.resolution = await this.fetchResolvedDependency(relativeId(resolvedId.id), module.id, resolvedId));
        }));
        for (const dependency of dependencies) {
            if (dependency) {
                module.dynamicDependencies.add(dependency);
                dependency.dynamicImporters.push(module.id);
            }
        }
    }
    async fetchModule({ id, meta, moduleSideEffects, syntheticNamedExports }, importer, isEntry) {
        const existingModule = this.modulesById.get(id);
        if (existingModule instanceof Module) {
            if (isEntry) {
                existingModule.info.isEntry = true;
                this.implicitEntryModules.delete(existingModule);
                for (const dependant of existingModule.implicitlyLoadedAfter) {
                    dependant.implicitlyLoadedBefore.delete(existingModule);
                }
                existingModule.implicitlyLoadedAfter.clear();
            }
            return existingModule;
        }
        const module = new Module(this.graph, id, this.options, isEntry, moduleSideEffects, syntheticNamedExports, meta);
        this.modulesById.set(id, module);
        this.graph.watchFiles[id] = true;
        await this.addModuleSource(id, importer, module);
        await this.pluginDriver.hookParallel('moduleParsed', [module.info]);
        await Promise.all([
            this.fetchStaticDependencies(module),
            this.fetchDynamicDependencies(module)
        ]);
        module.linkImports();
        return module;
    }
    fetchResolvedDependency(source, importer, resolvedId) {
        if (resolvedId.external) {
            if (!this.modulesById.has(resolvedId.id)) {
                this.modulesById.set(resolvedId.id, new ExternalModule(this.options, resolvedId.id, resolvedId.moduleSideEffects, resolvedId.meta));
            }
            const externalModule = this.modulesById.get(resolvedId.id);
            if (!(externalModule instanceof ExternalModule)) {
                return error(errInternalIdCannotBeExternal(source, importer));
            }
            return Promise.resolve(externalModule);
        }
        else {
            return this.fetchModule(resolvedId, importer, false);
        }
    }
    async fetchStaticDependencies(module) {
        for (const dependency of await Promise.all(Array.from(module.sources, async (source) => this.fetchResolvedDependency(source, module.id, (module.resolvedIds[source] =
            module.resolvedIds[source] ||
                this.handleResolveId(await this.resolveId(source, module.id, EMPTY_OBJECT), source, module.id)))))) {
            module.dependencies.add(dependency);
            dependency.importers.push(module.id);
        }
    }
    getNormalizedResolvedIdWithoutDefaults(resolveIdResult, importer, source) {
        if (resolveIdResult) {
            if (typeof resolveIdResult === 'object') {
                return {
                    ...resolveIdResult,
                    external: resolveIdResult.external || this.options.external(resolveIdResult.id, importer, true)
                };
            }
            const external = this.options.external(resolveIdResult, importer, true);
            return {
                external,
                id: external ? normalizeRelativeExternalId(resolveIdResult, importer) : resolveIdResult
            };
        }
        const id = normalizeRelativeExternalId(source, importer);
        if (resolveIdResult !== false && !this.options.external(id, importer, true)) {
            return null;
        }
        return {
            external: true,
            id
        };
    }
    handleResolveId(resolvedId, source, importer) {
        if (resolvedId === null) {
            if (isRelative(source)) {
                return error(errUnresolvedImport(source, importer));
            }
            this.options.onwarn(errUnresolvedImportTreatedAsExternal(source, importer));
            return {
                external: true,
                id: source,
                meta: EMPTY_OBJECT,
                moduleSideEffects: this.hasModuleSideEffects(source, true),
                syntheticNamedExports: false
            };
        }
        else {
            if (resolvedId.external && resolvedId.syntheticNamedExports) {
                this.options.onwarn(errExternalSyntheticExports(source, importer));
            }
        }
        return resolvedId;
    }
    async loadEntryModule(unresolvedId, isEntry, importer, implicitlyLoadedBefore) {
        const resolveIdResult = await resolveId(unresolvedId, importer, this.options.preserveSymlinks, this.pluginDriver, null, EMPTY_OBJECT);
        if (resolveIdResult == null) {
            return error(implicitlyLoadedBefore === null
                ? errUnresolvedEntry(unresolvedId)
                : errUnresolvedImplicitDependant(unresolvedId, implicitlyLoadedBefore));
        }
        if (resolveIdResult === false ||
            (typeof resolveIdResult === 'object' && resolveIdResult.external)) {
            return error(implicitlyLoadedBefore === null
                ? errEntryCannotBeExternal(unresolvedId)
                : errImplicitDependantCannotBeExternal(unresolvedId, implicitlyLoadedBefore));
        }
        return this.fetchModule(this.addDefaultsToResolvedId(typeof resolveIdResult === 'object' ? resolveIdResult : { id: resolveIdResult }), undefined, isEntry);
    }
    async resolveDynamicImport(module, specifier, importer) {
        const resolution = await this.pluginDriver.hookFirst('resolveDynamicImport', [
            specifier,
            importer
        ]);
        if (typeof specifier !== 'string') {
            if (typeof resolution === 'string') {
                return resolution;
            }
            if (!resolution) {
                return null;
            }
            return {
                external: false,
                moduleSideEffects: true,
                ...resolution
            };
        }
        if (resolution == null) {
            return (module.resolvedIds[specifier] =
                module.resolvedIds[specifier] ||
                    this.handleResolveId(await this.resolveId(specifier, module.id, EMPTY_OBJECT), specifier, module.id));
        }
        return this.handleResolveId(this.addDefaultsToResolvedId(this.getNormalizedResolvedIdWithoutDefaults(resolution, importer, specifier)), specifier, importer);
    }
}
function normalizeRelativeExternalId(source, importer) {
    return isRelative(source)
        ? importer
            ? resolve(importer, '..', source)
            : resolve(source)
        : source;
}
function addChunkNamesToModule(module, { fileName, name }, isUserDefined) {
    if (fileName !== null) {
        module.chunkFileNames.add(fileName);
    }
    else if (name !== null) {
        if (module.chunkName === null) {
            module.chunkName = name;
        }
        if (isUserDefined) {
            module.userChunkNames.add(name);
        }
    }
}

function getDeprecatedContextHandler(handler, handlerName, newHandlerName, pluginName, activeDeprecation, options) {
    let deprecationWarningShown = false;
    return ((...args) => {
        if (!deprecationWarningShown) {
            deprecationWarningShown = true;
            warnDeprecation({
                message: `The "this.${handlerName}" plugin context function used by plugin ${pluginName} is deprecated. The "this.${newHandlerName}" plugin context function should be used instead.`,
                plugin: pluginName
            }, activeDeprecation, options);
        }
        return handler(...args);
    });
}
function getPluginContexts(pluginCache, graph, options, fileEmitter) {
    const existingPluginNames = new Set();
    return (plugin, pidx) => {
        let cacheable = true;
        if (typeof plugin.cacheKey !== 'string') {
            if (plugin.name.startsWith(ANONYMOUS_PLUGIN_PREFIX) ||
                plugin.name.startsWith(ANONYMOUS_OUTPUT_PLUGIN_PREFIX) ||
                existingPluginNames.has(plugin.name)) {
                cacheable = false;
            }
            else {
                existingPluginNames.add(plugin.name);
            }
        }
        let cacheInstance;
        if (!pluginCache) {
            cacheInstance = NO_CACHE;
        }
        else if (cacheable) {
            const cacheKey = plugin.cacheKey || plugin.name;
            cacheInstance = createPluginCache(pluginCache[cacheKey] || (pluginCache[cacheKey] = Object.create(null)));
        }
        else {
            cacheInstance = getCacheForUncacheablePlugin(plugin.name);
        }
        const context = {
            addWatchFile(id) {
                if (graph.phase >= BuildPhase.GENERATE) {
                    return this.error(errInvalidRollupPhaseForAddWatchFile());
                }
                graph.watchFiles[id] = true;
            },
            cache: cacheInstance,
            emitAsset: getDeprecatedContextHandler((name, source) => fileEmitter.emitFile({ type: 'asset', name, source }), 'emitAsset', 'emitFile', plugin.name, true, options),
            emitChunk: getDeprecatedContextHandler((id, options) => fileEmitter.emitFile({ type: 'chunk', id, name: options && options.name }), 'emitChunk', 'emitFile', plugin.name, true, options),
            emitFile: fileEmitter.emitFile,
            error(err) {
                return throwPluginError(err, plugin.name);
            },
            getAssetFileName: getDeprecatedContextHandler(fileEmitter.getFileName, 'getAssetFileName', 'getFileName', plugin.name, true, options),
            getChunkFileName: getDeprecatedContextHandler(fileEmitter.getFileName, 'getChunkFileName', 'getFileName', plugin.name, true, options),
            getFileName: fileEmitter.getFileName,
            getModuleIds: () => graph.modulesById.keys(),
            getModuleInfo: graph.getModuleInfo,
            getWatchFiles: () => Object.keys(graph.watchFiles),
            isExternal: getDeprecatedContextHandler((id, parentId, isResolved = false) => options.external(id, parentId, isResolved), 'isExternal', 'resolve', plugin.name, true, options),
            meta: {
                rollupVersion: version,
                watchMode: graph.watchMode
            },
            get moduleIds() {
                function* wrappedModuleIds() {
                    warnDeprecation({
                        message: `Accessing "this.moduleIds" on the plugin context by plugin ${plugin.name} is deprecated. The "this.getModuleIds" plugin context function should be used instead.`,
                        plugin: plugin.name
                    }, false, options);
                    yield* moduleIds;
                }
                const moduleIds = graph.modulesById.keys();
                return wrappedModuleIds();
            },
            parse: graph.contextParse,
            resolve(source, importer, { custom, skipSelf } = BLANK) {
                return graph.moduleLoader.resolveId(source, importer, custom, skipSelf ? pidx : null);
            },
            resolveId: getDeprecatedContextHandler((source, importer) => graph.moduleLoader
                .resolveId(source, importer, BLANK)
                .then(resolveId => resolveId && resolveId.id), 'resolveId', 'resolve', plugin.name, true, options),
            setAssetSource: fileEmitter.setAssetSource,
            warn(warning) {
                if (typeof warning === 'string')
                    warning = { message: warning };
                if (warning.code)
                    warning.pluginCode = warning.code;
                warning.code = 'PLUGIN_WARNING';
                warning.plugin = plugin.name;
                options.onwarn(warning);
            }
        };
        return context;
    };
}

const inputHookNames = {
    buildEnd: 1,
    buildStart: 1,
    closeWatcher: 1,
    load: 1,
    moduleParsed: 1,
    options: 1,
    resolveDynamicImport: 1,
    resolveId: 1,
    transform: 1,
    watchChange: 1
};
const inputHooks = Object.keys(inputHookNames);
function throwInvalidHookError(hookName, pluginName) {
    return error({
        code: 'INVALID_PLUGIN_HOOK',
        message: `Error running plugin hook ${hookName} for ${pluginName}, expected a function hook.`
    });
}
class PluginDriver {
    constructor(graph, options, userPlugins, pluginCache, basePluginDriver) {
        this.graph = graph;
        this.options = options;
        warnDeprecatedHooks(userPlugins, options);
        this.pluginCache = pluginCache;
        this.fileEmitter = new FileEmitter(graph, options, basePluginDriver && basePluginDriver.fileEmitter);
        this.emitFile = this.fileEmitter.emitFile;
        this.getFileName = this.fileEmitter.getFileName;
        this.finaliseAssets = this.fileEmitter.assertAssetsFinalized;
        this.setOutputBundle = this.fileEmitter.setOutputBundle;
        this.plugins = userPlugins.concat(basePluginDriver ? basePluginDriver.plugins : []);
        this.pluginContexts = this.plugins.map(getPluginContexts(pluginCache, graph, options, this.fileEmitter));
        if (basePluginDriver) {
            for (const plugin of userPlugins) {
                for (const hook of inputHooks) {
                    if (hook in plugin) {
                        options.onwarn(errInputHookInOutputPlugin(plugin.name, hook));
                    }
                }
            }
        }
    }
    createOutputPluginDriver(plugins) {
        return new PluginDriver(this.graph, this.options, plugins, this.pluginCache, this);
    }
    // chains, first non-null result stops and returns
    hookFirst(hookName, args, replaceContext, skip) {
        let promise = Promise.resolve(undefined);
        for (let i = 0; i < this.plugins.length; i++) {
            if (skip === i)
                continue;
            promise = promise.then(result => {
                if (result != null)
                    return result;
                return this.runHook(hookName, args, i, false, replaceContext);
            });
        }
        return promise;
    }
    // chains synchronously, first non-null result stops and returns
    hookFirstSync(hookName, args, replaceContext) {
        for (let i = 0; i < this.plugins.length; i++) {
            const result = this.runHookSync(hookName, args, i, replaceContext);
            if (result != null)
                return result;
        }
        return null;
    }
    // parallel, ignores returns
    hookParallel(hookName, args, replaceContext) {
        const promises = [];
        for (let i = 0; i < this.plugins.length; i++) {
            const hookPromise = this.runHook(hookName, args, i, false, replaceContext);
            if (!hookPromise)
                continue;
            promises.push(hookPromise);
        }
        return Promise.all(promises).then(() => { });
    }
    // chains, reduces returned value, handling the reduced value as the first hook argument
    hookReduceArg0(hookName, [arg0, ...rest], reduce, replaceContext) {
        let promise = Promise.resolve(arg0);
        for (let i = 0; i < this.plugins.length; i++) {
            promise = promise.then(arg0 => {
                const args = [arg0, ...rest];
                const hookPromise = this.runHook(hookName, args, i, false, replaceContext);
                if (!hookPromise)
                    return arg0;
                return hookPromise.then(result => reduce.call(this.pluginContexts[i], arg0, result, this.plugins[i]));
            });
        }
        return promise;
    }
    // chains synchronously, reduces returned value, handling the reduced value as the first hook argument
    hookReduceArg0Sync(hookName, [arg0, ...rest], reduce, replaceContext) {
        for (let i = 0; i < this.plugins.length; i++) {
            const args = [arg0, ...rest];
            const result = this.runHookSync(hookName, args, i, replaceContext);
            arg0 = reduce.call(this.pluginContexts[i], arg0, result, this.plugins[i]);
        }
        return arg0;
    }
    // chains, reduces returned value to type T, handling the reduced value separately. permits hooks as values.
    hookReduceValue(hookName, initialValue, args, reduce, replaceContext) {
        let promise = Promise.resolve(initialValue);
        for (let i = 0; i < this.plugins.length; i++) {
            promise = promise.then(value => {
                const hookPromise = this.runHook(hookName, args, i, true, replaceContext);
                if (!hookPromise)
                    return value;
                return hookPromise.then(result => reduce.call(this.pluginContexts[i], value, result, this.plugins[i]));
            });
        }
        return promise;
    }
    // chains synchronously, reduces returned value to type T, handling the reduced value separately. permits hooks as values.
    hookReduceValueSync(hookName, initialValue, args, reduce, replaceContext) {
        let acc = initialValue;
        for (let i = 0; i < this.plugins.length; i++) {
            const result = this.runHookSync(hookName, args, i, replaceContext);
            acc = reduce.call(this.pluginContexts[i], acc, result, this.plugins[i]);
        }
        return acc;
    }
    // chains, ignores returns
    hookSeq(hookName, args, replaceContext) {
        let promise = Promise.resolve();
        for (let i = 0; i < this.plugins.length; i++) {
            promise = promise.then(() => this.runHook(hookName, args, i, false, replaceContext));
        }
        return promise;
    }
    // chains synchronously, ignores returns
    hookSeqSync(hookName, args, replaceContext) {
        for (let i = 0; i < this.plugins.length; i++) {
            this.runHookSync(hookName, args, i, replaceContext);
        }
    }
    runHook(hookName, args, pluginIndex, permitValues, hookContext) {
        const plugin = this.plugins[pluginIndex];
        const hook = plugin[hookName];
        if (!hook)
            return undefined;
        let context = this.pluginContexts[pluginIndex];
        if (hookContext) {
            context = hookContext(context, plugin);
        }
        return Promise.resolve()
            .then(() => {
            // permit values allows values to be returned instead of a functional hook
            if (typeof hook !== 'function') {
                if (permitValues)
                    return hook;
                return throwInvalidHookError(hookName, plugin.name);
            }
            return hook.apply(context, args);
        })
            .catch(err => throwPluginError(err, plugin.name, { hook: hookName }));
    }
    /**
     * Run a sync plugin hook and return the result.
     * @param hookName Name of the plugin hook. Must be in `PluginHooks`.
     * @param args Arguments passed to the plugin hook.
     * @param pluginIndex Index of the plugin inside `this.plugins[]`.
     * @param hookContext When passed, the plugin context can be overridden.
     */
    runHookSync(hookName, args, pluginIndex, hookContext) {
        const plugin = this.plugins[pluginIndex];
        const hook = plugin[hookName];
        if (!hook)
            return undefined;
        let context = this.pluginContexts[pluginIndex];
        if (hookContext) {
            context = hookContext(context, plugin);
        }
        try {
            // permit values allows values to be returned instead of a functional hook
            if (typeof hook !== 'function') {
                return throwInvalidHookError(hookName, plugin.name);
            }
            return hook.apply(context, args);
        }
        catch (err) {
            return throwPluginError(err, plugin.name, { hook: hookName });
        }
    }
}

function normalizeEntryModules(entryModules) {
    if (Array.isArray(entryModules)) {
        return entryModules.map(id => ({
            fileName: null,
            id,
            implicitlyLoadedAfter: [],
            importer: undefined,
            name: null
        }));
    }
    return Object.keys(entryModules).map(name => ({
        fileName: null,
        id: entryModules[name],
        implicitlyLoadedAfter: [],
        importer: undefined,
        name
    }));
}
class Graph {
    constructor(options, watcher) {
        var _a, _b;
        this.options = options;
        this.entryModules = [];
        this.modulesById = new Map();
        this.needsTreeshakingPass = false;
        this.phase = BuildPhase.LOAD_AND_PARSE;
        this.watchFiles = Object.create(null);
        this.watchMode = false;
        this.externalModules = [];
        this.implicitEntryModules = [];
        this.modules = [];
        this.getModuleInfo = (moduleId) => {
            const foundModule = this.modulesById.get(moduleId);
            if (!foundModule)
                return null;
            return foundModule.info;
        };
        this.deoptimizationTracker = new PathTracker();
        this.cachedModules = new Map();
        if (options.cache !== false) {
            if ((_a = options.cache) === null || _a === void 0 ? void 0 : _a.modules) {
                for (const module of options.cache.modules)
                    this.cachedModules.set(module.id, module);
            }
            this.pluginCache = ((_b = options.cache) === null || _b === void 0 ? void 0 : _b.plugins) || Object.create(null);
            // increment access counter
            for (const name in this.pluginCache) {
                const cache = this.pluginCache[name];
                for (const key of Object.keys(cache))
                    cache[key][0]++;
            }
        }
        this.contextParse = (code, options = {}) => this.acornParser.parse(code, {
            ...this.options.acorn,
            ...options
        });
        if (watcher) {
            this.watchMode = true;
            const handleChange = (...args) => this.pluginDriver.hookSeqSync('watchChange', args);
            const handleClose = () => this.pluginDriver.hookSeqSync('closeWatcher', []);
            watcher.on('change', handleChange);
            watcher.on('close', handleClose);
            watcher.once('restart', () => {
                watcher.removeListener('change', handleChange);
                watcher.removeListener('close', handleClose);
            });
        }
        this.pluginDriver = new PluginDriver(this, options, options.plugins, this.pluginCache);
        this.scope = new GlobalScope();
        this.acornParser = Parser.extend(...options.acornInjectPlugins);
        this.moduleLoader = new ModuleLoader(this, this.modulesById, this.options, this.pluginDriver);
    }
    async build() {
        timeStart('generate module graph', 2);
        await this.generateModuleGraph();
        timeEnd('generate module graph', 2);
        timeStart('sort modules', 2);
        this.phase = BuildPhase.ANALYSE;
        this.sortModules();
        timeEnd('sort modules', 2);
        timeStart('mark included statements', 2);
        this.includeStatements();
        timeEnd('mark included statements', 2);
        this.phase = BuildPhase.GENERATE;
    }
    getCache() {
        // handle plugin cache eviction
        for (const name in this.pluginCache) {
            const cache = this.pluginCache[name];
            let allDeleted = true;
            for (const key of Object.keys(cache)) {
                if (cache[key][0] >= this.options.experimentalCacheExpiry)
                    delete cache[key];
                else
                    allDeleted = false;
            }
            if (allDeleted)
                delete this.pluginCache[name];
        }
        return {
            modules: this.modules.map(module => module.toJSON()),
            plugins: this.pluginCache
        };
    }
    async generateModuleGraph() {
        ({
            entryModules: this.entryModules,
            implicitEntryModules: this.implicitEntryModules
        } = await this.moduleLoader.addEntryModules(normalizeEntryModules(this.options.input), true));
        if (this.entryModules.length === 0) {
            throw new Error('You must supply options.input to rollup');
        }
        for (const module of this.modulesById.values()) {
            if (module instanceof Module) {
                this.modules.push(module);
            }
            else {
                this.externalModules.push(module);
            }
        }
    }
    includeStatements() {
        for (const module of [...this.entryModules, ...this.implicitEntryModules]) {
            if (module.preserveSignature !== false) {
                module.includeAllExports(false);
            }
            else {
                markModuleAndImpureDependenciesAsExecuted(module);
            }
        }
        if (this.options.treeshake) {
            let treeshakingPass = 1;
            do {
                timeStart(`treeshaking pass ${treeshakingPass}`, 3);
                this.needsTreeshakingPass = false;
                for (const module of this.modules) {
                    if (module.isExecuted) {
                        if (module.info.hasModuleSideEffects === 'no-treeshake') {
                            module.includeAllInBundle();
                        }
                        else {
                            module.include();
                        }
                    }
                }
                timeEnd(`treeshaking pass ${treeshakingPass++}`, 3);
            } while (this.needsTreeshakingPass);
        }
        else {
            for (const module of this.modules)
                module.includeAllInBundle();
        }
        for (const externalModule of this.externalModules)
            externalModule.warnUnusedImports();
        for (const module of this.implicitEntryModules) {
            for (const dependant of module.implicitlyLoadedAfter) {
                if (!(dependant.info.isEntry || dependant.isIncluded())) {
                    error(errImplicitDependantIsNotIncluded(dependant));
                }
            }
        }
    }
    sortModules() {
        const { orderedModules, cyclePaths } = analyseModuleExecution(this.entryModules);
        for (const cyclePath of cyclePaths) {
            this.options.onwarn({
                code: 'CIRCULAR_DEPENDENCY',
                cycle: cyclePath,
                importer: cyclePath[0],
                message: `Circular dependency: ${cyclePath.join(' -> ')}`
            });
        }
        this.modules = orderedModules;
        for (const module of this.modules) {
            module.bindReferences();
        }
        this.warnForMissingExports();
    }
    warnForMissingExports() {
        for (const module of this.modules) {
            for (const importName of Object.keys(module.importDescriptions)) {
                const importDescription = module.importDescriptions[importName];
                if (importDescription.name !== '*' &&
                    !importDescription.module.getVariableForExportName(importDescription.name)) {
                    module.warn({
                        code: 'NON_EXISTENT_EXPORT',
                        message: `Non-existent export '${importDescription.name}' is imported from ${relativeId(importDescription.module.id)}`,
                        name: importDescription.name,
                        source: importDescription.module.id
                    }, importDescription.start);
                }
            }
        }
    }
}

function ensureArray(items) {
    if (Array.isArray(items)) {
        return items.filter(Boolean);
    }
    if (items) {
        return [items];
    }
    return [];
}

function getAugmentedNamespace(n) {
	if (n.__esModule) return n;
	var a = Object.defineProperty({}, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var require$$0 = /*@__PURE__*/getAugmentedNamespace(acorn);

const getPrototype = Object.getPrototypeOf || (o => o.__proto__);

const getAcorn = Parser => {
  if (Parser.acorn) return Parser.acorn

  const acorn = require$$0;

  if (acorn.version.indexOf("6.") != 0 && acorn.version.indexOf("6.0.") == 0 && acorn.version.indexOf("7.") != 0) {
    throw new Error(`acorn-private-class-elements requires acorn@^6.1.0 or acorn@7.0.0, not ${acorn.version}`)
  }

  // Make sure `Parser` comes from the same acorn as we `require`d,
  // otherwise the comparisons fail.
  for (let cur = Parser; cur && cur !== acorn.Parser; cur = getPrototype(cur)) {
    if (cur !== acorn.Parser) {
      throw new Error("acorn-private-class-elements does not support mixing different acorn copies")
    }
  }
  return acorn
};

var acornPrivateClassElements = function(Parser) {
  // Only load this plugin once.
  if (Parser.prototype.parsePrivateName) {
    return Parser
  }

  const acorn = getAcorn(Parser);

  Parser = class extends Parser {
    _branch() {
      this.__branch = this.__branch || new Parser({ecmaVersion: this.options.ecmaVersion}, this.input);
      this.__branch.end = this.end;
      this.__branch.pos = this.pos;
      this.__branch.type = this.type;
      this.__branch.value = this.value;
      this.__branch.containsEsc = this.containsEsc;
      return this.__branch
    }

    parsePrivateClassElementName(element) {
      element.computed = false;
      element.key = this.parsePrivateName();
      if (element.key.name == "constructor") this.raise(element.key.start, "Classes may not have a private element named constructor");
      const accept = {get: "set", set: "get"}[element.kind];
      const privateBoundNames = this._privateBoundNames;
      if (Object.prototype.hasOwnProperty.call(privateBoundNames, element.key.name) && privateBoundNames[element.key.name] !== accept) {
        this.raise(element.start, "Duplicate private element");
      }
      privateBoundNames[element.key.name] = element.kind || true;
      delete this._unresolvedPrivateNames[element.key.name];
      return element.key
    }

    parsePrivateName() {
      const node = this.startNode();
      node.name = this.value;
      this.next();
      this.finishNode(node, "PrivateName");
      if (this.options.allowReserved == "never") this.checkUnreserved(node);
      return node
    }

    // Parse # token
    getTokenFromCode(code) {
      if (code === 35) {
        ++this.pos;
        const word = this.readWord1();
        return this.finishToken(this.privateNameToken, word)
      }
      return super.getTokenFromCode(code)
    }

    // Manage stacks and check for undeclared private names
    parseClass(node, isStatement) {
      const oldOuterPrivateBoundNames = this._outerPrivateBoundNames;
      this._outerPrivateBoundNames = this._privateBoundNames;
      this._privateBoundNames = Object.create(this._privateBoundNames || null);
      const oldOuterUnresolvedPrivateNames = this._outerUnresolvedPrivateNames;
      this._outerUnresolvedPrivateNames = this._unresolvedPrivateNames;
      this._unresolvedPrivateNames = Object.create(null);

      const _return = super.parseClass(node, isStatement);

      const unresolvedPrivateNames = this._unresolvedPrivateNames;
      this._privateBoundNames = this._outerPrivateBoundNames;
      this._outerPrivateBoundNames = oldOuterPrivateBoundNames;
      this._unresolvedPrivateNames = this._outerUnresolvedPrivateNames;
      this._outerUnresolvedPrivateNames = oldOuterUnresolvedPrivateNames;
      if (!this._unresolvedPrivateNames) {
        const names = Object.keys(unresolvedPrivateNames);
        if (names.length) {
          names.sort((n1, n2) => unresolvedPrivateNames[n1] - unresolvedPrivateNames[n2]);
          this.raise(unresolvedPrivateNames[names[0]], "Usage of undeclared private name");
        }
      } else Object.assign(this._unresolvedPrivateNames, unresolvedPrivateNames);
      return _return
    }

    // Class heritage is evaluated with outer private environment
    parseClassSuper(node) {
      const privateBoundNames = this._privateBoundNames;
      this._privateBoundNames = this._outerPrivateBoundNames;
      const unresolvedPrivateNames = this._unresolvedPrivateNames;
      this._unresolvedPrivateNames = this._outerUnresolvedPrivateNames;
      const _return = super.parseClassSuper(node);
      this._privateBoundNames = privateBoundNames;
      this._unresolvedPrivateNames = unresolvedPrivateNames;
      return _return
    }

    // Parse private element access
    parseSubscript(base, startPos, startLoc, _noCalls, _maybeAsyncArrow, _optionalChained) {
      const optionalSupported = this.options.ecmaVersion >= 11 && acorn.tokTypes.questionDot;
      const branch = this._branch();
      if (!(
        (branch.eat(acorn.tokTypes.dot) || (optionalSupported && branch.eat(acorn.tokTypes.questionDot))) &&
        branch.type == this.privateNameToken
      )) {
        return super.parseSubscript.apply(this, arguments)
      }
      let optional = false;
      if (!this.eat(acorn.tokTypes.dot)) {
        this.expect(acorn.tokTypes.questionDot);
        optional = true;
      }
      let node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.computed = false;
      if (optionalSupported) {
        node.optional = optional;
      }
      if (this.type == this.privateNameToken) {
        if (base.type == "Super") {
          this.raise(this.start, "Cannot access private element on super");
        }
        node.property = this.parsePrivateName();
        if (!this._privateBoundNames || !this._privateBoundNames[node.property.name]) {
          if (!this._unresolvedPrivateNames) {
            this.raise(node.property.start, "Usage of undeclared private name");
          }
          this._unresolvedPrivateNames[node.property.name] = node.property.start;
        }
      } else {
        node.property = this.parseIdent(true);
      }
      return this.finishNode(node, "MemberExpression")
    }

    // Prohibit delete of private class elements
    parseMaybeUnary(refDestructuringErrors, sawUnary) {
      const _return = super.parseMaybeUnary(refDestructuringErrors, sawUnary);
      if (_return.operator == "delete") {
        if (_return.argument.type == "MemberExpression" && _return.argument.property.type == "PrivateName") {
          this.raise(_return.start, "Private elements may not be deleted");
        }
      }
      return _return
    }
  };
  Parser.prototype.privateNameToken = new acorn.TokenType("privateName");
  return Parser
};

var acornClassFields = function(Parser) {
  const acorn = Parser.acorn || require$$0;
  const tt = acorn.tokTypes;

  Parser = acornPrivateClassElements(Parser);
  return class extends Parser {
    _maybeParseFieldValue(field) {
      if (this.eat(tt.eq)) {
        const oldInFieldValue = this._inFieldValue;
        this._inFieldValue = true;
        if (this.type === tt.name && this.value === "await" && (this.inAsync || this.options.allowAwaitOutsideFunction)) {
          field.value = this.parseAwait();
        } else field.value = this.parseExpression();
        this._inFieldValue = oldInFieldValue;
      } else field.value = null;
    }

    // Parse fields
    parseClassElement(_constructorAllowsSuper) {
      if (this.options.ecmaVersion >= 8 && (this.type == tt.name || this.type.keyword || this.type == this.privateNameToken || this.type == tt.bracketL || this.type == tt.string || this.type == tt.num)) {
        const branch = this._branch();
        if (branch.type == tt.bracketL) {
          let count = 0;
          do {
            if (branch.eat(tt.bracketL)) ++count;
            else if (branch.eat(tt.bracketR)) --count;
            else branch.next();
          } while (count > 0)
        } else branch.next(true);
        let isField = branch.type == tt.eq || branch.type == tt.semi;
        if (!isField && branch.canInsertSemicolon()) {
          isField = branch.type != tt.parenL;
        }
        if (isField) {
          const node = this.startNode();
          if (this.type == this.privateNameToken) {
            this.parsePrivateClassElementName(node);
          } else {
            this.parsePropertyName(node);
          }
          if ((node.key.type === "Identifier" && node.key.name === "constructor") ||
              (node.key.type === "Literal" && node.key.value === "constructor")) {
            this.raise(node.key.start, "Classes may not have a field called constructor");
          }
          this.enterScope(64 | 2 | 1); // See acorn's scopeflags.js
          this._maybeParseFieldValue(node);
          this.exitScope();
          this.finishNode(node, "FieldDefinition");
          this.semicolon();
          return node
        }
      }

      return super.parseClassElement.apply(this, arguments)
    }

    // Prohibit arguments in class field initializers
    parseIdent(liberal, isBinding) {
      const ident = super.parseIdent(liberal, isBinding);
      if (this._inFieldValue && ident.name == "arguments") this.raise(ident.start, "A class field initializer may not contain arguments");
      return ident
    }
  }
};

function withoutAcornBigInt(acorn, Parser) {
  return class extends Parser {
    readInt(radix, len) {
      // Hack: len is only != null for unicode escape sequences,
      // where numeric separators are not allowed
      if (len != null) return super.readInt(radix, len)

      let start = this.pos, total = 0, acceptUnderscore = false;
      for (;;) {
        let code = this.input.charCodeAt(this.pos), val;
        if (code >= 97) val = code - 97 + 10; // a
        else if (code == 95) {
          if (!acceptUnderscore) this.raise(this.pos, "Invalid numeric separator");
          ++this.pos;
          acceptUnderscore = false;
          continue
        } else if (code >= 65) val = code - 65 + 10; // A
        else if (code >= 48 && code <= 57) val = code - 48; // 0-9
        else val = Infinity;
        if (val >= radix) break
        ++this.pos;
        total = total * radix + val;
        acceptUnderscore = true;
      }
      if (this.pos === start) return null
      if (!acceptUnderscore) this.raise(this.pos - 1, "Invalid numeric separator");

      return total
    }

    readNumber(startsWithDot) {
      const token = super.readNumber(startsWithDot);
      let octal = this.end - this.start >= 2 && this.input.charCodeAt(this.start) === 48;
      const stripped = this.getNumberInput(this.start, this.end);
      if (stripped.length < this.end - this.start) {
        if (octal) this.raise(this.start, "Invalid number");
        this.value = parseFloat(stripped);
      }
      return token
    }

    // This is used by acorn-bigint
    getNumberInput(start, end) {
      return this.input.slice(start, end).replace(/_/g, "")
    }
  }
}

function withAcornBigInt(acorn, Parser) {
  return class extends Parser {
    readInt(radix, len) {
      // Hack: len is only != null for unicode escape sequences,
      // where numeric separators are not allowed
      if (len != null) return super.readInt(radix, len)

      let start = this.pos, total = 0, acceptUnderscore = false;
      for (;;) {
        let code = this.input.charCodeAt(this.pos), val;
        if (code >= 97) val = code - 97 + 10; // a
        else if (code == 95) {
          if (!acceptUnderscore) this.raise(this.pos, "Invalid numeric separator");
          ++this.pos;
          acceptUnderscore = false;
          continue
        } else if (code >= 65) val = code - 65 + 10; // A
        else if (code >= 48 && code <= 57) val = code - 48; // 0-9
        else val = Infinity;
        if (val >= radix) break
        ++this.pos;
        total = total * radix + val;
        acceptUnderscore = true;
      }
      if (this.pos === start) return null
      if (!acceptUnderscore) this.raise(this.pos - 1, "Invalid numeric separator");

      return total
    }

    readNumber(startsWithDot) {
      let start = this.pos;
      if (!startsWithDot && this.readInt(10) === null) this.raise(start, "Invalid number");
      let octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
      let octalLike = false;
      if (octal && this.strict) this.raise(start, "Invalid number");
      let next = this.input.charCodeAt(this.pos);
      if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
        let str = this.getNumberInput(start, this.pos);
        // eslint-disable-next-line node/no-unsupported-features/es-builtins
        let val = typeof BigInt !== "undefined" ? BigInt(str) : null;
        ++this.pos;
        if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
        return this.finishToken(acorn.tokTypes.num, val)
      }
      if (octal && /[89]/.test(this.input.slice(start, this.pos))) {
        octal = false;
        octalLike = true;
      }
      if (next === 46 && !octal) { // '.'
        ++this.pos;
        this.readInt(10);
        next = this.input.charCodeAt(this.pos);
      }
      if ((next === 69 || next === 101) && !octal) { // 'eE'
        next = this.input.charCodeAt(++this.pos);
        if (next === 43 || next === 45) ++this.pos; // '+-'
        if (this.readInt(10) === null) this.raise(start, "Invalid number");
      }
      if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
      let str = this.getNumberInput(start, this.pos);
      if ((octal || octalLike) && str.length < this.pos - start) {
        this.raise(start, "Invalid number");
      }

      let val = octal ? parseInt(str, 8) : parseFloat(str);
      return this.finishToken(acorn.tokTypes.num, val)
    }

    parseLiteral(value) {
      const ret = super.parseLiteral(value);
      if (ret.bigint) ret.bigint = ret.bigint.replace(/_/g, "");
      return ret
    }

    readRadixNumber(radix) {
      let start = this.pos;
      this.pos += 2; // 0x
      let val = this.readInt(radix);
      if (val == null) { this.raise(this.start + 2, `Expected number in radix ${radix}`); }
      if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
        let str = this.getNumberInput(start, this.pos);
        // eslint-disable-next-line node/no-unsupported-features/es-builtins
        val = typeof BigInt !== "undefined" ? BigInt(str) : null;
        ++this.pos;
      } else if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
      return this.finishToken(acorn.tokTypes.num, val)
    }

    // This is used by acorn-bigint, which theoretically could be used with acorn@6.2 || acorn@7
    getNumberInput(start, end) {
      return this.input.slice(start, end).replace(/_/g, "")
    }
  }
}

// eslint-disable-next-line node/no-unsupported-features/es-syntax
function numericSeparator(Parser) {
  const acorn = Parser.acorn || require$$0;
  const withAcornBigIntSupport = (acorn.version.startsWith("6.") && !(acorn.version.startsWith("6.0.") || acorn.version.startsWith("6.1."))) || acorn.version.startsWith("7.");

  return withAcornBigIntSupport ? withAcornBigInt(acorn, Parser) : withoutAcornBigInt(acorn, Parser)
}

var acornNumericSeparator = numericSeparator;

var acornStaticClassFeatures = function(Parser) {
  const ExtendedParser = acornPrivateClassElements(Parser);

  const acorn = Parser.acorn || require$$0;
  const tt = acorn.tokTypes;

  return class extends ExtendedParser {
    _maybeParseFieldValue(field) {
      if (this.eat(tt.eq)) {
        const oldInFieldValue = this._inStaticFieldScope;
        this._inStaticFieldScope = this.currentThisScope();
        field.value = this.parseExpression();
        this._inStaticFieldScope = oldInFieldValue;
      } else field.value = null;
    }

    // Parse fields
    parseClassElement(_constructorAllowsSuper) {
      if (this.options.ecmaVersion < 8 || !this.isContextual("static")) {
        return super.parseClassElement.apply(this, arguments)
      }

      const branch = this._branch();
      branch.next();
      if ([tt.name, tt.bracketL, tt.string, tt.num, this.privateNameToken].indexOf(branch.type) == -1 && !branch.type.keyword) {
        return super.parseClassElement.apply(this, arguments)
      }
      if (branch.type == tt.bracketL) {
        let count = 0;
        do {
          if (branch.eat(tt.bracketL)) ++count;
          else if (branch.eat(tt.bracketR)) --count;
          else branch.next();
        } while (count > 0)
      } else branch.next();
      if (branch.type != tt.eq && !branch.canInsertSemicolon() && branch.type != tt.semi) {
        return super.parseClassElement.apply(this, arguments)
      }

      const node = this.startNode();
      node.static = this.eatContextual("static");
      if (this.type == this.privateNameToken) {
        this.parsePrivateClassElementName(node);
      } else {
        this.parsePropertyName(node);
      }
      if ((node.key.type === "Identifier" && node.key.name === "constructor") ||
          (node.key.type === "Literal" && !node.computed && node.key.value === "constructor")) {
        this.raise(node.key.start, "Classes may not have a field called constructor");
      }
      if ((node.key.name || node.key.value) === "prototype" && !node.computed) {
        this.raise(node.key.start, "Classes may not have a static property named prototype");
      }

      this.enterScope(64 | 2 | 1); // See acorn's scopeflags.js
      this._maybeParseFieldValue(node);
      this.exitScope();
      this.finishNode(node, "FieldDefinition");
      this.semicolon();
      return node
    }

    // Parse private static methods
    parsePropertyName(prop) {
      if (prop.static && this.type == this.privateNameToken) {
        this.parsePrivateClassElementName(prop);
      } else {
        super.parsePropertyName(prop);
      }
    }

    // Prohibit arguments in class field initializers
    parseIdent(liberal, isBinding) {
      const ident = super.parseIdent(liberal, isBinding);
      if (this._inStaticFieldScope && this.currentThisScope() === this._inStaticFieldScope && ident.name == "arguments") {
        this.raise(ident.start, "A static class field initializer may not contain arguments");
      }
      return ident
    }
  }
};

const defaultOnWarn = warning => console.warn(warning.message || warning);
function warnUnknownOptions(passedOptions, validOptions, optionType, warn, ignoredKeys = /$./) {
    const validOptionSet = new Set(validOptions);
    const unknownOptions = Object.keys(passedOptions).filter(key => !(validOptionSet.has(key) || ignoredKeys.test(key)));
    if (unknownOptions.length > 0) {
        warn({
            code: 'UNKNOWN_OPTION',
            message: `Unknown ${optionType}: ${unknownOptions.join(', ')}. Allowed options: ${[
                ...validOptionSet
            ]
                .sort()
                .join(', ')}`
        });
    }
}

function normalizeInputOptions(config) {
    var _a, _b;
    // These are options that may trigger special warnings or behaviour later
    // if the user did not select an explicit value
    const unsetOptions = new Set();
    const context = (_a = config.context) !== null && _a !== void 0 ? _a : 'undefined';
    const onwarn = getOnwarn(config);
    const strictDeprecations = config.strictDeprecations || false;
    const options = {
        acorn: getAcorn$1(config),
        acornInjectPlugins: getAcornInjectPlugins(config),
        cache: getCache(config),
        context,
        experimentalCacheExpiry: (_b = config.experimentalCacheExpiry) !== null && _b !== void 0 ? _b : 10,
        external: getIdMatcher(config.external),
        inlineDynamicImports: getInlineDynamicImports(config, onwarn, strictDeprecations),
        input: getInput(config),
        manualChunks: getManualChunks(config, onwarn, strictDeprecations),
        moduleContext: getModuleContext(config, context),
        onwarn,
        perf: config.perf || false,
        plugins: ensureArray(config.plugins),
        preserveEntrySignatures: getPreserveEntrySignatures(config, unsetOptions),
        preserveModules: getPreserveModules(config, onwarn, strictDeprecations),
        preserveSymlinks: config.preserveSymlinks || false,
        shimMissingExports: config.shimMissingExports || false,
        strictDeprecations,
        treeshake: getTreeshake(config, onwarn, strictDeprecations)
    };
    warnUnknownOptions(config, [...Object.keys(options), 'watch'], 'input options', options.onwarn, /^(output)$/);
    return { options, unsetOptions };
}
const getOnwarn = (config) => {
    return config.onwarn
        ? warning => {
            warning.toString = () => {
                let str = '';
                if (warning.plugin)
                    str += `(${warning.plugin} plugin) `;
                if (warning.loc)
                    str += `${relativeId(warning.loc.file)} (${warning.loc.line}:${warning.loc.column}) `;
                str += warning.message;
                return str;
            };
            config.onwarn(warning, defaultOnWarn);
        }
        : defaultOnWarn;
};
const getAcorn$1 = (config) => ({
    allowAwaitOutsideFunction: true,
    ecmaVersion: 'latest',
    preserveParens: false,
    sourceType: 'module',
    ...config.acorn
});
const getAcornInjectPlugins = (config) => [
    acornClassFields,
    acornStaticClassFeatures,
    acornNumericSeparator,
    ...ensureArray(config.acornInjectPlugins)
];
const getCache = (config) => {
    var _a;
    return ((_a = config.cache) === null || _a === void 0 ? void 0 : _a.cache) || config.cache;
};
const getIdMatcher = (option) => {
    if (option === true) {
        return () => true;
    }
    if (typeof option === 'function') {
        return (id, ...args) => (!id.startsWith('\0') && option(id, ...args)) || false;
    }
    if (option) {
        const ids = new Set();
        const matchers = [];
        for (const value of ensureArray(option)) {
            if (value instanceof RegExp) {
                matchers.push(value);
            }
            else {
                ids.add(value);
            }
        }
        return (id, ..._args) => ids.has(id) || matchers.some(matcher => matcher.test(id));
    }
    return () => false;
};
const getInlineDynamicImports = (config, warn, strictDeprecations) => {
    const configInlineDynamicImports = config.inlineDynamicImports;
    if (configInlineDynamicImports) {
        warnDeprecationWithOptions('The "inlineDynamicImports" option is deprecated. Use the "output.inlineDynamicImports" option instead.', false, warn, strictDeprecations);
    }
    return configInlineDynamicImports;
};
const getInput = (config) => {
    const configInput = config.input;
    return configInput == null ? [] : typeof configInput === 'string' ? [configInput] : configInput;
};
const getManualChunks = (config, warn, strictDeprecations) => {
    const configManualChunks = config.manualChunks;
    if (configManualChunks) {
        warnDeprecationWithOptions('The "manualChunks" option is deprecated. Use the "output.manualChunks" option instead.', false, warn, strictDeprecations);
    }
    return configManualChunks;
};
const getModuleContext = (config, context) => {
    const configModuleContext = config.moduleContext;
    if (typeof configModuleContext === 'function') {
        return id => { var _a; return (_a = configModuleContext(id)) !== null && _a !== void 0 ? _a : context; };
    }
    if (configModuleContext) {
        const contextByModuleId = Object.create(null);
        for (const key of Object.keys(configModuleContext)) {
            contextByModuleId[resolve(key)] = configModuleContext[key];
        }
        return id => contextByModuleId[id] || context;
    }
    return () => context;
};
const getPreserveEntrySignatures = (config, unsetOptions) => {
    const configPreserveEntrySignatures = config.preserveEntrySignatures;
    if (configPreserveEntrySignatures == null) {
        unsetOptions.add('preserveEntrySignatures');
    }
    return configPreserveEntrySignatures !== null && configPreserveEntrySignatures !== void 0 ? configPreserveEntrySignatures : 'strict';
};
const getPreserveModules = (config, warn, strictDeprecations) => {
    const configPreserveModules = config.preserveModules;
    if (configPreserveModules) {
        warnDeprecationWithOptions('The "preserveModules" option is deprecated. Use the "output.preserveModules" option instead.', false, warn, strictDeprecations);
    }
    return configPreserveModules;
};
const getTreeshake = (config, warn, strictDeprecations) => {
    const configTreeshake = config.treeshake;
    if (configTreeshake === false) {
        return false;
    }
    if (configTreeshake && configTreeshake !== true) {
        if (typeof configTreeshake.pureExternalModules !== 'undefined') {
            warnDeprecationWithOptions(`The "treeshake.pureExternalModules" option is deprecated. The "treeshake.moduleSideEffects" option should be used instead. "treeshake.pureExternalModules: true" is equivalent to "treeshake.moduleSideEffects: 'no-external'"`, true, warn, strictDeprecations);
        }
        return {
            annotations: configTreeshake.annotations !== false,
            moduleSideEffects: getHasModuleSideEffects(configTreeshake.moduleSideEffects, configTreeshake.pureExternalModules, warn),
            propertyReadSideEffects: configTreeshake.propertyReadSideEffects !== false,
            tryCatchDeoptimization: configTreeshake.tryCatchDeoptimization !== false,
            unknownGlobalSideEffects: configTreeshake.unknownGlobalSideEffects !== false
        };
    }
    return {
        annotations: true,
        moduleSideEffects: () => true,
        propertyReadSideEffects: true,
        tryCatchDeoptimization: true,
        unknownGlobalSideEffects: true
    };
};
const getHasModuleSideEffects = (moduleSideEffectsOption, pureExternalModules, warn) => {
    if (typeof moduleSideEffectsOption === 'boolean') {
        return () => moduleSideEffectsOption;
    }
    if (moduleSideEffectsOption === 'no-external') {
        return (_id, external) => !external;
    }
    if (typeof moduleSideEffectsOption === 'function') {
        return (id, external) => !id.startsWith('\0') ? moduleSideEffectsOption(id, external) !== false : true;
    }
    if (Array.isArray(moduleSideEffectsOption)) {
        const ids = new Set(moduleSideEffectsOption);
        return id => ids.has(id);
    }
    if (moduleSideEffectsOption) {
        warn(errInvalidOption('treeshake.moduleSideEffects', 'please use one of false, "no-external", a function or an array'));
    }
    const isPureExternalModule = getIdMatcher(pureExternalModules);
    return (id, external) => !(external && isPureExternalModule(id));
};

function normalizeOutputOptions(config, inputOptions, unsetInputOptions) {
    var _a, _b, _c, _d, _e, _f, _g;
    // These are options that may trigger special warnings or behaviour later
    // if the user did not select an explicit value
    const unsetOptions = new Set(unsetInputOptions);
    const compact = config.compact || false;
    const format = getFormat(config);
    const inlineDynamicImports = getInlineDynamicImports$1(config, inputOptions);
    const preserveModules = getPreserveModules$1(config, inlineDynamicImports, inputOptions);
    const file = getFile(config, preserveModules, inputOptions);
    const outputOptions = {
        amd: getAmd(config),
        assetFileNames: (_a = config.assetFileNames) !== null && _a !== void 0 ? _a : 'assets/[name]-[hash][extname]',
        banner: getAddon(config, 'banner'),
        chunkFileNames: (_b = config.chunkFileNames) !== null && _b !== void 0 ? _b : '[name]-[hash].js',
        compact,
        dir: getDir(config, file),
        dynamicImportFunction: getDynamicImportFunction(config, inputOptions),
        entryFileNames: getEntryFileNames(config, unsetOptions),
        esModule: (_c = config.esModule) !== null && _c !== void 0 ? _c : true,
        exports: getExports(config, unsetOptions),
        extend: config.extend || false,
        externalLiveBindings: (_d = config.externalLiveBindings) !== null && _d !== void 0 ? _d : true,
        file,
        footer: getAddon(config, 'footer'),
        format,
        freeze: (_e = config.freeze) !== null && _e !== void 0 ? _e : true,
        globals: config.globals || {},
        hoistTransitiveImports: (_f = config.hoistTransitiveImports) !== null && _f !== void 0 ? _f : true,
        indent: getIndent(config, compact),
        inlineDynamicImports,
        interop: getInterop(config, inputOptions),
        intro: getAddon(config, 'intro'),
        manualChunks: getManualChunks$1(config, inlineDynamicImports, preserveModules, inputOptions),
        minifyInternalExports: getMinifyInternalExports(config, format, compact),
        name: config.name,
        namespaceToStringTag: config.namespaceToStringTag || false,
        noConflict: config.noConflict || false,
        outro: getAddon(config, 'outro'),
        paths: config.paths || {},
        plugins: ensureArray(config.plugins),
        preferConst: config.preferConst || false,
        preserveModules,
        preserveModulesRoot: getPreserveModulesRoot(config),
        sourcemap: config.sourcemap || false,
        sourcemapExcludeSources: config.sourcemapExcludeSources || false,
        sourcemapFile: config.sourcemapFile,
        sourcemapPathTransform: config.sourcemapPathTransform,
        strict: (_g = config.strict) !== null && _g !== void 0 ? _g : true,
        systemNullSetters: config.systemNullSetters || false
    };
    warnUnknownOptions(config, Object.keys(outputOptions), 'output options', inputOptions.onwarn);
    return { options: outputOptions, unsetOptions };
}
const getFile = (config, preserveModules, inputOptions) => {
    const file = config.file;
    if (typeof file === 'string') {
        if (preserveModules) {
            return error({
                code: 'INVALID_OPTION',
                message: 'You must set "output.dir" instead of "output.file" when using the "output.preserveModules" option.'
            });
        }
        if (!Array.isArray(inputOptions.input))
            return error({
                code: 'INVALID_OPTION',
                message: 'You must set "output.dir" instead of "output.file" when providing named inputs.'
            });
    }
    return file;
};
const getFormat = (config) => {
    const configFormat = config.format;
    switch (configFormat) {
        case undefined:
        case 'es':
        case 'esm':
        case 'module':
            return 'es';
        case 'cjs':
        case 'commonjs':
            return 'cjs';
        case 'system':
        case 'systemjs':
            return 'system';
        case 'amd':
        case 'iife':
        case 'umd':
            return configFormat;
        default:
            return error({
                message: `You must specify "output.format", which can be one of "amd", "cjs", "system", "es", "iife" or "umd".`,
                url: `https://rollupjs.org/guide/en/#outputformat`
            });
    }
};
const getInlineDynamicImports$1 = (config, inputOptions) => {
    var _a;
    const inlineDynamicImports = ((_a = config.inlineDynamicImports) !== null && _a !== void 0 ? _a : inputOptions.inlineDynamicImports) ||
        false;
    const { input } = inputOptions;
    if (inlineDynamicImports && (Array.isArray(input) ? input : Object.keys(input)).length > 1) {
        return error({
            code: 'INVALID_OPTION',
            message: 'Multiple inputs are not supported for "output.inlineDynamicImports".'
        });
    }
    return inlineDynamicImports;
};
const getPreserveModules$1 = (config, inlineDynamicImports, inputOptions) => {
    var _a;
    const preserveModules = ((_a = config.preserveModules) !== null && _a !== void 0 ? _a : inputOptions.preserveModules) || false;
    if (preserveModules) {
        if (inlineDynamicImports) {
            return error({
                code: 'INVALID_OPTION',
                message: `The "output.inlineDynamicImports" option is not supported for "output.preserveModules".`
            });
        }
        if (inputOptions.preserveEntrySignatures === false) {
            return error({
                code: 'INVALID_OPTION',
                message: 'Setting "preserveEntrySignatures" to "false" is not supported for "output.preserveModules".'
            });
        }
    }
    return preserveModules;
};
const getPreserveModulesRoot = (config) => {
    const preserveModulesRoot = config.preserveModulesRoot;
    if (preserveModulesRoot === null || preserveModulesRoot === undefined) {
        return undefined;
    }
    return resolve(preserveModulesRoot);
};
const getAmd = (config) => {
    const collection = {
        autoId: false,
        basePath: '',
        define: 'define',
        ...config.amd
    };
    if ((collection.autoId || collection.basePath) && collection.id) {
        return error({
            code: 'INVALID_OPTION',
            message: '"output.amd.autoId"/"output.amd.basePath" and "output.amd.id" cannot be used together.'
        });
    }
    if (collection.basePath && !collection.autoId) {
        return error({
            code: 'INVALID_OPTION',
            message: '"output.amd.basePath" only works with "output.amd.autoId".'
        });
    }
    let normalized;
    if (collection.autoId) {
        normalized = {
            autoId: true,
            basePath: collection.basePath,
            define: collection.define
        };
    }
    else {
        normalized = {
            autoId: false,
            define: collection.define,
            id: collection.id
        };
    }
    return normalized;
};
const getAddon = (config, name) => {
    const configAddon = config[name];
    if (typeof configAddon === 'function') {
        return configAddon;
    }
    return () => configAddon || '';
};
const getDir = (config, file) => {
    const dir = config.dir;
    if (typeof dir === 'string' && typeof file === 'string') {
        return error({
            code: 'INVALID_OPTION',
            message: 'You must set either "output.file" for a single-file build or "output.dir" when generating multiple chunks.'
        });
    }
    return dir;
};
const getDynamicImportFunction = (config, inputOptions) => {
    const configDynamicImportFunction = config.dynamicImportFunction;
    if (configDynamicImportFunction) {
        warnDeprecation(`The "output.dynamicImportFunction" option is deprecated. Use the "renderDynamicImport" plugin hook instead.`, false, inputOptions);
    }
    return configDynamicImportFunction;
};
const getEntryFileNames = (config, unsetOptions) => {
    const configEntryFileNames = config.entryFileNames;
    if (configEntryFileNames == null) {
        unsetOptions.add('entryFileNames');
    }
    return configEntryFileNames !== null && configEntryFileNames !== void 0 ? configEntryFileNames : '[name].js';
};
function getExports(config, unsetOptions) {
    const configExports = config.exports;
    if (configExports == null) {
        unsetOptions.add('exports');
    }
    else if (!['default', 'named', 'none', 'auto'].includes(configExports)) {
        return error(errInvalidExportOptionValue(configExports));
    }
    return configExports || 'auto';
}
const getIndent = (config, compact) => {
    if (compact) {
        return '';
    }
    const configIndent = config.indent;
    return configIndent === false ? '' : configIndent !== null && configIndent !== void 0 ? configIndent : true;
};
const ALLOWED_INTEROP_TYPES = new Set(['auto', 'esModule', 'default', 'defaultOnly', true, false]);
const getInterop = (config, inputOptions) => {
    const configInterop = config.interop;
    const validatedInteropTypes = new Set();
    const validateInterop = (interop) => {
        if (!validatedInteropTypes.has(interop)) {
            validatedInteropTypes.add(interop);
            if (!ALLOWED_INTEROP_TYPES.has(interop)) {
                return error({
                    code: 'INVALID_OPTION',
                    message: `The value ${JSON.stringify(interop)} is not supported for "output.interop". Use one of ${Array.from(ALLOWED_INTEROP_TYPES.values(), value => JSON.stringify(value)).join(', ')} instead.`,
                    url: 'https://rollupjs.org/guide/en/#outputinterop'
                });
            }
            if (typeof interop === 'boolean') {
                warnDeprecation({
                    message: `The boolean value "${interop}" for the "output.interop" option is deprecated. Use ${interop ? '"auto"' : '"esModule", "default" or "defaultOnly"'} instead.`,
                    url: 'https://rollupjs.org/guide/en/#outputinterop'
                }, false, inputOptions);
            }
        }
        return interop;
    };
    if (typeof configInterop === 'function') {
        const interopPerId = Object.create(null);
        let defaultInterop = null;
        return id => id === null
            ? defaultInterop || validateInterop((defaultInterop = configInterop(id)))
            : id in interopPerId
                ? interopPerId[id]
                : validateInterop((interopPerId[id] = configInterop(id)));
    }
    return configInterop === undefined ? () => true : () => validateInterop(configInterop);
};
const getManualChunks$1 = (config, inlineDynamicImports, preserveModules, inputOptions) => {
    const configManualChunks = config.manualChunks || inputOptions.manualChunks;
    if (configManualChunks) {
        if (inlineDynamicImports) {
            return error({
                code: 'INVALID_OPTION',
                message: 'The "output.manualChunks" option is not supported for "output.inlineDynamicImports".'
            });
        }
        if (preserveModules) {
            return error({
                code: 'INVALID_OPTION',
                message: 'The "output.manualChunks" option is not supported for "output.preserveModules".'
            });
        }
    }
    return configManualChunks || {};
};
const getMinifyInternalExports = (config, format, compact) => { var _a; return (_a = config.minifyInternalExports) !== null && _a !== void 0 ? _a : (compact || format === 'es' || format === 'system'); };

function rollup(rawInputOptions) {
    return rollupInternal(rawInputOptions, null);
}
async function rollupInternal(rawInputOptions, watcher) {
    const { options: inputOptions, unsetOptions: unsetInputOptions } = await getInputOptions(rawInputOptions, watcher !== null);
    initialiseTimers(inputOptions);
    const graph = new Graph(inputOptions, watcher);
    // remove the cache option from the memory after graph creation (cache is not used anymore)
    const useCache = rawInputOptions.cache !== false;
    delete inputOptions.cache;
    delete rawInputOptions.cache;
    timeStart('BUILD', 1);
    try {
        await graph.pluginDriver.hookParallel('buildStart', [inputOptions]);
        await graph.build();
    }
    catch (err) {
        const watchFiles = Object.keys(graph.watchFiles);
        if (watchFiles.length > 0) {
            err.watchFiles = watchFiles;
        }
        await graph.pluginDriver.hookParallel('buildEnd', [err]);
        throw err;
    }
    await graph.pluginDriver.hookParallel('buildEnd', []);
    timeEnd('BUILD', 1);
    const result = {
        cache: useCache ? graph.getCache() : undefined,
        async generate(rawOutputOptions) {
            return handleGenerateWrite(false, inputOptions, unsetInputOptions, rawOutputOptions, graph);
        },
        watchFiles: Object.keys(graph.watchFiles),
        async write(rawOutputOptions) {
            return handleGenerateWrite(true, inputOptions, unsetInputOptions, rawOutputOptions, graph);
        }
    };
    if (inputOptions.perf)
        result.getTimings = getTimings;
    return result;
}
async function getInputOptions(rawInputOptions, watchMode) {
    if (!rawInputOptions) {
        throw new Error('You must supply an options object to rollup');
    }
    const rawPlugins = ensureArray(rawInputOptions.plugins);
    const { options, unsetOptions } = normalizeInputOptions(await rawPlugins.reduce(applyOptionHook(watchMode), Promise.resolve(rawInputOptions)));
    normalizePlugins(options.plugins, ANONYMOUS_PLUGIN_PREFIX);
    return { options, unsetOptions };
}
function applyOptionHook(watchMode) {
    return async (inputOptions, plugin) => {
        if (plugin.options)
            return (plugin.options.call({ meta: { rollupVersion: version, watchMode } }, await inputOptions) || inputOptions);
        return inputOptions;
    };
}
function normalizePlugins(plugins, anonymousPrefix) {
    for (let pluginIndex = 0; pluginIndex < plugins.length; pluginIndex++) {
        const plugin = plugins[pluginIndex];
        if (!plugin.name) {
            plugin.name = `${anonymousPrefix}${pluginIndex + 1}`;
        }
    }
}
async function handleGenerateWrite(isWrite, inputOptions, unsetInputOptions, rawOutputOptions, graph) {
    const { options: outputOptions, outputPluginDriver, unsetOptions } = getOutputOptionsAndPluginDriver(rawOutputOptions, graph.pluginDriver, inputOptions, unsetInputOptions);
    const bundle = new Bundle$1(outputOptions, unsetOptions, inputOptions, outputPluginDriver, graph);
    const generated = await bundle.generate(isWrite);
    if (isWrite) {
        if (!outputOptions.dir && !outputOptions.file) {
            return error({
                code: 'MISSING_OPTION',
                message: 'You must specify "output.file" or "output.dir" for the build.'
            });
        }
        await Promise.all(Object.keys(generated).map(chunkId => writeOutputFile(generated[chunkId], outputOptions)));
        await outputPluginDriver.hookParallel('writeBundle', [outputOptions, generated]);
    }
    return createOutput(generated);
}
function getOutputOptionsAndPluginDriver(rawOutputOptions, inputPluginDriver, inputOptions, unsetInputOptions) {
    if (!rawOutputOptions) {
        throw new Error('You must supply an options object');
    }
    const rawPlugins = ensureArray(rawOutputOptions.plugins);
    normalizePlugins(rawPlugins, ANONYMOUS_OUTPUT_PLUGIN_PREFIX);
    const outputPluginDriver = inputPluginDriver.createOutputPluginDriver(rawPlugins);
    return {
        ...getOutputOptions(inputOptions, unsetInputOptions, rawOutputOptions, outputPluginDriver),
        outputPluginDriver
    };
}
function getOutputOptions(inputOptions, unsetInputOptions, rawOutputOptions, outputPluginDriver) {
    return normalizeOutputOptions(outputPluginDriver.hookReduceArg0Sync('outputOptions', [rawOutputOptions.output || rawOutputOptions], (outputOptions, result) => result || outputOptions, pluginContext => {
        const emitError = () => pluginContext.error(errCannotEmitFromOptionsHook());
        return {
            ...pluginContext,
            emitFile: emitError,
            setAssetSource: emitError
        };
    }), inputOptions, unsetInputOptions);
}
function createOutput(outputBundle) {
    return {
        output: Object.keys(outputBundle)
            .map(fileName => outputBundle[fileName])
            .filter(outputFile => Object.keys(outputFile).length > 0).sort((outputFileA, outputFileB) => {
            const fileTypeA = getSortingFileType(outputFileA);
            const fileTypeB = getSortingFileType(outputFileB);
            if (fileTypeA === fileTypeB)
                return 0;
            return fileTypeA < fileTypeB ? -1 : 1;
        })
    };
}
var SortingFileType;
(function (SortingFileType) {
    SortingFileType[SortingFileType["ENTRY_CHUNK"] = 0] = "ENTRY_CHUNK";
    SortingFileType[SortingFileType["SECONDARY_CHUNK"] = 1] = "SECONDARY_CHUNK";
    SortingFileType[SortingFileType["ASSET"] = 2] = "ASSET";
})(SortingFileType || (SortingFileType = {}));
function getSortingFileType(file) {
    if (file.type === 'asset') {
        return SortingFileType.ASSET;
    }
    if (file.isEntry) {
        return SortingFileType.ENTRY_CHUNK;
    }
    return SortingFileType.SECONDARY_CHUNK;
}
function writeOutputFile(outputFile, outputOptions) {
    const fileName = resolve(outputOptions.dir || dirname(outputOptions.file), outputFile.fileName);
    let writeSourceMapPromise;
    let source;
    if (outputFile.type === 'asset') {
        source = outputFile.source;
    }
    else {
        source = outputFile.code;
        if (outputOptions.sourcemap && outputFile.map) {
            let url;
            if (outputOptions.sourcemap === 'inline') {
                url = outputFile.map.toUrl();
            }
            else {
                url = `${basename(outputFile.fileName)}.map`;
                writeSourceMapPromise = writeFile(`${fileName}.map`, outputFile.map.toString());
            }
            if (outputOptions.sourcemap !== 'hidden') {
                source += `//# ${SOURCEMAPPING_URL}=${url}\n`;
            }
        }
    }
    return Promise.all([writeFile(fileName, source), writeSourceMapPromise]);
}

let fsEvents;
let fsEventsImportError;
function loadFsEvents() {
    return import('fsevents')
        .then(namespace => {
        fsEvents = namespace.default;
    })
        .catch(err => {
        fsEventsImportError = err;
    });
}
// A call to this function will be injected into the chokidar code
function getFsEvents() {
    if (fsEventsImportError)
        throw fsEventsImportError;
    return fsEvents;
}

var fseventsImporter = {
  __proto__: null,
  loadFsEvents: loadFsEvents,
  getFsEvents: getFsEvents
};

class WatchEmitter extends EventEmitter {
    constructor() {
        super();
        // Allows more than 10 bundles to be watched without
        // showing the `MaxListenersExceededWarning` to the user.
        this.setMaxListeners(Infinity);
    }
    close() { }
}
function watch(configs) {
    const emitter = new WatchEmitter();
    const configArray = ensureArray(configs);
    const watchConfigs = configArray.filter(config => config.watch !== false);
    if (watchConfigs.length === 0) {
        throw error(errInvalidOption('watch', 'there must be at least one config where "watch" is not set to "false"'));
    }
    loadFsEvents()
        .then(() => import('./watch.js'))
        .then(({ Watcher }) => new Watcher(watchConfigs, emitter));
    return emitter;
}

export { createCommonjsModule, defaultOnWarn, ensureArray, fseventsImporter, getAugmentedNamespace, rollup, rollupInternal, version, warnUnknownOptions, watch };
