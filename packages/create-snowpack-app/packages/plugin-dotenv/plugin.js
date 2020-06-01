module.exports = function plugin(config, options) {
  const NODE_ENV = process.env.NODE_ENV;
  if (!NODE_ENV) {
    throw new Error(
      "The NODE_ENV environment variable is required but was not specified."
    );
  }

  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  const dotenvFiles = [
    `.env.${NODE_ENV}.local`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    NODE_ENV !== "test" && `.env.local`,
    `.env.${NODE_ENV}`,
    ".env",
  ].filter(Boolean);

  // Load environment variables from .env* files. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.  Variable expansion is supported in .env files.
  // https://github.com/motdotla/dotenv
  // https://github.com/motdotla/dotenv-expand
  dotenvFiles.forEach((dotenvFile) => {
    if (fs.existsSync(dotenvFile)) {
      require("dotenv-expand")(
        require("dotenv").config({
          path: dotenvFile,
        })
      );
    }
  });

  return {};
};
