// Resolve nomes lógicos Android para caminhos físicos, inclusive após aapt optimize.
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function resourcePaths(table, type, name) {
  const pattern = new RegExp(`^\\s*resource\\s+0x[0-9a-f]+\\s+[^\\s:]+:${escape(type)}/${escape(name)}:`
    + `\\s+t=0x03[^\\r\\n]*\\r?\\n\\s*\\(string(?:8|16)?\\)\\s+"([^"\\r\\n]+)"`, 'gmi');
  return [...new Set([...table.matchAll(pattern)].map(match => match[1]))]
    .filter(value => /^res\//.test(value) && !value.split('/').includes('..') && !value.includes('\\'));
}
function inspectResourcePaths(table) {
  return {
    nativeAlarm: resourcePaths(table, 'raw', 'escolta_alerta'),
    fallbackAlarm: resourcePaths(table, 'raw', 'assets_alert_tone'),
    ionicons: resourcePaths(table, 'raw', 'node_modules_expo_vectoricons_build_vendor_reactnativevectoricons_fonts_ionicons'),
    googleIcon: resourcePaths(table, 'drawable', 'assets_googleg'),
  };
}
module.exports = { resourcePaths, inspectResourcePaths };
if (require.main === module) {
  const fs = require('node:fs');
  process.stdout.write(JSON.stringify(inspectResourcePaths(fs.readFileSync(0, 'utf8'))) + '\n');
}
