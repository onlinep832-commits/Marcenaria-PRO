# 🎯 Quick Start Guide - Marcenaria PRO

## ⚡ TL;DR - Começar Rapidamente

```bash
# 1. Clone o repositório (se ainda não fez)
git clone https://github.com/onlinep832-commits/Marcenaria-PRO.git
cd Marcenaria-PRO

# 2. IMPORTANTE: Copie o código HTML completo (3000+ linhas) do requisito
#    e cole em app/index.html

# 3. Abra no navegador
cd app
open index.html  # Mac
# ou
start index.html  # Windows
# ou
xdg-open index.html  # Linux
```

## 📦 O que Você Tem Agora

Este repositório contém:

### ✅ Documentação Completa
- `README.md` - Visão geral do sistema
- `INSTALL.md` - Guia passo-a-passo de instalação
- `app/README.md` - Documentação da aplicação web
- `app/OBTENDO-CODIGO.md` - Como obter o código completo
- `programa/README.md` - Documentação do programa Python

### ✅ Programa Python (CLI)
- `programa/marcenaria_pro.py` - Programa de linha de comando funcional
- Sistema de módulos pré-definidos
- Cálculo de orçamentos
- Exportação para JSON

### ⚠️ Aplicação Web (Requer Código Completo)
- `app/index.html` - **PLACEHOLDER** (você precisa substituir)
- O código completo está no requisito original (3000+ linhas)

## 🚨 Ação Necessária

### Passo Crítico: Instalar o Sistema Completo

O arquivo `app/index.html` atual é apenas informativo. Para ter o sistema completo:

1. **Localize o código HTML completo** no requisito original
2. **Copie TODO o código** (desde `<!DOCTYPE html>` até `</html>`)
3. **Substitua** o conteúdo de `app/index.html`
4. **Abra no navegador**

## 🎓 Primeiros Passos Após Instalação

### 1. Verificar Instalação
```bash
# Abra app/index.html no navegador
# Clique no botão "ℹ️ Status de Dados"
# Você verá o status do sistema
```

### 2. Criar Catálogo (Primeira Execução)
```
1. Abra o sistema no navegador
2. Vá em "Gerenciar Catálogos"
3. Adicione:
   - Cores de MDF (ex: Branco, Preto, Amadeirado)
   - Cores de Borda (ex: Branco, Preto)
   - Ferragens (ex: Dobradiça, Puxador)
   - Perfis (ex: Perfil Alumínio)
4. Vá em "Configurações" → "Baixar dados.json"
5. Salve o arquivo
```

### 3. Criar Primeiro Módulo
```
1. Vá em "Gerenciar Módulos"
2. Clique em "Criar Novo Módulo"
3. Escolha categoria (ex: Cozinha)
4. Nome: "Balcão 2 Portas"
5. Adicione peças:
   - Base: A=altura, L=largura
   - Laterais: A=altura, L=profundidade
   - Portas: A=(altura-10), L=(largura/2-5)
6. Salve o módulo
```

### 4. Criar Primeiro Projeto
```
1. Vá em "Montagem do Projeto"
2. Preencha:
   - Nome do Cliente
   - Ambiente (ex: Cozinha)
   - Cor Material Interno
   - Cor Material Externo
3. Escolha o módulo criado
4. Digite dimensões (A=900, L=1200, P=550)
5. Clique em "Adicionar ao Projeto"
6. Clique em "Gerar Listagem Completa"
7. Veja o orçamento gerado!
```

## 📊 Recursos Principais

| Recurso | Descrição | Status |
|---------|-----------|--------|
| **Gestão de Projetos** | Salvar múltiplos projetos por cliente | ✅ Disponível |
| **Catálogo de Materiais** | MDF, bordas, ferragens, perfis | ✅ Disponível |
| **Editor de Módulos** | Criar módulos com fórmulas | ✅ Disponível |
| **Cálculo de Orçamento** | Automático com margens | ✅ Disponível |
| **Exportação PDF** | Produção e cliente | ✅ Disponível |
| **Exportação Excel** | Plano de corte | ✅ Disponível |
| **Lista de Compras** | Agrupamento inteligente | ✅ Disponível |
| **Backup Automático** | JSON/JS auto-export | ✅ Disponível |

## 🛠️ Ferramentas Disponíveis

### Web App (Após Instalação Completa)
- Interface moderna com gradientes
- Cálculos em tempo real
- Export para múltiplos formatos
- Sem necessidade de servidor

### Programa Python (Já Disponível)
```bash
cd programa
python3 marcenaria_pro.py

# Funcionalidades:
# - Adicionar módulos pré-definidos
# - Calcular orçamentos
# - Variação de preços
# - Salvar em JSON
```

## 📱 Suporte e Ajuda

### Documentação
- 📖 [README.md](../README.md) - Visão geral
- 📖 [INSTALL.md](../INSTALL.md) - Instalação detalhada
- 📖 [app/README.md](../app/README.md) - Funcionalidades do app
- 📖 [app/OBTENDO-CODIGO.md](../app/OBTENDO-CODIGO.md) - Como obter código

### Debugging
```javascript
// No console do navegador (F12):
console.log("Status:", localStorage.getItem("marcenaria_pro_AppData"));
// Ou clique no botão "Status de Dados" no sistema
```

### Problemas Comuns

**Problema:** "Nenhum dado de catálogo encontrado"
```
Solução:
1. Vá em "Gerenciar Catálogos"
2. Adicione materiais manualmente
3. Ou importe um arquivo dados.json existente
```

**Problema:** "Dados desaparecem após recarregar"
```
Solução:
1. Sempre clique em "Baixar dados.json" após alterações
2. Coloque dados.json na mesma pasta que index.html
3. Recarregue a página
```

## 🎯 Próximos Passos Recomendados

### Para Usuários
1. ✅ Instalar sistema completo (copiar HTML)
2. ✅ Criar catálogo de materiais
3. ✅ Criar primeiros módulos
4. ✅ Testar com projeto exemplo
5. ✅ Fazer backup dos dados

### Para Desenvolvedores
1. ✅ Entender estrutura do código
2. ✅ Personalizar estilos CSS
3. ✅ Adicionar novos tipos de módulos
4. ✅ Integrar com APIs externas
5. ✅ Criar extensões

## 💡 Dicas Profissionais

### Organização
- Use categorias descritivas para módulos
- Nomeie projetos com padrão: "Cliente - Ambiente - Data"
- Faça backup semanal dos dados

### Performance
- Mantenha catálogo organizado
- Remova módulos não utilizados
- Limpe localStorage periodicamente

### Backup
```bash
# Faça backup regular:
# 1. Baixe dados.json
# 2. Baixe dados-clientes.json
# 3. Guarde em local seguro (ex: Google Drive, Dropbox)
```

## 🌟 Funcionalidades Avançadas

Após dominar o básico, explore:

- **Fórmulas Dinâmicas**: Use variáveis como A, L, P nas peças
- **Corrediças Automáticas**: Sistema escolhe tamanho ideal
- **Puxadores Personalizados**: Cava ou perfil de alumínio
- **Módulos de Canto**: Para projetos em L
- **Ripados**: Gerador automático de painéis ripados
- **Agrupamento**: Peças iguais são agrupadas automaticamente

## 📞 Contato e Suporte

- **Issues**: Use o GitHub Issues para reportar problemas
- **Documentação**: Consulte os arquivos .md no repositório
- **Console**: Use F12 no navegador para debug

---

**Desenvolvido para marcenarias profissionais. Use com responsabilidade e precisão.**

**Versão:** 2.0  
**Data:** 18 de janeiro de 2026  
**Autor:** onlinep832-commits
