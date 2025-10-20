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
