/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: { public: '/' },
	alias: {
		styles: './public/styles',
	},
	plugins: ['@snowpack/plugin-angular'],
	buildOptions: { clean: true },
	routes: [{ match: 'routes', src: '.*', dest: '/index.html' }],
};
