# 📻 Mapeamento de Cobertura Rádio 2.0 - E-MÍDIAS

Sistema avançado para visualização interativa da cobertura geográfica de rádios com processamento de arquivos KMZ e KML do Google Drive.

## 🚀 Novidades da Versão 2.0

### ✨ Recursos Principais

- **🗺️ Processamento de KMZ**: Extração automática de imagens de cobertura (GroundOverlay) e legendas (ScreenOverlay)
- **📊 Dados Técnicos**: Extração de informações da antena (frequência, potência, ERP, altura, sensibilidade)
- **🏙️ Análise Populacional**: Processamento de KML com dados detalhados de população por cidade
- **🎨 Qualidade de Sinal**: Marcadores coloridos por qualidade (Excelente/Ótimo/Fraco)
- **📈 Estatísticas Avançadas**: População total, coberta, distribuição por gênero e faixa etária
- **📍 Visualização Interativa**: Mapa Leaflet com imagem de cobertura sobreposta
- **📊 Exportação Excel**: Lista completa de cidades com todos os dados

## 📋 Estrutura do Projeto

```
mapeamento-radio-2/
├── index.html              # Página principal
├── style.css               # Estilos com identidade E-MÍDIAS
├── script.js               # Lógica principal (processamento KMZ/KML)
├── functions/
│   └── radio-data.js       # Cloudflare Function (API Notion)
├── wrangler.toml           # Configuração Cloudflare Pages
├── package.json            # Dependências
├── _headers                # Configuração CORS
└── README.md               # Esta documentação
```

## 🔧 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Mapas**: Leaflet + OpenStreetMap
- **Processamento**: JSZip (arquivos KMZ), DOMParser (XML/KML)
- **Exportação**: SheetJS (Excel)
- **Backend**: Cloudflare Pages Functions
- **Banco de Dados**: Notion API

## 📦 Instalação

### 1. Preparar o Repositório Git

```bash
# Criar pasta do projeto
mkdir mapeamento-radio-2
cd mapeamento-radio-2

# Inicializar git
git init

# Criar arquivos (copie o conteúdo dos artifacts)
# - index.html
# - style.css
# - script.js
# - wrangler.toml
# - package.json
# - _headers
# - README.md

# Criar pasta functions
mkdir functions

# Criar function (copie o conteúdo do artifact)
# - functions/radio-data.js

# Adicionar ao git
git add .
git commit -m "Initial commit - Mapeamento Radio 2.0"
```

### 2. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e crie um novo repositório
2. Não inicialize com README (já temos um)
3. Copie a URL do repositório

```bash
# Conectar ao GitHub
git remote add origin https://github.com/SEU_USUARIO/mapeamento-radio-2.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Cloudflare Pages

#### Opção A: Via Dashboard (Recomendado)

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vá em **Workers & Pages** > **Create application** > **Pages**
3. Conecte seu repositório GitHub
4. Configurações:
   - **Project name**: `mapeamento-radio-2`
   - **Production branch**: `main`
   - **Build command**: (deixe vazio)
   - **Build output directory**: `/`
5. Clique em **Save and Deploy**

#### Opção B: Via CLI

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Login no Cloudflare
wrangler login

# Deploy
wrangler pages deploy . --project-name=mapeamento-radio-2
```

### 4. Configurar Variáveis de Ambiente

1. No dashboard do Cloudflare Pages:
2. Vá em **Settings** > **Environment Variables**
3. Adicione para **Production**:
   - **Variable name**: `NOTION_TOKEN`
   - **Value**: `secret_XXXXXXX` (seu token do Notion)
4. Clique em **Save**

### 5. Obter Token do Notion

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **+ New integration**
3. Configure:
   - **Name**: Mapeamento Radio 2.0
   - **Associated workspace**: Seu workspace
   - **Capabilities**: Read content
4. Copie o **Internal Integration Token** (começa com `secret_`)
5. No Notion, compartilhe seu banco de dados com a integração:
   - Abra o database
   - Clique em **Share**
   - Adicione sua integração

## 📝 Configuração do Notion

### Estrutura do Database

Seu database no Notion deve ter os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **Emissora** | Title | Nome da rádio |
| **Dial** | Text | Frequência (ex: 107.3 FM) |
| **Região** | Select | Região do Brasil |
| **UF** | Select | Estado (sigla) |
| **Praça** | Text | Cidade principal |
| **KMZ2** | URL | Link do Google Drive para arquivo KMZ |
| **KML2** | URL | Link do Google Drive para arquivo KML |
| **Imagem** | URL | Logo da rádio (opcional) |

### Compartilhar Arquivos do Google Drive

**IMPORTANTE**: Os arquivos KMZ2 e KML2 no Google Drive devem estar **públicos**:

1. Abra o arquivo no Google Drive
2. Clique em **Compartilhar**
3. Em **Acesso geral**, selecione **Qualquer pessoa com o link**
4. Clique em **Copiar link**
5. Cole o link no campo correspondente no Notion

## 🎯 Como Usar

### Acessar uma Rádio Específica

```
https://seu-site.pages.dev/?id=NOTION_ID
```

**Exemplo**:
```
https://mapeamento-radio-2.pages.dev/?id=12345678901234567890123456789012
```

### Obter o ID do Notion

1. Abra o registro da rádio no Notion
2. Copie o link da página
3. O ID são os 32 caracteres hexadecimais no final da URL

**Exemplo de URL do Notion**:
```
https://www.notion.so/Nome-da-Radio-12345678901234567890123456789012
```

O ID é: `12345678901234567890123456789012`

## 🗺️ Funcionalidades Detalhadas

### 1. Processamento de KMZ

O sistema extrai automaticamente:

- **GroundOverlay**: Imagem da cobertura de rádio com coordenadas geográficas
- **ScreenOverlay**: Legenda de cores (RAINBOW.dBm.key.png)
- **Placemark**: Localização da antena e dados técnicos:
  - Frequência
  - Potência
  - ERP (Potência Efetiva Radiada)
  - Altura da antena
  - Tipo de antena
  - Sensibilidade do receptor

### 2. Processamento de KML de Cidades

Cada cidade contém:

- **Identificação**: Nome e estado
- **População**: Total e coberta (com percentual)
- **Demografia**: Distribuição por gênero
- **Faixas Etárias**: População por idade
- **Qualidade**: Excelente/Ótimo/Fraco com ícones coloridos
- **Setores**: Setores cobertos vs total
- **Coordenadas**: Latitude e longitude

### 3. Mapa Interativo

- **Imagem de Cobertura**: Sobreposta no mapa com transparência ajustável
- **Marcador da Antena**: Vermelho com dados técnicos no popup
- **Marcadores de Cidades**: Coloridos por qualidade de sinal:
  - 🟢 Verde: Excelente
  - 🔵 Ciano: Ótimo
  - 🔵 Azul: Fraco
- **Legenda**: Exibida no canto inferior direito
- **Zoom Automático**: Ajusta para mostrar toda a cobertura

### 4. Lista de Cidades

- **Busca em Tempo Real**: Por nome, estado ou qualidade
- **Ordenação**: Por nome (alfabética)
- **Detalhes Visíveis**:
  - População total e coberta
  - Percentual de cobertura
  - Qualidade do sinal
  - Número de setores
- **Clique para Destacar**: Centraliza no mapa e abre popup

### 5. Exportação Excel

Colunas exportadas:

1. **Cidade**
2. **UF**
3. **População Total**
4. **População Coberta**
5. **% Cobertura**
6. **Qualidade**
7. **Setores**

## 🎨 Identidade Visual

O sistema mantém a identidade E-MÍDIAS:

- **Cores Primárias**:
  - Azul Escuro: `#06055B`
  - Magenta: `#FC1E75`
  - Rosa: `#D71E97`
  - Roxo: `#AA1EA5`

- **Tipografia**: Space Grotesk
- **Gradientes**: Utilizados em botões e destaques
- **Sombras**: Sutis para profundidade

## 🐛 Troubleshooting

### Erro: "ID do Notion inválido"

**Solução**: Verifique se o ID tem exatamente 32 caracteres hexadecimais.

### Erro: "Token do Notion não configurado"

**Solução**: Configure a variável de ambiente `NOTION_TOKEN` no Cloudflare.

### Erro: "Não foi possível processar KMZ"

**Causas possíveis**:
1. Arquivo não está público no Google Drive
2. URL incorreta no Notion
3. Arquivo corrompido

**Solução**: Verifique as permissões do arquivo e tente novamente.

### Imagem de cobertura não aparece

**Causas possíveis**:
1. PNG não está dentro do KMZ
2. GroundOverlay sem coordenadas
3. Coordenadas inválidas

**Solução**: Verifique o conteúdo do KMZ com um visualizador KML.

### Cidades não aparecem

**Causas possíveis**:
1. KML2 vazio ou inválido
2. Placemarks sem coordenadas
3. URL do KML2 incorreta

**Solução**: Verifique o KML2 no Google Earth ou editor XML.

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique o console do navegador (F12)
2. Verifique os logs do Cloudflare Pages
3. Revise a estrutura do Notion
4. Teste com outro ID de registro

## 📝 Changelog

### v2.0.0 (2025-01-13)

- ✨ Processamento completo de arquivos KMZ
- ✨ Extração de dados técnicos da antena
- ✨ Análise populacional detalhada
- ✨ Marcadores coloridos por qualidade
- ✨ Imagem de cobertura sobreposta no mapa
- ✨ Exportação Excel avançada
- 🎨 Nova identidade visual E-MÍDIAS
- 📱 Interface responsiva otimizada

## 📄 Licença

Proprietário - E-MÍDIAS © 2025

---

**Desenvolvido com ❤️ por E-MÍDIAS**
