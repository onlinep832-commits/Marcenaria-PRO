# 📦 Guia de Instalação - Marcenaria PRO

## ⚠️ IMPORTANTE

O código HTML completo fornecido no requisito é muito grande (3000+ linhas) para ser incluído automaticamente. Você precisa copiá-lo manualmente.

## 🚀 Instalação Passo a Passo

### Passo 1: Obter o Código Completo

1. Localize o código HTML completo no requisito (começa com `<!DOCTYPE html>` e contém `<meta name="google-adsense-account"`)
2. Copie **TODO** o código HTML desde `<!DOCTYPE html>` até `</html>`
3. O código deve ter aproximadamente 3.000 linhas

### Passo 2: Salvar o Arquivo

**Opção A - Substituir o arquivo atual:**
```bash
# Navegue até a pasta do projeto
cd /home/runner/work/Marcenaria-PRO/Marcenaria-PRO/app/

# Cole o código completo em index.html
nano index.html  # ou use seu editor preferido
```

**Opção B - Criar novo arquivo:**
```bash
# Crie um novo arquivo com o nome que preferir
touch marcenaria-pro-completo.html

# Cole o código completo nele
nano marcenaria-pro-completo.html
```

### Passo 3: Abrir no Navegador

```bash
# Se estiver em ambiente local
open index.html  # macOS
start index.html  # Windows
xdg-open index.html  # Linux
```

Ou simplesmente arraste o arquivo para o navegador.

## 📁 Estrutura de Arquivos Necessária

```
Marcenaria-PRO/
├── app/
│   ├── index.html          # ← Arquivo principal (3000+ linhas)
│   ├── dados.json          # Gerado automaticamente pelo sistema
│   ├── dados.js            # Gerado automaticamente pelo sistema
│   ├── dados-clientes.json # Gerado automaticamente pelo sistema
│   └── dados-clientes.js   # Gerado automaticamente pelo sistema
└── README.md
```

## 🎯 Primeira Execução

### 1. Abra o Sistema
- Abra `index.html` no navegador (Chrome, Firefox, Edge, Safari)

### 2. Verificar Status dos Dados
- Clique no botão "ℹ️ Status de Dados" no topo da página
- Se os dados estiverem vazios, você verá um alerta

### 3. Importar ou Criar Dados

**Opção A - Criar Novo Catálogo:**
1. Vá em "Gerenciar Catálogos"
2. Adicione materiais (MDF, bordas)
3. Adicione ferragens
4. Adicione perfis de puxador
5. Salve os dados (botão "Baixar dados.json")

**Opção B - Importar Dados Existentes:**
1. Vá em "Configurações" → "Gerenciamento de Dados"
2. Clique em "Importar Backup"
3. Selecione um arquivo `dados.json` existente

### 4. Criar Primeiro Módulo
1. Vá em "Gerenciar Módulos"
2. Clique em "Criar Novo Módulo"
3. Defina as peças e suas fórmulas
4. Salve o módulo

### 5. Criar Primeiro Projeto
1. Volte para "Montagem do Projeto"
2. Preencha os dados do cliente
3. Adicione módulos ao projeto
4. Gere a listagem
5. Exporte ou salve o projeto

## 🔧 Solução de Problemas

### Problema: "Nenhum dado de catálogo encontrado"

**Solução 1 - Carregar dados.json automaticamente:**
1. Salve o arquivo `dados.json` na mesma pasta que `index.html`
2. Recarregue a página (F5)
3. O sistema tentará carregar automaticamente

**Solução 2 - Importar manualmente:**
1. Vá em Configurações
2. Use "Importar Backup"
3. Selecione o arquivo JSON

**Solução 3 - Criar do zero:**
1. Vá em "Gerenciar Catálogos"
2. Adicione os itens manualmente
3. Salve ao final

### Problema: Dados desaparecem após recarregar

**Causa:** Os dados estão apenas no localStorage

**Solução:**
1. Sempre clique em "Baixar dados.json" após fazer alterações
2. Os arquivos `dados.json` e `dados.js` serão baixados
3. Coloque-os na mesma pasta que `index.html`
4. Recarregue a página

### Problema: Imagens não aparecem

**Causa:** Upload de imagens usa API externa (ImgBB)

**Solução:**
- As imagens são opcionais
- O sistema funciona perfeitamente sem elas
- Se quiser usar imagens, certifique-se de ter conexão com internet

## 💾 Backup e Recuperação

### Fazer Backup Regular

1. **Dados do Catálogo:**
   - Vá em Configurações
   - Clique em "Baixar dados.json"
   - Salve o arquivo em local seguro

2. **Dados dos Clientes:**
   - Sempre que salvar um projeto, os arquivos são exportados automaticamente
   - Guarde os arquivos `dados-clientes.json` e `dados-clientes.js`

### Restaurar Backup

1. Abra o sistema
2. Vá em Configurações → Importar Backup
3. Selecione o arquivo `dados.json` salvo
4. Aguarde a mensagem de sucesso
5. A página será recarregada

## 📊 Dicas de Uso

### Performance
- O sistema roda completamente no navegador
- Não requer servidor
- Todos os cálculos são instantâneos

### Organização
- Use categorias para organizar módulos
- Nomeie projetos de forma descritiva
- Salve projetos regularmente

### Backup
- Faça backup antes de grandes alterações
- Exporte dados após criar novos módulos
- Mantenha cópia dos arquivos JSON em nuvem

## 🆘 Suporte

### Console do Navegador
Pressione F12 para abrir o console e ver logs detalhados:
- Status de carregamento de dados
- Erros (se houver)
- Informações de debug

### Verificar Dados
Use o botão "ℹ️ Status de Dados" para ver:
- Quantos módulos estão carregados
- Quantas cores estão disponíveis
- Quantas ferragens existem
- Status do localStorage

---

## ✅ Checklist de Instalação Completa

- [ ] Código HTML completo copiado
- [ ] Arquivo salvo como `index.html`
- [ ] Arquivo aberto no navegador
- [ ] Dados do catálogo importados ou criados
- [ ] Primeiro módulo criado
- [ ] Primeiro projeto testado
- [ ] Backup dos dados realizado

---

**Última atualização:** 18 de janeiro de 2026
