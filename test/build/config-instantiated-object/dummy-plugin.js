module.exports = (snowpackConfig, {instance}) => {
  if (!instance.prop) {
    throw new Error("simple prop value didn't make it");
  }

  if (!instance.method) {
    throw new Error("method value didn't make it");
  }

  return {name: 'dummy-plugin'};
};
