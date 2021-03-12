/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	buildOptions: { clean: true },
	mount: { public: '/' },
	plugins: ['snowpack-plugin-angular'],
	routes: [{ match: 'routes', src: '.*', dest: '/index.html' }],
};
