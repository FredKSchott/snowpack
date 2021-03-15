const { promises: fs } = require('fs');
const path = require('path');

const getAllFiles = async (dir) => {
  const all = await fs.readdir(dir, { withFileTypes: true });
  return [].concat(...await Promise.all(all.map(ent => ent.isFile() ? path.join(dir, ent.name) : getAllFiles(path.join(dir, ent.name)))));
}

async function copy() {
  const docsDir = path.resolve(__dirname, '../../docs');
  const docs = await getAllFiles(docsDir);
  
  await Promise.all(docs.map(src => {
    if (['README.md', '.DS_Store'].includes(path.basename(src))) return;

    console.log(src.replace(docsDir, ''));
    const dest = path.join(process.cwd(), '_template', src.replace(docsDir, ''));
    return fs.mkdir(path.dirname(dest), { recursive: true }).then(() => fs.copyFile(src, dest));
  }));
}

copy()
