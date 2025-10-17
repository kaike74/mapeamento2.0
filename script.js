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
        
        console.log('✅ Divisórias dos estados adicionadas (sem interação)');
        
    } catch (error) {
        console.warn('⚠️ Erro ao carregar divisórias dos estados:', error);
        // Continuar sem as divisórias
    }
}

// =========================================================================
// 🚀 MAPEAMENTO RÁDIO 2.0 - E-MÍDIAS - VERSÃO COM PROPOSTA MÚLTIPLA
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
    "Preparando antenas para transmissão..."
];

// 🚀 VARIÁVEIS DE PERFORMANCE OTIMIZADA
let performanceMode = false; // Flag para modo de performance
let lastInteractionTime = 0; // Timestamp da última interação
let interactionTimeout = null; // Timeout para detectar fim de interação
let rafId = null; // RequestAnimationFrame ID para cancelamento

// =========================================================================
// 🎯 INICIALIZAÇÃO PRINCIPAL - 🔧 CORRIGIDA PARA MODO INDIVIDUAL
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando Mapeamento 2.0...');
        
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
    console.log('🎬 Mostrando tela de carregamento animada...');
    
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
    
    // Configurar interface para proposta ANTES do mapa
    setupPropostaInterface();
    
    // Inicializar mapa
    initializeMap();
    
    // 🔧 AGUARDAR processamento completo antes de adicionar ao mapa
    console.log('🔄 Aguardando processamento de todas as rádios...');
    await processAllRadiosInProposta();
    
    // 🚀 USAR requestAnimationFrame PARA OPERAÇÕES VISUAIS
    requestAnimationFrame(() => {
        addAllRadiosToMap(); // Agora é otimizado com batches
        
        // 🆕 ESTATÍSTICAS E TELA DE CARREGAMENTO APÓS TUDO PRONTO
        setTimeout(() => {
            setupConsolidatedStats(); // Agora é otimizado
            hideLoadingScreen();
        }, 500);
    });
    
    console.log('✅ Modo proposta inicializado');
}

// =========================================================================
// 📻 INICIALIZAÇÃO MODO INDIVIDUAL (UMA RÁDIO) - 🔧 CORRIGIDA PARA OCULTAR LOADING
// =========================================================================
async function initIndividualMode(radioId) {
    console.log('📻 Inicializando modo individual...');
    
    await loadRadioData(radioId);
    await processFiles(); // Logo será extraída do KMZ automaticamente
    initializeMap();
    renderCities();
    setupSearch();
    
    // 🖼️ ATUALIZAR LOGO NO FINAL (GARANTIR QUE DOM ESTÁ PRONTO)
    setTimeout(() => {
        updateHeaderLogoFinal(0);
    }, 1000);
    
    // 🔧 OCULTAR TELA DE CARREGAMENTO APÓS TUDO CARREGADO NO MODO INDIVIDUAL
    setTimeout(() => {
        hideLoadingScreen();
        console.log('✅ Tela de carregamento ocultada - modo individual pronto');
    }, 1500);
    
    console.log('✅ Modo individual inicializado');
}

// =========================================================================
// 📡 CARREGAR DADOS DA PROPOSTA
// =========================================================================
async function loadPropostaData(propostaId) {
    if (!propostaId || !/^[0-9a-f]{32}$/i.test(propostaId)) {
        throw new Error('ID da proposta inválido. Use: ?idproposta=DATABASE_ID');
    }
    
    console.log('📡 Buscando dados da proposta:', propostaId);
    
    const response = await fetch(`/api/proposta-data?database_id=${propostaId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    propostaData = await response.json();
    console.log('✅ Dados da proposta carregados:', propostaData.proposta.title);
    console.log(`📊 Total de rádios: ${propostaData.radios.length}`);
    
    // Atualizar header com informações da proposta
    updateHeaderProposta();
}

// =========================================================================
// 📡 CARREGAR DADOS DO NOTION (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
async function loadRadioData(notionId) {
    console.log('📡 Buscando dados do Notion:', notionId);
    
    const response = await fetch(`/api/radio-data?id=${notionId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    radioData = await response.json();
    console.log('✅ Dados carregados:', radioData);
    
    // 🖼️ PROCESSAR ÍCONE DO NOTION IMEDIATAMENTE (APENAS MODO INDIVIDUAL)
    if (!isPropostaMode) {
        processNotionIcon();
    }
    
    // Atualizar header inicial (sem logo - virá do KMZ)
    updateHeaderBasic();
}

// =========================================================================
// 🔄 PROCESSAR TODAS AS RÁDIOS DA PROPOSTA - AGUARDAR CONCLUSÃO
// =========================================================================
async function processAllRadiosInProposta() {
    console.log('🔄 Processando todas as rádios da proposta...');
    
    const processPromises = propostaData.radios.map(async (radio, index) => {
        try {
            console.log(`📻 Processando rádio ${index + 1}/${propostaData.radios.length}: ${radio.name}`);
            
            // Processar ícone do Notion para cada rádio (SEM ATUALIZAR HEADER)
            processRadioNotionIcon(radio);
            
            // Processar KMZ se disponível - AGUARDAR CONCLUSÃO
            if (radio.kmz2Url && radio.kmz2Url.trim() !== '') {
                console.log(`📦 Processando KMZ de ${radio.name}...`);
                await processRadioKMZ(radio);
                console.log(`📦 KMZ de ${radio.name} processado`);
            } else {
                console.warn(`⚠️ ${radio.name} não tem URL de KMZ2`);
            }
            
            // Processar KML se disponível - AGUARDAR CONCLUSÃO  
            if (radio.kml2Url && radio.kml2Url.trim() !== '') {
                console.log(`🏙️ Processando KML de ${radio.name}...`);
                await processRadioKML(radio);
                console.log(`🏙️ KML de ${radio.name} processado`);
            } else {
                console.warn(`⚠️ ${radio.name} não tem URL de KML2`);
            }
            
            console.log(`✅ Rádio ${radio.name} processada - Cobertura: ${!!radio.coverageImage}, Antena: ${!!radio.antennaLocation}, Cidades: ${radio.citiesData?.length || 0}`);
            
        } catch (error) {
            console.error(`❌ Erro ao processar rádio ${radio.name}:`, error);
            // Continuar com as outras rádios
        }
    });
    
    // 🔧 AGUARDAR TODAS AS RÁDIOS SEREM PROCESSADAS
    await Promise.all(processPromises);
    
    console.log('✅ Todas as rádios processadas');
    console.log('📊 Resumo final:');
    propostaData.radios.forEach(radio => {
        console.log(`- ${radio.name}: Cobertura=${!!radio.coverageImage}, Antena=${!!radio.antennaLocation}, Cidades=${radio.citiesData?.length || 0}`);
    });
}

// =========================================================================
// 🖼️ PROCESSAR ÍCONE DO NOTION PARA RÁDIO ESPECÍFICA
// =========================================================================
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
// 📦 PROCESSAR KMZ DE UMA RÁDIO ESPECÍFICA - COM DEBUG DETALHADO
// =========================================================================
async function processRadioKMZ(radio) {
    try {
        console.log(`📦 Iniciando processamento KMZ de ${radio.name}...`);
        console.log(`🔗 URL: ${radio.kmz2Url}`);
        
        const directUrl = convertGoogleDriveUrl(radio.kmz2Url);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log(`📦 Baixando via proxy: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log(`📦 KMZ baixado, tamanho: ${arrayBuffer.byteLength} bytes`);
        
        const zip = await JSZip.loadAsync(arrayBuffer);
        console.log(`📦 Arquivos no KMZ de ${radio.name}:`, Object.keys(zip.files));
        
        // Extrair KML interno
        let kmlFile = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (filename.toLowerCase().endsWith('.kml')) {
                kmlFile = file;
                console.log(`📄 KML encontrado: ${filename}`);
                break;
            }
        }
        
        if (!kmlFile) {
            throw new Error('KML não encontrado no KMZ');
        }
        
        const kmlText = await kmlFile.async('text');
        console.log(`📄 KML extraído de ${radio.name}, tamanho: ${kmlText.length} caracteres`);
        
        await parseRadioKMZContent(radio, kmlText, zip);
        
        console.log(`✅ KMZ de ${radio.name} processado com sucesso`);
        
    } catch (error) {
        console.error(`❌ Erro ao processar KMZ de ${radio.name}:`, error);
        // Não interromper o processamento das outras rádios
    }
}

// =========================================================================
// 🔍 PROCESSAR CONTEÚDO DO KMZ DE UMA RÁDIO
// =========================================================================
async function parseRadioKMZContent(radio, kmlText, zip) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    
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
            
            // Extrair imagem do ZIP
            const imageFile = zip.file(iconHref);
            if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);
                
                radio.coverageImage = {
                    url: imageUrl,
                    bounds: [[south, west], [north, east]]
                };
                
                console.log(`✅ GroundOverlay de ${radio.name} extraído`);
            }
        }
    }
    
    // Extrair dados da antena
    const placemark = xmlDoc.querySelector('Placemark');
    if (placemark) {
        // Extrair logo do IconStyle (SEM ATUALIZAR HEADER NO MODO PROPOSTA)
        const iconStyle = placemark.querySelector('Style IconStyle Icon href');
        if (iconStyle) {
            const logoUrl = iconStyle.textContent.trim();
            if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                radio.logoUrlFromKMZ = logoUrl;
                console.log(`✅ Logo de ${radio.name} extraída do KMZ: ${logoUrl}`);
                
                // 🔧 APENAS ATUALIZAR HEADER SE NÃO ESTIVER NO MODO PROPOSTA
                if (!isPropostaMode) {
                    forceUpdateHeaderLogo();
                }
            }
        }
        
        // Extrair coordenadas da antena
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        if (coordinates) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            radio.antennaLocation = { lat, lng };
        }
        
        // Extrair dados técnicos
        const description = placemark.querySelector('description')?.textContent;
        if (description) {
            radio.antennaData = parseAntennaData(description);
        }
    }
}

// =========================================================================
// 🏙️ PROCESSAR KML DE CIDADES DE UMA RÁDIO
// =========================================================================
async function processRadioKML(radio) {
    try {
        const directUrl = convertGoogleDriveUrl(radio.kml2Url);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const kmlText = await response.text();
        radio.citiesData = await parseKMLCitiesForRadio(kmlText);
        
        console.log(`✅ ${radio.citiesData.length} cidades processadas para ${radio.name}`);
        
    } catch (error) {
        console.warn(`⚠️ Erro ao processar KML da rádio ${radio.name}:`, error);
        radio.citiesData = [];
    }
}

// =========================================================================
// 🔍 PROCESSAR CIDADES DO KML PARA UMA RÁDIO ESPECÍFICA
// =========================================================================
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
            
            // Extrair dados do ExtendedData
            const cityData = parseExtendedData(placemark);
            
            // Se não encontrou no ExtendedData, tentar na descrição HTML
            if (!cityData.totalPopulation) {
                const description = placemark.querySelector('description')?.textContent || '';
                if (description) {
                    const htmlData = parseCityDescription(description);
                    Object.assign(cityData, htmlData);
                }
            }
            
            // EXTRAIR UF DO NOME DA CIDADE
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
// 🗺️ INICIALIZAR MAPA (MEGA OTIMIZADO PARA PERFORMANCE)
// =========================================================================
function initializeMap() {
    console.log('🗺️ Inicializando mapa com otimizações de performance (preservando todos os dados)...');
    
    // Zoom padrão para enquadrar o Brasil
    const center = { lat: -14.2350, lng: -51.9253 }; // Centro do Brasil
    const zoom = 5; // Zoom para mostrar todo o Brasil
    
    map = L.map('map', {
        // 🚀 OTIMIZAÇÕES DE PERFORMANCE (PRESERVANDO DADOS COMPLETOS)
        preferCanvas: true, // Canvas é mais performático que SVG
        zoomControl: true,
        attributionControl: false, // Remover para reduzir overhead
        zoomSnap: 0.25, // Reduzir granularidade do zoom
        zoomDelta: 0.5, // Reduzir delta do zoom
        wheelDebounceTime: 100, // Aumentar debounce para reduzir eventos
        wheelPxPerZoomLevel: 80, // Reduzir sensibilidade
        // 🚀 CONFIGURAÇÕES ESPECÍFICAS PARA PERFORMANCE
        fadeAnimation: true, // Manter animação fluida
        zoomAnimation: true, // Animações suaves
        markerZoomAnimation: true, // Animação de marcadores
        transform3DLimit: 2^23, // Limite de transformações 3D
        zoomAnimationThreshold: 8, // Threshold para animações
        // 🚀 BUFFERS E CACHE
        maxBoundsViscosity: 1.0, // Reduzir viscosidade
    }).setView([center.lat, center.lng], zoom);
    
    // 🗺️ DEFINIR APENAS 2 CAMADAS DE MAPA (SATÉLITE COMO PADRÃO)
    baseLayers = {
        'Satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 18,
            // 🚀 OTIMIZAÇÕES DE TILES (SEM AFETAR DADOS)
            updateWhenIdle: true, // Só atualizar quando não estiver interagindo
            updateWhenZooming: false, // NÃO atualizar durante zoom
            keepBuffer: 4, // Aumentar buffer de tiles
            reuseTiles: true, // Reutilizar tiles
            unloadInvisibleTiles: true, // Descarregar tiles invisíveis
            updateInterval: 150, // Aumentar intervalo de updates
        }),
        'Padrão': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            // 🚀 OTIMIZAÇÕES DE TILES (SEM AFETAR DADOS)
            updateWhenIdle: true,
            updateWhenZooming: false, 
            keepBuffer: 4,
            reuseTiles: true,
            unloadInvisibleTiles: true,
            updateInterval: 150,
        })
    };
    
    // Adicionar camada padrão (Satélite primeiro)
    baseLayers['Satélite'].addTo(map);
    
    // 🚀 SISTEMA DE PERFORMANCE OTIMIZADO (MANTENDO DADOS COMPLETOS)
    let isUserInteracting = false;
    let interactionEndTimer = null;
    let frameScheduled = false;
    
    // 🚀 FUNÇÃO PARA DETECTAR INÍCIO DE INTERAÇÃO
    function startPerformanceMode() {
        if (!isUserInteracting) {
            isUserInteracting = true;
            performanceMode = true;
            console.log('🚀 Performance mode ATIVADO');
            
            // Suspender atualizações custosas durante interação
            if (isPropostaMode) {
                // Reduzir qualidade visual temporariamente se necessário
                document.documentElement.style.pointerEvents = 'auto';
            }
        }
        
        // Reset do timer para detectar fim da interação
        clearTimeout(interactionEndTimer);
        interactionEndTimer = setTimeout(() => {
            endPerformanceMode();
        }, 200); // 200ms sem interação = fim da interação
    }
    
    // 🚀 FUNÇÃO PARA DETECTAR FIM DE INTERAÇÃO
    function endPerformanceMode() {
        if (isUserInteracting) {
            isUserInteracting = false;
            performanceMode = false;
            console.log('🚀 Performance mode DESATIVADO');
            
            // Restaurar qualidade visual
            if (isPropostaMode) {
                // Reagendar operações que foram suspensas
                if (!frameScheduled) {
                    frameScheduled = true;
                    requestAnimationFrame(() => {
                        frameScheduled = false;
                        // Executar operações de restauração se necessário
                        console.log('🔄 Operações de restauração executadas');
                    });
                }
            }
        }
    }
    
    // 🚀 EVENTOS OTIMIZADOS - SEM OPERAÇÕES CUSTOSAS EM TEMPO REAL (PRESERVA DADOS)
    map.on('zoomstart', function() {
        startPerformanceMode();
    });
    
    map.on('movestart', function() {
        startPerformanceMode();
    });
    
    map.on('dragstart', function() {
        startPerformanceMode();
    });
    
    // 🚀 EVENTOS DE FIM DE INTERAÇÃO - APENAS ESTES FAZEM OPERAÇÕES
    map.on('zoomend', function() {
        // Agendar fim da performance mode
        startPerformanceMode(); // Reset do timer
    });
    
    map.on('moveend', function() {
        // Agendar fim da performance mode
        startPerformanceMode(); // Reset do timer
    });
    
    map.on('dragend', function() {
        // Agendar fim da performance mode
        startPerformanceMode(); // Reset do timer
    });
    
    // 🚀 REMOVER COMPLETAMENTE EVENTOS CUSTOSOS DURANTE INTERAÇÃO
    // Todos os eventos de zoom, move, etc. que faziam operações custosas foram removidos
    
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
        
    }, 300); // Reduzir tempo de espera
    
    // Mostrar mapa
    document.getElementById('map-section').style.display = 'block';
    
    console.log('✅ Mapa inicializado com otimizações de performance (sem perda de dados)');
}

// =========================================================================
// 🌟 ADICIONAR TODAS AS RÁDIOS AO MAPA (MODO PROPOSTA) - 🚀 SUPER OTIMIZADO
// =========================================================================
function addAllRadiosToMap() {
    console.log('🌟 Adicionando todas as rádios ao mapa com TODOS os dados (performance otimizada)...');
    
    let processedRadios = 0;
    const batchSize = 2; // Reduzir batch para compensar processamento de TODAS as cidades
    
    function processBatch() {
        const endIndex = Math.min(processedRadios + batchSize, propostaData.radios.length);
        
        for (let i = processedRadios; i < endIndex; i++) {
            const radio = propostaData.radios[i];
            console.log(`📻 Processando rádio ${i + 1}: ${radio.name}`);
            
            // 🔧 CRIAR LAYER GROUP PARA ESTA RÁDIO COM OTIMIZAÇÕES
            const radioLayerGroup = L.layerGroup({
                // 🚀 OTIMIZAÇÕES DE LAYER GROUP
                interactive: true,
                bubblingMouseEvents: false, // Reduzir propagação de eventos
            });
            
            // 1. Adicionar imagem de cobertura se disponível
            if (radio.coverageImage) {
                const coverageLayer = L.imageOverlay(
                    radio.coverageImage.url,
                    radio.coverageImage.bounds,
                    {
                        opacity: 0.6,
                        interactive: false, // Imagens não precisam ser interativas
                        crossOrigin: false, // Melhorar performance
                    }
                );
                radioLayerGroup.addLayer(coverageLayer);
            }
            
            // 2. Adicionar marcador da antena
            if (radio.antennaLocation) {
                const antennaMarker = createRadioAntennaMarker(radio);
                radioLayerGroup.addLayer(antennaMarker);
            }
            
            // 3. Adicionar marcadores de cidades (SEM LIMITAÇÕES)
            if (radio.citiesData && radio.citiesData.length > 0) {
                // 🚀 PROCESSAMENTO OTIMIZADO SEM PERDER DADOS
                // Usar todas as cidades sem limite - dados são prioridade
                radio.citiesData.forEach((city, cityIndex) => {
                    const cityMarker = createCityMarker(city, radio);
                    radioLayerGroup.addLayer(cityMarker);
                });
                
                console.log(`✅ ${radio.name}: ${radio.citiesData.length} cidades adicionadas (sem limitações)`);
            }
            
            // 4. Adicionar o grupo completo ao mapa
            radioLayerGroup.addTo(map);
            radiosLayers[radio.id] = radioLayerGroup;
        }
        
        processedRadios = endIndex;
        
        // Continuar processamento ou finalizar
        if (processedRadios < propostaData.radios.length) {
            // 🚀 USAR requestAnimationFrame para não travar UI
            requestAnimationFrame(processBatch);
        } else {
            // Finalizar processamento
            finalizarAdicaoRadios();
        }
    }
    
    // Iniciar processamento em batches
    processBatch();
}

function finalizarAdicaoRadios() {
    // Ajustar zoom para mostrar todas as rádios
    fitMapBoundsForProposta();
    
    console.log(`✅ ${propostaData.radios.length} rádios processadas no mapa com TODOS os dados (sem limitações)`);
    console.log(`📊 Layer Groups disponíveis: ${Object.keys(radiosLayers).length}`);
    
    // 🚀 CONFIGURAR LAYERS CONTROL DEPOIS DE TUDO CARREGADO
    requestAnimationFrame(() => {
        setupLayersControlForProposta();
    });
}

// =========================================================================
// 📍 CRIAR MARCADOR DA ANTENA PARA UMA RÁDIO (FUNÇÃO OTIMIZADA)
// =========================================================================
function createRadioAntennaMarker(radio) {
    let antennaIcon;
    let logoUrl = radio.logoUrlFromKMZ || radio.notionIconUrl;
    
    if (logoUrl) {
        // Criar ícone personalizado com a logo
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
        // Ícone padrão vermelho se não tiver logo
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
            <h4 style="margin: 0 0 12px 0; color: #06055B;">📡 ${radio.name}</h4>
            <p style="margin: 4px 0;"><strong>${radio.dial}</strong></p>
            <p style="margin: 4px 0;">${radio.praca} - ${radio.uf}</p>
            ${radio.antennaData ? `
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
                <div style="text-align: left; font-size: 12px;">
                    ${radio.antennaData.frequencia ? `<p><strong>Frequência:</strong> ${radio.antennaData.frequencia}</p>` : ''}
                    ${radio.antennaData.potencia ? `<p><strong>Potência:</strong> ${radio.antennaData.potencia}</p>` : ''}
                    ${radio.antennaData.erp ? `<p><strong>ERP:</strong> ${radio.antennaData.erp}</p>` : ''}
                    ${radio.antennaData.altura ? `<p><strong>Altura:</strong> ${radio.antennaData.altura}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    return L.marker([radio.antennaLocation.lat, radio.antennaLocation.lng], { icon: antennaIcon })
        .bindPopup(popupContent);
}

// =========================================================================
// 🏙️ CRIAR MARCADOR DE CIDADE (FUNÇÃO OTIMIZADA)
// =========================================================================
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
                <p style="margin: 4px 0;"><strong>População Coberta:</strong> ${(city.coveredPopulation || 0).toLocaleString()} ${city.coveragePercent ? `(${city.coveragePercent})` : ''}</p>
                <p style="margin: 4px 0;"><strong>Qualidade:</strong> ${getQualityText(city.quality)}</p>
            </div>
        </div>
    `;
    
    return L.marker([city.coordinates.lat, city.coordinates.lng], { icon: cityIcon })
        .bindPopup(popupContent);
}

// =========================================================================
// 🎛️ CONFIGURAR CONTROLE DE LAYERS PARA PROPOSTA - COM DEBUG
// =========================================================================
function setupLayersControlForProposta() {
    // Overlays para controle de coberturas
    const overlays = {};
    
    console.log('🎛️ Configurando controle de layers...');
    console.log(`📊 Total de rádios: ${propostaData.radios.length}`);
    console.log(`📊 Layers de cobertura disponíveis: ${Object.keys(radiosLayers).length}`);
    
    // Adicionar cada rádio como overlay controlável
    propostaData.radios.forEach(radio => {
        if (radiosLayers[radio.id]) {
            overlays[`📻 ${radio.name} (${radio.dial})`] = radiosLayers[radio.id];
            console.log(`✅ Layer adicionado: ${radio.name}`);
        } else {
            console.warn(`⚠️ Layer não encontrado para: ${radio.name}`);
        }
    });
    
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
// 🗺️ AJUSTAR ZOOM PARA PROPOSTA
// =========================================================================
function fitMapBoundsForProposta() {
    const bounds = L.latLngBounds();
    let hasData = false;
    
    propostaData.radios.forEach(radio => {
        // Adicionar antenas
        if (radio.antennaLocation) {
            bounds.extend([radio.antennaLocation.lat, radio.antennaLocation.lng]);
            hasData = true;
        }
        
        // Adicionar cidades
        if (radio.citiesData) {
            radio.citiesData.forEach(city => {
                bounds.extend([city.coordinates.lat, city.coordinates.lng]);
                hasData = true;
            });
        }
        
        // Adicionar bounds da imagem de cobertura
        if (radio.coverageImage) {
            bounds.extend(radio.coverageImage.bounds);
            hasData = true;
        }
    });
    
    if (hasData && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// =========================================================================
// 🖼️ CONFIGURAR INTERFACE PARA PROPOSTA - 🔧 CORRIGIDA
// =========================================================================
function setupPropostaInterface() {
    // Atualizar header (SEM LOGO)
    updateHeaderProposta();
    
    // 🔧 OCULTAR ELEMENTOS DESNECESSÁRIOS NO MODO PROPOSTA
    hideUnnecessaryElementsInPropostaMode();
    
    console.log('✅ Interface proposta configurada');
}

// =========================================================================
// 🔧 OCULTAR ELEMENTOS DESNECESSÁRIOS NO MODO PROPOSTA
// =========================================================================
function hideUnnecessaryElementsInPropostaMode() {
    console.log('🔧 Ocultando elementos desnecessários no modo proposta...');
    
    // 🔧 OCULTAR CARDS INDIVIDUAIS
    const infoSection = document.getElementById('info-section');
    if (infoSection) {
        infoSection.style.display = 'none';
    }
    
    // 🔧 OCULTAR SEÇÃO DE CIDADES/LISTA/BUSCA/EXCEL
    const cidadesSection = document.getElementById('cidades-section');
    if (cidadesSection) {
        cidadesSection.style.display = 'none';
    }
    
    console.log('✅ Elementos individuais ocultados no modo proposta');
}

// =========================================================================
// 📊 ATUALIZAR HEADER PARA PROPOSTA - 🔧 LOGO COMPLETAMENTE REMOVIDA
// =========================================================================
function updateHeaderProposta() {
    const radioName = document.getElementById('radio-name');
    const radioInfo = document.getElementById('radio-info');
    const headerLogo = document.getElementById('header-logo');
    
    if (radioName) {
        // 🔧 REMOVER COMPLETAMENTE A LOGO DO TEXTO
        radioName.innerHTML = '🗺️ Mapeamento da Proposta';
        
        // 🔧 REMOVER QUALQUER ELEMENTO IMG QUE POSSA EXISTIR
        const existingImgs = radioName.querySelectorAll('img');
        existingImgs.forEach(img => img.remove());
    }
    
    if (radioInfo) {
        const radiosCount = propostaData.proposta.totalRadios;
        const estadosCount = propostaData.summary.estados.length;
        radioInfo.textContent = `${radiosCount} rádios • ${estadosCount} estados • ${propostaData.proposta.title}`;
    }
    
    // 🔧 FORÇAR REMOÇÃO COMPLETA DA LOGO
    if (headerLogo) {
        headerLogo.style.display = 'none';
        headerLogo.style.visibility = 'hidden';
        headerLogo.src = '';
        
        // 🔧 REMOVER COMPLETAMENTE O ELEMENTO
        try {
            headerLogo.remove();
        } catch (e) {
            console.warn('⚠️ Não foi possível remover elemento header-logo:', e);
        }
    }
    
    console.log('✅ Header atualizado para proposta (logo completamente removida)');
}

// =========================================================================
// 📊 CONFIGURAR ESTATÍSTICAS CONSOLIDADAS - 🚀 OTIMIZADO PARA PERFORMANCE
// =========================================================================
function setupConsolidatedStats() {
    console.log('📊 Configurando estatísticas consolidadas...');
    
    // 🚀 USAR requestIdleCallback PARA NÃO TRAVAR A UI
    if ('requestIdleCallback' in window) {
        requestIdleCallback(calculateStatsWhenIdle);
    } else {
        // Fallback para navegadores sem suporte
        setTimeout(calculateStatsWhenIdle, 100);
    }
}

function calculateStatsWhenIdle() {
    console.log('🔍 Calculando estatísticas...');
    
    // Calcular estatísticas de forma otimizada
    let totalRadios = propostaData.proposta.totalRadios || propostaData.radios.length;
    let totalCities = 0;
    let totalPopulation = 0;
    let totalCoveredPopulation = 0;
    let radiosWithKmz = 0;
    let radiosWithKml = 0;
    
    // 🚀 PROCESSAR EM BATCHES PEQUENOS PARA NÃO TRAVAR (MAS SEM PERDER DADOS)
    let processedRadios = 0;
    const batchSize = 5; // Aumentar batch size
    
    function processBatch() {
        const endIndex = Math.min(processedRadios + batchSize, propostaData.radios.length);
        
        for (let i = processedRadios; i < endIndex; i++) {
            const radio = propostaData.radios[i];
            
            // Corrigir flags
            if (radio.hasKmz || radio.coverageImage) radiosWithKmz++;
            if (radio.hasKml || (radio.citiesData && radio.citiesData.length > 0)) radiosWithKml++;
            
            // Somar dados de cidades
            if (radio.citiesData && Array.isArray(radio.citiesData)) {
                totalCities += radio.citiesData.length;
                
                // 🚀 OTIMIZAR: Usar reduce para cálculos populacionais
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
        
        // Continuar processamento ou finalizar
        if (processedRadios < propostaData.radios.length) {
            // 🚀 USAR requestAnimationFrame para próximo batch
            requestAnimationFrame(processBatch);
        } else {
            // Finalizar e renderizar
            finalizarEstatisticas(totalRadios, totalCities, totalPopulation, totalCoveredPopulation, radiosWithKmz, radiosWithKml);
        }
    }
    
    // Iniciar processamento em batches
    processBatch();
}

function finalizarEstatisticas(totalRadios, totalCities, totalPopulation, totalCoveredPopulation, radiosWithKmz, radiosWithKml) {
    const coveragePercent = totalPopulation > 0 ? ((totalCoveredPopulation / totalPopulation) * 100).toFixed(1) : 0;
    
    console.log('📊 Estatísticas calculadas:', {
        totalRadios,
        totalCities,
        totalPopulation,
        totalCoveredPopulation,
        coveragePercent,
        radiosWithKmz,
        radiosWithKml
    });
    
    // Renderizar estatísticas
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = `
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
        
        document.getElementById('stats-section').style.display = 'block';
    }
    
    console.log('✅ Estatísticas consolidadas configuradas (dados completos + performance otimizada)');
}

// =========================================================================
// 🎯 DESTACAR RÁDIO NO MAPA - OTIMIZADO COM LAYER GROUPS
// =========================================================================
function highlightRadio(radioId) {
    const radio = propostaData.radios.find(r => r.id === radioId);
    if (!radio || !radiosLayers[radioId]) return;
    
    // Centralizar no marcador da antena se disponível
    if (radio.antennaLocation) {
        map.flyTo([radio.antennaLocation.lat, radio.antennaLocation.lng], 10, {
            animate: true,
            duration: 1.5
        });
        
        // 🚀 OTIMIZADO: Encontrar marcador da antena no layer group
        setTimeout(() => {
            const layerGroup = radiosLayers[radioId];
            if (layerGroup) {
                layerGroup.eachLayer(layer => {
                    // Verificar se é um marcador da antena (40x40 px)
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
    
    // Destacar layer group (piscar temporariamente) - OTIMIZADO
    if (radiosLayers[radioId]) {
        const layerGroup = radiosLayers[radioId];
        
        // Animação de destaque apenas se não estiver em modo de performance
        if (!performanceMode) {
            layerGroup.eachLayer(layer => {
                if (layer.setOpacity) {
                    const originalOpacity = layer.options.opacity || 0.6;
                    layer.setOpacity(0.9);
                    setTimeout(() => layer.setOpacity(originalOpacity), 1000);
                }
            });
        }
    }
}

// =========================================================================
// 📄 PROCESSAR ARQUIVOS (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
async function processFiles() {
    console.log('📄 Processando arquivos KMZ e KML...');
    
    // Processar KMZ
    if (radioData.kmz2Url) {
        console.log('📦 Processando KMZ...');
        await processKMZ(radioData.kmz2Url);
    }
    
    // Processar KML de cidades
    if (radioData.kml2Url) {
        console.log('🏙️ Processando KML de cidades...');
        await processKML(radioData.kml2Url);
    }
    
    console.log('✅ Arquivos processados com sucesso');
}

// =========================================================================
// 📦 PROCESSAR ARQUIVO KMZ (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
async function processKMZ(driveUrl) {
    try {
        const directUrl = convertGoogleDriveUrl(driveUrl);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log('📦 Baixando KMZ via proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        console.log('📦 Arquivos no KMZ:', Object.keys(zip.files));
        
        // Extrair KML interno
        let kmlFile = null;
        for (const [filename, file] of Object.entries(zip.files)) {
            if (filename.toLowerCase().endsWith('.kml')) {
                kmlFile = file;
                break;
            }
        }
        
        if (!kmlFile) throw new Error('KML não encontrado no KMZ');
        
        const kmlText = await kmlFile.async('text');
        console.log('📄 KML extraído, tamanho:', kmlText.length);
        
        // Processar KML interno
        await parseKMZContent(kmlText, zip);
        
    } catch (error) {
        console.error('❌ Erro ao processar KMZ:', error);
        // Não lançar erro, continuar sem imagem de cobertura
        console.warn('⚠️ Continuando sem imagem de cobertura');
    }
}

// =========================================================================
// 🔍 PROCESSAR CONTEÚDO DO KMZ (KML INTERNO + IMAGENS) - PRESERVADO
// =========================================================================
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
            
            console.log('🗺️ GroundOverlay encontrado:', { north, south, east, west });
            
            // Extrair imagem do ZIP
            const imageFile = zip.file(iconHref);
            if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                const imageUrl = URL.createObjectURL(imageBlob);
                
                radioData.coverageImage = {
                    url: imageUrl,
                    bounds: [[south, west], [north, east]]
                };
                
                console.log('✅ GroundOverlay extraído:', radioData.coverageImage.bounds);
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
        
        // 🖼️ EXTRAIR LOGO DO ICONSTYLE PRIMEIRO (SÓ NO MODO INDIVIDUAL)
        if (!isPropostaMode) {
            const iconStyle = placemark.querySelector('Style IconStyle Icon href');
            if (iconStyle) {
                const logoUrl = iconStyle.textContent.trim();
                console.log('🔍 URL encontrada no IconStyle:', logoUrl);
                if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                    radioData.logoUrlFromKMZ = logoUrl;
                    console.log('✅ Logo extraída do IconStyle KMZ:', logoUrl);
                    // 🚀 FORÇAR ATUALIZAÇÃO IMEDIATA DO HEADER (SÓ NO MODO INDIVIDUAL)
                    forceUpdateHeaderLogo();
                }
            }
        }
        
        const description = placemark.querySelector('description')?.textContent;
        if (description) {
            parseAntennaDataDescription(description);
        }
        
        // Coordenadas da antena
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        if (coordinates) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            radioData.antennaLocation = { lat, lng };
            console.log('📍 Localização da antena:', radioData.antennaLocation);
        }
        
        // Extrair dados do JSON raw request se disponível
        if (description && description.includes('"frq"')) {
            try {
                const jsonMatch = description.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonData = JSON.parse(jsonMatch[0]);
                    extractTechnicalFromJson(jsonData);
                }
            } catch (e) {
                console.warn('⚠️ Não foi possível extrair JSON dos dados técnicos');
            }
        }
    }
    
    console.log('🎯 LOGOS DISPONÍVEIS APÓS KMZ:', {
        kmzLogo: !!radioData.logoUrlFromKMZ,
        notionIcon: !!radioData.notionIconUrl,
        imageUrl: !!radioData.imageUrl
    });
}

// =========================================================================
// 📊 EXTRAIR DADOS TÉCNICOS DA ANTENA (PRESERVADO) - RENOMEADO PARA EVITAR CONFLITO
// =========================================================================
function parseAntennaDataDescription(htmlDescription) {
    console.log('📊 Extraindo dados técnicos e logo...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    
    const data = {};
    
    // 🖼️ EXTRAIR LOGO DA DESCRIÇÃO HTML SE NÃO ACHOU NO ICONSTYLE (SÓ NO MODO INDIVIDUAL)
    if (!isPropostaMode && !radioData.logoUrlFromKMZ) {
        const imgTag = doc.querySelector('img');
        if (imgTag) {
            const logoUrl = imgTag.getAttribute('src');
            console.log('🔍 URL encontrada na descrição HTML:', logoUrl);
            if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('https'))) {
                radioData.logoUrlFromKMZ = logoUrl;
                console.log('✅ Logo extraída da descrição HTML:', logoUrl);
                // 🚀 FORÇAR ATUALIZAÇÃO IMEDIATA DO HEADER (SÓ NO MODO INDIVIDUAL)
                forceUpdateHeaderLogo();
            }
        }
    }
    
    // Método 1: Tentar extrair de tabela HTML
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
    
    // Método 2: Tentar extrair por regex se não encontrou na tabela
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
    console.log('📊 Dados técnicos extraídos:', data);
}

// Função helper para parsing de dados técnicos (reutilizada)
function parseAntennaData(htmlDescription) {
    return parseAntennaDataDescription(htmlDescription);
}

// =========================================================================
// 🔧 EXTRAIR DADOS TÉCNICOS DO JSON (PRESERVADO)
// =========================================================================
function extractTechnicalFromJson(jsonData) {
    console.log('🔧 Extraindo dados do JSON técnico...');
    
    const data = radioData.antennaData || {};
    
    if (jsonData.frq) data.frequencia = `${jsonData.frq} MHz`;
    if (jsonData.txw) data.potencia = `${jsonData.txw} W`;
    if (jsonData.erp) data.erp = `${jsonData.erp} W`;
    if (jsonData.txh) data.altura = `${jsonData.txh} m`;
    
    radioData.antennaData = data;
    console.log('✅ Dados do JSON extraídos:', data);
}

// =========================================================================
// 🏙️ PROCESSAR KML DE CIDADES (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
async function processKML(driveUrl) {
    try {
        const directUrl = convertGoogleDriveUrl(driveUrl);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log('🏙️ Baixando KML via proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const kmlText = await response.text();
        console.log('📄 KML de cidades baixado, tamanho:', kmlText.length);
        await parseKMLCities(kmlText);
        
    } catch (error) {
        console.error('❌ Erro ao processar KML:', error);
        throw error;
    }
}

// =========================================================================
// 🔍 PROCESSAR CIDADES DO KML (MODO INDIVIDUAL) - PRESERVADO
// =========================================================================
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
        
        console.log(`📍 Processando cidade ${index + 1}: ${name}`);
        
        if (coordinates && name) {
            const coords = coordinates.trim().split(',');
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            
            // Extrair dados do ExtendedData
            const cityData = parseExtendedData(placemark);
            
            // Se não encontrou no ExtendedData, tentar na descrição HTML
            if (!cityData.totalPopulation) {
                const description = placemark.querySelector('description')?.textContent || '';
                if (description) {
                    const htmlData = parseCityDescription(description);
                    Object.assign(cityData, htmlData);
                }
            }
            
            // EXTRAIR UF DO NOME DA CIDADE (CORRIGIDO)
            const nameParts = name.split(' - ');
            cityData.name = nameParts[0] || name;
            cityData.uf = nameParts[1] || radioData.uf || ''; // Fallback para UF da rádio
            cityData.fullName = name; // Nome completo para buscas
            cityData.coordinates = { lat, lng };
            cityData.quality = getSignalQuality(styleUrl);
            
            console.log(`📊 Dados de ${name}:`, {
                name: cityData.name,
                uf: cityData.uf,
                totalPop: cityData.totalPopulation,
                coveredPop: cityData.coveredPopulation,
                quality: cityData.quality
            });
            
            citiesData.push(cityData);
            
            totalPopulation += cityData.totalPopulation || 0;
            coveredPopulation += cityData.coveredPopulation || 0;
        }
    });
    
    radioData.totalPopulation = totalPopulation;
    radioData.coveredPopulation = coveredPopulation;
    radioData.citiesCount = citiesData.length;
    
    // 📊 ORDENAR CIDADES POR QUALIDADE (NOVO)
    sortCitiesByQuality();
    
    console.log(`✅ ${citiesData.length} cidades processadas e ordenadas`);
    console.log(`👥 População total: ${totalPopulation.toLocaleString()}`);
    console.log(`✅ População coberta: ${coveredPopulation.toLocaleString()}`);
    
    // Atualizar UI
    updateCoverageInfo();
}

// TODAS AS OUTRAS FUNÇÕES AUXILIARES PRESERVADAS
// =========================================================================
// 📊 ORDENAR CIDADES POR QUALIDADE (IMPLEMENTAÇÃO NOVA)
// =========================================================================
function sortCitiesByQuality() {
    const qualityOrder = { 'excelente': 1, 'otimo': 2, 'fraco': 3, 'desconhecido': 4 };
    
    citiesData.sort((a, b) => {
        const qualityA = qualityOrder[a.quality] || 999;
        const qualityB = qualityOrder[b.quality] || 999;
        
        if (qualityA !== qualityB) {
            return qualityA - qualityB;
        }
        
        // Se mesma qualidade, ordenar alfabeticamente
        return a.name.localeCompare(b.name);
    });
    
    console.log('✅ Cidades ordenadas por qualidade: Excelente → Ótimo → Fraco');
}

// =========================================================================
// 📊 EXTRAIR DADOS DO EXTENDED DATA
// =========================================================================
function parseExtendedData(placemark) {
    const data = {};
    const extendedData = placemark.querySelector('ExtendedData');
    
    if (extendedData) {
        console.log('📋 ExtendedData encontrado, processando...');
        
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

// =========================================================================
// 📊 EXTRAIR DADOS DE UMA CIDADE DA DESCRIÇÃO HTML
// =========================================================================
function parseCityDescription(htmlDescription) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    
    const data = {};
    
    // Extrair de divs estruturados
    const divs = doc.querySelectorAll('div');
    divs.forEach(div => {
        const text = div.textContent;
        
        // População
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
        
        // Qualidade do sinal
        if (text.includes('Sinal')) {
            if (text.includes('Excelente')) data.qualityText = 'Excelente';
            else if (text.includes('Ótimo') || text.includes('Ã"timo')) data.qualityText = 'Ótimo';
            else if (text.includes('Fraco')) data.qualityText = 'Fraco';
        }
    });
    
    return data;
}

// =========================================================================
// 🎨 DETERMINAR QUALIDADE DO SINAL (CORRIGIDO COM ACENTO)
// =========================================================================
function getSignalQuality(styleUrl) {
    if (styleUrl.includes('excelente')) return 'excelente';
    if (styleUrl.includes('otimo')) return 'otimo';
    if (styleUrl.includes('fraco')) return 'fraco';
    return 'desconhecido';
}

// Função para converter qualidade para texto com acento
function getQualityText(quality) {
    switch (quality) {
        case 'excelente': return 'Excelente';
        case 'otimo': return 'Ótimo';
        case 'fraco': return 'Fraco';
        default: return 'Desconhecido';
    }
}

// =========================================================================
// 🖼️ ADICIONAR IMAGEM DE COBERTURA AO MAPA (MODO INDIVIDUAL)
// =========================================================================
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

// =========================================================================
// 📍 ADICIONAR MARCADOR DA ANTENA (MODO INDIVIDUAL)
// =========================================================================
function addAntennaMarker() {
    // 🖼️ USAR LOGO PRIORITÁRIA (KMZ → NOTION → PADRÃO)
    let antennaIcon;
    let logoUrl = radioData.logoUrlFromKMZ || radioData.notionIconUrl;
    
    if (logoUrl) {
        // Criar ícone personalizado com a logo
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
        console.log('✅ Marcador da antena com logo:', logoUrl);
    } else {
        // Ícone padrão vermelho
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
            ${radioData.antennaData ? `
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
                <div style="text-align: left; font-size: 12px;">
                    ${radioData.antennaData.frequencia ? `<p><strong>Frequência:</strong> ${radioData.antennaData.frequencia}</p>` : ''}
                    ${radioData.antennaData.potencia ? `<p><strong>Potência:</strong> ${radioData.antennaData.potencia}</p>` : ''}
                    ${radioData.antennaData.erp ? `<p><strong>ERP:</strong> ${radioData.antennaData.erp}</p>` : ''}
                    ${radioData.antennaData.altura ? `<p><strong>Altura:</strong> ${radioData.antennaData.altura}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    L.marker([radioData.antennaLocation.lat, radioData.antennaLocation.lng], { icon: antennaIcon })
        .addTo(map)
        .bindPopup(popupContent);
    
    console.log('📍 Marcador da antena adicionado');
}

// =========================================================================
// 🏙️ ADICIONAR MARCADORES DAS CIDADES (MODO INDIVIDUAL)
// =========================================================================
function addCityMarkers() {
    cityMarkersIndividual = []; // Limpar marcadores existentes
    
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
                    <p style="margin: 4px 0;"><strong>População Coberta:</strong> ${(city.coveredPopulation || 0).toLocaleString()} ${city.coveragePercent ? `(${city.coveragePercent})` : ''}</p>
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

// =========================================================================
// 🎨 OBTER COR POR QUALIDADE
// =========================================================================
function getQualityColor(quality) {
    switch (quality) {
        case 'excelente': return '#00FF00';
        case 'otimo': return '#00FFFF';
        case 'fraco': return '#0000FF';
        default: return '#808080';
    }
}

// =========================================================================
// 🗺️ AJUSTAR ZOOM DO MAPA (MODO INDIVIDUAL)
// =========================================================================
function fitMapBounds() {
    if (citiesData.length === 0 && !radioData.antennaLocation && !radioData.coverageImage) return;
    
    const bounds = L.latLngBounds();
    
    // Adicionar cidades
    citiesData.forEach(city => {
        bounds.extend([city.coordinates.lat, city.coordinates.lng]);
    });
    
    // Adicionar antena
    if (radioData.antennaLocation) {
        bounds.extend([radioData.antennaLocation.lat, radioData.antennaLocation.lng]);
    }
    
    // Adicionar bounds da imagem de cobertura
    if (radioData.coverageImage) {
        bounds.extend(radioData.coverageImage.bounds);
    }
    
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// =========================================================================
// 🏙️ RENDERIZAR LISTA DE CIDADES (MODO INDIVIDUAL)
// =========================================================================
function renderCities() {
    filteredCities = [...citiesData];
    updateCitiesList();
    
    document.getElementById('cidade-count').textContent = citiesData.length;
    document.getElementById('cidades-section').style.display = 'block';
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

// =========================================================================
// 🔍 CONFIGURAR BUSCA (MODO INDIVIDUAL)
// =========================================================================
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

// =========================================================================
// 🎯 DESTACAR CIDADE NO MAPA (MODO INDIVIDUAL)
// =========================================================================
function highlightCity(cityName) {
    const city = citiesData.find(c => c.name === cityName);
    if (!city) return;
    
    map.flyTo([city.coordinates.lat, city.coordinates.lng], 13, {
        animate: true,
        duration: 1.5
    });
    
    // Encontrar e abrir popup do marcador
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

// =========================================================================
// 📊 EXPORTAR PARA EXCEL (MODO INDIVIDUAL)
// =========================================================================
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
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    
    // Larguras das colunas
    ws['!cols'] = [
        { wch: 30 }, // Cidade
        { wch: 5 },  // UF
        { wch: 15 }, // Pop Total
        { wch: 15 }, // Pop Coberta
        { wch: 12 }, // % Cobertura
        { wch: 15 }  // Qualidade
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cidades de Cobertura');
    
    const fileName = `${radioData.name || 'cobertura'}_mapeamento_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log('📊 Excel exportado:', fileName);
}

// =========================================================================
// 🔧 FUNÇÕES AUXILIARES
// =========================================================================
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

// =========================================================================
// 🖼️ FUNÇÕES DE ATUALIZAÇÃO DO HEADER - PRESERVADAS PARA MODO INDIVIDUAL
// =========================================================================

// 🖼️ PROCESSAR ÍCONE DO NOTION (MODO INDIVIDUAL)
function processNotionIcon() {
    console.log('🖼️ Processando ícone do Notion...');
    
    if (radioData.icon) {
        if (radioData.icon.type === 'file' && radioData.icon.url) {
            radioData.notionIconUrl = radioData.icon.url;
            console.log('✅ Ícone do Notion (file) processado:', radioData.notionIconUrl);
        } else if (radioData.icon.type === 'external' && radioData.icon.url) {
            radioData.notionIconUrl = radioData.icon.url;
            console.log('✅ Ícone do Notion (external) processado:', radioData.notionIconUrl);
        } else if (radioData.icon.type === 'emoji') {
            radioData.notionEmoji = radioData.icon.emoji;
            console.log('✅ Emoji do Notion processado:', radioData.notionEmoji);
        }
    } else {
        console.log('ℹ️ Nenhum ícone encontrado no Notion');
    }
    
    // 🖼️ FALLBACK PARA CAMPO IMAGEM SE NÃO TEM ÍCONE
    if (!radioData.notionIconUrl && radioData.imageUrl && !radioData.imageUrl.includes('placeholder')) {
        radioData.notionIconUrl = radioData.imageUrl;
        console.log('✅ Usando campo Imagem como fallback:', radioData.notionIconUrl);
    }
}

// ATUALIZAR HEADER BÁSICO (SEM LOGO)
function updateHeaderBasic() {
    const radioName = document.getElementById('radio-name');
    const radioInfo = document.getElementById('radio-info');
    
    if (radioName) {
        radioName.textContent = radioData.name || 'Rádio';
    }
    
    if (radioInfo) {
        radioInfo.textContent = `${radioData.dial || ''} • ${radioData.praca || ''} - ${radioData.uf || ''}`;
    }
    
    console.log('✅ Header básico atualizado');
}

// 🖼️ ATUALIZAR LOGO NO HEADER - FUNÇÃO PRINCIPAL COM RETRY (SÓ MODO INDIVIDUAL)
function updateHeaderLogoFinal(retryCount = 0) {
    // 🔧 NÃO EXECUTAR NO MODO PROPOSTA
    if (isPropostaMode) {
        console.log('🚫 updateHeaderLogoFinal() pulado no modo proposta');
        return;
    }
    
    const maxRetries = 5;
    
    console.log(`🔍 Tentativa ${retryCount + 1}/${maxRetries + 1} de encontrar header-logo...`);
    
    const headerLogo = document.getElementById('header-logo');
    
    if (!headerLogo) {
        if (retryCount < maxRetries) {
            console.warn(`⚠️ Elemento header-logo não encontrado, tentando novamente em 500ms... (${retryCount + 1}/${maxRetries + 1})`);
            setTimeout(() => {
                updateHeaderLogoFinal(retryCount + 1);
            }, 500);
            return;
        } else {
            console.error('❌ Elemento header-logo não foi encontrado após 5 tentativas!');
            
            // 🛠️ TENTAR CRIAR O ELEMENTO SE NÃO EXISTIR
            const radioNameElement = document.getElementById('radio-name');
            if (radioNameElement) {
                console.log('🛠️ Tentando criar elemento header-logo...');
                const logoImg = document.createElement('img');
                logoImg.id = 'header-logo';
                logoImg.className = 'header-logo';
                logoImg.style.display = 'none';
                logoImg.alt = 'Logo';
                radioNameElement.appendChild(logoImg);
                
                // Tentar novamente após criar
                setTimeout(() => {
                    updateHeaderLogoFinal(0);
                }, 200);
                return;
            } else {
                console.error('❌ Nem radio-name nem header-logo foram encontrados!');
                return;
            }
        }
    }
    
    console.log('✅ Elemento header-logo encontrado!');
    
    // 🎯 PRIORIDADE: KMZ → NOTION ICON → CAMPO IMAGEM → OCULTAR
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
    
    console.log('🖼️ LOGOS DISPONÍVEIS:', {
        kmzLogo: radioData.logoUrlFromKMZ || 'Não encontrada',
        notionIcon: radioData.notionIconUrl || 'Não encontrado',
        imageUrl: radioData.imageUrl || 'Não encontrado',
        escolhida: logoUrl ? `${source}: ${logoUrl}` : 'Nenhuma'
    });
    
    if (logoUrl) {
        console.log(`🎯 Configurando logo do ${source} no header:`, logoUrl);
        
        headerLogo.src = logoUrl;
        headerLogo.style.display = 'block';
        
        headerLogo.onload = function() {
            console.log(`✅ Logo do ${source} carregada com sucesso no header!`);
        };
        
        headerLogo.onerror = function() {
            console.warn(`⚠️ Erro ao carregar logo do ${source}:`, logoUrl);
            this.style.display = 'none';
            
            // Tentar próxima opção se falhar
            if (source === 'KMZ' && radioData.notionIconUrl) {
                console.log('🔄 Tentando Notion Icon como fallback...');
                setTimeout(() => {
                    radioData.logoUrlFromKMZ = null; // Marcar como falha
                    updateHeaderLogoFinal(0); // Tentar novamente
                }, 100);
            } else if (source === 'Notion Icon' && radioData.imageUrl) {
                console.log('🔄 Tentando Campo Imagem como fallback...');
                setTimeout(() => {
                    radioData.notionIconUrl = null; // Marcar como falha
                    updateHeaderLogoFinal(0); // Tentar novamente
                }, 100);
            }
        };
        
        console.log(`✅ Logo do ${source} configurada no header`);
    } else {
        headerLogo.style.display = 'none';
        console.log('ℹ️ Nenhuma logo disponível para o header');
    }
}

// 🚀 FORÇAR ATUALIZAÇÃO DA LOGO QUANDO DETECTADA NO KMZ (SÓ MODO INDIVIDUAL)
function forceUpdateHeaderLogo() {
    // 🔧 NÃO EXECUTAR NO MODO PROPOSTA
    if (isPropostaMode) {
        console.log('🚫 forceUpdateHeaderLogo() pulado no modo proposta');
        return;
    }
    
    console.log('🚀 FORÇANDO atualização da logo no header...');
    
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        updateHeaderLogoFinal(0);
    }, 200);
}

// ATUALIZAR APENAS A LOGO DO HEADER (LEGACY - COMPATIBILIDADE)
function updateHeaderLogo() {
    // Chamar a função principal
    updateHeaderLogoFinal(0);
}

// ATUALIZAR HEADER COMPLETO (LEGACY - COMPATIBILIDADE)
function updateHeader() {
    updateHeaderBasic();
    updateHeaderLogoFinal(0);
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
    hideLoadingScreen(); // 🆕 Garantir que tela personalizada também suma
    document.getElementById('error-message').textContent = message;
    
    if (details) {
        document.getElementById('error-details').textContent = details;
        document.getElementById('error-details').style.display = 'block';
    }
    
    document.getElementById('error').style.display = 'block';
}
