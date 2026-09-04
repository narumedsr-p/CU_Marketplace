const path = require('path');

module.exports = (options) => ({
  ...options,
  entry: path.resolve(__dirname, 'src/main.ts'),
  // @scalar/nestjs-api-reference pulls in ESM-only deps with no CJS entry point,
  // so they must be bundled instead of left external like the rest of node_modules.
  externals: [
    (ctx, callback) => {
      if (/^@scalar\//.test(ctx.request || '')) {
        return callback();
      }
      return options.externals[0](ctx, callback);
    },
  ],
  output: {
    ...options.output,
    filename: 'main.cjs',
  },
  resolve: {
    ...options.resolve,
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
});
