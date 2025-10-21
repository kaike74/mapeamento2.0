# 📻 Mapeamento de Cobertura Rádio 2.0 - E-MÍDIAS

Sistema avançado para visualização interativa da cobertura geográfica de rádios com processamento de arquivos KMZ e KML do Google Drive.

## 🌟 **NOVA FUNCIONALIDADE: MODO PROPOSTA**

**🎉 Agora suporta visualização de múltiplas rádios em um único mapa!**

### **🔗 Como usar:**
- **Rádio Individual**: `mapeamento.emidiastec.com.br/?id=NOTION_ID_DA_RADIO`
- **🆕 Proposta (Múltiplas Rádios)**: `mapeamento.emidiastec.com.br/?idproposta=NOTION_DATABASE_ID`

## 🚀 Novidades da Versão 2.2

### ✨ **Áreas de Interesse - Texto Simples (NOVO)**

- **📝 Campo de Texto**: Digite cidades diretamente no Notion sem precisar de arquivos KML
- **✅ Checkmarks Visuais**: Cidades de interesse marcadas com ✅ sobre os marcadores existentes
- **🎯 Matching Inteligente**: Comparação case-insensitive e sem acentos
- **🔄 Compatibilidade**: Suporte a texto E arquivos KML (modo legado)
- **📍 Formato Simples**: `Rio de Janeiro-RJ, São Paulo-SP, Mogi das Cruzes-SP`

### ✨ **Modo Proposta (v2.1)**

- **🗺️ Múltiplas Coberturas**: Todas as rádios da proposta no mesmo mapa
- **🎛️ Controle Individual**: Seletor para mostrar/ocultar cada cobertura
- **📻 Lista Interativa**: Painel lateral com todas as rádios da proposta
- **📊 Estatísticas Consolidadas**: População total, cidades atendidas, distribuição por UF
- **🎯 Foco Dinâmico**: Clique para destacar cada rádio no mapa
- **📈 Exportação Completa**: Excel com dados de todas as rádios

### ✨ **Melhorias Gerais**

- **🖼️ Logo Automática**: Extração da logo do KMZ para header e mapa
- **🗺️ Mapas Otimizados**: Apenas Satélite (padrão) e Padrão com divisórias dos estados
- **📍 Ordenação Inteligente**: Cidades por qualidade (Excelente → Ótimo → Fraco)
- **🎨 Interface Responsiva**: Design otimizado para desktop e mobile
- **⚡ Performance**: Carregamento mais rápido e código otimizado

## 📋 Estrutura do Projeto

```
mapeamento-radio-2/
├── index.html              # Página principal (suporta ambos os modos)
├── style.css               # Estilos com identidade E-MÍDIAS + funcionalidades da proposta
├── script.js               # Lógica principal (individual + proposta)
├── functions/
│   ├── api/radio-data.js   # API para rádio individual
│   └── api/proposta-data.js # 🆕 API para proposta (múltiplas rádios)
│   └── api/proxy.js        # Proxy CORS para Google Drive
├── wrangler.toml           # Configuração Cloudflare Pages
├── package.json            # Dependências
├── _headers                # Configuração CORS
└── README.md               # Esta documentação
```

## 🔧 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Mapas**: Leaflet + OpenStreetMap/Esri Satellite
- **Processamento**: JSZip (arquivos KMZ), DOMParser (XML/KML)
- **Exportação**: SheetJS (Excel)
- **Backend**: Cloudflare Pages Functions
- **Banco de Dados**: Notion API
- **GeoData**: GeoJSON dos estados brasileiros (IBGE)

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
mkdir functions/api

# Criar functions (copie o conteúdo dos artifacts)
# - functions/api/radio-data.js (preservado)
# - functions/api/proposta-data.js (NOVO)
# - functions/api/proxy.js (preservado)

# Adicionar ao git
git add .
git commit -m "Initial commit - Mapeamento Radio 2.1 com Modo Proposta"
```

### 2. Deploy no Cloudflare Pages

Siga as mesmas instruções da versão anterior. O sistema é **100% compatível** - todas as funcionalidades existentes continuam funcionando.

### 3. Configurar Variáveis de Ambiente

As mesmas configurações da versão anterior:
- **Variable name**: `NOTION_TOKEN`
- **Value**: `secret_XXXXXXX` (seu token do Notion)

## 📝 Configuração do Notion

### **🆕 Para Modo Proposta**

Sua **database/tabela do Notion** deve ter os mesmos campos da versão individual:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **Emissora** | Title | Nome da rádio |
| **Dial** | Text | Frequência (ex: 107.3 FM) |
| **Região** | Select | Região do Brasil |
| **UF** | Select | Estado (sigla) |
| **Praça** | Text | Cidade principal |
| **KMZ2** | URL | Link do Google Drive para arquivo KMZ |
| **KML2** | URL | Link do Google Drive para arquivo KML |
| **Imagem** | URL | Logo da rádio (opcional - fallback se KMZ não tiver) |
| **🆕 Areas_Interesse** | Text | **NOVO**: Cidades de interesse separadas por vírgula (ex: `São Paulo-SP, Rio de Janeiro-RJ`) |

### **🔑 Obter ID da Database (Proposta)**

1. Abra sua tabela/database no Notion
2. Copie o link da página da database
3. O ID são os 32 caracteres hexadecimais após `/` e antes de `?v=`

**Exemplo de URL da Database**:
```
https://www.notion.so/workspace/Nome-da-Proposta-28d20b549cf5817082bbff59d24819ba?v=28d20b549cf581be9c27000c15e36c6b
```

O ID da database é: `28d20b549cf5817082bbff59d24819ba`

### **🔗 Fórmula Atualizada para o Notion**

Use esta fórmula na sua database para gerar links automáticos:

**Para rádio individual** (preservado):
```
link(
  style("Ver cobertura", "b", "blue"),
  "mapeamento.emidiastec.com.br/?id=" + replaceAll(id(), "-", "")
)
```

**🆕 Para proposta completa** (novo):
```
link(
  style("Ver proposta completa", "b", "green"),
  "mapeamento.emidiastec.com.br/?idproposta=" + replaceAll(prop("ID da Database"), "-", "")
)
```

**Onde conseguir o "ID da Database"**: É o ID fixo da sua database/tabela do Notion.

## 🎯 Como Usar

### **🆕 Áreas de Interesse (v2.2)**

#### **Configuração Simples**
1. No Notion, crie ou edite o campo `Areas_Interesse`
2. Tipo do campo: **Text** (não Files!)
3. Digite cidades separadas por vírgula:
   ```
   Rio de Janeiro-RJ, São Paulo-SP, Mogi das Cruzes-SP
   ```

#### **Formato**
- `NomeCidade-UF, OutraCidade-UF, ...`
- Acentos são opcionais: `São Paulo-SP` = `Sao Paulo-SP`
- Case insensitive: `SÃO PAULO-SP` = `são paulo-sp`
- UF opcional se nome for único

#### **O que Acontece**
- Sistema compara com cidades do KML2
- Cidades encontradas ganham checkmark ✅
- Popup mostra badge "✅ Área de Interesse"
- Apenas cidades cobertas são marcadas

#### **Exemplo Visual**
```
Mapa antes:  ⭕ São Paulo
Mapa depois: ⭕✅ São Paulo  (com checkmark)
```

#### **Compatibilidade**
- ✅ Funciona em modo Individual
- ✅ Funciona em modo Proposta
- ✅ Arquivos KML ainda funcionam (legado)

**📖 Guia Completo**: Veja `AREAS_INTERESSE_MIGRATION.md` para detalhes

### **📻 Modo Individual (Preservado)**

```
https://mapeamento.emidiastec.com.br/?id=NOTION_ID_DA_RADIO
```

**Funcionalidades**:
- Visualiza **uma rádio específica**
- Imagem de cobertura do KMZ sobreposta no mapa
- Lista de cidades com dados populacionais
- Exportação Excel das cidades
- Logo automática extraída do KMZ

### **🌟 Modo Proposta (NOVO)**

```
https://mapeamento.emidiastec.com.br/?idproposta=NOTION_DATABASE_ID
```

**Exemplo com sua proposta**:
```
https://mapeamento.emidiastec.com.br/?idproposta=28d20b549cf5817082bbff59d24819ba
```

**Funcionalidades Exclusivas**:

#### **🗺️ Visualização Consolidada**
- **Todas as coberturas** das rádios no mesmo mapa
- **Sobreposição inteligente** das imagens de cobertura
- **Marcadores únicos** para cada antena com sua logo
- **Zoom automático** para enquadrar toda a proposta

#### **🎛️ Controle de Layers**
- **Painel lateral** com lista de todas as rádios
- **Checkboxes individuais** para mostrar/ocultar cada cobertura
- **Botões rápidos**: "Mostrar Todas" / "Ocultar Todas"
- **Foco dinâmico**: Clique para centralizar em cada rádio

#### **📊 Estatísticas Consolidadas**
- **População total** de todas as rádios somadas
- **Cidades atendidas** por toda a proposta
- **Distribuição por UF** e qualidade de sinal
- **Percentual de cobertura** global

#### **📈 Exportação Avançada**
- **Excel consolidado** com dados de todas as rádios:
  - Nome da rádio, dial, UF, praça
  - Total de cidades por rádio
  - População total e coberta por rádio
  - Indicadores de cobertura e dados disponíveis

#### **🎯 Interatividade Avançada**
- **Lista lateral**: Clique em qualquer rádio para focar no mapa
- **Destaque temporal**: Cobertura fica mais visível temporariamente
- **Popup detalhado**: Informações completas de cada antena
- **Responsivo**: Interface otimizada para desktop e mobile

## 🎨 Interface de Usuário

### **🌟 Modo Proposta**

#### **Header Dinâmico**
```
🗺️ [Nome da Proposta]
X rádios • Y estados • Mapeamento Consolidado
```

#### **Painel de Controle (Lateral Esquerdo)**
- 📻 **Controle de Rádios**
- 🌍 **Mostrar Todas** / 👁️ **Ocultar Todas**
- Lista de rádios com:
  - ☑️ Checkbox para mostrar/ocultar
  - 🖼️ Ícone da logo (se disponível)
  - 🎯 Botão para focar no mapa

#### **Controle de Layers (Canto Superior Direito)**
- 🗺️ **Mapas**: Satélite / Padrão
- 📻 **Coberturas**: Lista de todas as rádios
  - "📻 Rádio Exemplo (107.3 FM)"
  - Checkboxes para controle individual

#### **Estatísticas Consolidadas**
```
📻 Total de Rádios: 12
🏙️ Cidades Atendidas: 324
👥 População Total: 2.547.891
✅ População Coberta: 1.892.445 (74.3%)
🎯 Sinal Excelente: 189 cidades
📊 Distribuição: SP: 8 • RJ: 3 • MG: 1
```

#### **Lista de Rádios**
```
📻 Rádio A (107.3 FM)
📍 São Paulo - SP • 🏙️ 45 cidades • 👥 850.000 hab.
✅ 720.000 cobertos • 📊 Cobertura • 🖼️ Logo

📻 Rádio B (95.5 FM)  
📍 Rio de Janeiro - RJ • 🏙️ 32 cidades • 👥 650.000 hab.
✅ 480.000 cobertos • 📊 Cobertura • 🏙️ Cidades
```

### **📻 Modo Individual (Inalterado)**

Mantém toda a interface original:
- Header com logo da rádio
- Cards de informações básicas
- Lista de cidades com busca
- Exportação Excel individual

## 🆕 Funcionalidades Detalhadas

### **1. Processamento Inteligente**

**Modo Proposta**:
- Processa **todas as rádios** da database em paralelo
- **Extração automática** de logos de cada KMZ
- **Sobreposição otimizada** de múltiplas coberturas
- **Consolidação** de dados populacionais

**Preservado do Modo Individual**:
- Processamento completo de KMZ (GroundOverlay, ScreenOverlay, Placemark)
- Extração de dados técnicos da antena
- Análise populacional detalhada por cidade
- Marcadores coloridos por qualidade de sinal

### **2. Mapas Interativos**

**Ambos os Modos**:
- **Satélite** (padrão): Imagens de alta resolução
- **Padrão**: OpenStreetMap com divisórias dos estados
- **Divisórias dos Estados**: Linhas tracejadas brancas com tooltips
- **Zoom Automático**: Ajusta para mostrar todo o conteúdo

**Exclusivo do Modo Proposta**:
- **Controle de Layers Avançado**: Checkboxes para cada rádio
- **Sobreposição Múltipla**: Várias coberturas no mesmo mapa
- **Painel de Controle**: Interface lateral para gerenciar visualizações

### **3. Exportações**

**Modo Individual** (Excel):
```
Cidade | UF | População Total | População Coberta | % Cobertura | Qualidade
São Paulo | SP | 12.000.000 | 11.500.000 | 95.8% | Excelente
```

**Modo Proposta** (Excel Consolidado):
```
Rádio | Dial | UF | Praça | Total Cidades | Pop. Total | Pop. Coberta | Tem Cobertura | Tem Cidades
Rádio A | 107.3 FM | SP | São Paulo | 45 | 850.000 | 720.000 | Sim | Sim
Rádio B | 95.5 FM | RJ | Rio de Janeiro | 32 | 650.000 | 480.000 | Sim | Sim
```

### **4. Performance e Otimizações**

- **Carregamento Paralelo**: Múltiplas rádios processadas simultaneamente
- **Cache Inteligente**: Reutilização de dados entre componentes
- **Renderização Otimizada**: Apenas elementos visíveis são renderizados
- **Responsividade**: Interface adaptável para qualquer dispositivo

## 🐛 Troubleshooting

### **Modo Proposta**

#### **Erro: "ID da proposta inválido"**
**Solução**: Verifique se o ID da database tem exatamente 32 caracteres hexadecimais.

#### **Algumas rádios não aparecem no mapa**
**Causas possíveis**:
1. KMZ2 ou KML2 URLs inválidas/expiradas
2. Arquivos corrompidos no Google Drive
3. Campos obrigatórios vazios no Notion

**Solução**: Verifique os logs do console (F12) para identificar rádios com erro.

#### **Painel de controle não aparece**
**Solução**: O painel aparece automaticamente 3 segundos após o carregamento no modo proposta.

#### **Controle de layers muito longo**
**Solução**: Normal para propostas com muitas rádios. Use o painel lateral como alternativa.

### **Modo Individual (Preservado)**

Todos os troubleshootings da versão anterior continuam válidos.

### **Geral**

#### **Performance lenta com muitas rádios**
**Solução**: 
- Use "Ocultar Todas" para melhorar performance
- Ative apenas as coberturas necessárias
- Em mobile, use menos rádios simultâneas

#### **Mapas não carregam**
**Solução**: Verifique conexão com internet e tente recarregar a página.

## 📞 Suporte

Para problemas ou dúvidas:

1. **Logs Detalhados**: Abra console do navegador (F12)
2. **Cloudflare Logs**: Verifique logs do Cloudflare Pages
3. **Notion**: Revise estrutura da database/tabela
4. **Teste Individual**: Teste primeiro com uma rádio individual

## 📝 Changelog

### **v2.2.0 (2025-01-XX) - ÁREAS DE INTERESSE SIMPLIFICADAS**

#### **🌟 Funcionalidade Principal**
- ✨ **Campo de Texto para Áreas de Interesse**: Não precisa mais fazer upload de arquivos KML
- ✨ **Formato Simples**: Digite cidades separadas por vírgula: `São Paulo-SP, Rio de Janeiro-RJ`
- ✨ **Checkmarks Visuais**: Cidades de interesse exibem ✅ sobre os marcadores
- ✨ **Matching Inteligente**: Case-insensitive, sem acentos, flexível
- ✨ **Badge em Popups**: "✅ Área de Interesse" nos detalhes da cidade

#### **🔧 Melhorias Técnicas**
- 🔄 **Compatibilidade Total**: Suporte a texto E arquivos KML (modo legado)
- 🎯 **Análise Automática**: Sistema compara com cidades do KML2 automaticamente
- 📊 **Dual Mode**: Funciona em modo Individual e Proposta
- 🔍 **Normalização**: Remove acentos e normaliza nomes para matching preciso

#### **📚 Documentação**
- 📖 **Migration Guide**: Guia completo em `AREAS_INTERESSE_MIGRATION.md`
- ✅ **Exemplos**: Casos de uso e troubleshooting
- 🎓 **Tutorial**: Como migrar de KML para texto

### **v2.1.0 (2025-01-16) - MODO PROPOSTA**

#### **🌟 Novidades Principais**
- ✨ **Modo Proposta**: Múltiplas rádios em um único mapa
- 🎛️ **Controle de Layers**: Painel lateral para gerenciar visualizações
- 📊 **Estatísticas Consolidadas**: Dados agregados de toda a proposta
- 📈 **Exportação Avançada**: Excel consolidado com todas as rádios
- 🎯 **Foco Dinâmico**: Interação avançada com cada rádio

#### **🔧 Melhorias Técnicas**
- 🆕 **API Proposta**: `/api/proposta-data.js` para buscar múltiplas rádios
- ⚡ **Processamento Paralelo**: Carregamento otimizado de múltiplas rádios
- 🎨 **Interface Responsiva**: Design adaptado para ambos os modos
- 💾 **Compatibilidade Total**: Modo individual 100% preservado

#### **🐛 Correções**
- ✅ Controle de layers mais robusto
- ✅ Performance otimizada para múltiplas coberturas
- ✅ Interface responsiva em dispositivos móveis

### **v2.0.0 (2025-01-13)**

- ✨ Processamento completo de arquivos KMZ
- ✨ Extração de dados técnicos da antena
- ✨ Análise populacional detalhada
- ✨ Marcadores coloridos por qualidade
- ✨ Imagem de cobertura sobreposta no mapa
- ✨ Exportação Excel avançada
- 🎨 Nova identidade visual E-MÍDIAS
- 📱 Interface responsiva otimizada

## 🔮 Roadmap Futuro

### **v2.3.0 (Planejado)**
- 🔄 **Comparação de Propostas**: Visualizar múltiplas propostas simultaneamente
- 📊 **Relatórios Avançados**: Gráficos e análises detalhadas
- 🎯 **Filtros Dinâmicos**: Por região, qualidade, população
- 🔔 **Notificações**: Alertas quando áreas de interesse são cobertas
- 📱 **App Mobile**: Versão nativa para dispositivos móveis

### **v2.4.0 (Planejado)**
- 🤖 **IA Análise**: Sugestões automáticas de otimização
- 🗺️ **Mapas 3D**: Visualização tridimensional da cobertura
- 📈 **Dashboard Analytics**: Métricas em tempo real
- 🔗 **API Pública**: Integração com outros sistemas
- 🌐 **Geocoding**: Endereços completos para áreas de interesse

## 📄 Licença

Proprietário - E-MÍDIAS © 2025

---

## 🎯 Links de Teste

**🆕 Proposta de Exemplo**:
```
https://mapeamento.emidiastec.com.br/?idproposta=28d20b549cf5817082bbff59d24819ba
```

**📻 Rádio Individual** (qualquer rádio da proposta):
```
https://mapeamento.emidiastec.com.br/?id=[ID_DE_UMA_RADIO_DA_PROPOSTA]
```

---

**Desenvolvido com ❤️ por E-MÍDIAS**

*🌟 Agora com suporte a múltiplas rádios! 🌟*
