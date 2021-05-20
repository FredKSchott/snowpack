/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    public: '/',
    src: '/_dist',
  },
  devOptions: {
    tailwindConfig: './tailwind.config.js',
  },
  plugins: ['@snowpack/plugin-postcss'],
};
