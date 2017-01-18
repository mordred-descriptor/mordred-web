import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';


const plugins = [
    nodeResolve({jsnext: true, main: true, browser: true}),
    commonjs(),
    babel({
        presets: ['es2015-rollup'],
        plugins: ["transform-inline-environment-variables"],
    }),
]

if (process.env.NODE_ENV === 'production') {
    plugins.push(uglify());
}


export default {
    entry: 'tmp/index.js',
    dest: 'dist/bundle.js',
    format: 'iife',
    moduleName: 'MyBundle',
    plugins: plugins
}
