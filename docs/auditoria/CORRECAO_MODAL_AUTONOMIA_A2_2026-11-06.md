# Candidata 1.0.3 A1 — correção do modal de autonomia

Fonte: `77ec535`. APK anterior 1.0.2 preservado em
`dist/android/candidata-1.0.2-a1/`. Nenhum firmware foi alterado.

- Modal A1: altura limitada à janela, área inferior segura e rolagem aninhada,
  seguindo o modal de ensaio de proximidade que já havia sido corrigido.
- Rodapé do Sistema: versão lida de `app.json`, sem texto fixo `v1.0.0`.
- EAS perfil `autonomia-instrumentada`, build
  `b0e18cef-0a96-4e86-b510-be8d3c184308`, concluído em 06/11/2026.
- Arquivo de envio inspecionado: 66 arquivos, 2.540.653 bytes, somente fontes e
  recursos autorizados; sem documentos, fotos, CSV ou credenciais.
- APK: `dist/android/candidata-1.0.3-a1/Escolta_UNITAU_1.0.3_A1.apk`,
  95.676.336 bytes, SHA-256
  `D49ECF5F0566CB2F4686C51CA461407390E59A7B4B292AAA9F3F7B113B23AC82`.
- Verificador do artefato final aprovado: pacote
  `com.nicolasvmen.escoltaunitau`, versão 1.0.3/código 4, certificado original
  SHA-256 `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`,
  monitor validado, manifesto, permissões, bundle e recursos esperados.
- Bundle incorporado contém os identificadores do modal corrigido e `1.0.3`;
  não contém o rodapé literal `Escolta UNITAU v1.0.0`.

**Ainda não instalado/testado no Samsung.** O usuário informou que não consegue
conectar o celular nem a caixinha agora. Quando disponíveis, confirmar Sentinela
em espera e silenciosa antes de atualizar com `adb install -r`, sem desinstalar
ou limpar dados. Após instalar, conferir 1.0.3 no Android e no rodapé; abrir o
Registro de autonomia, rolar de cima até os dois botões de salvar e voltar,
repetir após fechar/reabrir o modal e após reiniciar o aplicativo. Salvar um CSV
em pasta local e validar que a coleta anterior permaneceu; não apagar registros.
Não retomar proteção nem produzir alerta real apenas para este teste de layout.
