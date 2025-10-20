function parseAreasInteresseBatchGeo(data) {
    // ... código existente ...

    // Adicionando suporte para ler o elemento <address> do BatchGeo quando não houver <name>
    if (!area.name && area.address) {
        area.name = area.address;
    }
    // ... código existente ...
}

function addAreasInteresseToMap(areas) {
    // Substituindo L.layerGroup() por L.featureGroup()
    const group = L.featureGroup();
    // ... código existente ...
}

function addAllRadiosToMap(radios) {
    // Substituindo L.layerGroup() por L.featureGroup() para consistência
    const group = L.featureGroup();
    // ... código existente ...
}