import ts from 'rollup-plugin-ts'

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [
    ts({
      tsconfig: 'tsconfig.build.json',
    }),
  ],
}
