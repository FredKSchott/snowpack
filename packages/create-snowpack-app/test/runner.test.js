const fs = require("fs");
const path = require("path");
const execa = require("execa");
const dircompare = require("dir-compare");

const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

const templates = fs.readdirSync(TEMPLATES_DIR);

const format = (stdout) =>
  stdout
    .replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, "$1XXXXXXXX$2") // strip chunk hash
    .replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, "") // strip whitespace chars
    .replace(/\n\s*\/\*[^*]+\*\/\s*\n/gm, "\n"); // strip full-line comments (throws Svelte test)

describe("npx create-snowpack-app", () => {
  // test npx create-snowpack-app bin
  it("npx create-snowpack-app", async () => {
    const template = "app-template-react"; // any template will do

    // run the local create-snowpack-app bin
    await execa(
      "node",
      [
        "./packages/create-snowpack-app",
        `test/test-install`,
        "--template",
        `../../templates/${template}`,
        "--use-yarn", // we use Yarn for this repo
        "--force", // saves you from having to manually delete things
      ],
      { cwd: path.resolve(__dirname, "..") }
    );

    // snowpack.config.json is a file we can test for to assume successful
    // install, since it’s added at the end.
    const snowpackConfigExists = fs.existsSync(
      path.resolve(__dirname, "test-install", "snowpack.config.json")
    );
    expect(snowpackConfigExists).toBe(true);
  });

  // template snapshots
  templates.forEach((template) => {
    it(`--template @snowpack/${template}`, async () => {
      const cwd = path.join(TEMPLATES_DIR, template);

      // run yarn build
      await execa("yarn", ["build"], { cwd, env: { NODE_ENV: "production" } });

      const expected = path.join(__dirname, "snapshots", template);
      const actual = path.join(cwd, "build");

      const res = dircompare.compareSync(expected, actual);
      res.diffSet.forEach((entry) => {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        if (entry.type1 !== "file") {
          return;
        }

        // NOTE: common chunks are hashed, non-trivial to compare
        if (entry.path1.endsWith("common") && entry.path2.endsWith("common")) {
          return;
        }

        const f1 = fs.readFileSync(path.join(entry.path1, entry.name1), "utf8");
        const f2 = fs.readFileSync(path.join(entry.path2, entry.name2), "utf8");

        expect(format(f2)).toBe(format(f1));
      });
    });
  });
});
