// 1. Wczytaj plik JSON
let rawData;
fetch('am_data.json')
  .then(r => r.json())
  .then(json => {
    rawData = json;
    init();
  });

// 2. Przygotowanie struktury „serie”: { name, data: [[ts, val],…] }
function prepareSeries(obj) {
  return Object.entries(obj).map(([key, arr]) => ({
    name: key,
    data: arr.map(pt => [ new Date(pt.date).getTime(), pt.value ]),
  }));
}

// 3. Inicjalizacja UI i wykresu
let chart;
function init() {
  const seriesArr = prepareSeries(rawData);
  populateSeriesList(seriesArr);
  setupCalculator(seriesArr);

  chart = new ApexCharts(document.querySelector('#chart'), {
    chart: { type: 'line', height: 400, toolbar: { show: true } },
    series: seriesArr,
    xaxis: { type: 'datetime' },
    stroke: { curve: 'smooth' },
    legend: { position: 'top' },
    tooltip: { x: { format: 'yyyy-MM-dd' } },
  });
  chart.render();
}

// 4. Lista serii z checkboxami
function populateSeriesList(seriesArr) {
  const ul = document.getElementById('series-list');
  seriesArr.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <label class="flex items-center space-x-2">
        <input type="checkbox" checked data-idx="${i}">
        <span>${s.name}</span>
      </label>`;
    ul.append(li);
  });
  ul.addEventListener('change', e => {
    const idx = +e.target.dataset.idx;
    const s = seriesArr[idx];
    chart.updateSeries(
      seriesArr.map((ser, j) =>
        j === idx && !e.target.checked
          ? { name: ser.name, data: [] }
          : ser
      )
    );
  });
}

// 5. Kalkulator (A, B, operacja → nowa seria)
function setupCalculator(seriesArr) {
  const a = document.getElementById('calc-a');
  const b = document.getElementById('calc-b');
  seriesArr.forEach((s, i) => {
    a.innerHTML += `<option value="${i}">${s.name}</option>`;
    b.innerHTML += `<option value="${i}">${s.name}</option>`;
  });
  document.getElementById('calc-go').onclick = () => {
    const ia = +a.value, ib = +b.value, op = document.getElementById('calc-op').value;
    const A = seriesArr[ia].data, B = seriesArr[ib].data;
    const newData = A.map((pt, i) => {
      const vA = pt[1], vB = B[i][1];
      let val;
      if (op === '+') val = vA + vB;
      else if (op === '-') val = vA - vB;
      else if (op === '%') val = ((vA - vB) / vB) * 100;
      else val = vA - vB;
      return [pt[0], parseFloat(val.toFixed(2))];
    });
    const name = `${seriesArr[ia].name} ${op} ${seriesArr[ib].name}`;
    chart.appendSeries({ name, data: newData });
  };
}

// 6. Burger menu (mobilki)
document.getElementById('burger').onclick = () => {
  document.getElementById('sidebar').classList.toggle('hidden');
};
