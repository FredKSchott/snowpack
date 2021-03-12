async function run() {
  const modules = import.meta.glob('./dir/*.js');

  for (const path in modules) {
    modules[path]().then((mod) => {
      console.log(path, mod)
    })
  }
};

run();
