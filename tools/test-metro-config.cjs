const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../metro.config.js'), 'utf8');

function load(root, defaults) {
  const module = { exports: {} };
  vm.runInNewContext(source, { module, __dirname: root, require: name => {
    assert.equal(name, 'expo/metro-config');
    return { getDefaultConfig: requestedRoot => { assert.equal(requestedRoot, root); return defaults; } };
  } });
  return module.exports;
}

test('Metro ignora só jtmp do projeto, com caminho absoluto/relativo e separadores Windows/POSIX', () => {
  const root = 'C:\\Users\\Nicolas Venciguerra\\Desktop\\app_tcc';
  const config = load(root, { resolver: {} });
  const excluded = file => config.resolver.blockList.some(pattern => pattern.test(file));
  for (const file of ['.expo/jtmp', '.expo\\jtmp\\socket_1930626818',
    `${root}\\.expo\\jtmp`, `${root}\\.expo\\jtmp\\socket_1930626818`,
    `${root.replaceAll('\\', '/')}/.expo/jtmp/socket_1930626818`]) assert.equal(excluded(file), true, file);
  for (const file of ['src/screens/DashboardScreen.tsx', 'assets/alert_tone.wav', 'node_modules/expo/AppEntry.js',
    '.expo/.virtual-metro-entry.bundle', '.expo/jtmp-backup/file.js', 'src/.expo/jtmp/file.js',
    `${root}\\.expo\\jtmp2\\source.js`, `${root}-other\\.expo\\jtmp\\file`]) assert.equal(excluded(file), false, file);
});

test('Metro preserva bloqueios e todas as demais opções padrão do Expo', () => {
  const existing = /\.expo[\\/]types/;
  const resolver = { blockList: existing, sourceExts: ['js', 'tsx'], assetExts: ['png', 'wav'] };
  const transformer = {}, serializer = {}, watcher = {}, cacheStores = [];
  const config = load('/workspace/app.tcc+(1)', { resolver, transformer, serializer, watcher, cacheStores });
  assert.equal(config.resolver.blockList[0], existing);
  assert.equal(config.resolver.sourceExts, resolver.sourceExts);
  assert.equal(config.resolver.assetExts, resolver.assetExts);
  assert.equal(config.transformer, transformer); assert.equal(config.serializer, serializer);
  assert.equal(config.watcher, watcher); assert.equal(config.cacheStores, cacheStores);
  assert.equal(config.resolver.blockList[1].test('/workspace/app.tcc+(1)/.expo/jtmp/socket'), true);
  assert.equal(config.resolver.blockList[1].test('/workspace/appXtcc1/.expo/jtmp/socket'), false);
  const arrayConfig = load('/workspace', { resolver: { blockList: [existing] } });
  assert.equal(arrayConfig.resolver.blockList[0], existing);
  assert.equal(arrayConfig.resolver.blockList.length, 2);
});

test('watcher real não observa jtmp existente nem criada depois de iniciar', async () => {
  const FallbackWatcher = require('../node_modules/metro-file-map/src/watchers/FallbackWatcher.js').default;
  const temporaryParent = path.resolve(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(temporaryParent, 'escolta-metro-watch-'));
  assert.equal(path.dirname(path.resolve(fixture)), temporaryParent);
  assert.ok(path.basename(fixture).startsWith('escolta-metro-watch-'));
  let watcher;
  try {
    const expo = path.join(fixture, '.expo'), jtmp = path.join(expo, 'jtmp');
    fs.mkdirSync(jtmp, { recursive: true });
    fs.mkdirSync(path.join(fixture, 'src'));
    fs.writeFileSync(path.join(jtmp, 'socket_fixture'), 'socket simulado, não fonte');
    const config = load(fixture, { resolver: {} });
    const ignored = new RegExp(config.resolver.blockList.map(pattern => `(${pattern.source})`).join('|'));
    const errors = [];
    watcher = new FallbackWatcher(fixture, { ignored, globs: ['**/*'], dot: true });
    watcher.onError(error => errors.push(error));
    await watcher.startWatching();
    assert.ok(watcher.watched[path.join(fixture, 'src')]);
    assert.equal(watcher.watched[jtmp], undefined);
    // Evento com caminho relativo: mesma decisão usada quando Gradle cria jtmp depois.
    await watcher._processChange(expo, 'rename', 'jtmp');
    assert.equal(watcher.watched[jtmp], undefined);
    assert.equal(errors.length, 0);
  } finally {
    if (watcher) await watcher.stopWatching();
    // Somente a fixture nova e explicitamente validada dentro de os.tmpdir().
    assert.equal(path.dirname(path.resolve(fixture)), temporaryParent);
    assert.ok(path.basename(fixture).startsWith('escolta-metro-watch-'));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
