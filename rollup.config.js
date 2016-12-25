// rollup.config.vendor.js
import alias from 'rollup-plugin-alias';
import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default {
 entry: 'app/mainaot.ts',
 dest: 'dist/bundle.aot.js',
 format: 'iife',
 moduleName: 'mainaot',
 plugins: [
   typescript(),
   alias({ rxjs: __dirname + '/node_modules/rxjs-es' }),
   resolve({ jsnext: true,
             main: true,
             browser: true }),
 ]
}