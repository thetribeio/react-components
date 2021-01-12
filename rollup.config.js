/* eslint-disable import/no-extraneous-dependencies */
import commonjs from '@rollup/plugin-commonjs';
import url from '@rollup/plugin-url';
import typescriptResolve from 'rollup-plugin-typescript2';
import typescript from 'typescript';

const plugins = [
    typescriptResolve({ typescript, rollupCommonJSResolveHack: true }),
    commonjs({
        sourceMap: true,
        extensions: ['.js', '.ts'],
    }),
    url({
        include: ['**/*.ttf'],
        limit: Infinity,
    }),
];
export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/bundle.js',
        format: 'cjs',
        name: 'test',
    },
    plugins,
};
