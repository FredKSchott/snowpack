class Instantiable {
	constructor() {
		this.prop = true;
	}

	method() {}
}

const instance = new Instantiable();

module.exports = {
  mount: {
    './src': '/_dist_',
  },
  plugins: [
    [ "./dummy-plugin.js", { instance } ]
  ]
};
