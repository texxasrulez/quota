/* === RC Canvas Compat: willReadFrequently patch (id:rc-canvas-compat@1) === */
(function(){
  try {
    var _origGetContext = HTMLCanvasElement.prototype.getContext;
    if (!_origGetContext.__rc_patched__) {
      HTMLCanvasElement.prototype.getContext = function(type, attrs) {
        try {
          if (type === '2d') {
            attrs = attrs || {};
            if (attrs.willReadFrequently !== true) {
              attrs = Object.assign({ willReadFrequently: true }, attrs);
            }
          }
          var ctx = _origGetContext.call(this, type, attrs);
          return ctx;
        } catch (e) {
          // Fallback for older browsers that reject the second argument
          return _origGetContext.call(this, type);
        }
      };
      HTMLCanvasElement.prototype.getContext.__rc_patched__ = true;
    }
  } catch (e) {
    // If environment prevents patching, fail silently.
  }
})(); 
/* === end rc-canvas-compat === */

function drawDiskQuota() {

    var decimalPoint = '.';

    var isCommaAsDecimalPoint = function(str) {
        var matches = str.match(/,/g);

        return matches ? matches.length === 1 : false;
    };

    var getInnerNumberStringById = function(eleId) {
        var text = document.getElementById(eleId).innerHTML;

        // some country use comma as the decimal point
        if (isCommaAsDecimalPoint(text)) {
            decimalPoint = ',';
            text = text.replace(',', '.');
        } else {
            text = text.replace(/,/g, '');
        }

        return text;
    };

    var quotaUsedPercents = getInnerNumberStringById('quotaUsedPercents');
    var quotaFreePercents = getInnerNumberStringById('quotaFreePercents');
    var labelUsedSpace = getInnerNumberStringById('labelUsedSpace');
    var labelFreeSpace = getInnerNumberStringById('labelFreeSpace');

    var chart = new CanvasJS.Chart('chartContainer', {
        animationEnabled: true,
        title: {
            text: plugin_quota_chartTitle
        },
        data: [{
            type: 'pie',
            startAngle: 275,
            yValueFormatString: decimalPoint === '.' ? '##0.00"%"' : '##0,00"%"',
            indexLabel: '{label} {y}',
            dataPoints: [
                {y: quotaUsedPercents, label: labelUsedSpace, color: 'rgb(3,71,91)'},
                {y: quotaFreePercents, label: labelFreeSpace, color: 'rgb(199,227,239)'}
            ]
        }]
    });

    chart.render();

}



/* === RC Canvas Theme helper (id:rc-canvas-theme@1) [v2] === */
(function(){
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_) {
      return fallback;
    }
  }

  var THEME = {
    used: cssVar('--quota-used-color', '#e74c3c'),
    free: cssVar('--quota-free-color', '#2ecc71'),
    grid: cssVar('--quota-grid-color', '#cccccc'),
    background: cssVar('--quota-bg-color', 'transparent'),
    text: cssVar('--quota-text-color', '#333333')
  };

  // 'override' ensures we overwrite colors even if options already set them.
  // You can switch at runtime: RC_CANVAS_THEME.setMode('respect'|'override')
  var MODE = 'override';

  function looksLike(name, token) {
    if (!name) return false;
    name = String(name).toLowerCase();
    token = String(token).toLowerCase();
    return name.indexOf(token) !== -1;
  }

  function setColor(obj, key, val) {
    if (MODE === 'override') {
      obj[key] = val;
    } else if (obj[key] == null) {
      obj[key] = val;
    }
  }

  function paintTwo(a, b, aIsUsedHint, bIsUsedHint) {
    // If we have hints from names, prefer them
    if (aIsUsedHint === true || bIsUsedHint === false) {
      setColor(a, 'color', THEME.used);
      setColor(b, 'color', THEME.free);
    } else if (bIsUsedHint === true || aIsUsedHint === false) {
      setColor(a, 'color', THEME.free);
      setColor(b, 'color', THEME.used);
    } else {
      // Default order: first=used, second=free
      setColor(a, 'color', THEME.used);
      setColor(b, 'color', THEME.free);
    }
  }

  function applyTheme(options) {
    if (!options) options = {};
    // Background & text defaults
    if (options.backgroundColor == null || MODE === 'override') options.backgroundColor = THEME.background;
    if (options.axisX) {
      if (MODE === 'override' || options.axisX.labelFontColor == null) options.axisX.labelFontColor = THEME.text;
      if (MODE === 'override' || options.axisX.lineColor == null) options.axisX.lineColor = THEME.grid;
      if (MODE === 'override' || options.axisX.tickColor == null) options.axisX.tickColor = THEME.grid;
    }
    if (options.axisY) {
      if (MODE === 'override' || options.axisY.labelFontColor == null) options.axisY.labelFontColor = THEME.text;
      if (MODE === 'override' || options.axisY.lineColor == null) options.axisY.lineColor = THEME.grid;
      if (MODE === 'override' || options.axisY.tickColor == null) options.axisY.tickColor = THEME.grid;
    }

    if (Array.isArray(options.data)) {
      var data = options.data;

      // Case A: Two separate series (e.g., two columns/areas, or two pies but usually one series for pies)
      if (data.length === 2) {
        var a = data[0], b = data[1];
        var aIsUsed = looksLike(a.name, 'used') || looksLike(a.legendText, 'used');
        var bIsUsed = looksLike(b.name, 'used') || looksLike(b.legendText, 'used');
        paintTwo(a, b, aIsUsed, bIsUsed);

      } else if (data.length === 1 && data[0] && Array.isArray(data[0].dataPoints)) {
        // Case B: Single series with two datapoints (typical doughnut/pie for quota)
        var s = data[0];
        var pts = s.dataPoints;
        if (pts.length === 2) {
          var p0 = pts[0], p1 = pts[1];
          var p0IsUsed = looksLike(p0.name, 'used') || looksLike(p0.label, 'used');
          var p1IsUsed = looksLike(p1.name, 'used') || looksLike(p1.label, 'used');
          paintTwo(p0, p1, p0IsUsed, p1IsUsed);
        } else {
          // Map by name hints for any count
          pts.forEach(function(pt){
            if (looksLike(pt.name, 'used') || looksLike(pt.label, 'used')) {
              setColor(pt, 'color', THEME.used);
            } else if (looksLike(pt.name, 'free') || looksLike(pt.label, 'free')) {
              setColor(pt, 'color', THEME.free);
            }
          });
        }
        // Also color the series if charts use series color
        if (typeof s.color !== 'undefined' || MODE === 'override') {
          // If majority of points look like 'used', color series used, else free
          var usedCount = s.dataPoints.filter(function(pt){
            return looksLike(pt.name, 'used') || looksLike(pt.label, 'used');
          }).length;
          var freeCount = s.dataPoints.filter(function(pt){
            return looksLike(pt.name, 'free') || looksLike(pt.label, 'free');
          }).length;
          setColor(s, 'color', usedCount >= freeCount ? THEME.used : THEME.free);
        }

      } else {
        // Case C: N series — color by name hints if present
        data.forEach(function(series){
          if (looksLike(series.name, 'used') || looksLike(series.legendText, 'used')) {
            setColor(series, 'color', THEME.used);
          } else if (looksLike(series.name, 'free') || looksLike(series.legendText, 'free')) {
            setColor(series, 'color', THEME.free);
          }
          if (Array.isArray(series.dataPoints)) {
            series.dataPoints.forEach(function(pt){
              if (looksLike(pt.name, 'used') || looksLike(pt.label, 'used')) {
                setColor(pt, 'color', THEME.used);
              } else if (looksLike(pt.name, 'free') || looksLike(pt.label, 'free')) {
                setColor(pt, 'color', THEME.free);
              }
            });
          }
        });
      }
    }
    return options;
  }

  // Expose for diagnostics / manual use
  window.RC_CANVAS_THEME = {
    get: function(){ return THEME; },
    apply: applyTheme,
    setMode: function(mode){
      if (mode === 'respect' || mode === 'override') MODE = mode;
    }
  };

  // Wrap CanvasJS.Chart to auto-apply theme if CanvasJS is present
  function wrapWhenReady(){
    try {
      if (window.CanvasJS && window.CanvasJS.Chart && !window.CanvasJS.Chart.__rc_wrapped__) {
        var _Ctor = window.CanvasJS.Chart;
        window.CanvasJS.Chart = function(container, options){
          options = applyTheme(options || {});
          var chart = new _Ctor(container, options);
          return chart;
        };
        window.CanvasJS.Chart.prototype = _Ctor.prototype;
        window.CanvasJS.Chart.__rc_wrapped__ = true;
      }
    } catch (_) {}
  }

  // Try now and also on DOMContentLoaded
  wrapWhenReady();
  document.addEventListener('DOMContentLoaded', wrapWhenReady);
})();
/* === end rc-canvas-theme === */
(function(){
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_) {
      return fallback;
    }
  }

  var THEME = {
    used: cssVar('--quota-used-color', '#e74c3c'),
    free: cssVar('--quota-free-color', '#2ecc71'),
    grid: cssVar('--quota-grid-color', '#cccccc'),
    background: cssVar('--quota-bg-color', 'transparent'),
    text: cssVar('--quota-text-color', '#333333')
  };

  function looksLike(name, token) {
    if (!name) return false;
    name = String(name).toLowerCase();
    token = String(token).toLowerCase();
    return name.indexOf(token) !== -1;
  }

  function applyTheme(options) {
    if (!options) options = {};
    // Background & text defaults
    if (options.backgroundColor == null) options.backgroundColor = THEME.background;
    if (options.axisX) {
      options.axisX.labelFontColor = options.axisX.labelFontColor || THEME.text;
      options.axisX.lineColor = options.axisX.lineColor || THEME.grid;
      options.axisX.tickColor = options.axisX.tickColor || THEME.grid;
    }
    if (options.axisY) {
      options.axisY.labelFontColor = options.axisY.labelFontColor || THEME.text;
      options.axisY.lineColor = options.axisY.lineColor || THEME.grid;
      options.axisY.tickColor = options.axisY.tickColor || THEME.grid;
    }

    if (Array.isArray(options.data)) {
      var data = options.data;
      // If two series, assume [used, free] unless names hint otherwise
      if (data.length === 2) {
        var a = data[0], b = data[1];
        var aIsUsed = looksLike(a.name, 'used') || looksLike(a.legendText, 'used');
        var aIsFree = looksLike(a.name, 'free') || looksLike(a.legendText, 'free');
        var bIsUsed = looksLike(b.name, 'used') || looksLike(b.legendText, 'used');
        var bIsFree = looksLike(b.name, 'free') || looksLike(b.legendText, 'free');
        if (aIsUsed || bIsFree || (!aIsFree && !bIsUsed)) {
          a.color = a.color || THEME.used;
          b.color = b.color || THEME.free;
        } else {
          a.color = a.color || THEME.free;
          b.color = b.color || THEME.used;
        }
      } else {
        // Map by name hints for any count
        data.forEach(function(series) {
          if (looksLike(series.name, 'used') || looksLike(series.legendText, 'used')) {
            series.color = series.color || THEME.used;
          } else if (looksLike(series.name, 'free') || looksLike(series.legendText, 'free')) {
            series.color = series.color || THEME.free;
          }
        });
      }
    }
    return options;
  }

  // Expose for diagnostics / manual use
  window.RC_CANVAS_THEME = {
    get: function(){ return THEME; },
    apply: applyTheme
  };

  // Wrap CanvasJS.Chart to auto-apply theme if CanvasJS is present
  function wrapWhenReady(){
    try {
      if (window.CanvasJS && window.CanvasJS.Chart && !window.CanvasJS.Chart.__rc_wrapped__) {
        var _Ctor = window.CanvasJS.Chart;
        window.CanvasJS.Chart = function(container, options){
          options = applyTheme(options || {});
          var chart = new _Ctor(container, options);
          return chart;
        };
        window.CanvasJS.Chart.prototype = _Ctor.prototype;
        window.CanvasJS.Chart.__rc_wrapped__ = true;
      }
    } catch (_) {}
  }

  // Try now and also on DOMContentLoaded
  wrapWhenReady();
  document.addEventListener('DOMContentLoaded', wrapWhenReady);
})();
/* === end rc-canvas-theme === */
