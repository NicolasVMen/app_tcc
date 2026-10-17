import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { withTimeout } from '../utils/asyncTimeout';
import { buildTrialExport, TrialExportOptions } from '../utils/proximityExport';
import type { TrialRun } from '../utils/proximityTrial';

type ExportResult = { status: 'shared' | 'saved' | 'cancelled'; filename: string };
let exporting = false;

/** Uma operação por vez, inclusive enquanto o seletor do Android está aberto. */
export async function exportTrialCsv(runs: TrialRun[], options: TrialExportOptions,
  action: 'share' | 'save'): Promise<ExportResult> {
  if (exporting) throw new Error('Já existe uma exportação em andamento.');
  exporting = true;
  try {
    const file = buildTrialExport(runs, options);
    if (action === 'save') {
      if (Platform.OS !== 'android') throw new Error('Neste aparelho, use Compartilhar CSV para salvar o arquivo.');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return { status: 'cancelled', filename: file.filename };
      const uri = await withTimeout(FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri, file.filename, 'text/csv'), 15000, 'Não foi possível criar o CSV na pasta escolhida.');
      await withTimeout(FileSystem.writeAsStringAsync(uri, file.content, { encoding: FileSystem.EncodingType.UTF8 }),
        15000, 'A gravação não foi confirmada. Verifique o arquivo na pasta escolhida antes de tentar novamente.');
      return { status: 'saved', filename: file.filename };
    }
    // Importação tardia: abrir o app antigo não pode falhar só por faltar o novo módulo.
    if (!requireOptionalNativeModule('ExpoSharing')) {
      throw new Error('Atualize o aplicativo para compartilhar arquivos. Enquanto isso, use Salvar CSV no celular.');
    }
    const Sharing = await import('expo-sharing');
    if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível. Use Salvar CSV no celular.');
    if (!FileSystem.cacheDirectory) throw new Error('O armazenamento temporário está indisponível.');
    const directory = FileSystem.cacheDirectory + 'escolta-exports/';
    await withTimeout(FileSystem.makeDirectoryAsync(directory, { intermediates: true }),
      10000, 'Não foi possível preparar a pasta temporária.');
    const uri = directory + file.filename;
    await withTimeout(FileSystem.writeAsStringAsync(uri, file.content, { encoding: FileSystem.EncodingType.UTF8 }),
      15000, 'Não foi possível preparar o CSV. O histórico continua guardado no aplicativo.');
    // Apenas a URI passa pela Intent; nunca enviar o CSV inteiro em EXTRA_TEXT.
    // Não apagar ao retornar: o destinatário pode ainda estar lendo o arquivo.
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text',
      dialogTitle: `Escolta — ${file.runCount} ensaio(s), ${file.sampleCount} amostras` });
    // O retorno do seletor não comprova envio; também pode significar cancelamento.
    return { status: 'shared', filename: file.filename };
  } finally {
    exporting = false;
  }
}
