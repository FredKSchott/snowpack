const fs = require("fs");
const path = require("path");
const execa = require("execa");

const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

const templates = fs.readdirSync(TEMPLATES_DIR);

describe("npx create-snowpack-app", () => {
  templates.forEach((template) => {
    it(`--template @snowpack/${template}`, async () => {
      // run yarn in this directory
      await execa("yarn", { cwd: path.join(TEMPLATES_DIR, template) });

      // run the local create-snowpack-app bin
      await execa(
        "node",
        [
          "./packages/create-snowpack-app",
          `test/testdata/${template}`,
          "--template",
          `../../../templates/${template}`, // this is relative to the new app in testdata/, not this file
          "--use-yarn", // we use Yarn for this repo
          "--force", // saves you from having to manually delete things
        ],
        { cwd: path.resolve(__dirname, "..") }
      );

      // snowpack.config.json is a file we can test for to assume successful
      // install, since it’s added at the end.

      const snowpackConfigExists = fs.existsSync(
        path.resolve(__dirname, "testdata", template, "snowpack.config.json")
      );
      expect(snowpackConfigExists).toBe(true);
    });
  });
});
