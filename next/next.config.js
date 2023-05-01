class WasmChunksFixPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("WasmChunksFixPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "WasmChunksFixPlugin" },
        (assets) =>
          Object.entries(assets).forEach(([pathname, source]) => {
            if (!pathname.match(/\.wasm$/)) return;
            compilation.deleteAsset(pathname);

            const name = pathname.split("/")[1];
            const info = compilation.assetsInfo.get(pathname);
            compilation.emitAsset(name, source, info);
          })
      );
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  distDir: 'build',
  webpack: (config, options) => {
    config.experiments.asyncWebAssembly = true;
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    if (!options.dev && options.isServer) {
      config.output.webassemblyModuleFilename = "chunks/[id].wasm";
      config.plugins.push(new WasmChunksFixPlugin());
    }

    return config;
  },
};

module.exports = nextConfig;
