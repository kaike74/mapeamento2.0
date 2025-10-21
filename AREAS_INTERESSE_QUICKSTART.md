# 🎯 Areas de Interesse - Quick Start Guide

## What Changed?

### BEFORE (Old Way)
1. Create KML file with coordinates
2. Upload to Notion Files field
3. Areas shown as separate markers

### NOW (New Way) ✨
1. Type city names in Notion Text field
2. Cities get automatic checkmarks ✅
3. Integrated with existing city markers

## Setup in 3 Steps

### Step 1: Change Field Type in Notion
```
Field Name: Areas_Interesse (or similar)
Old Type: Files & media ❌
New Type: Text ✅
```

### Step 2: Enter City Names
```
Format: City-UF, City-UF, City-UF

Example:
Rio de Janeiro-RJ, São Paulo-SP, Mogi das Cruzes-SP, Campinas-SP, Santos-SP
```

### Step 3: View Map
Open your map URL and see checkmarks on matched cities!

## Visual Example

### Before
```
Map shows:
⭕ São Paulo (normal marker)
⭕ Rio de Janeiro (normal marker)
⭕ Campinas (normal marker)
```

### After (with text: "São Paulo-SP, Campinas-SP")
```
Map shows:
⭕✅ São Paulo (marker + checkmark)
⭕ Rio de Janeiro (normal - not in list)
⭕✅ Campinas (marker + checkmark)
```

### Popup Before
```
┌──────────────────────────┐
│ São Paulo - SP           │
│ 📻 Rádio ABC (107.3 FM)  │
│ População: 12,000,000    │
│ Qualidade: Excelente     │
└──────────────────────────┘
```

### Popup After
```
┌──────────────────────────┐
│ São Paulo - SP           │
│ ✅ Área de Interesse     │ ← NEW!
│ 📻 Rádio ABC (107.3 FM)  │
│ População: 12,000,000    │
│ Qualidade: Excelente     │
└──────────────────────────┘
```

## Matching Examples

All these match "São Paulo-SP":
- ✅ `São Paulo-SP`
- ✅ `Sao Paulo-SP` (no accent)
- ✅ `SÃO PAULO-SP` (uppercase)
- ✅ `são paulo-sp` (lowercase)
- ✅ `  São Paulo - SP  ` (extra spaces)

These DON'T match:
- ❌ `São Paulo-RJ` (wrong state)
- ❌ `San Paulo-SP` (typo)

## Format Rules

### Correct ✅
```
São Paulo-SP, Rio de Janeiro-RJ, Campinas-SP
Sao Paulo-SP, Rio de Janeiro-RJ
SAO PAULO-SP, CAMPINAS-SP
São Paulo-SP,Rio de Janeiro-RJ,Campinas-SP
```

### Wrong ❌
```
São Paulo; Rio de Janeiro (semicolon instead of comma)
São Paulo SP (missing dash)
São Paulo-São Paulo (city twice)
SP-São Paulo (wrong order)
```

## Troubleshooting

### ❓ No checkmarks appearing?

**Check 1: Field Type**
- Open Notion
- Click on field settings
- Must say "Text" (not "Files & media")

**Check 2: Format**
- Must have: `City-UF, City-UF`
- Common mistake: `City SP` (missing dash)

**Check 3: City Names**
- Cities must exist in KML2 coverage
- Check what cities appear on normal map
- Use exact names (accents optional)

**Check 4: Console Logs**
- Press F12 in browser
- Look for: `✅ X cidade(s) de interesse parseada(s)`
- Look for: `✅ Match encontrado: City-UF`

### ❓ Only some cities have checkmarks?

This is NORMAL! ✅
- Only cities that are in your KML2 coverage get checkmarks
- Cities not in coverage are ignored
- Check console to see which cities matched

### ❓ Still seeing old file upload behavior?

The field is still type "Files":
1. Go to Notion database
2. Click field name dropdown
3. Click "Edit property"
4. Change type to "Text"
5. Re-enter city names

## Examples by Use Case

### Example 1: Radio Station
**Goal**: Mark major cities in coverage area

**Input**:
```
São Paulo-SP, Guarulhos-SP, Osasco-SP, Santo André-SP, São Bernardo do Campo-SP
```

**Result**: 5 checkmarks on major cities in Greater São Paulo

### Example 2: Proposal
**Goal**: Highlight client's priority markets

**Input**:
```
Rio de Janeiro-RJ, São Paulo-SP, Belo Horizonte-MG, Curitiba-PR, Porto Alegre-RS
```

**Result**: Checkmarks on capital cities across proposal

### Example 3: Regional
**Goal**: Focus on interior cities

**Input**:
```
Campinas-SP, Sorocaba-SP, São José dos Campos-SP, Ribeirão Preto-SP, Santos-SP
```

**Result**: Interior cities highlighted

## Pro Tips

### Tip 1: Copy from Spreadsheet
1. Have cities in Excel/Sheets?
2. Copy column of cities
3. Use find/replace to add commas
4. Paste into Notion

### Tip 2: Start Small
1. Test with 2-3 cities first
2. Verify checkmarks appear
3. Then add all cities

### Tip 3: Use State Codes
- Always include `-UF` for accuracy
- Prevents matching wrong city with same name
- Example: `Santos-SP` vs `Santos-BA`

### Tip 4: Check Coverage First
1. Open map without areas first
2. Note which cities are shown
3. Use those exact names in text

### Tip 5: Console is Your Friend
- Press F12 to open console
- Look for match confirmations
- Helps debug why cities don't match

## Backward Compatibility

### Still Have KML Files?
**No problem!** Old way still works:
1. Keep field as "Files & media"
2. Upload KML file
3. Areas shown as before

### Migrating from KML to Text?
1. Open old KML file
2. List the city names
3. Enter as text: `City1-UF, City2-UF, ...`
4. Delete KML file (optional)

## FAQ

**Q: Can I mix text and files?**  
A: No, field must be either Text OR Files, not both.

**Q: What if city name has comma?**  
A: Rare case. Use KML file instead.

**Q: Case sensitive?**  
A: No! `SÃO PAULO-SP` = `são paulo-sp`

**Q: Accents required?**  
A: No! `São Paulo-SP` = `Sao Paulo-SP`

**Q: UF required?**  
A: Recommended for accuracy, but optional if name is unique.

**Q: How many cities max?**  
A: No hard limit. Tested with 50+ cities successfully.

**Q: Works on mobile?**  
A: Yes! Checkmarks appear on mobile too.

**Q: Can I update while viewing?**  
A: Change in Notion, then refresh map page.

## Support

Need help?
1. Check console logs (F12)
2. Review `AREAS_INTERESSE_MIGRATION.md` for details
3. Verify Notion field configuration
4. Test with just 1-2 cities first

---

**Version**: 2.2.0  
**Status**: ✅ Ready to Use  
**Tested**: Individual & Proposta modes  
**Compatible**: All browsers
