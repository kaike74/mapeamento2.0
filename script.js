// =========================================================================
// 🗺️ ADICIONAR DIVISÓRIAS DOS ESTADOS BRASILEIROS - SEM INTERAÇÃO
// =========================================================================
async function addStateBorders() {
    try {
        console.log('🗺️ Carregando divisórias dos estados...');
        
        // URL do GeoJSON dos estados brasileiros (IBGE)
        const geoJsonUrl = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson';
        
        const response = await fetch(geoJsonUrl);
        if (!response.ok) {
            console.warn('⚠️ Não foi possível carregar divisórias dos estados');
            return;
        }
        
        const statesData = await response.json();
        
        // Adicionar layer dos estados com estilo - SEM INTERAÇÃO
        L.geoJSON(statesData, {
            style: {
                color: '#FFFFFF',        // Linha branca
                weight: 2,               // Espessura da linha
                opacity: 0.8,            // Opacidade da linha
                fillOpacity: 0,          // Sem preenchimento
                dashArray: '5, 5',       // Linha tracejada
                interactive: false       // 🔧 REMOVER INTERAÇÃO
            }
            // 🔧 REMOVER onEachFeature para eliminar tooltips
        }).addTo(map);
        
        console.log('✅ Divisórias dos estados adicionadas');
        
    } catch (error) {
        console.warn('⚠️ Erro ao carregar divisórias dos estados:', error);
        // Continuar sem as divisórias
    }
}

// =========================================================================
// 🚀 MAPEAMENTO RÁDIO 2.0 - E-MÍDIAS - VERSÃO CORRIGIDA PARA BATCHGEO
// =========================================================================

let map;
let radioData = {}; // Para modo individual
let propostaData = {}; // Para modo proposta
let citiesData = [];
let filteredCities = [];
let coverageImageLayer = null;
let legendImage = null;
let cityMarkersIndividual = []; // Para modo individual apenas
let baseLayers = {}; // Para controle de layers

// 🆕 VARIÁVEIS PARA MODO PROPOSTA
let isPropostaMode = false;
let radiosLayers = {}; // Layer Groups completos de cada rádio (cobertura + antena + cidades)
let layersControl = null; // Controle de layers dinâmico

// 🆕 VARIÁVEIS PARA ÁREAS DE INTERESSE - CORRIGIDAS
let areasInteresseData = []; // Todas as áreas de interesse
let areasInteresseLayer = null; // Layer das áreas de interesse
let filteredAreasInteresse = []; // Áreas filtradas por modo

// 🆕 VARIÁVEIS PARA TELA DE CARREGAMENTO
let loadingInterval = null;
const loadingTexts = [
    "Localizando rádios escondidas...",
    "Ajustando a sintonia...", 
    "Testando, som... som... 1, 2, 3...",
    "O mapa vai entrar no ar em instantes!",
    "Contando universo: 1, 2, 3... quase lá!",
    "Sintonizando frequências...",
    "Mapeando cobertura em tempo real...",
    "Preparando antenas para transmissão...",
    "🎯 Carregando áreas de interesse...",
    "📍 Analisando locais prioritários..."
];

// =========================================================================
// 🎯 INICIALIZAÇÃO PRINCIPAL
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando Mapeamento 2.0 com Áreas de Interesse...');
        
        // 🔍 DETECTAR MODO: INDIVIDUAL OU PROPOSTA
        const params = new URLSearchParams(window.location.search);
        const radioId = params.get('id');
        const propostaId = params.get('idproposta');
        
        // 🆕 SEMPRE MOSTRAR TELA DE CARREGAMENTO INICIAL
        showLoadingScreen();
        
        if (propostaId) {
            // 🌟 MODO PROPOSTA (MÚLTIPLAS RÁDIOS)
            console.log('🌟 Modo Proposta detectado:', propostaId);
            isPropostaMode = true;
            await initPropostaMode(propostaId);
        } else if (radioId) {
            // 📻 MODO INDIVIDUAL (UMA RÁDIO)
            console.log('📻 Modo Individual detectado:', radioId);
            isPropostaMode = false;
            await initIndividualMode(radioId);
        } else {
            throw new Error('Parâmetro obrigatório: ?id=RADIO_ID ou ?idproposta=DATABASE_ID');
        }
        
        // 🆕 OCULTAR LOADING PADRÃO EM AMBOS OS MODOS
        hideLoading();
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        hideLoadingScreen(); // 🆕 Garantir que tela de carregamento suma em caso de erro
        showError(error.message, error.stack);
    }
});

// =========================================================================
// 🆕 TELA DE CARREGAMENTO ANIMADA
// =========================================================================
function showLoadingScreen() {
    console.log('🎬 Mostrando tela de carregamento...');
    
    // Ocultar loading padrão
    document.getElementById('loading').style.display = 'none';
    
    // Mostrar tela personalizada
    const loadingScreen = document.getElementById('loading-proposta');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        
        // Iniciar alternância de textos
        startLoadingTextRotation();
    }
}

function hideLoadingScreen() {
    console.log('🎬 Ocultando tela de carregamento...');
    
    // Parar alternância de textos
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    
    // Fade out da tela de carregamento
    const loadingScreen = document.getElementById('loading-proposta');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '1'; // Reset para próxima vez
        }, 800);
    }
}

function startLoadingTextRotation() {
    const loadingTextElement = document.getElementById('loading-text');
    if (!loadingTextElement) return;
    
    let currentIndex = 0;
    
    // Definir texto inicial
    loadingTextElement.textContent = loadingTexts[currentIndex];
    
    // Alternar textos a cada 2.5 segundos
    loadingInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % loadingTexts.length;
        loadingTextElement.textContent = loadingTexts[currentIndex];
    }, 2500);
}

// =========================================================================
// 🌟 INICIALIZAÇÃO MODO PROPOSTA (MÚLTIPLAS RÁDIOS) - CORRIGIDO
// =========================================================================
async function initPropostaMode(propostaId) {
    console.log('🌟 Inicializando modo proposta...');
    
    // Carregar dados da proposta
    await loadPropostaData(propostaId);
    
    // 🆕 BUSCAR E PROCESSAR ÁREAS DE INTERESSE - CORRIGIDO
    await loadAndProcessAreasInteresse();
    
    // Configurar interface para proposta ANTES do mapa
    setupPropostaInterface();
    
    // Inicializar mapa
    initializeMap();
    
    // 🔧 AGUARDAR processamento completo antes de adicionar ao mapa
    console.log('🔄 Processando rádios (logs simplificados)...');
    await processAllRadiosInProposta();
    
    // 🚀 USAR requestAnimationFrame PARA OPERAÇÕES VISUAIS
    requestAnimationFrame(() => {
        addAllRadiosToMap(); // Agora é otimizado com batches
        
        // 🆕 ADICIONAR ÁREAS DE INTERESSE AO MAPA - CORRIGIDO
        addAreasInteresseToMap();
        
        // 🆕 ESTATÍSTICAS E TELA DE CARREGAMENTO APÓS TUDO PRONTO
        setTimeout(() => {
            setupConsolidatedStats(); // Agora é otimizado
            hideLoadingScreen();
        }, 500);
    });
    
    console.log('✅ Modo proposta inicializado');
}

// =========================================================================
// 📻 INICIALIZAÇÃO MODO INDIVIDUAL (UMA RÁDIO) - 🔧 CORRIGIDA
// =========================================================================
async function initIndividualMode(radioId) {
    console.log('📻 Inicializando modo individual...');
    
    await loadRadioData(radioId);
    
    // 🆕 BUSCAR E PROCESSAR ÁREAS DE INTERESSE (MODO INDIVIDUAL) - CORRIGIDO
    await loadAndProcessAreasInteresseIndividual();
    
    await processFiles(); // Logo será extraída do KMZ automaticamente
    initializeMap();
    
    // 🔧 ADICIONAR CONTROLE DE LAYERS NO MODO INDIVIDUAL - CORRIGIDO
    setupLayersControlForIndividual();
    
    renderCities();
    setupSearch();
    
    // 🆕 ADICIONAR ÁREAS DE INTERESSE AO MAPA (MODO INDIVIDUAL) - CORRIGIDO
    addAreasInteresseToMap();
    
    // 🖼️ ATUALIZAR LOGO NO FINAL (GARANTIR QUE DOM ESTÁ PRONTO)
    setTimeout(() => {
        updateHeaderLogoFinal(0);
    }, 1000);
    
    // 🔧 OCULTAR TELA DE CARREGAMENTO APÓS TUDO CARREGADO NO MODO INDIVIDUAL
    setTimeout(() => {
        hideLoadingScreen();
        console.log('✅ Modo individual pronto');
    }, 1500);
    
    console.log('✅ Modo individual inicializado');
}

// =========================================================================
// 🎯 FUNÇÕES SIMPLIFICADAS PARA ÁREAS DE INTERESSE - APENAS MOSTRAR PONTOS
// =========================================================================

// 🆕 BUSCAR E PROCESSAR ÁREAS DE INTERESSE (MODO PROPOSTA) - CORRIGIDO
async function loadAndProcessAreasInteresse() {
    console.log('🎯 Buscando áreas de interesse na proposta...');
    
    // Buscar arquivo em qualquer registro da proposta
    let areasInteresseUrl = null;
    let radioComAreas = null;
    
    for (const radio of propostaData.radios) {
        if (radio.areasInteresse && radio.areasInteresse.length > 0) {
            // 🔧 CORRIGIDO: Buscar URL em todas as possíveis estruturas
            const arquivo = radio.areasInteresse[0];
            
            if (arquivo.url) {
                areasInteresseUrl = arquivo.url;
            } else if (arquivo.file && arquivo.file.url) {
                areasInteresseUrl = arquivo.file.url;
            } else if (arquivo.external && arquivo.external.url) {
                areasInteresseUrl = arquivo.external.url;
            }
            
            if (areasInteresseUrl) {
                radioComAreas = radio.name;
                console.log(`🎯 Arquivo de áreas encontrado na rádio: ${radio.name}`);
                console.log(`📁 URL do arquivo: ${areasInteresseUrl}`);
                break;
            }
        }
    }
    
    if (areasInteresseUrl) {
        console.log('📁 Processando arquivo de áreas de interesse...');
        await processAreasInteresseKML(areasInteresseUrl);
        
        // 🔧 CORRIGIDO: Analisar cobertura após processar as áreas
        if (areasInteresseData.length > 0) {
            analyzeAreasForProposta();
        }
    } else {
        console.log('ℹ️ Nenhum arquivo de áreas de interesse encontrado na proposta');
        areasInteresseData = [];
    }
}

// 🆕 BUSCAR E PROCESSAR ÁREAS DE INTERESSE (MODO INDIVIDUAL) - CORRIGIDO
async function loadAndProcessAreasInteresseIndividual() {
    console.log('🎯 Buscando áreas de interesse para modo individual...');
    
    // Para modo individual, buscar o arquivo da própria rádio
    let areasInteresseUrl = null;
    
    // Verificar se tem arquivo na própria rádio
    if (radioData.areasInteresse && radioData.areasInteresse.length > 0) {
        // 🔧 CORRIGIDO: Buscar URL em todas as possíveis estruturas
        const arquivo = radioData.areasInteresse[0];
        
        if (arquivo.url) {
            areasInteresseUrl = arquivo.url;
        } else if (arquivo.file && arquivo.file.url) {
            areasInteresseUrl = arquivo.file.url;
        } else if (arquivo.external && arquivo.external.url) {
            areasInteresseUrl = arquivo.external.url;
        }
        
        console.log('🎯 Arquivo de áreas encontrado na própria rádio');
        console.log(`📁 URL do arquivo: ${areasInteresseUrl}`);
    }
    
    if (areasInteresseUrl) {
        console.log('📁 Processando arquivo de áreas de interesse...');
        await processAreasInteresseKML(areasInteresseUrl);
        
        // 🔧 CORRIGIDO: Filtrar áreas para modo individual após processar
        if (areasInteresseData.length > 0) {
            filterAreasForIndividualRadio();
        }
    } else {
        console.log('ℹ️ Nenhum arquivo de áreas de interesse encontrado');
        areasInteresseData = [];
        filteredAreasInteresse = [];
    }
}

// 🆕 PROCESSAR KML - CORRIGIDO E ROBUSTO
async function processAreasInteresseKML(kmlUrl) {
    try {
        console.log('🎯 Baixando KML:', kmlUrl);
        
        // 🔧 CORRIGIDO: Verificar se é URL do Google Drive e converter se necessário
        let finalUrl = kmlUrl;
        if (kmlUrl.includes('drive.google.com') && !kmlUrl.includes('/uc?')) {
            try {
                finalUrl = convertGoogleDriveUrl(kmlUrl);
                console.log('🔄 URL convertida para Google Drive:', finalUrl);
            } catch (e) {
                console.warn('⚠️ Erro ao converter URL do Google Drive, usando original:', e.message);
            }
        }
        
        // Usar proxy para evitar CORS
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const kmlText = await response.text();
        console.log(`📄 KML baixado com sucesso: ${Math.round(kmlText.length/1024)}KB`);
        
        // 🔧 CORRIGIDO: Parser mais robusto
        parseKMLAreasRobusto(kmlText);
        
    } catch (error) {
        console.error('❌ Erro ao processar KML das áreas:', error);
        areasInteresseData = [];
    }
}

// 🆕 PARSER ROBUSTO PARA KML DE ÁREAS - CORRIGIDO
function parseKMLAreasRobusto(kmlText) {
    console.log('🎯 Parseando KML de áreas de interesse...');
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
        
        // 🔧 CORRIGIDO: Buscar Placemarks em todos os níveis
        const placemarks = xmlDoc.querySelectorAll('Placemark');
        console.log(`📍 Encontrados ${placemarks.length} Placemarks no KML`);
        
        if (placemarks.length === 0) {
            console.warn('⚠️ Nenhum Placemark encontrado no KML');
            areasInteresseData = [];
            return;
        }
        
        areasInteresseData = [];
        let pontosProcessados = 0;
        
        placemarks.forEach((placemark, index) => {
            try {
                // 🔧 CORRIGIDO: Extrair nome com fallbacks
                let name = `Área ${index + 1}`;
                
                const nameEl = placemark.querySelector('name');
                if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
                    name = nameEl.textContent.trim();
                }
                
                // 🔧 CORRIGIDO: Extrair coordenadas - buscar Point primeiro
                const pointEl = placemark.querySelector('Point');
                if (!pointEl) {
                    console.warn(`⚠️ Ponto ${index + 1}: Sem elemento Point, pulando...`);
                    return;
                }
                
                const coordinatesEl = pointEl.querySelector('coordinates');
                if (!coordinatesEl) {
                    console.warn(`⚠️ Ponto ${index + 1}: Sem coordenadas no Point, pulando...`);
                    return;
                }
                
                const coordsText = coordinatesEl.textContent.trim();
                if (!coordsText) {
                    console.warn(`⚠️ Ponto ${index + 1}: Coordenadas vazias, pulando...`);
                    return;
                }
                
                // 🔧 CORRIGIDO: Parse das coordenadas (formato: longitude,latitude,altitude)
                const coords = coordsText.split(',').map(c => c.trim()).filter(c => c);
                
                if (coords.length < 2) {
                    console.warn(`⚠️ Ponto ${index + 1}: Coordenadas insuficientes (${coords.length}), pulando...`);
                    return;
                }
                
                const longitude = parseFloat(coords[0]);
                const latitude = parseFloat(coords[1]);
                
                // 🔧 CORRIGIDO: Validação robusta de coordenadas
                if (isNaN(latitude) || isNaN(longitude)) {
                    console.warn(`⚠️ Ponto ${index + 1}: Coordenadas inválidas (lat: ${latitude}, lng: ${longitude}), pulando...`);
                    return;
                }
                
                // 🔧 CORRIGIDO: Validação de range das coordenadas para Brasil
                if (latitude < -35 || latitude > 6 || longitude < -75 || longitude > -30) {
                    console.warn(`⚠️ Ponto ${index + 1}: Coordenadas fora do Brasil (lat: ${latitude}, lng: ${longitude}), mas incluindo mesmo assim...`);
                }
                
                // 🔧 CORRIGIDO: Extrair descrição
                let description = '';
                const descEl = placemark.querySelector('description');
                if (descEl && descEl.textContent) {
                    description = descEl.textContent.trim();
                }
                
                // Criar objeto da área
                const area = {
                    name: name,
                    description: description,
                    coordinates: { lat: latitude, lng: longitude },
                    type: 'geral',
                    priority: 'media',
                    covered: false,
                    coveringRadios: []
                };
                
                areasInteresseData.push(area);
                pontosProcessados++;
                
                // Log das primeiras 3 áreas para verificação
                if (index < 3) {
                    console.log(`📍 Área ${index + 1}: "${name}"`);
                    console.log(`   → Lat: ${latitude}, Lng: ${longitude}`);
                    if (description) {
                        console.log(`   → Descrição: ${description.substring(0, 50)}...`);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Erro ao processar ponto ${index + 1}:`, error.message);
            }
        });
        
        console.log(`✅ ${pontosProcessados} áreas de interesse processadas com sucesso!`);
        
        if (pontosProcessados === 0) {
            console.warn('⚠️ Nenhuma área foi processada com sucesso');
            areasInteresseData = [];
        }
        
    } catch (error) {
        console.error('❌ Erro crítico no parser do KML:', error);
        areasInteresseData = [];
    }
}

// =========================================================================
// 🆕 ADICIONAR ÁREAS DE INTERESSE AO MAPA - CORRIGIDO E ROBUSTO
// =========================================================================
function addAreasInteresseToMap() {
    console.log('🎯 Adicionando áreas de interesse ao mapa...');
    
    if (!areasInteresseData || areasInteresseData.length === 0) {
        console.log('ℹ️ Nenhuma área de interesse para adicionar');
        return;
    }
    
    // Remover layer existente se houver
    if (areasInteresseLayer) {
        map.removeLayer(areasInteresseLayer);
        areasInteresseLayer = null;
    }
    
    // Criar novo layer group para áreas de interesse
    areasInteresseLayer = L.layerGroup();
    
    // 🔧 CORRIGIDO: Decidir quais áreas mostrar baseado no modo
    const areasToShow = isPropostaMode ? areasInteresseData : (filteredAreasInteresse || areasInteresseData);
    
    if (areasToShow.length === 0) {
        console.log('ℹ️ Nenhuma área filtrada para mostrar');
        return;
    }
    
    console.log(`📍 Criando ${areasToShow.length} marcadores de áreas de interesse...`);
    let markersAdicionados = 0;
    let errosNaCriacao = 0;
    
    areasToShow.forEach((area, index) => {
        try {
            const marker = createAreaInteresseMarkerRobust(area, index);
            if (marker) {
                areasInteresseLayer.addLayer(marker);
                markersAdicionados++;
            } else {
                errosNaCriacao++;
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao criar marcador ${index + 1}:`, error);
            errosNaCriacao++;
        }
    });
    
    // Adicionar ao mapa se tiver marcadores válidos
    if (markersAdicionados > 0) {
        areasInteresseLayer.addTo(map);
        console.log(`✅ ${markersAdicionados} áreas adicionadas ao mapa com sucesso!`);
        
        if (errosNaCriacao > 0) {
            console.warn(`⚠️ ${errosNaCriacao} áreas falharam na criação`);
        }
    } else {
        console.warn('❌ Nenhum marcador foi criado com sucesso');
    }
}

// =========================================================================
// 🆕 CRIAR MARCADOR ROBUSTO PARA ÁREA DE INTERESSE
// =========================================================================
function createAreaInteresseMarkerRobust(area, index) {
    try {
        // 🔧 CORRIGIDO: Validação rigorosa das coordenadas
        const lat = area.coordinates?.lat;
        const lng = area.coordinates?.lng;
        
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
            console.warn(`⚠️ Coordenadas inválidas para área: ${area.name}`, area.coordinates);
            return null;
        }
        
        // 🔧 CORRIGIDO: Validação de range básico
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn(`⚠️ Coordenadas fora do range válido: ${area.name} (${lat}, ${lng})`);
            return null;
        }
        
        // 🔧 CORRIGIDO: Definir cor e ícone baseado no modo e cobertura
        let color, borderColor, icon;
        
        if (isPropostaMode) {
            // Modo proposta: cores baseadas na cobertura
            if (area.coveringRadios && area.coveringRadios.length > 1) {
                color = '#3B82F6'; // Azul (múltiplas rádios)
                borderColor = '#1E40AF';
                icon = '💎';
            } else if (area.coveringRadios && area.coveringRadios.length === 1) {
                color = '#10B981'; // Verde (uma rádio)
                borderColor = '#059669';
                icon = '⭐';
            } else {
                color = '#EF4444'; // Vermelho (sem cobertura)
                borderColor = '#DC2626';
                icon = '⚠️';
            }
        } else {
            // Modo individual: cor dourada uniforme
            color = '#F59E0B'; // Dourado
            borderColor = '#D97706';
            icon = '🎯';
        }
        
        // 🔧 CORRIGIDO: Criar ícone HTML mais robusto
        const areaIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    background: ${color};
                    border: 3px solid ${borderColor};
                    border-radius: 50%;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    position: relative;
                    cursor: pointer;
                ">
                    <span style="
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        font-size: 10px;
                        line-height: 1;
                    ">${icon}</span>
                </div>
            `,
            className: 'area-interesse-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
        });
        
        // 🔧 CORRIGIDO: Criar popup mais robusto
        const popupContent = createAreaInteressePopupRobust(area);
        
        // 🔧 CORRIGIDO: Criar marcador com tratamento de erros
        const marker = L.marker([lat, lng], { 
            icon: areaIcon,
            title: area.name || `Área ${index + 1}`
        }).bindPopup(popupContent, {
            maxWidth: 300,
            className: 'area-interesse-popup'
        });
        
        // Log de criação bem-sucedida (apenas para os primeiros 3)
        if (index < 3) {
            console.log(`✅ Marcador ${index + 1} criado: "${area.name}" (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
        
        return marker;
        
    } catch (error) {
        console.warn(`⚠️ Erro ao criar marcador para área "${area.name}":`, error);
        return null;
    }
}

// =========================================================================
// 🆕 CRIAR POPUP ROBUSTO PARA ÁREA DE INTERESSE
// =========================================================================
function createAreaInteressePopupRobust(area) {
    // 🔧 CORRIGIDO: Tratamento seguro de propriedades
    const areaName = area.name || 'Área sem nome';
    const areaDescription = area.description || '';
    const coordinates = area.coordinates || {};
    const lat = coordinates.lat || 0;
    const lng = coordinates.lng || 0;
    
    let coverageInfo = '';
    
    if (isPropostaMode) {
        // Modo proposta: mostrar cobertura detalhada
        if (area.coveringRadios && area.coveringRadios.length > 0) {
            const radiosList = area.coveringRadios
                .map(r => `📻 ${r.name || 'Rádio'} (${r.dial || 'N/A'})`)
                .join('<br>');
            
            coverageInfo = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong style="color: #10B981;">✅ Cobertura:</strong><br>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${radiosList}
                    </div>
                </div>
            `;
        } else {
            coverageInfo = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong style="color: #EF4444;">⚠️ Sem cobertura</strong>
                    <div style="font-size: 11px; color: #999; margin-top: 2px;">
                        Nenhuma rádio da proposta cobre esta área
                    </div>
                </div>
            `;
        }
    } else {
        // Modo individual: sempre coberto (só mostra áreas cobertas)
        const radioName = radioData?.name || 'Rádio';
        const radioDial = radioData?.dial || 'N/A';
        
        coverageInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <strong style="color: #10B981;">✅ Coberto por:</strong><br>
                <div style="margin-top: 4px; font-size: 12px; color: #059669;">
                    📻 ${radioName} (${radioDial})
                </div>
            </div>
        `;
    }
    
    // 🔧 CORRIGIDO: Construir popup robusto
    return `
        <div style="text-align: center; font-family: var(--font-primary); min-width: 220px; max-width: 280px;">
            <h4 style="margin: 0 0 8px 0; color: #06055B; font-size: 15px;">
                🎯 ${areaName}
            </h4>
            
            <div style="text-align: left; font-size: 13px; color: #64748B;">
                ${areaDescription ? `
                    <div style="margin: 4px 0; padding: 6px; background: #F8F9FA; border-radius: 4px; border-left: 3px solid #06055B;">
                        <strong>Descrição:</strong><br>
                        <span style="font-size: 12px;">${areaDescription.substring(0, 100)}${areaDescription.length > 100 ? '...' : ''}</span>
                    </div>
                ` : ''}
                
                <div style="margin: 4px 0; padding: 4px 0;">
                    <strong>Coordenadas:</strong> 
                    <span style="font-family: monospace; background: #F1F5F9; padding: 2px 4px; border-radius: 3px;">
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </span>
                </div>
                
                ${coverageInfo}
            </div>
        </div>
    `;
}

// =========================================================================
// RESTO DAS FUNÇÕES (SEM ALTERAÇÕES) - MANTIDAS DO CÓDIGO ORIGINAL
// =========================================================================

// Extrair tipos e prioridades
function extractAreaTypeFlexible(name, description) {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.match(/shop|mall|centro.*comercial|mercado/)) return 'shopping';
    if (text.match(/escola|universidade|faculdade|colégio|educaç/)) return 'educacao';
    if (text.match(/hospital|clínica|posto.*saúde|upa|pronto.*socorro/)) return 'saude';
    if (text.match(/empresarial|comercial|escritório|corporativo/)) return 'comercial';
    if (text.match(/industrial|fábrica|indústria|galpão/)) return 'industrial';
    if (text.match(/residencial|bairro|condomínio|vila/)) return 'residencial';
    if (text.match(/igreja|templo|religioso/)) return 'religioso';
    if (text.match(/parque|praça|área.*verde/)) return 'lazer';
    
    return 'geral';
}

function extractAreaPriorityFlexible(name, description) {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.match(/alta.*prioridade|importante|prioritário|crítico|principal/)) return 'alta';
    if (text.match(/baixa.*prioridade|secundário|opcional/)) return 'baixa';
    
    return 'media';
}

// Analisar áreas para proposta - CORRIGIDO
function analyzeAreasForProposta() {
    console.log('🎯 Analisando cobertura das áreas de interesse...');
    
    if (!areasInteresseData || areasInteresseData.length === 0) {
        console.log('ℹ️ Nenhuma área para analisar');
        return;
    }
    
    let areasCobertas = 0;
    let areasComMultiplasRadios = 0;
    
    areasInteresseData.forEach((area, index) => {
        // Resetar dados de cobertura
        area.coveringRadios = [];
        area.covered = false;
        
        // 🔧 CORRIGIDO: Verificar cobertura por cada rádio da proposta
        if (propostaData && propostaData.radios) {
            propostaData.radios.forEach(radio => {
                if (isAreaCoveredByRadioRobust(area, radio)) {
                    area.coveringRadios.push({
                        id: radio.id,
                        name: radio.name || 'Rádio',
                        dial: radio.dial || 'N/A'
                    });
                    area.covered = true;
                }
            });
        }
        
        if (area.covered) {
            areasCobertas++;
            if (area.coveringRadios.length > 1) {
                areasComMultiplasRadios++;
            }
        }
        
        // 🔧 LOG DETALHADO APENAS PARA AS PRIMEIRAS 5 ÁREAS
        if (index < 5) {
            console.log(`📍 "${area.name}": ${area.coveringRadios.length} rádio(s) cobrindo`);
        }
    });
    
    console.log(`✅ Análise completa de cobertura:`);
    console.log(`   📊 Total de áreas: ${areasInteresseData.length}`);
    console.log(`   ✅ Áreas cobertas: ${areasCobertas}`);
    console.log(`   💎 Áreas com múltiplas rádios: ${areasComMultiplasRadios}`);
    console.log(`   ❌ Áreas sem cobertura: ${areasInteresseData.length - areasCobertas}`);
}

// Filtrar áreas para modo individual - CORRIGIDO
function filterAreasForIndividualRadio() {
    console.log('🎯 Filtrando áreas cobertas para modo individual...');
    
    if (!areasInteresseData || areasInteresseData.length === 0) {
        console.log('ℹ️ Nenhuma área para filtrar');
        filteredAreasInteresse = [];
        return;
    }
    
    filteredAreasInteresse = areasInteresseData.filter(area => {
        const covered = isAreaCoveredByRadioRobust(area, radioData);
        if (covered) {
            area.covered = true;
            area.coveringRadios = [{
                id: radioData.notionId || 'radio-individual',
                name: radioData.name || 'Rádio',
                dial: radioData.dial || 'N/A'
            }];
        } else {
            area.covered = false;
            area.coveringRadios = [];
        }
        return covered;
    });
    
    console.log(`✅ Filtragem concluída:`);
    console.log(`   📊 Total de áreas processadas: ${areasInteresseData.length}`);
    console.log(`   ✅ Áreas cobertas pela rádio: ${filteredAreasInteresse.length}`);
    console.log(`   ❌ Áreas fora de cobertura: ${areasInteresseData.length - filteredAreasInteresse.length}`);
}

// Verificar se área está coberta por rádio - CORRIGIDO E ROBUSTO
function isAreaCoveredByRadioRobust(area, radio) {
    if (!area || !area.coordinates || !radio) {
        return false;
    }
    
    const areaLat = area.coordinates.lat;
    const areaLng = area.coordinates.lng;
    
    if (typeof areaLat !== 'number' || typeof areaLng !== 'number' || isNaN(areaLat) || isNaN(areaLng)) {
        return false;
    }
    
    // 🔧 ESTRATÉGIA 1: Verificar se a área está dentro da imagem de cobertura (mais preciso)
    if (radio.coverageImage && radio.coverageImage.bounds) {
        try {
            const bounds = L.latLngBounds(radio.coverageImage.bounds);
            const areaLatLng = L.latLng(areaLat, areaLng);
            const withinBounds = bounds.contains(areaLatLng);
            
            if (withinBounds) {
                return true; // Área definitivamente coberta
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao verificar bounds da rádio ${radio.name}:`, error);
        }
    }
    
    // 🔧 ESTRATÉGIA 2: Verificar por proximidade com cidades cobertas (fallback)
    if (radio.citiesData && radio.citiesData.length > 0) {
        const maxDistance = 50; // km (raio de cobertura estimado)
        
        for (const city of radio.citiesData) {
            if (city.coordinates && typeof city.coordinates.lat === 'number' && typeof city.coordinates.lng === 'number') {
                try {
                    const distance = calculateDistanceHaversine(
                        areaLat, areaLng,
                        city.coordinates.lat, city.coordinates.lng
                    );
                    
                    if (distance <= maxDistance) {
                        return true; // Área próxima de cidade coberta
                    }
                } catch (error) {
                    // Continuar verificando outras cidades
                }
            }
        }
    }
    
    // 🔧 ESTRATÉGIA 3: Verificar proximidade com a antena (fallback final)
    if (radio.antennaLocation && typeof radio.antennaLocation.lat === 'number' && typeof radio.antennaLocation.lng === 'number') {
        try {
            const distance = calculateDistanceHaversine(
                areaLat, areaLng,
                radio.antennaLocation.lat, radio.antennaLocation.lng
            );
            
            // Raio de cobertura estimado baseado na potência (simplificado)
            const maxAntennaDistance = 100; // km
            
            if (distance <= maxAntennaDistance) {
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao calcular distância da antena ${radio.name}:`, error);
        }
    }
    
    return false; // Área não coberta por nenhuma estratégia
}

// Calcular distância entre pontos (Haversine) - CORRIGIDO
function calculateDistanceHaversine(lat1, lng1, lat2, lng2) {
    // Validar inputs
    if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
        isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        throw new Error('Coordenadas inválidas para cálculo de distância');
    }
    
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
}

// Funções auxiliares para áreas
function getAreaTypeText(type) {
    const types = {
        'shopping': '🛍️ Shopping',
        'educacao': '🎓 Educação',
        'saude': '🏥 Saúde',
        'comercial': '🏢 Comercial',
        'industrial': '🏭 Industrial',
        'residencial': '🏘️ Residencial',
        'religioso': '⛪ Religioso',
        'lazer': '🌳 Lazer',
        'geral': '📍 Geral'
    };
    return types[type] || '📍 Geral';
}

function getAreaPriorityText(priority) {
    const priorities = {
        'alta': '🔴 Alta',
        'media': '🟡 Média',
        'baixa': '🟢 Baixa'
    };
    return priorities[priority] || '🟡 Média';
}

// =========================================================================
// CARREGAR DADOS DA PROPOSTA
// =========================================================================
async function loadPropostaData(propostaId) {
    if (!propostaId || !/^[0-9a-f]{32}$/i.test(propostaId)) {
        throw new Error('ID da proposta inválido. Use: ?idproposta=DATABASE_ID');
    }
    
    console.log('📡 Buscando dados da proposta...');
    
    const response = await fetch(`/api/proposta-data?database_id=${propostaId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    propostaData = await response.json();
    console.log(`✅ Proposta: "${propostaData.proposta.title}" - ${propostaData.radios.length} rádios`);
    
    // Atualizar header com informações da proposta
    updateHeaderProposta();
}

// =========================================================================
// CARREGAR DADOS DO NOTION (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
async function loadRadioData(notionId) {
    console.log('📡 Buscando dados da rádio...');
    
    const response = await fetch(`/api/radio-data?id=${notionId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    radioData = await response.json();
    console.log(`✅ Rádio: "${radioData.name}" carregada`);
    
    // 🖼️ PROCESSAR ÍCONE DO NOTION IMEDIATAMENTE (APENAS MODO INDIVIDUAL)
    if (!isPropostaMode) {
        processNotionIcon();
    }
    
    // Atualizar header inicial (sem logo - virá do KMZ)
    updateHeaderBasic();
}

// =========================================================================
// PROCESSAR TODAS AS RÁDIOS DA PROPOSTA - LOGS SIMPLIFICADOS
// =========================================================================
async function processAllRadiosInProposta() {
    const total = propostaData.radios.length;
    let processed = 0;
    let withKMZ = 0;
    let withKML = 0;
    
    const processPromises = propostaData.radios.map(async (radio, index) => {
        try {
            // Processar ícone do Notion para cada rádio (SEM ATUALIZAR HEADER)
            processRadioNotionIcon(radio);
            
            // Processar KMZ se disponível - AGUARDAR CONCLUSÃO
            if (radio.kmz2Url && radio.kmz2Url.trim() !== '') {
                await processRadioKMZ(radio);
                if (radio.coverageImage) withKMZ++;
            }
            
            // Processar KML se disponível - AGUARDAR CONCLUSÃO  
            if (radio.kml2Url && radio.kml2Url.trim() !== '') {
                await processRadioKML(radio);
                if (radio.citiesData?.length > 0) withKML++;
            }
            
            processed++;
            
            // 🔧 LOG SIMPLIFICADO A CADA 5 RÁDIOS
            if (processed % 5 === 0 || processed === total) {
                console.log(`📊 Progresso: ${processed}/${total} rádios processadas`);
            }
            
        } catch (error) {
            console.error(`❌ Erro na rádio ${radio.name}:`, error.message);
            // Continuar com as outras rádios
        }
    });
    
    // 🔧 AGUARDAR TODAS AS RÁDIOS SEREM PROCESSADAS
    await Promise.all(processPromises);
    
    console.log(`✅ Processamento concluído: ${withKMZ} KMZ, ${withKML} KML`);
}

// Processar ícone do Notion para rádio específica
function processRadioNotionIcon(radio) {
    if (radio.icon) {
        if (radio.icon.type === 'file' && radio.icon.url) {
            radio.notionIconUrl = radio.icon.url;
        } else if (radio.icon.type === 'external' && radio.icon.url) {
            radio.notionIconUrl = radio.icon.url;
        } else if (radio.icon.type === 'emoji') {
            radio.notionEmoji = radio.icon.emoji;
        }
    }
    
    // Fallback para campo Imagem
    if (!radio.notionIconUrl && radio.imageUrl && !radio.imageUrl.includes('placeholder')) {
        radio.notionIconUrl = radio.imageUrl;
    }
}

// =========================================================================
// INICIALIZAR MAPA
// =========================================================================
function initializeMap() {
    console.log('🗺️ Inicializando mapa...');
    
    // Zoom padrão para enquadrar o Brasil
    const center = { lat: -14.2350, lng: -51.9253 }; // Centro do Brasil
    const zoom = 5; // Zoom para mostrar todo o Brasil
    
    map = L.map('map', {
        preferCanvas: false,
        zoomControl: true,
        attributionControl: false,
        zoomSnap: 1,
        zoomDelta: 1,
        wheelDebounceTime: 40,
        wheelPxPerZoomLevel: 60,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
        maxBoundsViscosity: 1.0
    }).setView([center.lat, center.lng], zoom);
    
    // 🗺️ DEFINIR APENAS 2 CAMADAS DE MAPA COM CONFIGURAÇÕES ESTÁVEIS
    baseLayers = {
        'Satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 18,
            updateWhenIdle: false,
            updateWhenZooming: true,
            keepBuffer: 2,
            updateInterval: 200
        }),
        'Padrão': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            updateWhenIdle: false,
            updateWhenZooming: true,
            keepBuffer: 2,
            updateInterval: 200
        })
    };
    
    // Adicionar camada padrão (Satélite primeiro)
    baseLayers['Satélite'].addTo(map);
    
    // Adicionar divisórias dos estados brasileiros
    addStateBorders();
    
    // Aguardar um pouco para o mapa renderizar
    setTimeout(() => {
        map.invalidateSize();
        
        if (isPropostaMode) {
            // 🌟 MODO PROPOSTA: Adicionar todas as rádios
            addAllRadiosToMap();
            setupLayersControlForProposta();
        } else {
            // 📻 MODO INDIVIDUAL: Lógica original
            if (radioData.coverageImage) {
                addCoverageImage();
            }
            
            if (radioData.antennaLocation) {
                addAntennaMarker();
            }
            
            addCityMarkers();
            
            if (citiesData.length > 0 || radioData.antennaLocation || radioData.coverageImage) {
                fitMapBounds();
            }
            
            if (legendImage) {
                document.getElementById('map-legend').style.display = 'block';
            }
        }
        
    }, 300);
    
    // Mostrar mapa
    document.getElementById('map-section').style.display = 'block';
    
    console.log('✅ Mapa inicializado');
}

// =========================================================================
// CONFIGURAR CONTROLE DE LAYERS PARA MODO INDIVIDUAL - CORRIGIDO
// =========================================================================
function setupLayersControlForIndividual() {
    console.log('🎛️ Configurando controle de layers para modo individual...');
    
    // Overlays para controle individual
    const overlays = {};
    
    // 🆕 ADICIONAR ÁREAS DE INTERESSE SE EXISTIREM NO MODO INDIVIDUAL - CORRIGIDO
    if (areasInteresseLayer) {
        const areasCount = filteredAreasInteresse ? filteredAreasInteresse.length : areasInteresseData.length;
        if (areasCount > 0) {
            overlays[`🎯 Áreas de Interesse (${areasCount})`] = areasInteresseLayer;
            console.log(`✅ Áreas de interesse adicionadas ao controle: ${areasCount} pontos`);
        }
    }
    
    // Criar controle de layers para modo individual
    if (layersControl) {
        map.removeControl(layersControl);
    }
    
    layersControl = L.control.layers(baseLayers, overlays, {
        position: 'topright',
        collapsed: false
    }).addTo(map);
    
    console.log('✅ Controle de layers configurado para modo individual');
}

// =========================================================================
// CONFIGURAR CONTROLE DE LAYERS PARA PROPOSTA - CORRIGIDO
// =========================================================================
function setupLayersControlForProposta() {
    const overlays = {};
    
    console.log('🎛️ Configurando controle de layers para proposta...');
    
    // Adicionar cada rádio como overlay controlável
    propostaData.radios.forEach(radio => {
        if (radiosLayers[radio.id]) {
            overlays[`📻 ${radio.name} (${radio.dial})`] = radiosLayers[radio.id];
        }
    });
    
    // 🆕 ADICIONAR ÁREAS DE INTERESSE SE EXISTIREM - CORRIGIDO
    if (areasInteresseLayer && areasInteresseData && areasInteresseData.length > 0) {
        const areasCobertas = areasInteresseData.filter(area => area.covered).length;
        overlays[`🎯 Áreas de Interesse (${areasCobertas}/${areasInteresseData.length})`] = areasInteresseLayer;
        console.log(`✅ Áreas de interesse adicionadas ao controle: ${areasCobertas}/${areasInteresseData.length} cobertas`);
    }
    
    console.log(`📊 Total de overlays configurados: ${Object.keys(overlays).length}`);
    
    // Criar controle de layers completo
    if (layersControl) {
        map.removeControl(layersControl);
    }
    
    layersControl = L.control.layers(baseLayers, overlays, {
        position: 'topright',
        collapsed: false
    }).addTo(map);
    
    console.log('✅ Controle de layers configurado para proposta');
}

// =========================================================================
// RESTANTE DAS FUNÇÕES AUXILIARES (PRESERVADAS DO CÓDIGO ORIGINAL)
// =========================================================================

// Adicionar todas as rádios ao mapa (modo proposta)
function addAllRadiosToMap() {
    console.log('🌟 Adicionando rádios ao mapa (otimizado)...');
    
    let processedRadios = 0;
    const batchSize = 2;
    
    function processBatch() {
        const endIndex = Math.min(processedRadios + batchSize, propostaData.radios.length);
        
        for (let i = processedRadios; i < endIndex; i++) {
            const radio = propostaData.radios[i];
            
            const radioLayerGroup = L.layerGroup({
                interactive: true,
                bubblingMouseEvents: false,
            });
            
            // 1. Adicionar imagem de cobertura se disponível
            if (radio.coverageImage) {
                const coverageLayer = L.imageOverlay(
                    radio.coverageImage.url,
                    radio.coverageImage.bounds,
                    {
                        opacity: 0.6,
                        interactive: false,
                        crossOrigin: false,
                    }
                );
                radioLayerGroup.addLayer(coverageLayer);
            }
            
            // 2. Adicionar marcador da antena
            if (radio.antennaLocation) {
                const antennaMarker = createRadioAntennaMarker(radio);
                radioLayerGroup.addLayer(antennaMarker);
            }
            
            // 3. Adicionar marcadores de cidades
            if (radio.citiesData && radio.citiesData.length > 0) {
                radio.citiesData.forEach((city, cityIndex) => {
                    const cityMarker = createCityMarker(city, radio);
                    radioLayerGroup.addLayer(cityMarker);
                });
            }
            
            // 4. Adicionar o grupo completo ao mapa
            radioLayerGroup.addTo(map);
            radiosLayers[radio.id] = radioLayerGroup;
        }
        
        processedRadios = endIndex;
        
        // Continuar processamento ou finalizar
        if (processedRadios < propostaData.radios.length) {
            requestAnimationFrame(processBatch);
        } else {
            finalizarAdicaoRadios();
        }
    }
    
    processBatch();
}

function finalizarAdicaoRadios() {
    fitMapBoundsForProposta();
    console.log(`✅ ${propostaData.radios.length} rádios processadas no mapa`);
    
    requestAnimationFrame(() => {
        setupLayersControlForProposta();
    });
}

// Criar marcador da antena para uma rádio
function createRadioAntennaMarker(radio) {
    let antennaIcon;
    let logoUrl = radio.logoUrlFromKMZ || radio.notionIconUrl;
    
    if (logoUrl) {
        antennaIcon = L.divIcon({
            html: `
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    overflow: hidden;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <img src="${logoUrl}" 
                         style="width: 34px; height: 34px; object-fit: cover; border-radius: 50%;"
                         onerror="this.parentElement.innerHTML='📡'; this.parentElement.style.color='#FF0000'; this.parentElement.style.fontSize='20px';">
                </div>
            `,
            className: 'antenna-marker-logo',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    } else {
        antennaIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    background: #FF0000;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                "></div>
            `,
            className: 'antenna-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }
    
    const popupContent = `
        <div style="text-align: center; font-family: var(--font-primary); min-width: 200px;">
            <h4 style="margin: 0 0 12px 0; color: #06055B;">📡 Antena Transmissora</h4>
            <p style="margin: 4px 0;"><strong>${radioData.name}</strong></p>
            <p style="margin: 4px 0;">${radioData.dial}</p>
        </div>
    `;
    
    L.marker([radioData.antennaLocation.lat, radioData.antennaLocation.lng], { icon: antennaIcon })
        .addTo(map)
        .bindPopup(popupContent);
    
    console.log('📍 Marcador da antena adicionado');
}

// Adicionar marcadores das cidades
function addCityMarkers() {
    cityMarkersIndividual = [];
    
    citiesData.forEach(city => {
        const color = getQualityColor(city.quality);
        
        const cityIcon = L.divIcon({
            html: `
                <div style="
                    width: 16px;
                    height: 16px;
                    background: ${color};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                "></div>
            `,
            className: 'city-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const popupContent = `
            <div style="text-align: center; font-family: var(--font-primary); min-width: 220px;">
                <h4 style="margin: 0 0 8px 0; color: #06055B;">${city.name} - ${city.uf}</h4>
                <div style="text-align: left; font-size: 13px; color: #64748B;">
                    <p style="margin: 4px 0;"><strong>População Total:</strong> ${(city.totalPopulation || 0).toLocaleString()}</p>
                    <p style="margin: 4px 0;"><strong>População Coberta:</strong> ${(city.coveredPopulation || 0).toLocaleString()}</p>
                    <p style="margin: 4px 0;"><strong>Qualidade:</strong> ${getQualityText(city.quality)}</p>
                </div>
            </div>
        `;
        
        const marker = L.marker([city.coordinates.lat, city.coordinates.lng], { icon: cityIcon })
            .addTo(map)
            .bindPopup(popupContent);
        
        cityMarkersIndividual.push(marker);
    });
    
    console.log(`🏙️ ${cityMarkersIndividual.length} marcadores de cidades adicionados`);
}

// Ajustar zoom do mapa - CORRIGIDO PARA INCLUIR ÁREAS
function fitMapBounds() {
    console.log('🗺️ Ajustando bounds do mapa...');
    
    // Verificar se há dados para enquadrar
    const hasData = citiesData.length > 0 || 
                   radioData.antennaLocation || 
                   radioData.coverageImage || 
                   (filteredAreasInteresse && filteredAreasInteresse.length > 0);
    
    if (!hasData) {
        console.log('ℹ️ Nenhum dado para ajustar bounds');
        return;
    }
    
    const bounds = L.latLngBounds();
    let pointsAdded = 0;
    
    // Adicionar cidades
    citiesData.forEach(city => {
        if (city.coordinates && typeof city.coordinates.lat === 'number' && typeof city.coordinates.lng === 'number') {
            bounds.extend([city.coordinates.lat, city.coordinates.lng]);
            pointsAdded++;
        }
    });
    
    // Adicionar antena
    if (radioData.antennaLocation && typeof radioData.antennaLocation.lat === 'number' && typeof radioData.antennaLocation.lng === 'number') {
        bounds.extend([radioData.antennaLocation.lat, radioData.antennaLocation.lng]);
        pointsAdded++;
    }
    
    // Adicionar imagem de cobertura
    if (radioData.coverageImage && radioData.coverageImage.bounds) {
        try {
            bounds.extend(radioData.coverageImage.bounds);
            pointsAdded++;
        } catch (error) {
            console.warn('⚠️ Erro ao adicionar bounds da imagem de cobertura:', error);
        }
    }
    
    // 🆕 ADICIONAR ÁREAS DE INTERESSE AOS BOUNDS - CORRIGIDO
    if (filteredAreasInteresse && filteredAreasInteresse.length > 0) {
        filteredAreasInteresse.forEach(area => {
            if (area.coordinates && typeof area.coordinates.lat === 'number' && typeof area.coordinates.lng === 'number') {
                bounds.extend([area.coordinates.lat, area.coordinates.lng]);
                pointsAdded++;
            }
        });
        console.log(`📍 ${filteredAreasInteresse.length} áreas de interesse incluídas nos bounds`);
    }
    
    // Aplicar bounds se válido
    if (bounds.isValid() && pointsAdded > 0) {
        map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 15 // Evitar zoom muito próximo
        });
        console.log(`✅ Bounds ajustados com ${pointsAdded} pontos de referência`);
    } else {
        console.warn('⚠️ Bounds inválidos ou sem pontos');
    }
}

// Renderizar lista de cidades - CORRIGIDO PARA ÁREAS
function renderCities() {
    filteredCities = [...citiesData];
    updateCitiesList();
    
    document.getElementById('cidade-count').textContent = citiesData.length;
    
    // 🔧 CORRIGIDO: Atualizar título com informação das áreas se existirem
    const areasCount = filteredAreasInteresse ? filteredAreasInteresse.length : 0;
    if (areasCount > 0) {
        const cidadesTitle = document.querySelector('.cidades-title');
        if (cidadesTitle) {
            cidadesTitle.innerHTML = `
                🏙️ Cidades de Cobertura
                <span class="cidade-count" id="cidade-count">${citiesData.length}</span>
                • 🎯 ${areasCount} áreas de interesse
            `;
        }
    }
    
    document.getElementById('cidades-section').style.display = 'block';
    console.log(`✅ Lista de cidades renderizada: ${citiesData.length} cidades${areasCount > 0 ? ` + ${areasCount} áreas` : ''}`);
}

function updateCitiesList() {
    const container = document.getElementById('cidades-list');
    
    if (filteredCities.length === 0) {
        container.innerHTML = `
            <div class="cidade-item" style="text-align: center; padding: 30px;">
                ❌ Nenhuma cidade encontrada
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredCities.map(city => `
        <div class="cidade-item" onclick="highlightCity('${city.name.replace(/'/g, "\\'")}')">
            <div class="cidade-info">
                <div class="cidade-name">${city.name} - ${city.uf}</div>
                <div class="cidade-details">
                    <span>👥 ${(city.totalPopulation || 0).toLocaleString()} hab.</span>
                    <span>✅ ${(city.coveredPopulation || 0).toLocaleString()} cobertos ${city.coveragePercent ? `(${city.coveragePercent})` : ''}</span>
                    <span class="cidade-badge badge-${city.quality}">📶 ${getQualityText(city.quality)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Configurar busca
function setupSearch() {
    const searchInput = document.getElementById('city-search');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            filteredCities = [...citiesData];
        } else {
            filteredCities = citiesData.filter(city => {
                return city.name.toLowerCase().includes(query) ||
                       city.uf?.toLowerCase().includes(query) ||
                       city.fullName?.toLowerCase().includes(query) ||
                       getQualityText(city.quality).toLowerCase().includes(query) ||
                       city.quality?.toLowerCase().includes(query);
            });
        }
        
        updateCitiesList();
        document.getElementById('cidade-count').textContent = filteredCities.length;
    });
}

// Destacar cidade no mapa
function highlightCity(cityName) {
    const city = citiesData.find(c => c.name === cityName);
    if (!city) return;
    
    map.flyTo([city.coordinates.lat, city.coordinates.lng], 13, {
        animate: true,
        duration: 1.5
    });
    
    setTimeout(() => {
        cityMarkersIndividual.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - city.coordinates.lat) < 0.0001 &&
                Math.abs(markerLatLng.lng - city.coordinates.lng) < 0.0001) {
                marker.openPopup();
            }
        });
    }, 1000);
}

// Exportar para Excel
function exportToExcel() {
    const excelData = [
        ['Cidade', 'UF', 'População Total', 'População Coberta', '% Cobertura', 'Qualidade']
    ];
    
    filteredCities.forEach(city => {
        excelData.push([
            city.name || '',
            city.uf || '',
            city.totalPopulation || 0,
            city.coveredPopulation || 0,
            city.coveragePercent || '0%',
            getQualityText(city.quality)
        ]);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    ws['!cols'] = [
        { wch: 30 }, // Cidade
        { wch: 5 },  // UF
        { wch: 15 }, // Pop Total
        { wch: 15 }, // Pop Coberta
        { wch: 12 }, // % Cobertura
        { wch: 15 }  // Qualidade
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cidades de Cobertura');
    
    if (filteredAreasInteresse && filteredAreasInteresse.length > 0) {
        const areasData = [
            ['Área de Interesse', 'Tipo', 'Prioridade', 'Cobertura', 'Descrição']
        ];
        
        filteredAreasInteresse.forEach(area => {
            areasData.push([
                area.name || '',
                getAreaTypeText(area.type),
                getAreaPriorityText(area.priority),
                area.covered ? 'Sim' : 'Não',
                area.description || ''
            ]);
        });
        
        const wsAreas = XLSX.utils.aoa_to_sheet(areasData);
        wsAreas['!cols'] = [
            { wch: 35 }, // Área
            { wch: 15 }, // Tipo
            { wch: 12 }, // Prioridade
            { wch: 12 }, // Cobertura
            { wch: 40 }  // Descrição
        ];
        
        XLSX.utils.book_append_sheet(wb, wsAreas, 'Áreas de Interesse');
    }
    
    const fileName = `${radioData.name || 'cobertura'}_mapeamento_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('📊 Excel exportado:', fileName);
}

// Converter URL do Google Drive
function convertGoogleDriveUrl(url) {
    if (!url) return '';
    
    if (url.includes('drive.google.com/uc?')) {
        return url;
    }
    
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (!fileIdMatch) throw new Error('URL do Google Drive inválida');
    
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Processar ícone do Notion (modo individual)
function processNotionIcon() {
    console.log('🖼️ Processando ícone do Notion...');
    
    if (radioData.icon) {
        if (radioData.icon.type === 'file' && radioData.icon.url) {
            radioData.notionIconUrl = radioData.icon.url;
            console.log('✅ Ícone do Notion (file) processado');
        } else if (radioData.icon.type === 'external' && radioData.icon.url) {
            radioData.notionIconUrl = radioData.icon.url;
            console.log('✅ Ícone do Notion (external) processado');
        } else if (radioData.icon.type === 'emoji') {
            radioData.notionEmoji = radioData.icon.emoji;
            console.log('✅ Emoji do Notion processado');
        }
    }
    
    if (!radioData.notionIconUrl && radioData.imageUrl && !radioData.imageUrl.includes('placeholder')) {
        radioData.notionIconUrl = radioData.imageUrl;
        console.log('✅ Usando campo Imagem como fallback');
    }
}

// Atualizar header básico (sem logo) - CORRIGIDO PARA ÁREAS
function updateHeaderBasic() {
    const radioName = document.getElementById('radio-name');
    const radioInfo = document.getElementById('radio-info');
    
    if (radioName) {
        radioName.textContent = radioData.name || 'Rádio';
    }
    
    if (radioInfo) {
        let infoText = `${radioData.dial || ''} • ${radioData.praca || ''} - ${radioData.uf || ''}`;
        
        // 🔧 CORRIGIDO: Verificar áreas de interesse corretamente
        const areasCount = filteredAreasInteresse ? filteredAreasInteresse.length : 0;
        if (areasCount > 0) {
            infoText += ` • ${areasCount} áreas de interesse cobertas`;
        }
        
        radioInfo.textContent = infoText;
    }
    
    console.log('✅ Header básico atualizado');
}

// Atualizar logo no header
function updateHeaderLogoFinal(retryCount = 0) {
    if (isPropostaMode) {
        return;
    }
    
    const maxRetries = 5;
    const headerLogo = document.getElementById('header-logo');
    
    if (!headerLogo) {
        if (retryCount < maxRetries) {
            setTimeout(() => {
                updateHeaderLogoFinal(retryCount + 1);
            }, 500);
            return;
        } else {
            console.error('❌ Elemento header-logo não foi encontrado!');
            
            const radioNameElement = document.getElementById('radio-name');
            if (radioNameElement) {
                const logoImg = document.createElement('img');
                logoImg.id = 'header-logo';
                logoImg.className = 'header-logo';
                logoImg.style.display = 'none';
                logoImg.alt = 'Logo';
                radioNameElement.appendChild(logoImg);
                
                setTimeout(() => {
                    updateHeaderLogoFinal(0);
                }, 200);
                return;
            }
        }
    }
    
    let logoUrl = null;
    let source = '';
    
    if (radioData.logoUrlFromKMZ) {
        logoUrl = radioData.logoUrlFromKMZ;
        source = 'KMZ';
    } else if (radioData.notionIconUrl) {
        logoUrl = radioData.notionIconUrl;
        source = 'Notion Icon';
    } else if (radioData.imageUrl && !radioData.imageUrl.includes('placeholder')) {
        logoUrl = radioData.imageUrl;
        source = 'Campo Imagem';
    }
    
    if (logoUrl) {
        console.log(`🎯 Configurando logo do ${source} no header`);
        
        headerLogo.src = logoUrl;
        headerLogo.style.display = 'block';
        
        headerLogo.onload = function() {
            console.log(`✅ Logo carregada no header!`);
        };
        
        headerLogo.onerror = function() {
            console.warn(`⚠️ Erro ao carregar logo do ${source}`);
            this.style.display = 'none';
            
            if (source === 'KMZ' && radioData.notionIconUrl) {
                setTimeout(() => {
                    radioData.logoUrlFromKMZ = null;
                    updateHeaderLogoFinal(0);
                }, 100);
            } else if (source === 'Notion Icon' && radioData.imageUrl) {
                setTimeout(() => {
                    radioData.notionIconUrl = null;
                    updateHeaderLogoFinal(0);
                }, 100);
            }
        };
        
    } else {
        headerLogo.style.display = 'none';
        console.log('ℹ️ Nenhuma logo disponível para o header');
    }
}

// Forçar atualização da logo quando detectada no KMZ
function forceUpdateHeaderLogo() {
    if (isPropostaMode) {
        return;
    }
    
    console.log('🚀 FORÇANDO atualização da logo no header...');
    
    setTimeout(() => {
        updateHeaderLogoFinal(0);
    }, 200);
}

function updateCoverageInfo() {
    document.getElementById('info-dial').textContent = radioData.dial || '-';
    document.getElementById('info-uf').textContent = radioData.uf || '-';
    document.getElementById('info-praca').textContent = radioData.praca || '-';
    document.getElementById('info-pop-total').textContent = (radioData.totalPopulation || 0).toLocaleString();
    document.getElementById('info-pop-coberta').textContent = (radioData.coveredPopulation || 0).toLocaleString();
    document.getElementById('info-cidades-count').textContent = radioData.citiesCount || 0;
    
    document.getElementById('info-section').style.display = 'grid';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message, details) {
    document.getElementById('loading').style.display = 'none';
    hideLoadingScreen();
    document.getElementById('error-message').textContent = message;
    
    if (details) {
        document.getElementById('error-details').textContent = details;
        document.getElementById('error-details').style.display = 'block';
    }
    
    document.getElementById('error').style.display = 'block';
}

// Processar KMZ de uma rádio específica
async function processRadioKMZ(radio) {
    try {
        const directUrl = convertGoogleDriveUrl(radio.kmz2Url);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        let kmlFile = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (filename.toLowerCase().endsWith('.kml')) {
                kmlFile = file;
                break;
            }
        }
        
        if (!kmlFile) {
            throw new Error('KML não encontrado no KMZ');
        }
        
        const kmlText = await kmlFile.async('text');
        await parseRadioKMZContent(radio, kmlText, zip);
        
    } catch (error) {
        console.warn(`⚠️ KMZ ${radio.name}: ${error.message}`);
    }
}

// Processar conteúdo do KMZ de uma rádio
async function parseRadioKMZContent(radio, kmlText, zip) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
    const groundOverlay = xmlDoc.querySelector('GroundOverlay');
    if (groundOverlay) {
        const iconHref = groundOverlay.querySelector('Icon href')?.textContent;
        const latLonBox = groundOverlay.querySelector('LatLonBox');
        
        if (iconHref && latLonBox) {
            const north = parseFloat(latLonBox.querySelector('north')?.textContent);
            const south = parseFloat(latLonBox.querySelector('south')?.textContent);
            const east = parseFloat(latLonBox.querySelector('east')?.textContent);
            const west = parseFloat(latLonBox.querySelector('west')?.textContent);
            
            const imageFile = zip.file(iconHref);
            if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);
                
                radio.coverageImage = {
                    url: imageUrl,
                    bounds: [[south, west], [north, east]]
                };
            }
        }
    }
    
    const placemark = xmlDoc.querySelector('Placemark');
    if (placemark) {
        const iconStyle = placemark.querySelector('Style IconStyle Icon href');
        if (iconStyle) {
            const logoUrl = iconStyle.textContent.trim();
            if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                radio.logoUrlFromKMZ = logoUrl;
                
                if (!isPropostaMode) {
                    forceUpdateHeaderLogo();
                }
            }
        }
        
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        if (coordinates) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            radio.antennaLocation = { lat, lng };
        }
        
        const description = placemark.querySelector('description')?.textContent;
        if (description) {
            radio.antennaData = parseAntennaDataDescription(description);
        }
    }
}

// Processar KML de cidades de uma rádio
async function processRadioKML(radio) {
    try {
        const directUrl = convertGoogleDriveUrl(radio.kml2Url);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const kmlText = await response.text();
        radio.citiesData = await parseKMLCitiesForRadio(kmlText);
        
    } catch (error) {
        console.warn(`⚠️ KML ${radio.name}: ${error.message}`);
        radio.citiesData = [];
    }
}

// Processar cidades do KML para uma rádio específica
async function parseKMLCitiesForRadio(kmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    
    const cities = [];
    
    placemarks.forEach((placemark) => {
        const name = placemark.querySelector('name')?.textContent || '';
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        const styleUrl = placemark.querySelector('styleUrl')?.textContent || '';
        
        if (coordinates && name) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            
            const cityData = parseExtendedData(placemark);
            
            if (!cityData.totalPopulation) {
                const description = placemark.querySelector('description')?.textContent || '';
                if (description) {
                    const htmlData = parseCityDescription(description);
                    Object.assign(cityData, htmlData);
                }
            }
            
            const nameParts = name.split(' - ');
            cityData.name = nameParts[0] || name;
            cityData.uf = nameParts[1] || '';
            cityData.fullName = name;
            cityData.coordinates = { lat, lng };
            cityData.quality = getSignalQuality(styleUrl);
            
            cities.push(cityData);
        }
    });
    
    return cities;
}

// =========================================================================
// CONTROLES DO PAINEL DE RÁDIOS (MODO PROPOSTA)
// =========================================================================

function toggleRadiosPanel() {
    const panel = document.getElementById('radios-panel-content');
    if (panel) {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
    }
}

function showAllCoverages() {
    if (typeof radiosLayers !== 'undefined') {
        const layersArray = Object.values(radiosLayers);
        let index = 0;
        
        function processNext() {
            if (index < layersArray.length) {
                const layerGroup = layersArray[index];
                if (!map.hasLayer(layerGroup)) {
                    layerGroup.addTo(map);
                }
                layerGroup.setOpacity && layerGroup.setOpacity(0.6);
                index++;
                
                if (index % 3 === 0) {
                    requestAnimationFrame(processNext);
                } else {
                    processNext();
                }
            } else {
                console.log('✅ Todas as coberturas mostradas');
            }
        }
        
        processNext();
    }
}

function hideAllCoverages() {
    if (typeof radiosLayers !== 'undefined') {
        const layersArray = Object.values(radiosLayers);
        let index = 0;
        
        function processNext() {
            if (index < layersArray.length) {
                const layerGroup = layersArray[index];
                if (map.hasLayer(layerGroup)) {
                    map.removeLayer(layerGroup);
                }
                index++;
                
                if (index % 5 === 0) {
                    requestAnimationFrame(processNext);
                } else {
                    processNext();
                }
            } else {
                console.log('👁️ Todas as coberturas ocultadas');
            }
        }
        
        processNext();
    }
}

function toggleRadioCoverage(radioId) {
    if (typeof radiosLayers !== 'undefined' && radiosLayers[radioId]) {
        const layerGroup = radiosLayers[radioId];
        const checkbox = document.getElementById(`radio-${radioId}`);
        
        if (map.hasLayer(layerGroup)) {
            map.removeLayer(layerGroup);
            if (checkbox) checkbox.checked = false;
            console.log(`👁️ Grupo de ${radioId} ocultado`);
        } else {
            layerGroup.addTo(map);
            if (checkbox) checkbox.checked = true;
            console.log(`✅ Grupo de ${radioId} mostrado`);
        }
    }
}

function focusOnRadio(radioId) {
    if (typeof highlightRadio !== 'undefined') {
        highlightRadio(radioId);
    }
}

// Destacar rádio no mapa
function highlightRadio(radioId) {
    const radio = propostaData.radios.find(r => r.id === radioId);
    if (!radio || !radiosLayers[radioId]) return;
    
    if (radio.antennaLocation) {
        map.flyTo([radio.antennaLocation.lat, radio.antennaLocation.lng], 10, {
            animate: true,
            duration: 1.5
        });
        
        setTimeout(() => {
            const layerGroup = radiosLayers[radioId];
            if (layerGroup) {
                layerGroup.eachLayer(layer => {
                    if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.iconSize) {
                        const iconSize = layer.options.icon.options.iconSize;
                        if (iconSize[0] === 40 && iconSize[1] === 40) {
                            layer.openPopup();
                        }
                    }
                });
            }
        }, 1000);
    }
    
    if (radiosLayers[radioId]) {
        const layerGroup = radiosLayers[radioId];
        
        layerGroup.eachLayer(layer => {
            if (layer.setOpacity) {
                const originalOpacity = layer.options.opacity || 0.6;
                layer.setOpacity(0.9);
                setTimeout(() => layer.setOpacity(originalOpacity), 1000);
            }
        });
    }
        });
    }
    
    const popupContent = `
        <div style="text-align: center; font-family: var(--font-primary); min-width: 200px;">
            <h4 style="margin: 0 0 12px 0; color: #06055B;">📡 ${radio.name}</h4>
            <p style="margin: 4px 0;"><strong>${radio.dial}</strong></p>
            <p style="margin: 4px 0;">${radio.praca} - ${radio.uf}</p>
        </div>
    `;
    
    return L.marker([radio.antennaLocation.lat, radio.antennaLocation.lng], { icon: antennaIcon })
        .bindPopup(popupContent);
}

// Criar marcador de cidade
function createCityMarker(city, radio) {
    const color = getQualityColor(city.quality);
    
    const cityIcon = L.divIcon({
        html: `
            <div style="
                width: 16px;
                height: 16px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
        `,
        className: 'city-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    
    const popupContent = `
        <div style="text-align: center; font-family: var(--font-primary); min-width: 220px;">
            <h4 style="margin: 0 0 8px 0; color: #06055B;">${city.name} - ${city.uf}</h4>
            <p style="margin: 2px 0; font-weight: bold; color: #FC1E75;">📻 ${radio.name} (${radio.dial})</p>
            <div style="text-align: left; font-size: 13px; color: #64748B;">
                <p style="margin: 4px 0;"><strong>População Total:</strong> ${(city.totalPopulation || 0).toLocaleString()}</p>
                <p style="margin: 4px 0;"><strong>População Coberta:</strong> ${(city.coveredPopulation || 0).toLocaleString()}</p>
                <p style="margin: 4px 0;"><strong>Qualidade:</strong> ${getQualityText(city.quality)}</p>
            </div>
        </div>
    `;
    
    return L.marker([city.coordinates.lat, city.coordinates.lng], { icon: cityIcon })
        .bindPopup(popupContent);
}

// Ajustar zoom para proposta - CORRIGIDO PARA INCLUIR ÁREAS
function fitMapBoundsForProposta() {
    console.log('🗺️ Ajustando bounds para proposta...');
    
    const bounds = L.latLngBounds();
    let hasData = false;
    let pointsAdded = 0;
    
    // Adicionar dados de todas as rádios
    propostaData.radios.forEach(radio => {
        // Antena
        if (radio.antennaLocation && typeof radio.antennaLocation.lat === 'number' && typeof radio.antennaLocation.lng === 'number') {
            bounds.extend([radio.antennaLocation.lat, radio.antennaLocation.lng]);
            hasData = true;
            pointsAdded++;
        }
        
        // Cidades
        if (radio.citiesData && Array.isArray(radio.citiesData)) {
            radio.citiesData.forEach(city => {
                if (city.coordinates && typeof city.coordinates.lat === 'number' && typeof city.coordinates.lng === 'number') {
                    bounds.extend([city.coordinates.lat, city.coordinates.lng]);
                    hasData = true;
                    pointsAdded++;
                }
            });
        }
        
        // Imagem de cobertura
        if (radio.coverageImage && radio.coverageImage.bounds) {
            try {
                bounds.extend(radio.coverageImage.bounds);
                hasData = true;
                pointsAdded++;
            } catch (error) {
                console.warn(`⚠️ Erro ao adicionar bounds da rádio ${radio.name}:`, error);
            }
        }
    });
    
    // 🆕 ADICIONAR ÁREAS DE INTERESSE AOS BOUNDS DA PROPOSTA - CORRIGIDO
    if (areasInteresseData && areasInteresseData.length > 0) {
        let areasAdicionadas = 0;
        areasInteresseData.forEach(area => {
            if (area.coordinates && typeof area.coordinates.lat === 'number' && typeof area.coordinates.lng === 'number') {
                bounds.extend([area.coordinates.lat, area.coordinates.lng]);
                hasData = true;
                pointsAdded++;
                areasAdicionadas++;
            }
        });
        console.log(`📍 ${areasAdicionadas} áreas de interesse incluídas nos bounds da proposta`);
    }
    
    // Aplicar bounds se válido
    if (hasData && bounds.isValid() && pointsAdded > 0) {
        map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 12 // Zoom mais amplo para proposta
        });
        console.log(`✅ Bounds da proposta ajustados com ${pointsAdded} pontos de referência`);
    } else {
        console.warn('⚠️ Nenhum dado válido para ajustar bounds da proposta');
    }
}

// Configurar interface para proposta
function setupPropostaInterface() {
    updateHeaderProposta();
    hideUnnecessaryElementsInPropostaMode();
    console.log('✅ Interface proposta configurada');
}

function hideUnnecessaryElementsInPropostaMode() {
    const infoSection = document.getElementById('info-section');
    if (infoSection) {
        infoSection.style.display = 'none';
    }
    
    const cidadesSection = document.getElementById('cidades-section');
    if (cidadesSection) {
        cidadesSection.style.display = 'none';
    }
}

// Atualizar header para proposta
function updateHeaderProposta() {
    const radioName = document.getElementById('radio-name');
    const radioInfo = document.getElementById('radio-info');
    const headerLogo = document.getElementById('header-logo');
    
    if (radioName) {
        radioName.innerHTML = '🗺️ Mapeamento da Proposta';
        const existingImgs = radioName.querySelectorAll('img');
        existingImgs.forEach(img => img.remove());
    }
    
    if (radioInfo) {
        const radiosCount = propostaData.proposta.totalRadios;
        const estadosCount = propostaData.summary.estados.length;
        const areasCount = areasInteresseData ? areasInteresseData.length : 0;
        
        let infoText = `${radiosCount} rádios • ${estadosCount} estados`;
        if (areasCount > 0) {
            infoText += ` • ${areasCount} áreas de interesse`;
        }
        infoText += ` • ${propostaData.proposta.title}`;
        
        radioInfo.textContent = infoText;
    }
    
    if (headerLogo) {
        headerLogo.style.display = 'none';
        headerLogo.style.visibility = 'hidden';
        headerLogo.src = '';
        
        try {
            headerLogo.remove();
        } catch (e) {
            // Ignorar erro se elemento já foi removido
        }
    }
    
    console.log('✅ Header atualizado para proposta');
}

// Configurar estatísticas consolidadas
function setupConsolidatedStats() {
    console.log('📊 Calculando estatísticas...');
    
    if ('requestIdleCallback' in window) {
        requestIdleCallback(calculateStatsWhenIdle);
    } else {
        setTimeout(calculateStatsWhenIdle, 100);
    }
}

function calculateStatsWhenIdle() {
    let totalRadios = propostaData.proposta.totalRadios || propostaData.radios.length;
    let totalCities = 0;
    let totalPopulation = 0;
    let totalCoveredPopulation = 0;
    let radiosWithKmz = 0;
    let radiosWithKml = 0;
    
    let totalAreas = areasInteresseData ? areasInteresseData.length : 0;
    let coveredAreas = 0;
    
    let processedRadios = 0;
    const batchSize = 5;
    
    function processBatch() {
        const endIndex = Math.min(processedRadios + batchSize, propostaData.radios.length);
        
        for (let i = processedRadios; i < endIndex; i++) {
            const radio = propostaData.radios[i];
            
            if (radio.hasKmz || radio.coverageImage) radiosWithKmz++;
            if (radio.hasKml || (radio.citiesData && radio.citiesData.length > 0)) radiosWithKml++;
            
            if (radio.citiesData && Array.isArray(radio.citiesData)) {
                totalCities += radio.citiesData.length;
                
                const cityTotals = radio.citiesData.reduce((acc, city) => {
                    acc.total += city.totalPopulation || 0;
                    acc.covered += city.coveredPopulation || 0;
                    return acc;
                }, { total: 0, covered: 0 });
                
                totalPopulation += cityTotals.total;
                totalCoveredPopulation += cityTotals.covered;
            }
        }
        
        processedRadios = endIndex;
        
        if (processedRadios < propostaData.radios.length) {
            requestAnimationFrame(processBatch);
        } else {
            if (areasInteresseData) {
                coveredAreas = areasInteresseData.filter(area => area.covered).length;
            }
            
            finalizarEstatisticas(totalRadios, totalCities, totalPopulation, totalCoveredPopulation, radiosWithKmz, radiosWithKml, totalAreas, coveredAreas);
        }
    }
    
    processBatch();
}

function finalizarEstatisticas(totalRadios, totalCities, totalPopulation, totalCoveredPopulation, radiosWithKmz, radiosWithKml, totalAreas, coveredAreas) {
    const coveragePercent = totalPopulation > 0 ? ((totalCoveredPopulation / totalPopulation) * 100).toFixed(1) : 0;
    const areasPercent = totalAreas > 0 ? ((coveredAreas / totalAreas) * 100).toFixed(1) : 0;
    
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        let statsHTML = `
            <div class="stat-card">
                <div class="stat-card-title">📻 Total de Rádios</div>
                <div class="stat-card-value">${totalRadios}</div>
                <div class="stat-card-detail">${radiosWithKmz} com cobertura • ${radiosWithKml} com cidades</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-title">🏙️ Cidades cobertas</div>
                <div class="stat-card-value">${totalCities.toLocaleString()}</div>
                <div class="stat-card-detail">Em ${propostaData.summary.estados.length} estados</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-title">👥 População Total</div>
                <div class="stat-card-value">${totalPopulation.toLocaleString()}</div>
                <div class="stat-card-detail">Universo potencial</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-title">✅ Universo</div>
                <div class="stat-card-value">${totalCoveredPopulation.toLocaleString()}</div>
                <div class="stat-card-detail">${coveragePercent}% do total</div>
            </div>
        `;
        
        // 🔧 CORRIGIDO: Adicionar card de áreas apenas se existirem
        if (totalAreas > 0) {
            statsHTML += `
                <div class="stat-card stat-card-areas">
                    <div class="stat-card-title">🎯 Áreas de Interesse</div>
                    <div class="stat-card-value">${coveredAreas}/${totalAreas}</div>
                    <div class="stat-card-detail">${areasPercent}% atendidas</div>
                </div>
            `;
        }
        
        statsGrid.innerHTML = statsHTML;
        document.getElementById('stats-section').style.display = 'block';
    }
    
    console.log(`✅ Estatísticas finalizadas:`);
    console.log(`   📻 ${totalRadios} rádios`);
    console.log(`   🏙️ ${totalCities} cidades`);
    console.log(`   👥 ${totalPopulation.toLocaleString()} população total`);
    console.log(`   ✅ ${totalCoveredPopulation.toLocaleString()} população coberta (${coveragePercent}%)`);
    if (totalAreas > 0) {
        console.log(`   🎯 ${coveredAreas}/${totalAreas} áreas de interesse cobertas (${areasPercent}%)`);
    }
}

// =========================================================================
// FUNÇÕES AUXILIARES FINAIS
// =========================================================================

// Obter cor por qualidade
function getQualityColor(quality) {
    switch (quality) {
        case 'excelente': return '#00FF00';
        case 'otimo': return '#00FFFF';
        case 'fraco': return '#0000FF';
        default: return '#808080';
    }
}

function getQualityText(quality) {
    switch (quality) {
        case 'excelente': return 'Excelente';
        case 'otimo': return 'Ótimo';
        case 'fraco': return 'Fraco';
        default: return 'Desconhecido';
    }
}

// Processar arquivos (modo individual)
async function processFiles() {
    console.log('📄 Processando arquivos...');
    
    if (radioData.kmz2Url) {
        console.log('📦 Processando KMZ...');
        await processKMZ(radioData.kmz2Url);
    }
    
    if (radioData.kml2Url) {
        console.log('🏙️ Processando KML de cidades...');
        await processKML(radioData.kml2Url);
    }
    
    console.log('✅ Arquivos processados');
}

// Processar arquivo KMZ (modo individual)
async function processKMZ(driveUrl) {
    try {
        const directUrl = convertGoogleDriveUrl(driveUrl);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log('📦 Baixando KMZ...');
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        let kmlFile = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (filename.toLowerCase().endsWith('.kml')) {
                kmlFile = file;
                break;
            }
        }
        
        if (!kmlFile) throw new Error('KML não encontrado no KMZ');
        
        const kmlText = await kmlFile.async('text');
        console.log('📄 KML extraído');
        
        await parseKMZContent(kmlText, zip);
        
    } catch (error) {
        console.error('❌ Erro ao processar KMZ:', error);
        console.warn('⚠️ Continuando sem imagem de cobertura');
    }
}

// Processar conteúdo do KMZ
async function parseKMZContent(kmlText, zip) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
    console.log('🔍 Parseando conteúdo do KMZ...');
    
    // Extrair GroundOverlay (imagem de cobertura)
    const groundOverlay = xmlDoc.querySelector('GroundOverlay');
    if (groundOverlay) {
        const iconHref = groundOverlay.querySelector('Icon href')?.textContent;
        const latLonBox = groundOverlay.querySelector('LatLonBox');
        
        if (iconHref && latLonBox) {
            const north = parseFloat(latLonBox.querySelector('north')?.textContent);
            const south = parseFloat(latLonBox.querySelector('south')?.textContent);
            const east = parseFloat(latLonBox.querySelector('east')?.textContent);
            const west = parseFloat(latLonBox.querySelector('west')?.textContent);
            
            console.log('🗺️ GroundOverlay encontrado');
            
            const imageFile = zip.file(iconHref);
            if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);
                
                radioData.coverageImage = {
                    url: imageUrl,
                    bounds: [[south, west], [north, east]]
                };
                
                console.log('✅ GroundOverlay extraído');
            }
        }
    }
    
    // Extrair ScreenOverlay (legenda)
    const screenOverlay = xmlDoc.querySelector('ScreenOverlay');
    if (screenOverlay) {
        const iconHref = screenOverlay.querySelector('Icon href')?.textContent;
        if (iconHref) {
            const imageFile = zip.file(iconHref);
            if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                legendImage = URL.createObjectURL(imageBlob);
                console.log('✅ Legenda extraída');
            }
        }
    }
    
    // Extrair dados da antena (Placemark)
    const placemark = xmlDoc.querySelector('Placemark');
    if (placemark) {
        console.log('📡 Processando dados da antena...');
        
        if (!isPropostaMode) {
            const iconStyle = placemark.querySelector('Style IconStyle Icon href');
            if (iconStyle) {
                const logoUrl = iconStyle.textContent.trim();
                console.log('🔍 URL encontrada no IconStyle:', logoUrl);
                if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                    radioData.logoUrlFromKMZ = logoUrl;
                    console.log('✅ Logo extraída do IconStyle KMZ:', logoUrl);
                    forceUpdateHeaderLogo();
                }
            }
        }
        
        const description = placemark.querySelector('description')?.textContent;
        if (description) {
            parseAntennaDataDescription(description);
        }
        
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        if (coordinates) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            radioData.antennaLocation = { lat, lng };
            console.log('📍 Localização da antena encontrada');
        }
    }
}

// Extrair dados técnicos da antena
function parseAntennaDataDescription(htmlDescription) {
    console.log('📊 Extraindo dados técnicos...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    
    const data = {};
    
    if (!isPropostaMode && !radioData.logoUrlFromKMZ) {
        const imgTag = doc.querySelector('img');
        if (imgTag) {
            const logoUrl = imgTag.getAttribute('src');
            console.log('🔍 URL encontrada na descrição HTML:', logoUrl);
            if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                radioData.logoUrlFromKMZ = logoUrl;
                console.log('✅ Logo extraída da descrição HTML:', logoUrl);
                forceUpdateHeaderLogo();
            }
        }
    }
    
    const rows = doc.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const key = cells[0].textContent.trim().toLowerCase();
            const value = cells[1].textContent.trim();
            
            if (key.includes('frequência') || key.includes('frequency')) {
                data.frequencia = value;
            } else if (key.includes('potência') || key.includes('rf power') || key.includes('power')) {
                data.potencia = value;
            } else if (key.includes('erp')) {
                data.erp = value;
            } else if (key.includes('altura') || key.includes('height') || key.includes('tx height')) {
                data.altura = value;
            }
        }
    });
    
    if (Object.keys(data).length === 0) {
        const text = htmlDescription;
        
        let match = text.match(/(\d+\.?\d*)\s*(MHz|mhz)/i);
        if (match) data.frequencia = `${match[1]} ${match[2]}`;
        
        match = text.match(/(\d+\.?\d*)\s*(W|watts?)\b/i);
        if (match) data.potencia = `${match[1]} ${match[2]}`;
        
        match = text.match(/ERP[:\s]*(\d+\.?\d*\s*[Ww])/i);
        if (match) data.erp = match[1];
        
        match = text.match(/(\d+\.?\d*)\s*m\b/i);
        if (match) data.altura = `${match[1]}m`;
    }
    
    radioData.antennaData = data;
    console.log('📊 Dados técnicos extraídos');
}

// Processar KML de cidades
async function processKML(driveUrl) {
    try {
        const directUrl = convertGoogleDriveUrl(driveUrl);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log('🏙️ Baixando KML...');
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const kmlText = await response.text();
        console.log('📄 KML de cidades baixado');
        await parseKMLCities(kmlText);
        
    } catch (error) {
        console.error('❌ Erro ao processar KML:', error);
        throw error;
    }
}

// Processar cidades do KML
async function parseKMLCities(kmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    
    console.log(`🏙️ Encontrados ${placemarks.length} placemarks de cidades`);
    
    citiesData = [];
    let totalPopulation = 0;
    let coveredPopulation = 0;
    
    placemarks.forEach((placemark, index) => {
        const name = placemark.querySelector('name')?.textContent || '';
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        const styleUrl = placemark.querySelector('styleUrl')?.textContent || '';
        
        if (coordinates && name) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            
            const cityData = parseExtendedData(placemark);
            
            if (!cityData.totalPopulation) {
                const description = placemark.querySelector('description')?.textContent || '';
                if (description) {
                    const htmlData = parseCityDescription(description);
                    Object.assign(cityData, htmlData);
                }
            }
            
            const nameParts = name.split(' - ');
            cityData.name = nameParts[0] || name;
            cityData.uf = nameParts[1] || radioData.uf || '';
            cityData.fullName = name;
            cityData.coordinates = { lat, lng };
            cityData.quality = getSignalQuality(styleUrl);
            
            citiesData.push(cityData);
            
            totalPopulation += cityData.totalPopulation || 0;
            coveredPopulation += cityData.coveredPopulation || 0;
        }
    });
    
    radioData.totalPopulation = totalPopulation;
    radioData.coveredPopulation = coveredPopulation;
    radioData.citiesCount = citiesData.length;
    
    sortCitiesByQuality();
    
    console.log(`✅ ${citiesData.length} cidades processadas`);
    console.log(`👥 População: ${totalPopulation.toLocaleString()} (${coveredPopulation.toLocaleString()} cobertos)`);
    
    updateCoverageInfo();
}

// Ordenar cidades por qualidade
function sortCitiesByQuality() {
    const qualityOrder = { 'excelente': 1, 'otimo': 2, 'fraco': 3, 'desconhecido': 4 };
    
    citiesData.sort((a, b) => {
        const qualityA = qualityOrder[a.quality] || 999;
        const qualityB = qualityOrder[b.quality] || 999;
        
        if (qualityA !== qualityB) {
            return qualityA - qualityB;
        }
        
        return a.name.localeCompare(b.name);
    });
    
    console.log('✅ Cidades ordenadas por qualidade');
}

// Extrair dados do extended data
function parseExtendedData(placemark) {
    const data = {};
    const extendedData = placemark.querySelector('ExtendedData');
    
    if (extendedData) {
        const dataElements = extendedData.querySelectorAll('Data');
        dataElements.forEach(dataEl => {
            const name = dataEl.getAttribute('name');
            const value = dataEl.querySelector('value')?.textContent;
            
            if (name && value) {
                switch (name) {
                    case 'População_Total':
                    case 'PopulaÃ§Ã£o_Total':
                        data.totalPopulation = parseInt(value) || 0;
                        break;
                    case 'População_Coberta':
                    case 'PopulaÃ§Ã£o_Coberta':
                        data.coveredPopulation = parseInt(value) || 0;
                        break;
                    case 'Percentual_Pop_Coberta':
                        data.coveragePercent = `${parseFloat(value).toFixed(1)}%`;
                        break;
                }
            }
        });
    }
    
    return data;
}

// Extrair dados de uma cidade da descrição HTML
function parseCityDescription(htmlDescription) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    
    const data = {};
    
    const divs = doc.querySelectorAll('div');
    divs.forEach(div => {
        const text = div.textContent;
        
        if (text.includes('População Coberta') || text.includes('PopulaÃ§Ã£o Coberta')) {
            const match = text.match(/(\d{1,3}(?:[.,]\d{3})*)\s*hab/);
            if (match) {
                data.coveredPopulation = parseInt(match[1].replace(/[.,]/g, '')) || 0;
            }
            
            const totalMatch = text.match(/Total:\s*(\d{1,3}(?:[.,]\d{3})*)/);
            if (totalMatch) {
                data.totalPopulation = parseInt(totalMatch[1].replace(/[.,]/g, '')) || 0;
            }
        }
        
        if (text.includes('Sinal')) {
            if (text.includes('Excelente')) data.qualityText = 'Excelente';
            else if (text.includes('Ótimo') || text.includes('Ã"timo')) data.qualityText = 'Ótimo';
            else if (text.includes('Fraco')) data.qualityText = 'Fraco';
        }
    });
    
    return data;
}

function getSignalQuality(styleUrl) {
    if (styleUrl.includes('excelente')) return 'excelente';
    if (styleUrl.includes('otimo')) return 'otimo';
    if (styleUrl.includes('fraco')) return 'fraco';
    return 'desconhecido';
}

// Adicionar imagem de cobertura ao mapa
function addCoverageImage() {
    if (!radioData.coverageImage) return;
    
    coverageImageLayer = L.imageOverlay(
        radioData.coverageImage.url,
        radioData.coverageImage.bounds,
        {
            opacity: 0.6,
            interactive: false
        }
    ).addTo(map);
    
    console.log('🖼️ Imagem de cobertura adicionada');
}

// Adicionar marcador da antena
function addAntennaMarker() {
    let antennaIcon;
    let logoUrl = radioData.logoUrlFromKMZ || radioData.notionIconUrl;
    
    if (logoUrl) {
        antennaIcon = L.divIcon({
            html: `
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    overflow: hidden;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <img src="${logoUrl}" 
                         style="width: 34px; height: 34px; object-fit: cover; border-radius: 50%;"
                         onerror="this.parentElement.innerHTML='📡'; this.parentElement.style.color='#FF0000'; this.parentElement.style.fontSize='20px';">
                </div>
            `,
            className: 'antenna-marker-logo',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        console.log('✅ Marcador da antena com logo');
    } else {
        antennaIcon = L.divIcon({
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    background: #FF0000;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                "></div>
            `,
            className: 'antenna-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
