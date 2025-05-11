/**
 * Skrypt do konwersji danych agregatów monetarnych
 * Konwertuje dane z formatu JSON do struktury używanej przez wykres i drzewo kategorii
 */

// Funkcja do wczytywania i przetwarzania danych
function processMonetaryData(jsonData) {
    // Przetwarzanie danych dla drzewa kategorii
    const categoryTree = buildCategoryTree(jsonData);
    
    // Analiza dat - znalezienie wszystkich dostępnych dat z danych
    const allDates = extractAllDates(jsonData);
    
    return {
        categoryTree,
        allDates
    };
}

// Budowa struktury drzewa kategorii
function buildCategoryTree(data, path = '', parent = '#') {
    const treeData = [];
    
    function processCategory(category, currentPath, parentId) {
        let id = currentPath ? currentPath + '/' + category.name : category.name;
        let node = {
            id: id,
            text: category.name,
            parent: parentId,
            type: category.series ? 'series' : 'category'
        };
        
        // Jeśli kategoria zawiera serię danych
        if (category.series) {
            node.data = {
                seriesData: category.series
            };
        }
        
        // Dodanie do drzewa
        treeData.push(node);
        
        // Rekurencyjne przetwarzanie podkategorii
        if (category.subcategories && category.subcategories.length > 0) {
            category.subcategories.forEach(subcat => {
                processCategory(subcat, id, id);
            });
        }
    }
    
    // Początek rekurencji od głównego elementu
    processCategory(data, path, parent);
    
    return treeData;
}

// Ekstrakcja wszystkich unikalnych dat z danych
function extractAllDates(data) {
    const dates = new Set();
    
    function extractDatesFromCategory(category) {
        // Jeśli kategoria ma serię danych, dodaj jej daty
        if (category.series) {
            category.series.forEach(dataPoint => {
                dates.add(dataPoint[0]);
            });
        }
        
        // Rekurencyjnie przejdź przez podkategorie
        if (category.subcategories && category.subcategories.length > 0) {
            category.subcategories.forEach(subcat => {
                extractDatesFromCategory(subcat);
            });
        }
    }
    
    extractDatesFromCategory(data);
    
    // Sortowanie dat i zwrócenie jako tablica
    return Array.from(dates).sort();
}

// Obliczanie statystyk dla serii danych
function calculateSeriesStatistics(seriesData) {
    if (!seriesData || seriesData.length === 0) {
        return {
            min: 0,
            max: 0,
            mean: 0,
            last: 0,
            yearChange: 0
        };
    }
    
    // Pobranie wartości
    const values = seriesData.map(point => point[1]);
    
    // Podstawowe statystyki
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const last = values[values.length - 1];
    
    // Obliczanie zmiany rocznej
    let yearChange = 0;
    if (values.length > 12) {
        const lastValue = values[values.length - 1];
        const yearAgoValue = values[values.length - 13]; // 12 miesięcy wstecz
        yearChange = ((lastValue - yearAgoValue) / yearAgoValue) * 100;
    }
    
    return {
        min,
        max,
        mean,
        last,
        yearChange
    };
}

// Konwersja danych do formatu procentowego
function convertToPercentChange(seriesData) {
    if (!seriesData || seriesData.length <= 1) {
        return [];
    }
    
    const percentData = [];
    
    for (let i = 1; i < seriesData.length; i++) {
        const prevValue = seriesData[i-1][1];
        const currValue = seriesData[i][1];
        
        if (prevValue !== 0) {
            const percentChange = ((currValue - prevValue) / prevValue) * 100;
            percentData.push([
                seriesData[i][0],  // Data
                percentChange      // Zmiana procentowa
            ]);
        } else {
            percentData.push([
                seriesData[i][0],  // Data
                0                  // Jeśli poprzednia wartość to 0, unikamy dzielenia przez 0
            ]);
        }
    }
    
    return percentData;
}

// Filtrowanie danych po zakresie dat
function filterDataByDateRange(seriesData, startDate, endDate) {
    if (!seriesData || seriesData.length === 0) {
        return [];
    }
    
    // Konwersja dat
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return seriesData.filter(point => {
        const pointDate = new Date(point[0]);
        return pointDate >= start && pointDate <= end;
    });
}

// Filtrowanie danych po predefiniowanym okresie
function filterDataByPeriod(seriesData, periodType) {
    if (!seriesData || seriesData.length === 0 || periodType === 'all') {
        return seriesData;
    }
    
    const now = new Date();
    let cutoffDate;
    
    switch (periodType) {
        case '1y':
            cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            break;
        case '2y':
            cutoffDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
            break;
        case '5y':
            cutoffDate = new Date(now.getFullYear() - 5, now.getMonth(), 1);
            break;
        case '10y':
            cutoffDate = new Date(now.getFullYear() - 10, now.getMonth(), 1);
            break;
        default:
            return seriesData;
    }
    
    return seriesData.filter(point => new Date(point[0]) >= cutoffDate);
}

// Znalezienie sumy serii danych
function sumSeries(seriesA, seriesB) {
    // Tworzymy mapę data -> wartość dla serii A
    const dataMapA = new Map();
    seriesA.forEach(point => {
        dataMapA.set(point[0], point[1]);
    });
    
    // Tworzymy mapę data -> wartość dla serii B
    const dataMapB = new Map();
    seriesB.forEach(point => {
        dataMapB.set(point[0], point[1]);
    });
    
    // Zbieramy wszystkie unikalne daty
    const allDates = new Set([...dataMapA.keys(), ...dataMapB.keys()]);
    const sortedDates = Array.from(allDates).sort();
    
    // Tworzymy nową serię z sumą wartości
    const summedSeries = [];
    
    sortedDates.forEach(date => {
        const valueA = dataMapA.get(date) || 0;
        const valueB = dataMapB.get(date) || 0;
        summedSeries.push([date, valueA + valueB]);
    });
    
    return summedSeries;
}

// Eksport funkcji do użycia w głównym skrypcie strony
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        processMonetaryData,
        buildCategoryTree,
        extractAllDates,
        calculateSeriesStatistics,
        convertToPercentChange,
        filterDataByDateRange,
        filterDataByPeriod,
        sumSeries
    };
}
