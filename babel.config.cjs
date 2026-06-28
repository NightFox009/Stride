// Named `.cjs` on purpose: package.json declares `"type": "module"` (so the
// pure engine + node sim scripts stay ESM), but Babel config must be CommonJS.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
