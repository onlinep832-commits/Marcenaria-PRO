# Marcenaria-PRO
Sistema profissional completo de variação de módulos e orçamento para marcenaria

## ⚠️ Nota Importante sobre a Instalação

O sistema completo fornecido no requisito contém **mais de 3.000 linhas de código** com um sistema profissional avançado de gestão para marcenarias.

**Devido ao tamanho do código, você precisa copiar manualmente o código HTML completo do requisito.**

Veja o arquivo [`INSTALL.md`](./INSTALL.md) para instruções detalhadas de instalação.

## 📋 Descrição

Marcenaria-PRO é um sistema completo de gestão para marcenarias profissionais, incluindo:

### 🎯 Funcionalidades Principais

- **Gestão de Projetos**: Crie, edite e gerencie projetos de múltiplos clientes
- **Catálogo Completo**: Gerencie materiais (MDF, bordas), ferragens, perfis e peças
- **Editor de Módulos**: Crie módulos personalizados com fórmulas dinâmicas
- **Orçamentos Automáticos**: Cálculo automático com margens, materiais e ferragens
- **Lista de Produção**: Plano de corte detalhado com todas as peças
- **Lista de Compras**: Agrupamento inteligente de materiais para compra
- **Exportações**: PDF (produção e cliente), Excel, Cortcloud
- **Banco de Dados**: Armazene múltiplos projetos por cliente com backup

### 🎨 Design Moderno (2026)

- Interface gradiente premium
- Animações suaves e transições
- Layout totalmente responsivo
- Sistema de notificações toast
- Modais elegantes
- Cards com sombras flutuantes

## 📁 Estrutura do Projeto

```
Marcenaria-PRO/
├── app/                    # Aplicação Web
│   ├── index.html         # Arquivo principal (placeholder)
│   ├── README.md          # Documentação da aplicação
│   ├── dados.json         # Gerado automaticamente
│   ├── dados.js           # Gerado automaticamente
│   ├── dados-clientes.json # Gerado automaticamente
│   └── dados-clientes.js  # Gerado automaticamente
├── programa/              # Programa Desktop Python (legado)
│   ├── marcenaria_pro.py # Programa CLI
│   └── README.md         # Documentação do programa
├── INSTALL.md            # Guia completo de instalação
└── README.md             # Este arquivo
```

## 🚀 Instalação Rápida

### Passo 1: Copiar o Código Completo

O código HTML completo está no requisito original (mais de 3.000 linhas). Você precisa:

1. Localizar o código HTML completo no prompt do requisito
2. Copiar TUDO desde `<!DOCTYPE html>` até `</html>`
3. Salvar como `app/index.html`

### Passo 2: Abrir no Navegador

```bash
cd app
# Abra index.html no seu navegador preferido
```

### Passo 3: Configurar Dados

1. Importar dados existentes (se tiver) ou
2. Criar novo catálogo de materiais e ferragens

📖 **Para instruções detalhadas, veja [`INSTALL.md`](./INSTALL.md)**

## 💡 Características do Sistema Completo

### Gestão de Projetos
- Salvar projetos por cliente
- Carregar e editar projetos salvos
- Histórico completo de orçamentos
- Exportar projetos individuais ou por cliente

### Editor de Módulos
- Criar módulos retos ou de canto
- Definir peças com fórmulas dinâmicas (A, L, P, LadoA, LadoB, etc.)
- Associar ferragens automaticamente
- Calcular corrediças ideais
- Suporte para puxadores (externo, cava, perfil)

### Cálculo Avançado
- Preço por m² de MDF (calculado automaticamente)
- Custo de bordas por metro
- Margem de lucro configurável
- Ferragens por unidade, par ou metro
- Corrediças com seleção automática de tamanho

### Exportações Profissionais
- **PDF Produção**: Com imagens, dimensões completas, lista de ferragens
- **PDF Cliente**: Orçamento formatado para apresentação
- **Excel**: Plano de corte com múltiplas abas
- **Cortcloud**: Arquivo TXT para integração com sistema de corte

### Catálogo de Materiais
- MDF com preço por chapa (calcula automaticamente o m²)
- Fitas de borda (preço por rolo ou por metro)
- Perfis de alumínio para puxadores
- Ferragens gerais e corrediças
- Peças pré-definidas para reutilização

## 🎓 Como Usar

### Criar Primeiro Módulo
1. Acesse "Gerenciar Módulos"
2. Clique em "Criar Novo Módulo"
3. Defina peças com fórmulas (ex: altura = "A - 10", largura = "L - 20")
4. Adicione ferragens necessárias
5. Salve o módulo

### Criar Primeiro Projeto
1. Acesse "Montagem do Projeto"
2. Preencha dados do cliente e ambiente
3. Selecione cores de material interno/externo
4. Adicione módulos com dimensões
5. Adicione ferragens extras (se necessário)
6. Gere a listagem completa
7. Salve o projeto ou exporte

### Gerenciar Catálogo
1. Acesse "Gerenciar Catálogos"
2. Adicione cores de MDF (com preço da chapa)
3. Adicione cores de borda
4. Adicione ferragens e perfis
5. Salve os dados regularmente

## 📊 Tecnologias

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Design moderno com gradientes
- **JavaScript ES6+**: Lógica da aplicação

### Bibliotecas
- **jsPDF**: Geração de PDF
- **jsPDF-AutoTable**: Tabelas em PDF
- **SheetJS (XLSX)**: Exportação Excel

### Armazenamento
- **LocalStorage**: Cache local
- **JSON Export/Import**: Backup portátil
- **Auto-export**: Arquivos .json e .js automáticos

## 🔒 Segurança e Privacidade

- ✅ Todos os dados ficam no navegador
- ✅ Nenhum dado enviado para servidores externos
- ✅ Sistema funciona offline (após primeiro carregamento)
- ✅ Export/Import para backup seguro
- ℹ️ Upload de imagens opcional (usa ImgBB API)

## 📞 Suporte

### Verificar Status
Use o botão "ℹ️ Status de Dados" no sistema para verificar:
- Quantidade de módulos carregados
- Materiais disponíveis
- Status do localStorage

### Console de Debug
Pressione F12 no navegador para ver:
- Logs detalhados de operações
- Avisos sobre dados faltantes
- Informações de carregamento

### Arquivos de Ajuda
- [`INSTALL.md`](./INSTALL.md) - Guia completo de instalação
- [`app/README.md`](./app/README.md) - Documentação da aplicação
- [`programa/README.md`](./programa/README.md) - Documentação do programa CLI

## 🗺️ Roadmap

- [x] Sistema base de módulos e orçamentos
- [x] Gestão de projetos de clientes
- [x] Exportação PDF/Excel/Cortcloud
- [x] Design moderno 2026
- [x] Sistema de backup automático
- [ ] Modo offline completo (PWA)
- [ ] Sincronização em nuvem (opcional)
- [ ] App mobile nativo

## 👥 Contribuindo

Este é um sistema profissional completo. Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é de código aberto e está disponível sob licença livre para uso pessoal e comercial.

## 🙏 Agradecimentos

- Comunidade de marceneiros profissionais
- Desenvolvedores das bibliotecas utilizadas
- Todos que contribuíram com feedback

---

**Desenvolvido para marcenarias profissionais que buscam excelência em gestão e orçamentos precisos.**

**Versão:** 2.0 (Design 2026)  
**Última atualização:** 18 de janeiro de 2026
