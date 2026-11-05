import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system/legacy';
import { withTimeout } from '../utils/asyncTimeout';

let busy=false;
export async function exportAutonomyFile(content: string, summary: boolean, action:'save'|'share') {
  if (busy) throw new Error('Aguarde a exportação atual.');
  busy=true;
  const filename=`Escolta_autonomia_a1_${new Date().toISOString().replace(/[:.]/g,'-')}_${summary?'resumo':'registros'}.csv`;
  try {
    if (action==='save') {
      if (Platform.OS!=='android') throw new Error('Use Compartilhar neste aparelho.');
      const permission=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return 'Operação cancelada. A coleta foi preservada.';
      const uri=await withTimeout(FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri,filename,'text/csv'),15000,'Não foi possível criar o arquivo.');
      await withTimeout(FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8}),15000,'Gravação não confirmada. Confira o arquivo antes de tentar novamente.');
      return 'Arquivo salvo na pasta escolhida.';
    }
    if (!requireOptionalNativeModule('ExpoSharing')) throw new Error('Compartilhamento indisponível nesta instalação. Use Salvar.');
    const sharing=await import('expo-sharing');
    if (!await sharing.isAvailableAsync() || !FileSystem.cacheDirectory) throw new Error('Use Salvar CSV neste aparelho.');
    const folder=FileSystem.cacheDirectory+'escolta-autonomia/';
    await withTimeout(FileSystem.makeDirectoryAsync(folder,{intermediates:true}),10000,'Armazenamento temporário indisponível.');
    const uri=folder+filename;
    await withTimeout(FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8}),15000,'Não foi possível preparar o CSV.');
    await sharing.shareAsync(uri,{mimeType:'text/csv',UTI:'public.comma-separated-values-text',dialogTitle:'Autonomia do vestível — registro observado'});
    return 'Seletor de compartilhamento encerrado; confirme o recebimento. A coleta foi preservada.';
  } finally { busy=false; }
}
