const Stream = require('stream');

module.exports = Stream.Readable;
module.exports.Stream = Stream;
module.exports.Writable = Stream.Writable;
module.exports.Duplex = Stream.Duplex;
module.exports.Transform = Stream.Transform;
module.exports.PassThrough = Stream.PassThrough;
module.exports.finished = Stream.finished;
module.exports.pipeline = Stream.pipeline;