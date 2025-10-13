// =========================================================================
// 📡 CLOUDFLARE PAGES FUNCTION - RADIO DATA API 2.0
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
// 🔧 PROCESSAR DADOS DE UMA RÁDIO
// =========================================================================
async function processRadioData(notionData) {
  console.log('✅ Processando rádio:', {
    id: notionData.id,
    object: notionData.object,
    propertiesKeys: Object.keys(notionData.properties || {})
  });

  const properties = notionData.properties || {};
  
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
    
    // URLs e mídias
    imageUrl: extractValue(properties['Imagem'] || properties['imagem'], 'https://via.placeholder.com/100x75/06055B/white?text=FM', 'Imagem'),
    
    // Metadata
    source: 'notion',
    notionId: notionData.id,
    lastUpdate: new Date().toISOString()
  };

  console.log('📊 Valores extraídos:', {
    name: radioData.name,
    dial: radioData.dial,
    kmz2Url: radioData.kmz2Url ? 'Sim' : 'Não',
    kml2Url: radioData.kml2Url ? 'Sim' : 'Não'
  });

  // Validar URLs
  if (!radioData.kmz2Url) {
    console.warn('⚠️ KMZ2 URL não encontrada');
  }
  
  if (!radioData.kml2Url) {
    console.warn('⚠️ KML2 URL não encontrada');
  }

  return radioData;
}
