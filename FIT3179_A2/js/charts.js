/* Responsive Vega and Vega-Lite mounts. Sources remain separate, readable JSON files. */
(() => {
  const charts = [
    ['chart1_growing_regions','chart1_growing_regions.vg.json'],
    ['chart2_state_production','chart2_state_production.vg.json'],
    ['chart3_state_heatmap','chart3_growth_heatmap.vg.json'],
    ['chart4_production_value','chart4_production_value.vg.json'],
    ['chart5_industry_trend','chart5_industry_trend.vg.json'],
    ['chart6_bump_chart','chart6_bump_chart.vg.json'],
    ['chart12_growth_waterfall','chart12_growth_waterfall.vg.json'],
    ['chart8_export_flow_map','chart8_export_flow_map.vg.json'],
    ['chart9_destination_heatmap','chart9_trade_balance.vg.json'],
    ['chart10_destination_treemap','chart10_destination_treemap.vg.json'],
    ['chart11_industry_profile','chart11_parallel_coordinates.vg.json']
  ];
  const views = new Map();
  window.nutCharts = views; // Useful for checking selection states during development.

  async function mount(id, file) {
    const host = document.getElementById(id);
    if (!host) return;
    let source, result, lastWidth = 0, timer, rendering = false, rerun = false;
    const panel = host.closest('.chart-visual, .chart9-visual') || host.parentElement;
    try {
      const response = await fetch('js/' + file);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`);
      source = await response.json();
      await render();
      const observer = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(render, 200);
      });
      observer.observe(panel);
      window.addEventListener('pagehide', () => {
        observer.disconnect(); clearTimeout(timer); result?.view.finalize();
      }, { once: true });
    } catch (error) { showError(error); }

    function showError(error) {
      console.error(id, error);
      host.classList.add('chart-load-error');
      host.textContent = 'This chart could not load. Please refresh the page. The source and exact values are available below.';
    }
    async function render() {
      if (rendering) { rerun = true; return; }
      const width = Math.floor(panel.clientWidth - 16);
      if (width < 100 || Math.abs(width - lastWidth) < 8) return;
      rendering = true; lastWidth = width;
      try {
        const spec = structuredClone(source);
        if (id === 'chart2_state_production') {
          const cells = spec.vconcat.flatMap(row => row.hconcat);
          const columns = width < 600 ? 2 : 4;
          const cellWidth = Math.min(230, Math.floor((width - 65) / columns));
          cells.forEach(cell => { cell.width = cellWidth; cell.height = cellWidth; });
          spec.vconcat = [];
          for (let i = 0; i < cells.length; i += columns) spec.vconcat.push({ hconcat: cells.slice(i, i + columns), spacing: 14 });
        } else if (id === 'chart3_state_heatmap') {
          spec.width = Math.max(280, width - 115); spec.height = 315;
        } else if (id === 'chart8_export_flow_map') {
          const map = spec.hconcat[0], legend = spec.hconcat[1];
          if (width < 700) {
            map.width = width - 24; map.height = Math.round(map.width * .43);
            delete spec.hconcat; spec.vconcat = [map, legend];
          } else {
            map.width = width - 185; map.height = Math.round(map.width * .43);
          }
        } else if (id === 'chart9_destination_heatmap') {
          spec.width = width;
          spec.autosize = {type:'fit-x', contains:'padding', resize:true};
        } else if (id === 'chart10_destination_treemap') {
          // Geometry is precomputed; keep its aspect ratio and label sizes stable.
          spec.width = Math.max(746, width - 12); spec.height = 380;
          // Re-map the existing treemap coordinates to the available panel width.
          const stretch = node => {
            if (!node || typeof node !== 'object') return;
            if (node.scale && JSON.stringify(node.scale.range) === '[0,746]') node.scale.range = [0, spec.width];
            Object.values(node).forEach(stretch);
          };
          stretch(spec);
        } else if (id === 'chart11_industry_profile') {
          spec.width = Math.max(500, width - 170);
          spec.height = 310;
        } else {
          if (id === 'chart1_growing_regions') spec.height = Math.round(width * .43);
          spec.width = width;
          spec.autosize = { type: 'fit-x', contains: 'padding', resize: true };
        }
        const state = result?.view.getState({
          signals: name => ['state_pick','show_almond','focus'].includes(name) || (id === 'chart8_export_flow_map' && name === 'nut_pick'),
          data: name => name.endsWith('_store')
        });
        if (result) result.view.finalize();
        if (id === 'chart2_state_production') document.getElementById('chart2-controls').replaceChildren();
        if (id === 'chart9_destination_heatmap') document.getElementById('chart9-controls').replaceChildren();
        if (id === 'chart11_industry_profile') document.getElementById('chart11-controls').replaceChildren();
        if (id === 'chart8_export_flow_map') document.getElementById('chart8-controls').replaceChildren();
        result = await vegaEmbed(host, spec, {actions:false, renderer:'svg', tooltip:{theme:'light'}});
        if (state) await result.view.setState(state).runAsync();
        views.set(id, result.view);
      } catch (error) { showError(error); }
      finally { rendering = false; if (rerun) { rerun = false; render(); } }
    }
  }
  charts.forEach(([id,file]) => mount(id,file));
})();
