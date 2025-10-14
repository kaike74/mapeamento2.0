// =========================================================================
// 🚀 MAPEAMENTO RÁDIO 2.0 - E-MÍDIAS
// =========================================================================

let map;
let radioData = {};
let citiesData = [];
let filteredCities = [];
let coverageImageLayer = null;
let legendImage = null;
let cityMarkers = [];

// =========================================================================
// 🎯 INICIALIZAÇÃO
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando Mapeamento 2.0...');
        await loadRadioData();
        await processFiles();
        initializeMap();
        renderCities();
        setupSearch();
        hideLoading();
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showError(error.message, error.stack);
    }
});

// =========================================================================
// 📡 CARREGAR DADOS DO NOTION
// =========================================================================
async function loadRadioData() {
    const params = new URLSearchParams(window.location.search);
    const notionId = params.get('id');
    
    if (!notionId || !/^[0-9a-f]{32}$/i.test(notionId)) {
        throw new Error('ID do Notion inválido ou não fornecido. Use: ?id=SEU_NOTION_ID');
    }
    
    console.log('📡 Buscando dados do Notion:', notionId);
    
    // CORREÇÃO: URL correta da API
    const response = await fetch(`/api/radio-data?id=${notionId}`);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    radioData = await response.json();
    console.log('✅ Dados carregados:', radioData);
    
    // Atualizar header
    updateHeader();
}

// =========================================================================
// 📄 PROCESSAR ARQUIVOS KMZ E KML
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
// 📦 PROCESSAR ARQUIVO KMZ
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
        throw error;
    }
}

// =========================================================================
// 🔍 PROCESSAR CONTEÚDO DO KMZ (KML INTERNO + IMAGENS)
// =========================================================================
async function parseKMZContent(kmlText, zip) {
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
                
                radioData.coverageImage = {
                    url: imageUrl,
                    bounds: [[south, west], [north, east]]
                };
                
                console.log('🗺️ GroundOverlay extraído:', radioData.coverageImage.bounds);
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
                console.log('📊 Legenda extraída');
            }
        }
    }
    
    // Extrair dados da antena (Placemark)
    const placemark = xmlDoc.querySelector('Placemark');
    if (placemark) {
        const description = placemark.querySelector('description')?.textContent;
        if (description) {
            parseAntennaData(description);
        }
        
        // Coordenadas da antena
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        if (coordinates) {
            const [lng, lat] = coordinates.trim().split(',').map(parseFloat);
            radioData.antennaLocation = { lat, lng };
            console.log('�� Localização da antena:', radioData.antennaLocation);
        }
    }
}

// =========================================================================
// 📊 EXTRAIR DADOS TÉCNICOS DA ANTENA
// =========================================================================
function parseAntennaData(htmlDescription) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    const rows = doc.querySelectorAll('tr');
    
    const data = {};
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            
            if (key.includes('Frequência')) data.frequencia = value;
            else if (key.includes('Potência')) data.potencia = value;
            else if (key.includes('ERP')) data.erp = value;
            else if (key.includes('Altura')) data.altura = value;
            else if (key.includes('Antena')) data.antena = value;
            else if (key.includes('Sensibilidade')) data.sensibilidade = value;
        }
    });
    
    radioData.antennaData = data;
    console.log('📊 Dados técnicos extraídos:', data);
    
    // Atualizar UI
    updateTechnicalInfo(data);
}

// =========================================================================
// 🏙️ PROCESSAR KML DE CIDADES
// =========================================================================
async function processKML(driveUrl) {
    try {
        const directUrl = convertGoogleDriveUrl(driveUrl);
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        
        console.log('��️ Baixando KML via proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const kmlText = await response.text();
        await parseKMLCities(kmlText);
        
    } catch (error) {
        console.error('❌ Erro ao processar KML:', error);
        throw error;
    }
}

// =========================================================================
// 🔍 PROCESSAR CIDADES DO KML
// =========================================================================
async function parseKMLCities(kmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    
    citiesData = [];
    let totalPopulation = 0;
    let coveredPopulation = 0;
    
    placemarks.forEach(placemark => {
        const name = placemark.querySelector('name')?.textContent || '';
        const description = placemark.querySelector('description')?.textContent || '';
        const coordinates = placemark.querySelector('Point coordinates')?.textContent;
        const styleUrl = placemark.querySelector('styleUrl')?.textContent || '';
        
        if (coordinates) {
            const [lng, lat] = coordinates.trim().split(',').map(parseFloat);
            
            // Extrair dados da descrição
            const cityData = parseCityDescription(description);
            cityData.name = name;
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
    
    console.log(`🏙️ ${citiesData.length} cidades processadas`);
    console.log(`👥 População total: ${totalPopulation.toLocaleString()}`);
    console.log(`✅ População coberta: ${coveredPopulation.toLocaleString()}`);
    
    // Atualizar UI
    updateCoverageInfo();
}

// =========================================================================
// 📊 EXTRAIR DADOS DE UMA CIDADE
// =========================================================================
function parseCityDescription(htmlDescription) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlDescription, 'text/html');
    
    const data = {};
    
    // Extrair tabela
    const rows = doc.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            
            if (key.includes('População Total')) {
                data.totalPopulation = parseInt(value.replace(/\D/g, '')) || 0;
            } else if (key.includes('População Coberta')) {
                const match = value.match(/(\d+)\s*\(([^)]+)\)/);
                if (match) {
                    data.coveredPopulation = parseInt(match[1].replace(/\D/g, '')) || 0;
                    data.coveragePercent = match[2];
                }
            } else if (key.includes('Masculina')) {
                data.male = parseInt(value.replace(/\D/g, '')) || 0;
            } else if (key.includes('Feminina')) {
                data.female = parseInt(value.replace(/\D/g, '')) || 0;
            } else if (key.includes('Qualidade')) {
                data.qualityText = value;
            } else if (key.includes('Setores')) {
                data.sectors = value;
            }
        }
    });
    
    return data;
}

// =========================================================================
// 🎨 DETERMINAR QUALIDADE DO SINAL
// =========================================================================
function getSignalQuality(styleUrl) {
    if (styleUrl.includes('excelente')) return 'excelente';
    if (styleUrl.includes('otimo')) return 'otimo';
    if (styleUrl.includes('fraco')) return 'fraco';
    return 'desconhecido';
}

// =========================================================================
// 🗺️ INICIALIZAR MAPA
// =========================================================================
function initializeMap() {
    console.log('��️ Inicializando mapa...');
    
    const center = radioData.antennaLocation || { lat: -15.7942, lng: -47.8822 };
    
    map = L.map('map').setView([center.lat, center.lng], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Adicionar imagem de cobertura
    if (radioData.coverageImage) {
        addCoverageImage();
    }
    
    // Adicionar marcador da antena
    if (radioData.antennaLocation) {
        addAntennaMarker();
    }
    
    // Adicionar marcadores de cidades
    addCityMarkers();
    
    // Ajustar zoom
    fitMapBounds();
    
    // Mostrar legenda
    if (legendImage) {
        document.getElementById('map-legend').style.display = 'block';
    }
    
    // Mostrar mapa
    document.getElementById('map-section').style.display = 'block';
    
    console.log('✅ Mapa inicializado');
}

// =========================================================================
// 🖼️ ADICIONAR IMAGEM DE COBERTURA AO MAPA
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
// 📍 ADICIONAR MARCADOR DA ANTENA
// =========================================================================
function addAntennaMarker() {
    const antennaIcon = L.divIcon({
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
// 🏙️ ADICIONAR MARCADORES DAS CIDADES
// =========================================================================
function addCityMarkers() {
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
                <h4 style="margin: 0 0 8px 0; color: #06055B;">${city.name}</h4>
                <div style="text-align: left; font-size: 13px; color: #64748B;">
                    <p style="margin: 4px 0;"><strong>População Total:</strong> ${(city.totalPopulation || 0).toLocaleString()}</p>
                    <p style="margin: 4px 0;"><strong>População Coberta:</strong> ${(city.coveredPopulation || 0).toLocaleString()} ${city.coveragePercent ? `(${city.coveragePercent})` : ''}</p>
                    ${city.qualityText ? `<p style="margin: 4px 0;"><strong>Qualidade:</strong> ${city.qualityText}</p>` : ''}
                    ${city.sectors ? `<p style="margin: 4px 0;"><strong>Setores:</strong> ${city.sectors}</p>` : ''}
                </div>
            </div>
        `;
        
        const marker = L.marker([city.coordinates.lat, city.coordinates.lng], { icon: cityIcon })
            .addTo(map)
            .bindPopup(popupContent);
        
        cityMarkers.push(marker);
    });
    
    console.log(`🏙️ ${cityMarkers.length} marcadores de cidades adicionados`);
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
// 🗺️ AJUSTAR ZOOM DO MAPA
// =========================================================================
function fitMapBounds() {
    if (citiesData.length === 0) return;
    
    const bounds = L.latLngBounds(
        citiesData.map(city => [city.coordinates.lat, city.coordinates.lng])
    );
    
    if (radioData.antennaLocation) {
        bounds.extend([radioData.antennaLocation.lat, radioData.antennaLocation.lng]);
    }
    
    map.fitBounds(bounds, { padding: [50, 50] });
}

// =========================================================================
// 🏙️ RENDERIZAR LISTA DE CIDADES
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
        <div class="cidade-item" onclick="highlightCity('${city.name}')">
            <div class="cidade-info">
                <div class="cidade-name">${city.name}</div>
                <div class="cidade-details">
                    <span>👥 ${(city.totalPopulation || 0).toLocaleString()} hab.</span>
                    <span>✅ ${(city.coveredPopulation || 0).toLocaleString()} cobertos ${city.coveragePercent ? `(${city.coveragePercent})` : ''}</span>
                    ${city.quality ? `<span class="cidade-badge badge-${city.quality}">�� ${city.quality.toUpperCase()}</span>` : ''}
                </div>
            </div>
            <div class="cidade-stats">
                ${city.sectors ? `<div class="stat-item">🏢 ${city.sectors}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// =========================================================================
// 🔍 CONFIGURAR BUSCA
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
                       city.quality?.toLowerCase().includes(query) ||
                       city.qualityText?.toLowerCase().includes(query);
            });
        }
        
        updateCitiesList();
        document.getElementById('cidade-count').textContent = filteredCities.length;
    });
}

// =========================================================================
// 🎯 DESTACAR CIDADE NO MAPA
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
        cityMarkers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - city.coordinates.lat) < 0.0001 &&
                Math.abs(markerLatLng.lng - city.coordinates.lng) < 0.0001) {
                marker.openPopup();
            }
        });
    }, 1000);
}

// =========================================================================
// 📊 EXPORTAR PARA EXCEL
// =========================================================================
function exportToExcel() {
    const excelData = [
        ['Cidade', 'UF', 'População Total', 'População Coberta', '% Cobertura', 'Qualidade', 'Setores']
    ];
    
    filteredCities.forEach(city => {
        const uf = city.name.split(' - ')[1] || '';
        const cityName = city.name.split(' - ')[0] || city.name;
        
        excelData.push([
            cityName,
            uf,
            city.totalPopulation || 0,
            city.coveredPopulation || 0,
            city.coveragePercent || '0%',
            city.qualityText || city.quality || '-',
            city.sectors || '-'
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
        { wch: 15 }, // Qualidade
        { wch: 15 }  // Setores
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
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (!fileIdMatch) throw new Error('URL do Google Drive inválida');
    
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function updateHeader() {
    const radioName = document.getElementById('radio-name');
    const radioInfo = document.getElementById('radio-info');
    
    if (radioName) {
        radioName.textContent = radioData.name || 'Rádio';
    }
    
    if (radioInfo) {
        radioInfo.textContent = `${radioData.dial || ''} • ${radioData.praca || ''} - ${radioData.uf || ''}`;
    }
}

function updateTechnicalInfo(data) {
    document.getElementById('info-dial').textContent = radioData.dial || '-';
    document.getElementById('info-region').textContent = radioData.region || '-';
    document.getElementById('info-praca').textContent = radioData.praca || '-';
    document.getElementById('info-frequencia').textContent = data.frequencia || '-';
    document.getElementById('info-potencia').textContent = data.potencia || '-';
    document.getElementById('info-erp').textContent = data.erp || '-';
    document.getElementById('info-altura').textContent = data.altura || '-';
    
    document.getElementById('info-section').style.display = 'grid';
}

function updateCoverageInfo() {
    document.getElementById('info-pop-total').textContent = (radioData.totalPopulation || 0).toLocaleString();
    document.getElementById('info-pop-coberta').textContent = (radioData.coveredPopulation || 0).toLocaleString();
    document.getElementById('info-cidades-count').textContent = radioData.citiesCount || 0;
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message, details) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-message').textContent = message;
    
    if (details) {
        document.getElementById('error-details').textContent = details;
        document.getElementById('error-details').style.display = 'block';
    }
    
    document.getElementById('error').style.display = 'block';
}
