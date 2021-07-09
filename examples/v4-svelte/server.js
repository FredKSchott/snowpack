const {createServer} = require('snowpack');

async function main() {
  const server = await createServer({
    config: {entryPoints: ['./src/index.js']},
    cwd: 'src',
  });
  await server.listen(8080);
}
main();
