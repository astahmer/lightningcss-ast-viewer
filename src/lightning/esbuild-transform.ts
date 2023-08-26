import * as esbuild from 'esbuild-wasm'

await esbuild.initialize({
  wasmURL: import.meta.env.PROD ? 'esbuild.wasm' : './node_modules/esbuild-wasm/esbuild.wasm',
})

export const esbuildTransform = async (code: string) => {
  const result = await esbuild.transform(code, { loader: 'ts', target: 'es2015', format: 'esm' })
  return result.code
}
