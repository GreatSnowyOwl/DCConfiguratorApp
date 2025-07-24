# UPS Battery Configuration Fix

## Problem Fixed
The UPS configurator was showing inappropriate small battery options (SP12-18, SP12-26, SP12-38, SP12-42, SP12-50) for large UPS systems, which doesn't match technical specifications and the reference UPS_confeti.xlsx file.

## Solution Implemented

### 1. Enhanced Battery Configuration Mapping
- **UR Series (10-40kVA)**: Now use appropriate batteries from SP12-65 to SP12-250
- **UE Series (10-800kVA)**: Proper scaling from SP12-65 for small models to SP12-250 for large models  
- **UM Series (15-1200kVA)**: Large models (150kVA+) now exclusively use SP12-250 batteries

### 2. Battery Type Filtering by UPS Capacity
- **Small UPS (≤15kVA)**: SP12-65, SP12-80, SP12-100, SP12-120, SP12-150
- **Medium UPS (16-60kVA)**: SP12-100, SP12-120, SP12-150, SP12-200, SP12-250  
- **Large UPS (61-300kVA)**: SP12-150, SP12-200, SP12-250
- **Extra Large UPS (300kVA+)**: Only SP12-250 batteries

### 3. Enhanced Calculation Logic
- Improved battery quantity calculation based on UPS capacity, battery efficiency, and backup time
- Better fallback logic for unconfigured models
- Proper rack calculations (40 batteries per rack)

### 4. Comprehensive Model Coverage
Added battery configurations for **100+ UPS models** including:
- All UR Series models (UR-0100TPL to UR-0400TPL)
- All UE Series models (UE-0100TPL to UE-8000TAL)  
- All UM Series models (UM-0900TFL to UM-1500TFL and beyond)

## Technical Changes
- **File**: `src/components/UPSConfiguratorPage.tsx`
- **Lines**: 540 insertions, 157 deletions
- **New function**: `getAppropriatesBatteryTypes()` for filtering
- **Enhanced function**: `calculateBatteryQuantityForType()` with improved algorithms

## Result
- ✅ No more small batteries shown for large UPS systems
- ✅ Battery quantities correctly calculated based on UPS capacity
- ✅ Proper alignment with UPS_confeti.xlsx reference data
- ✅ Enhanced user experience with appropriate battery options

## Commit
```
Fix UPS battery configuration: prevent small batteries for large UPS systems
Branch: cursor/say-hello-22b4
Commit: 4fa0955
```

This resolves the расхождения with the reference Excel file and ensures only technically appropriate battery options are displayed for each UPS size.