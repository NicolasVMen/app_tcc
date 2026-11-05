# Candidata 1.0.2 A1 — 05/11/2026

Usuário confirmou Sentinela em espera e silenciosa antes da preparação.
Autorização ADB do Samsung foi refeita; consulta somente leitura confirmou
oficial 1.0.1/código 2, instalada em 17/10/2026. Nenhum firmware foi alterado.

## Fontes e preservação

- Implementação opt-in: commit `ac55c412f60c4de890d0e545417f70c781e2fefb`.
- Preparação de versão 1.0.2, base Android 3: commit `5f99446`.
- `npm run typecheck`: aprovado; `npm test`: 248 aprovados, sem falhas/skips/TODO.
- Perfil `autonomia-instrumentada`: herda `oficial-validada`; coletor A1 true,
  ferramentas internas false, monitor validado true e mesmo cliente Google Web.
- Oficial anterior preservada em `dist/android/oficial-1.0.1` e copiada para
  `backups/releases/2026-11-05_autonomia-a1`; SHA-256 reconferido:
  `13D5DC02313AFDA5356AAB14A5FCDC0EEAA1B3868ADF2A1ECA4F5968A750FC9C`.
- Fontes de upload inspecionadas antes e depois do envio: 66 arquivos,
  2.540.134 bytes; inventário SHA-256
  `175234dba8d57191c2846fe9406dfafe6a5bd7b11b6cd4f4b727818db6a80eca`.
- ZIP do arquivo de fontes preservado no mesmo checkpoint; SHA-256
  `795806120F7C2F2093E232771DA2F18362E7D012B9C4B107EFB1BC615319C1B0`.
  Documentos, fotos, coletas, `.env.local` e credenciais privadas não incluídos.

## Compilação remota solicitada

EAS CLI 21.0.0 existente, conta `nicolas_venciguerra_men`, projeto
`be41ccc5-f32b-428e-9974-91dffc0fed45`. Código remoto consultado antes: 2.
Compilação incrementou 2 → 3 e selecionou a configuração original
`Build Credentials A632cnQN2k (default)`. Isso não substitui conferência do
certificado no APK final.

- Build: `b001cb0f-65ec-4744-a69e-00ca7c4fc1d8`.
- [Acompanhamento no EAS](https://expo.dev/accounts/nicolas_venciguerra_men/projects/escolta-unitau/builds/b001cb0f-65ec-4744-a69e-00ca7c4fc1d8).
- Perfil: `autonomia-instrumentada`, APK interno, pacote oficial existente.
- Fontes comprimidas/enviadas, fingerprint calculado.

**Até este registro: nenhum APK A1 instalado, nenhuma coleta física iniciada.**
Antes de instalar, conferir assinatura, pacote, versão, código, recursos,
manifesto e bundle. Instalar como atualização, sem desinstalar ou limpar dados,
mantendo espera e sem abrir/retomar proteção automaticamente.

## Validação após instalação

Usar o [roteiro A1](../testes/COLETOR_AUTONOMIA_A1_2026-11-05.md): iniciar
manualmente uma coleta curta, conferir USB/bateria, estados reais, tela bloqueada,
persistência e arquivos exportados antes do ciclo longo. Não chamar os testes
automatizados ou a compilação de resultado de autonomia.
