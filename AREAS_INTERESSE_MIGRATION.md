# Áreas de Interesse - Migration Guide

## Overview
The system now supports **text-based Areas de Interesse** instead of requiring KML file uploads. This makes it much easier to specify cities of interest directly in Notion.

## What Changed

### Backend Changes (API)
- **radio-data.js** and **proposta-data.js** now support:
  - ✅ **Text fields** (`rich_text` type) with comma-separated city names
  - ✅ **File fields** (legacy support for existing KML uploads)
  - ✅ Automatic detection of field type

### Frontend Changes (script.js)
- ✅ **Text parsing**: Parses "City-UF, City-UF, ..." format
- ✅ **Intelligent matching**: Case-insensitive, accent-normalized matching
- ✅ **Visual indicators**: ✅ checkmarks on matched city markers
- ✅ **Dual mode**: Works in both Individual and Proposta modes
- ✅ **Backward compatible**: Legacy KML files still work

## How to Use

### Step 1: Update Notion Field
1. Go to your Notion database/page
2. Find the `Areas_Interesse` field (or similar name)
3. Change field type from **Files & media** to **Text**

### Step 2: Enter City Names
Enter cities as comma-separated text in this format:
```
Rio de Janeiro-RJ, São Paulo-SP, Mogi das Cruzes-SP, Belo Horizonte-MG
```

**Format Rules:**
- City name followed by dash and UF code
- Separate cities with commas
- Spaces are optional (trimmed automatically)
- Example: `São Paulo-SP` or `Sao Paulo-SP` (accents optional)

### Step 3: View Results
When you open the map:
- Cities matching your interest list will show a ✅ checkmark
- The checkmark appears as an overlay on the existing city marker
- Popup shows "✅ Área de Interesse" badge
- Only covered cities (present in KML2 data) show checkmarks

## Visual Indicators

### City Marker with Checkmark
```
┌─────────────┐
│   City      │ ← Original colored circle (quality)
│   Marker    │
│      ✅     │ ← Checkmark overlay (top-right)
└─────────────┘
```

### Popup Content
```
┌──────────────────────────────┐
│ São Paulo - SP               │
│ ✅ Área de Interesse         │ ← Badge
│ 📻 Rádio ABC (107.3 FM)      │
│ População Total: 12,000,000  │
│ População Coberta: 11,500,000│
│ Qualidade: Excelente         │
└──────────────────────────────┘
```

## Matching Logic

### How Cities Are Matched
1. **Parse text field**: Split by comma, trim whitespace
2. **Extract components**: Separate "City" from "UF"
3. **Normalize names**: 
   - Convert to lowercase
   - Remove accents (São Paulo → sao paulo)
   - Normalize spaces
4. **Match against KML2 cities**:
   - Compare normalized city names
   - Verify UF matches (if specified)
   - Use first match found

### Example Matches
| Text Input              | KML2 City Data          | Match? |
|-------------------------|-------------------------|--------|
| `São Paulo-SP`          | São Paulo - SP          | ✅ Yes  |
| `Sao Paulo-SP`          | São Paulo - SP          | ✅ Yes  |
| `SAO PAULO-SP`          | São Paulo - SP          | ✅ Yes  |
| `São Paulo-RJ`          | São Paulo - SP          | ❌ No (UF mismatch) |
| `Santos-SP`             | Santos - SP             | ✅ Yes  |
| `Santos`                | Santos - SP             | ✅ Yes (UF optional) |

## Backward Compatibility

### Legacy KML Files Still Work
If you keep the field as **Files & media** and upload KML files:
- ✅ System detects file type automatically
- ✅ Processes KML coordinates as before
- ✅ Shows areas as separate markers (not checkmarks)

### Migration Path
1. **Before**: Upload KML file with area coordinates
2. **Now**: Enter city names as text
3. **Both work**: Use whichever is easier for your workflow

## Modes

### Individual Mode
- Shows checkmarks only on cities from that specific radio's coverage (KML2)
- Only displays areas that are actually covered
- URL: `/?id=RADIO_ID`

### Proposta Mode  
- Aggregates interest cities across all radios in the proposal
- Shows which radios cover each interest area
- URL: `/?idproposta=DATABASE_ID`

## Troubleshooting

### Checkmarks Not Appearing?

#### 1. Check Field Name
Make sure the field is named one of these:
- `Areas_Interesse`
- `Areas Interesse`
- `Áreas de Interesse`
- `areas_interesse`
- (or similar variations)

#### 2. Check Field Type
Field must be **Text** type (not Files & media)

#### 3. Check Format
Text should be: `City-UF, City-UF, ...`

#### 4. Check City Names
Cities must exist in the KML2 coverage data
- Open the map normally
- Check which cities are shown in the coverage
- Use exact names (accents optional)

#### 5. Check Console Logs
Open browser console (F12) and look for:
```
📝 Áreas de interesse em formato texto: "..."
✅ X cidade(s) de interesse parseada(s)
🔍 Buscando match para: "City Name"
✅ Match encontrado: City-UF
```

### No Matches Found?

If console shows `❌ Nenhum match encontrado`:
- Verify city name spelling
- Check if city exists in KML2 data
- Try without UF code (e.g., just `São Paulo`)
- Check for extra spaces or special characters

### Still Using Files?

If you see:
```
📁 Processando arquivo(s) de áreas (modo legado)
```

The field is still a **Files** type. Change to **Text** in Notion.

## Examples

### Example 1: Simple List
```
São Paulo-SP, Rio de Janeiro-RJ, Belo Horizonte-MG
```

### Example 2: More Cities
```
São Paulo-SP, Campinas-SP, São José dos Campos-SP, Santos-SP, Sorocaba-SP
```

### Example 3: Mixed States
```
São Paulo-SP, Rio de Janeiro-RJ, Belo Horizonte-MG, Curitiba-PR, Porto Alegre-RS
```

### Example 4: Without UF (if unambiguous)
```
São Paulo, Campinas, Santos, Guarulhos, Osasco
```

## Benefits

### ✅ Simpler Workflow
- No need to create KML files
- No file upload management
- Direct text entry in Notion

### ✅ Easier Maintenance
- Edit cities directly in Notion
- Add/remove cities instantly
- No file regeneration needed

### ✅ Visual Clarity
- Checkmarks make interest areas obvious
- Integrated with existing city markers
- Clean, professional appearance

### ✅ Backward Compatible
- Existing KML-based workflows continue working
- Gradual migration possible
- No breaking changes

## Technical Details

### API Response Format

**Text-based:**
```json
{
  "areasInteresse": {
    "type": "text",
    "data": ["São Paulo-SP", "Rio de Janeiro-RJ", "Campinas-SP"]
  }
}
```

**File-based (legacy):**
```json
{
  "areasInteresse": {
    "type": "files",
    "data": [
      {
        "name": "areas.kml",
        "url": "https://...",
        "type": "application/vnd.google-earth.kml+xml"
      }
    ]
  }
}
```

### Frontend Data Structure

**Processed Area:**
```javascript
{
  name: "São Paulo",
  uf: "SP",
  fullText: "São Paulo-SP",
  normalizedName: "sao paulo",
  type: "cidade_interesse",
  priority: "alta",
  covered: true,
  matchedCity: {
    name: "São Paulo",
    uf: "SP",
    coordinates: { lat: -23.5505, lng: -46.6333 },
    quality: "excelente",
    totalPopulation: 12000000,
    coveredPopulation: 11500000
  },
  coveringRadios: [...]
}
```

## Testing

### Test Checklist
- [ ] Field type changed to Text in Notion
- [ ] City names entered in correct format
- [ ] Map loads without errors
- [ ] Checkmarks appear on matched cities
- [ ] Popup shows "Área de Interesse" badge
- [ ] Console logs show successful matching
- [ ] Works in both Individual and Proposta modes

### Test Cases

#### Test 1: Basic Text Entry
1. Enter: `São Paulo-SP, Rio de Janeiro-RJ`
2. Expected: 2 checkmarks on map (if cities in coverage)

#### Test 2: Normalized Matching
1. Enter: `SAO PAULO-SP, sao paulo-sp, São Paulo-SP`
2. Expected: 1 checkmark (all match same city)

#### Test 3: No Matches
1. Enter: `Fake City-XX`
2. Expected: No checkmarks, console shows no match

#### Test 4: Mixed Match
1. Enter: `São Paulo-SP, Fake City-XX, Rio de Janeiro-RJ`
2. Expected: 2 checkmarks (only valid cities)

#### Test 5: Legacy Files
1. Keep field as Files, upload KML
2. Expected: Separate area markers (not checkmarks)

## Support

For issues or questions:
1. Check console logs (F12)
2. Verify Notion field configuration
3. Confirm city names exist in coverage
4. Review this migration guide

---

**Version**: 2.2.0  
**Date**: 2025-01-XX  
**Author**: E-MÍDIAS Development Team
