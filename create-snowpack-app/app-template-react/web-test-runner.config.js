const got = require('got');

module.exports = {
  plugins: [
    {
      name: 'my-plugin',
      async serve(context) {
        console.log(context);
        const url = context.request.url.replace('/src/', '/_dist_/').replace('.jsx', '.js');
        console.log(url);
        return {body: (await got.get(`http://localhost:8080${url}`)).body, type: 'js'};
      },
    },
  ],
};
