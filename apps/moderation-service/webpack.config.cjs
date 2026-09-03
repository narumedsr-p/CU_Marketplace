module.exports = (options) => ({
  ...options,
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
