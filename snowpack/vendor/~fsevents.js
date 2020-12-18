// require("fsevents") gets hoisted and breaks under Windows & Linux as it is Mac-only.
// This shim module forces it to be required dynamically.
// Doing this disables Chokidar's automatic fsevents usage, so the useFSEvents option is required.

// // eslint-disable-next-line
try {
	module.exports = eval('require')('fsevents');
} catch (e) {}