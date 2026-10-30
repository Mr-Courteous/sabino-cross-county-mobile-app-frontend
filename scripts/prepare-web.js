/**
 * Prepares this Expo project to be built as a website.
 *   node scripts/prepare-web.js
 *
 * It does NOT install anything by itself. It
 *   1. checks that the web packages are in package.json (and prints the exact
 *      install command if not),
 *   2. makes sure app.json builds a single-page web app
 *      ("web": { "bundler": "metro", "output": "single" }) - needed because the
 *      app uses localStorage, which doesn't exist while a static site is
 *      being pre-rendered at build time,
 *   3. adds a "build:web" script to package.json.
 * Backups are saved as *.bak before any file is changed.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const backupAndWrite = (f, obj) => {
  const full = path.join(root, f);
  fs.copyFileSync(full, full + '.bak');
  fs.writeFileSync(full, JSON.stringify(obj, null, 2) + '\n');
};

if (!fs.existsSync(path.join(root, 'package.json'))) {
  console.error('❌ No package.json here. Run this from the root of the Expo project (the folder that contains "app").');
  process.exit(1);
}

// 1. packages
const pkg = read('package.json');
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const need = ['react-dom', 'react-native-web', '@expo/metro-runtime'].filter((d) => !deps[d]);
if (need.length) {
  console.log(`⚠️  Missing web packages: ${need.join(', ')}`);
  console.log(`    Run:  npx expo install ${need.join(' ')}\n`);
} else {
  console.log('✅ Web packages already installed.');
}
if (!deps['expo-router']) console.log('⚠️  expo-router not found in package.json - is this the right folder?');

// 2. app.json
if (fs.existsSync(path.join(root, 'app.json'))) {
  const app = read('app.json');
  app.expo = app.expo || {};
  app.expo.web = { ...(app.expo.web || {}), bundler: 'metro', output: 'single' };
  backupAndWrite('app.json', app);
  console.log('✅ app.json: web.bundler = "metro", web.output = "single"  (backup: app.json.bak)');
} else {
  console.log('⚠️  No app.json found (you may use app.config.js/ts). Add this by hand inside "expo":');
  console.log('    "web": { "bundler": "metro", "output": "single" }\n');
}

// 3. script
pkg.scripts = pkg.scripts || {};
if (!pkg.scripts['build:web']) {
  pkg.scripts['build:web'] = 'expo export --platform web';
  backupAndWrite('package.json', pkg);
  console.log('✅ package.json: added script "build:web"  (backup: package.json.bak)');
} else {
  console.log('✅ package.json already has "build:web".');
}

console.log('\nNext: npm run build:web   (creates the "dist" folder), then test it with:  npx serve dist -s');
