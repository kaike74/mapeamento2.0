// =========================================================================
// 📡 CLOUDFLARE PAGES FUNCTION - RADIO DATA API 2.0 - COM ÁREAS DE INTERESSE CORRIGIDO
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
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'ID do registro é obrigatório' 
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

    console.log('🔍 Buscando rádio no Notion:', id);

    // Buscar dados do Notion
    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
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
    const radioData = await processRadioData(notionData);

    return new Response(JSON.stringify(radioData), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('💥 Erro na função:', error);
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
  console.log('✅ Processando rádio:', {
    id: notionData.id,
    object: notionData.object,
    propertiesKeys: Object.keys(notionData.properties || {}),
    hasIcon: !!notionData.icon
  });

  const properties = notionData.properties || {};
  
  // 🔧 LOG DETALHADO DOS CAMPOS PARA DEBUG
  console.log('🔍 Campos disponíveis:', Object.keys(properties));
  
  // Função helper para extrair valores
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

  // 🆕 FUNÇÃO HELPER PARA EXTRAIR TODOS OS ARQUIVOS (ÁREAS DE INTERESSE) - CORRIGIDA
  const extractAllFiles = (prop) => {
    if (!prop || prop.type !== 'files' || !prop.files || prop.files.length === 0) {
      return [];
    }
    
    console.log(`📁 Encontrados ${prop.files.length} arquivo(s) de áreas de interesse`);
    
    return prop.files.map((file, index) => {
      console.log(`📄 Arquivo ${index + 1}:`, {
        name: file.name,
        hasFile: !!file.file,
        hasExternal: !!file.external,
        type: file.type || 'unknown'
      });
      
      return {
        name: file.name,
        file: file.file,
        external: file.external,
        url: file.file?.url || file.external?.url
      };
    });
  };

  // 🔧 BUSCAR ÁREAS DE INTERESSE COM MÚLTIPLAS VARIAÇÕES DE NOME
  let areasInteresse = [];
  const possibleAreasFields = [
    'Areas_Interesse',
    'areas_interesse', 
    'AreasInteresse',
    'Áreas de Interesse',
    'Areas de Interesse',
    'Areas Interesse',
    'areas interesse',
    'areasinteresse'
  ];
  
  console.log('🎯 Buscando campo de áreas de interesse...');
  
  for (const fieldName of possibleAreasFields) {
    if (properties[fieldName]) {
      console.log(`✅ Campo encontrado: "${fieldName}"`);
      areasInteresse = extractAllFiles(properties[fieldName]);
      break;
    }
  }
  
  if (areasInteresse.length === 0) {
    console.log('⚠️ Nenhum campo de áreas de interesse encontrado. Campos disponíveis:', Object.keys(properties));
  }

  // MAPEAR DADOS BÁSICOS
  const radioData = {
    // Informações básicas
    name: extractValue(properties['Emissora'] || properties['emissora'], 'Rádio Desconhecida', 'Emissora'),
    dial: extractValue(properties['Dial'] || properties['dial'], 'N/A', 'Dial'),
    
    // Localização
    region: extractValue(properties['Região'] || properties['regiao'], 'N/A', 'Região'),
    uf: extractValue(properties['UF'] || properties['uf'], 'N/A', 'UF'),
    praca: extractValue(properties['Praça'] || properties['praca'], 'N/A', 'Praça'),
    
    // URLs dos arquivos KMZ2 e KML2
    kmz2Url: extractValue(properties['KMZ2'] || properties['kmz2'], '', 'KMZ2'),
    kml2Url: extractValue(properties['KML2'] || properties['kml2'], '', 'KML2'),
    
    // URLs e mídias - remover placeholder inválido
    imageUrl: extractValue(properties['Imagem'] || properties['imagem'], '', 'Imagem'),
    
    // 🆕 ÁREAS DE INTERESSE - CORRIGIDO
    areasInteresse: areasInteresse,
    
    // Metadata
    source: 'notion',
    notionId: notionData.id,
    lastUpdate: new Date().toISOString()
  };

  // EXTRAIR ÍCONE DA PÁGINA
  if (notionData.icon) {
    console.log('🖼️ Ícone encontrado no Notion:', notionData.icon);
    
    if (notionData.icon.type === 'file' && notionData.icon.file) {
      radioData.icon = {
        type: 'file',
        url: notionData.icon.file.url
      };
      console.log('✅ Ícone de arquivo extraído:', radioData.icon.url);
    } else if (notionData.icon.type === 'emoji') {
      radioData.icon = {
        type: 'emoji',
        emoji: notionData.icon.emoji
      };
      console.log('✅ Emoji extraído:', radioData.icon.emoji);
    } else if (notionData.icon.type === 'external' && notionData.icon.external) {
      radioData.icon = {
        type: 'external',
        url: notionData.icon.external.url
      };
      console.log('✅ Ícone externo extraído:', radioData.icon.url);
    }
  }

  console.log('📊 Dados processados:', {
    name: radioData.name,
    dial: radioData.dial,
    uf: radioData.uf,
    kmz2Url: radioData.kmz2Url ? 'Sim' : 'Não',
    kml2Url: radioData.kml2Url ? 'Sim' : 'Não',
    areasInteresse: radioData.areasInteresse.length > 0 ? `${radioData.areasInteresse.length} arquivo(s)` : 'Não',
    hasIcon: !!radioData.icon
  });

  // Validar URLs
  if (!radioData.kmz2Url) {
    console.warn('⚠️ KMZ2 URL não encontrada');
  }
  
  if (!radioData.kml2Url) {
    console.warn('⚠️ KML2 URL não encontrada');
  }

  // 🆕 LOG DE ÁREAS DE INTERESSE - CORRIGIDO
  if (radioData.areasInteresse.length > 0) {
    console.log('🎯 Áreas de interesse encontradas:', radioData.areasInteresse.length);
    radioData.areasInteresse.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area.name} - URL: ${area.url ? 'Sim' : 'Não'}`);
    });
  } else {
    console.log('ℹ️ Nenhuma área de interesse encontrada');
  }

  return radioData;
}
