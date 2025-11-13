// =========================================================================
// 📡 CLOUDFLARE PAGES FUNCTION - PROPOSTA DATA API - CORRIGIDO PARA ÁREAS DE INTERESSE
// =========================================================================

export async function onRequest(context) {
  // Permitir CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder OPTIONS para CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers
    });
  }

  try {
    // Obter parâmetros da URL
    const url = new URL(context.request.url);
    const databaseId = url.searchParams.get('database_id');
    
    if (!databaseId) {
      return new Response(JSON.stringify({ 
        error: 'ID da database/proposta é obrigatório' 
      }), {
        status: 400,
        headers
      });
    }

    // Token do Notion
    const notionToken = context.env.NOTION_TOKEN;
    if (!notionToken) {
      return new Response(JSON.stringify({ 
        error: 'Token do Notion não configurado' 
      }), {
        status: 500,
        headers
      });
    }

    console.log('🔍 Buscando proposta no Notion:', databaseId);

    // Buscar dados da database do Notion
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100 // Máximo de rádios por proposta
      })
    });

    console.log('📡 Status da resposta Notion:', response.status);

    if (!response.ok) {
      console.error('❌ Erro da API Notion:', response.status, response.statusText);
      
      let errorDetails = response.statusText;
      try {
        const errorBody = await response.text();
        console.log('📄 Corpo do erro:', errorBody);
        errorDetails = errorBody;
      } catch (e) {
        console.log('⚠️ Não foi possível ler corpo do erro');
      }
      
      return new Response(JSON.stringify({ 
        error: `Erro ao buscar dados do Notion: ${response.status}`,
        details: errorDetails
      }), {
        status: response.status,
        headers
      });
    }

    const notionData = await response.json();
    
    console.log(`📊 Encontrados ${notionData.results.length} registros na proposta`);
    
    // Processar cada rádio da proposta - LOGS SIMPLIFICADOS
    const radiosData = [];
    let processedCount = 0;
    let errorCount = 0;
    
    for (const radioPage of notionData.results) {
      try {
        const processedRadio = await processRadioData(radioPage);
        radiosData.push(processedRadio);
        processedCount++;
        
        // 🔧 LOG SIMPLIFICADO A CADA 10 RÁDIOS
        if (processedCount % 10 === 0) {
          console.log(`📊 Processadas ${processedCount}/${notionData.results.length} rádios`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Erro na rádio ${radioPage.id}:`, error.message);
        errorCount++;
        // Continuar com as outras rádios mesmo se uma falhar
      }
    }

    console.log(`✅ Processamento concluído: ${processedCount} sucessos, ${errorCount} erros`);

    // Buscar informações da database (título da proposta)
    let propostaInfo = {};
    try {
      const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });
      
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        propostaInfo = {
          title: dbData.title?.[0]?.text?.content || 'Proposta',
          description: dbData.description?.[0]?.text?.content || ''
        };
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível buscar informações da database:', error);
    }

    const result = {
      proposta: {
        id: databaseId,
        title: propostaInfo.title || 'Proposta de Cobertura',
        description: propostaInfo.description || '',
        totalRadios: radiosData.length,
        lastUpdate: new Date().toISOString()
      },
      radios: radiosData,
      summary: generateSummary(radiosData)
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('💥 Erro na função proposta:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers
    });
  }
}

// =========================================================================
// 🔧 PROCESSAR DADOS DE UMA RÁDIO - CORRIGIDO PARA ÁREAS DE INTERESSE
// =========================================================================
async function processRadioData(notionData) {
  const properties = notionData.properties || {};
  
  // Função helper para extrair valores (igual ao arquivo radio-data.js)
  const extractValue = (prop, defaultValue = '', propName = '') => {
    if (!prop) {
      return defaultValue;
    }
    
    switch (prop.type) {
      case 'number':
        return prop.number !== null && prop.number !== undefined ? prop.number : defaultValue;
      case 'title':
        return prop.title?.[0]?.text?.content || defaultValue;
      case 'rich_text':
        return prop.rich_text?.[0]?.text?.content || defaultValue;
      case 'date':
        return prop.date?.start || defaultValue;
      case 'multi_select':
        return prop.multi_select?.map(item => item.name).join(',') || defaultValue;
      case 'select':
        return prop.select?.name || defaultValue;
      case 'url':
        return prop.url || defaultValue;
      case 'files':
        return prop.files?.[0]?.file?.url || prop.files?.[0]?.external?.url || defaultValue;
      default:
        return defaultValue;
    }
  };

  // 🆕 FUNÇÃO HELPER PARA EXTRAIR ÁREAS DE INTERESSE (TEXTO OU ARQUIVOS)
  const extractAreasInteresse = (prop) => {
    if (!prop) {
      return { type: 'none', data: [] };
    }
    
    // SUPORTE A TEXTO (NOVO): Campo de texto com cidades separadas por vírgula
    if (prop.type === 'rich_text') {
      const text = prop.rich_text?.[0]?.text?.content || '';
      if (text.trim()) {
        console.log(`📝 Áreas de interesse em formato texto: "${text}"`);
        // Parse comma-separated city names: "Rio de Janeiro-RJ, São Paulo-SP, Mogi das Cruzes-SP"
        const cities = text.split(',').map(city => city.trim()).filter(city => city.length > 0);
        console.log(`✅ ${cities.length} cidade(s) de interesse parseada(s)`);
        return { type: 'text', data: cities };
      }
    }
    
    // SUPORTE A ARQUIVOS (LEGADO): Backward compatibility com KML uploads
    if (prop.type === 'files' && prop.files && prop.files.length > 0) {
      console.log(`📁 Processando ${prop.files.length} arquivo(s) de áreas (modo legado)`);
      const files = prop.files.map((file, index) => {
        const fileData = {
          name: file.name || `Arquivo ${index + 1}`,
          type: file.type || 'unknown'
        };
        
        if (file.file && file.file.url) {
          fileData.file = file.file;
          fileData.url = file.file.url;
        } else if (file.external && file.external.url) {
          fileData.external = file.external;
          fileData.url = file.external.url;
        } else {
          fileData.url = null;
        }
        
        return fileData;
      });
      return { type: 'files', data: files };
    }
    
    return { type: 'none', data: [] };
  };

  // 🔧 BUSCAR ÁREAS DE INTERESSE (TEXTO OU ARQUIVOS)
  let areasInteresse = { type: 'none', data: [] };
  const possibleAreasFields = [
    'Areas_Interesse',
    'areas_interesse', 
    'AreasInteresse',
    'Areas Interesse',
    'areas interesse',
    'Áreas de Interesse',
    'Areas de Interesse',
    'areasinteresse',
    'Areas_interesse',
    'areas_Interesse'
  ];
  
  console.log('🎯 Buscando campo de áreas de interesse...');
  console.log('🔍 Campos disponíveis:', Object.keys(properties));
  
  for (const fieldName of possibleAreasFields) {
    if (properties[fieldName]) {
      console.log(`✅ Campo encontrado: "${fieldName}"`);
      areasInteresse = extractAreasInteresse(properties[fieldName]);
      
      if (areasInteresse.data.length > 0) {
        console.log(`🎯 ${areasInteresse.data.length} área(s) de interesse extraída(s) (tipo: ${areasInteresse.type})`);
        break;
      } else {
        console.log(`⚠️ Campo "${fieldName}" encontrado mas vazio`);
      }
    }
  }
  
  if (areasInteresse.data.length === 0) {
    console.log('ℹ️ Nenhum campo de áreas de interesse encontrado ou populado');
  }

  // MAPEAR DADOS BÁSICOS
  const radioData = {
    // Informações básicas
    id: notionData.id,
    name: extractValue(properties['Emissora'] || properties['emissora'], 'Rádio Desconhecida', 'Emissora'),
    dial: extractValue(properties['Dial'] || properties['dial'], 'N/A', 'Dial'),

    // Localização
    region: extractValue(properties['Região'] || properties['regiao'], 'N/A', 'Região'),
    uf: extractValue(properties['UF'] || properties['uf'], 'N/A', 'UF'),
    praca: extractValue(properties['Praça'] || properties['praca'], 'N/A', 'Praça'),

    // URLs dos arquivos KMZ2 e KML2
    kmz2Url: extractValue(properties['KMZ2'] || properties['kmz2'], '', 'KMZ2'),
    kml2Url: extractValue(properties['KML2'] || properties['kml2'], '', 'KML2'),

    // 🆕 URLs dos arquivos KML (fallback) e coordenadas (fallback do fallback)
    kmlUrl: extractValue(properties['KML'] || properties['kml'], '', 'KML'),
    latitude: extractValue(properties['Latitude'] || properties['latitude'], '', 'Latitude'),
    longitude: extractValue(properties['Longitude'] || properties['longitude'], '', 'Longitude'),

    // URLs e mídias
    imageUrl: extractValue(properties['Imagem'] || properties['imagem'], '', 'Imagem'),

    // 🆕 ÁREAS DE INTERESSE - CORRIGIDO E ROBUSTO
    areasInteresse: areasInteresse,

    // Metadata
    source: 'notion_proposta',
    notionId: notionData.id,
    lastUpdate: new Date().toISOString(),

    // Flags para controle
    hasKmz: !!extractValue(properties['KMZ2'] || properties['kmz2'], ''),
    hasKml: !!extractValue(properties['KML2'] || properties['kml2'], ''),
  };

  // EXTRAIR ÍCONE DA PÁGINA
  if (notionData.icon) {
    if (notionData.icon.type === 'file' && notionData.icon.file) {
      radioData.icon = {
        type: 'file',
        url: notionData.icon.file.url
      };
    } else if (notionData.icon.type === 'emoji') {
      radioData.icon = {
        type: 'emoji',
        emoji: notionData.icon.emoji
      };
    } else if (notionData.icon.type === 'external' && notionData.icon.external) {
      radioData.icon = {
        type: 'external',
        url: notionData.icon.external.url
      };
    }
  }

  // 🔧 LOG FINAL DE DEBUG PARA ÁREAS DE INTERESSE
  if (areasInteresse.data.length > 0) {
    if (areasInteresse.type === 'text') {
      console.log(`🎯 RÁDIO "${radioData.name}": ${areasInteresse.data.length} cidade(s) de interesse (texto)`);
      areasInteresse.data.slice(0, 3).forEach((city, i) => {
        console.log(`  📍 ${i+1}. ${city}`);
      });
    } else if (areasInteresse.type === 'files') {
      console.log(`🎯 RÁDIO "${radioData.name}": ${areasInteresse.data.length} arquivo(s) de interesse`);
      areasInteresse.data.forEach((file, i) => {
        console.log(`  📄 ${i+1}. ${file.name} - URL: ${file.url ? 'OK' : 'ERRO'}`);
      });
    }
  }

  return radioData;
}

// =========================================================================
// 📊 GERAR RESUMO DA PROPOSTA - INCLUIR ÁREAS DE INTERESSE
// =========================================================================
function generateSummary(radiosData) {
  const summary = {
    totalRadios: radiosData.length,
    radiosWithKmz: radiosData.filter(r => r.hasKmz).length,
    radiosWithKml: radiosData.filter(r => r.hasKml).length,
    radiosWithAreas: 0,
    estados: [...new Set(radiosData.map(r => r.uf).filter(uf => uf && uf !== 'N/A'))],
    regioes: [...new Set(radiosData.map(r => r.region).filter(region => region && region !== 'N/A'))],
    dialTypes: {}
  };

  // Contar tipos de dial (AM/FM)
  radiosData.forEach(radio => {
    if (radio.dial && radio.dial !== 'N/A') {
      const dialType = radio.dial.toUpperCase().includes('FM') ? 'FM' : 
                      radio.dial.toUpperCase().includes('AM') ? 'AM' : 'Outro';
      summary.dialTypes[dialType] = (summary.dialTypes[dialType] || 0) + 1;
    }
  });

  // 🆕 ANÁLISE DE ÁREAS DE INTERESSE
  let totalAreasFiles = 0;
  let totalAreasText = 0;
  radiosData.forEach(radio => {
    if (radio.areasInteresse) {
      if (radio.areasInteresse.type === 'text') {
        totalAreasText += radio.areasInteresse.data.length;
      } else if (radio.areasInteresse.type === 'files') {
        totalAreasFiles += radio.areasInteresse.data.length;
      }
    }
  });

  summary.totalAreasText = totalAreasText;
  summary.totalAreasFiles = totalAreasFiles;
  summary.radiosWithAreas = radiosData.filter(r => r.areasInteresse && r.areasInteresse.data.length > 0).length;

  console.log('📊 Resumo gerado:', {
    totalRadios: summary.totalRadios,
    radiosWithAreas: summary.radiosWithAreas,
    totalAreasText: summary.totalAreasText,
    totalAreasFiles: summary.totalAreasFiles,
    estados: summary.estados.length
  });

  return summary;
}
