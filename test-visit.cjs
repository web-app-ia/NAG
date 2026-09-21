const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const srcDir = path.join(process.cwd(), 'src');

esbuild.build({
  entryPoints: ['src/views/VisitExhibition.js'],
  bundle: true,
  format: 'cjs',
  jsx: 'transform',
  loader: { '.js': 'jsx', '.png': 'empty', '.jpg': 'empty', '.jpeg': 'empty', '.gif': 'empty', '.svg': 'empty', '.webp': 'empty', '.mp4': 'empty', '.glb': 'empty', '.gltf': 'empty', '.css': 'empty', '.scss': 'empty' },
  outfile: 'node_modules/.cache/visit-exhibition.test.cjs',
  external: ['react','react-dom','react-dom/server','three','@react-three/fiber','@react-three/drei','@react-three/postprocessing','postprocessing','react-router-dom','react-bootstrap','axios','agora-rtc-sdk-ng','@fortawesome/*','chart.js','react-chartjs-2','react-chartist'],
  plugins: [{
    name: 'stubs',
    setup(build) {
      build.onResolve({ filter: /^(components|views|net|contexts|assets|routes\.js)/ }, (args) => {
        let p = args.path;
        if (p.startsWith('routes.js')) return { path: path.join(srcDir, 'routes.js') };
        for (const ext of ['.jsx', '.js', '']) {
          const cand = path.join(srcDir, p + ext);
          console.log('MODULE EVAL OK');
try { fs.accessSync(cand); return { path: cand }; } catch (e) {}
        }
        return { path: 'stub-asset', namespace: 'stub' };
      });
      build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
        contents: 'export default "";',
        loader: 'js',
      }));
    },
  }],
  logLevel: 'silent',
}).then(runTest).catch((e) => { console.log('BUILD ERROR: ' + e.message); });


// Rendu SSR du composant pour capturer les erreurs de portee/execution.
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');

// Stubs navigateur minimaux.
global.localStorage = { getItem: () => 'ADMIN', setItem: () => {}, removeItem: () => {}, clear: () => {} };
global.window = { addEventListener: () => {}, removeEventListener: () => {}, innerWidth: 1280, location: { href: '' }, navigator: { userAgent: 'test' }, speechSynthesis: { cancel: () => {} } };
global.document = { documentElement: { scrollTop: 0, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }, scrollingElement: { scrollTop: 0 }, addEventListener: () => {}, removeEventListener: () => {}, body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } } };
global.fetch = () => Promise.reject(new Error('no network (test)'));
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'test', clipboard: undefined }, configurable: true });

function runTest() {
console.log('BUNDLE OK');
const mod = require('./node_modules/.cache/visit-exhibition.test.cjs');
const VisitExhibition = mod.default || mod;
console.log('MODULE EVAL OK');
try {
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(VisitExhibition)));
  console.log('SSR RENDER OK, ' + html.length + ' chars');
} catch (e) {
  console.log('RENDER ERROR: ' + e.message);
  console.log((e.stack || '').split('\n').slice(0, 6).join('\n'));
}
}
