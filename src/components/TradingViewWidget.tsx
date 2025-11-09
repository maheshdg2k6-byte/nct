import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  trades: Array<{
    id: string;
    entry_price: number;
    exit_price?: number;
    side: 'Long' | 'Short';
    created_at: string;
    pnl?: number;
  }>;
  className?: string;
}

export const TradingViewWidget = memo(({ symbol, trades, className = '' }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const chartReadyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerId = containerRef.current.id;

    // Clean up previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.log('Widget cleanup error:', e);
      }
      widgetRef.current = null;
      chartReadyRef.current = false;
    }

    // Map symbols to TradingView format with various exchanges
    let tvSymbol = symbol.replace('/', '');
    let exchange = 'OANDA';
    
    // Determine exchange based on symbol type
    if (tvSymbol.includes('USD') || tvSymbol.includes('EUR') || tvSymbol.includes('GBP') || 
        tvSymbol.includes('JPY') || tvSymbol.includes('AUD') || tvSymbol.includes('CAD') || 
        tvSymbol.includes('CHF') || tvSymbol.includes('NZD')) {
      exchange = 'OANDA'; // Forex pairs
    } else if (tvSymbol.includes('BTC') || tvSymbol.includes('ETH') || tvSymbol.includes('USDT')) {
      exchange = 'BINANCE'; // Crypto
    } else if (tvSymbol === 'XAUUSD' || tvSymbol === 'XAGUSD') {
      exchange = 'OANDA'; // Metals
    } else {
      exchange = 'NASDAQ'; // Stocks by default
    }

    // Check if TradingView script is already loaded
    if (typeof (window as any).TradingView !== 'undefined') {
      initWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    }

    function initWidget() {
      if (!containerRef.current || widgetRef.current) return;

      try {
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: `${exchange}:${tvSymbol}`,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          studies: [],
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: [
            'study_templates',
            'create_volume_indicator_by_default',
            'header_saveload',
            'header_settings',
            'header_indicators',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
            'header_fullscreen_button',
            'timeframes_toolbar',
            'control_bar',
            'timezone_menu',
            'display_market_status',
            'header_chart_type',
            'header_resolutions',
            'header_interval_dialog_button',
            'show_interval_dialog_on_key_press',
          ],
          save_load_adapter: {
            charts: [] as any[],
            studyTemplates: [] as any[],
            
            getAllCharts: function() {
              return Promise.resolve(this.charts);
            },
            
            removeChart: function(id: string) {
              const index = this.charts.findIndex((c: any) => c.id === id);
              if (index !== -1) {
                this.charts.splice(index, 1);
              }
              return Promise.resolve();
            },
            
            saveChart: function(chartData: any) {
              if (!chartData.id) {
                chartData.id = `chart_${Date.now()}`;
              }
              const index = this.charts.findIndex((c: any) => c.id === chartData.id);
              if (index !== -1) {
                this.charts[index] = chartData;
              } else {
                this.charts.push(chartData);
              }
              return Promise.resolve(chartData.id);
            },
            
            getChartContent: function(id: string) {
              const chart = this.charts.find((c: any) => c.id === id);
              return Promise.resolve(chart ? chart.content : null);
            },
            
            getAllStudyTemplates: function() {
              return Promise.resolve(this.studyTemplates);
            },
            
            removeStudyTemplate: function(studyTemplateInfo: any) {
              const index = this.studyTemplates.findIndex((t: any) => t.name === studyTemplateInfo.name);
              if (index !== -1) {
                this.studyTemplates.splice(index, 1);
              }
              return Promise.resolve();
            },
            
            saveStudyTemplate: function(studyTemplateData: any) {
              const index = this.studyTemplates.findIndex((t: any) => t.name === studyTemplateData.name);
              if (index !== -1) {
                this.studyTemplates[index] = studyTemplateData;
              } else {
                this.studyTemplates.push(studyTemplateData);
              }
              return Promise.resolve();
            },
            
            getStudyTemplateContent: function(studyTemplateInfo: any) {
              const template = this.studyTemplates.find((t: any) => t.name === studyTemplateInfo.name);
              return Promise.resolve(template ? template.content : null);
            }
          }
        });

        // Add trade markers after chart loads
        widgetRef.current.onChartReady(() => {
          if (chartReadyRef.current) return;
          chartReadyRef.current = true;
          
          const chart = widgetRef.current.activeChart();
          
          trades.forEach((trade) => {
            try {
              const entryDate = new Date(trade.created_at).getTime() / 1000;
              
              // Add entry marker with price
              const entryText = `${trade.side} Entry\n$${Number(trade.entry_price).toFixed(5)}`;
              chart.createShape(
                { time: entryDate, price: trade.entry_price },
                {
                  shape: trade.side === 'Long' ? 'arrow_up' : 'arrow_down',
                  text: entryText,
                  lock: true,
                  disableSelection: false,
                  disableSave: false,
                  disableUndo: false,
                  overrides: {
                    fontsize: 12,
                    color: trade.side === 'Long' ? '#22c55e' : '#ef4444',
                    textcolor: '#ffffff',
                    transparency: 0,
                  }
                }
              );

              // Add exit marker if exists
              if (trade.exit_price) {
                const exitDate = entryDate + 86400; // Add 1 day for visibility
                const exitText = `Exit\n$${Number(trade.exit_price).toFixed(5)}\nP&L: ${trade.pnl ? (trade.pnl > 0 ? '+' : '') + Number(trade.pnl).toFixed(2) : '0.00'}`;
                
                chart.createShape(
                  { time: exitDate, price: trade.exit_price },
                  {
                    shape: 'icon',
                    text: exitText,
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                      fontsize: 12,
                      color: trade.pnl && trade.pnl > 0 ? '#22c55e' : '#ef4444',
                      textcolor: '#ffffff',
                      icon: 0x1f3c1, // Flag emoji
                      transparency: 0,
                    }
                  }
                );

                // Draw a line connecting entry to exit
                chart.createMultipointShape(
                  [
                    { time: entryDate, price: trade.entry_price },
                    { time: exitDate, price: trade.exit_price }
                  ],
                  {
                    shape: 'trend_line',
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    overrides: {
                      linecolor: trade.pnl && trade.pnl > 0 ? '#22c55e' : '#ef4444',
                      linewidth: 2,
                      linestyle: 0,
                      transparency: 20,
                    }
                  }
                );
              }
            } catch (e) {
              console.log('Error creating trade marker:', e);
            }
          });
        });
      } catch (e) {
        console.error('Error initializing TradingView widget:', e);
      }
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
        widgetRef.current = null;
        chartReadyRef.current = false;
      }
    };
  }, [symbol, trades]);

  const containerId = `tradingview_${symbol.replace('/', '_')}_${Date.now()}`;

  return (
    <div className={`${className} w-full`}>
      <div 
        id={containerId}
        ref={containerRef}
        className="w-full h-full min-h-[600px]"
      />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
