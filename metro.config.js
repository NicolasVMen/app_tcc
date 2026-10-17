const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList ?? [];
// O Gradle usa este diretório para sockets locais do Java. Não são fontes nem assets.
// Metro usa caminhos absolutos no crawler e relativos em eventos do watcher.
const escapedRoot = __dirname.split(/[\\/]/)
  .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\\\/]');
const temporaryBuildFiles = new RegExp(`^(?:${escapedRoot}[\\\\/])?\\.expo[\\\\/]jtmp(?:[\\\\/]|$)`);

config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList]),
  temporaryBuildFiles,
];

module.exports = config;
