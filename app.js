/**
 * Altın & Döviz Portföyüm - Core Application Logic
 */

// Supported Assets Definition
const ASSET_REGISTRY = {
  // Altın Grubu
  'GA': { id: 'GA', name: 'Gram Altın (24K)', short: 'Gram Altın', category: 'gold', unit: 'gr', defaultPrice: 6635 },
  '22': { id: '22', name: '22 Ayar Altın / Bilezik', short: '22 Ayar', category: 'gold', unit: 'gr', defaultPrice: 6240 },
  'C': { id: 'C', name: 'Çeyrek Altın', short: 'Çeyrek Altın', category: 'gold', unit: 'adet', defaultPrice: 10920 },
  'Y': { id: 'Y', name: 'Yarım Altın', short: 'Yarım Altın', category: 'gold', unit: 'adet', defaultPrice: 21875 },
  'T': { id: 'T', name: 'Tam Altın', short: 'Tam Altın', category: 'gold', unit: 'adet', defaultPrice: 43550 },
  'ATA': { id: 'ATA', name: 'Ata / Cumhuriyet Altını', short: 'Ata Altın', category: 'gold', unit: 'adet', defaultPrice: 44610 },
  'RA': { id: 'RA', name: 'Reşat Altın', short: 'Reşat Altın', category: 'gold', unit: 'adet', defaultPrice: 44810 },
  'GAG': { id: 'GAG', name: 'Gram Gümüş', short: 'Gümüş (gr)', category: 'silver', unit: 'gr', defaultPrice: 84.7 },
  'XAUUSD': { id: 'XAUUSD', name: 'Ons Altın (USD)', short: 'Ons ($)', category: 'gold', unit: 'oz', defaultPrice: 4125 },

  // Döviz Grubu
  'USD': { id: 'USD', name: 'Amerikan Doları', short: 'Dolar ($)', category: 'forex', unit: 'USD', defaultPrice: 50.05 },
  'EUR': { id: 'EUR', name: 'Euro (€)', short: 'Euro (€)', category: 'forex', unit: 'EUR', defaultPrice: 56.50 },
  'GBP': { id: 'GBP', name: 'İngiliz Sterlini (£)', short: 'Sterlin (£)', category: 'forex', unit: 'GBP', defaultPrice: 67.80 },
  'CHF': { id: 'CHF', name: 'İsviçre Frangı', short: 'Frank (CHF)', category: 'forex', unit: 'CHF', defaultPrice: 61.70 },
  'CAD': { id: 'CAD', name: 'Kanada Doları', short: 'CAD', category: 'forex', unit: 'CAD', defaultPrice: 36.00 },
  'AUD': { id: 'AUD', name: 'Avustralya Doları', short: 'AUD', category: 'forex', unit: 'AUD', defaultPrice: 35.20 },
  'SAR': { id: 'SAR', name: 'Suudi Riyali', short: 'Riyal (SAR)', category: 'forex', unit: 'SAR', defaultPrice: 13.39 },
  'AED': { id: 'AED', name: 'BAE Dirhemi', short: 'Dirhem (AED)', category: 'forex', unit: 'AED', defaultPrice: 13.68 },
  'JPY': { id: 'JPY', name: 'Japon Yeni (100)', short: 'JPY', category: 'forex', unit: 'JPY', defaultPrice: 31.80 }
};

// Application State
const state = {
  transactions: [],
  liveRates: {},
  customRates: {},
  activeTab: 'portfolio',
  marketFilter: 'all',
  portfolioFilter: 'all',
  historyFilter: 'all',
  privacyMode: false,
  lastUpdated: null,
  isFetchingRates: false
};

// Security & Authentication State
const authState = {
  isUnlocked: false,
  isServerMode: false,
  pinSet: false,
  enteredPin: '',
  tempPin: '',
  mode: 'VERIFY', // 'SETUP_1', 'SETUP_2', 'VERIFY'
  verifiedPin: ''
};

// SHA-256 Hash helper for browser / Vercel static mode
const hashPinBrowser = async (pin) => {
  try {
    const msgBuffer = new TextEncoder().encode(pin.toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return btoa(pin + '_salt_portfoy');
  }
};

// Storage Keys
const STORAGE_TX_KEY = 'portfoy_transactions_v2';
const STORAGE_RATES_KEY = 'portfoy_rates_v2';
const STORAGE_CUSTOM_RATES_KEY = 'portfoy_custom_rates_v2';
const STORAGE_SETTINGS_KEY = 'portfoy_settings_v2';

// Formatters
const formatCurrency = (val, symbol = '₺') => {
  if (state.privacyMode) return '••••••';
  if (val === null || val === undefined || isNaN(val)) return '0,00 ' + symbol;
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' ' + symbol;
};

const formatNumber = (val, maxDecimals = 4) => {
  if (state.privacyMode) return '••••';
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: maxDecimals }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

// Toast message helper
const showToast = (message, icon = 'fa-check') => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
};

// Load saved data from localStorage
const loadState = () => {
  try {
    const rawTx = localStorage.getItem(STORAGE_TX_KEY);
    if (rawTx) state.transactions = JSON.parse(rawTx);

    const rawRates = localStorage.getItem(STORAGE_RATES_KEY);
    if (rawRates) state.liveRates = JSON.parse(rawRates);

    const rawCustom = localStorage.getItem(STORAGE_CUSTOM_RATES_KEY);
    if (rawCustom) state.customRates = JSON.parse(rawCustom);

    const rawSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      state.privacyMode = !!s.privacyMode;
    }
  } catch (e) {
    console.error('Data load error:', e);
  }
};

// Save state to localStorage
const saveState = () => {
  try {
    localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(state.transactions));
    localStorage.setItem(STORAGE_CUSTOM_RATES_KEY, JSON.stringify(state.customRates));
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify({ privacyMode: state.privacyMode }));
  } catch (e) {
    console.error('Data save error:', e);
  }
};

// Fetch live gold and foreign exchange rates
const fetchLiveRates = async () => {
  if (state.isFetchingRates) return;
  state.isFetchingRates = true;

  const refreshBtn = document.getElementById('btnRefresh');
  if (refreshBtn) refreshBtn.classList.add('spinning');

  try {
    // 1. Fetch Gold Rates
    const goldPromise = fetch('https://api.genelpara.com/json/?list=altin', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);

    // 2. Fetch Forex Rates
    const dovizPromise = fetch('https://api.genelpara.com/json/?list=doviz&sembol=all', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);

    const [goldRes, dovizRes] = await Promise.all([goldPromise, dovizPromise]);

    const newRates = { ...state.liveRates };

    if (goldRes && goldRes.data) {
      Object.entries(goldRes.data).forEach(([code, item]) => {
        newRates[code] = {
          alis: parseFloat(item.alis) || 0,
          satis: parseFloat(item.satis) || 0,
          degisim: parseFloat(item.degisim) || 0,
          oran: item.oran || '0.00',
          yon: item.yon || 'moneyNat'
        };
      });
    }

    if (dovizRes && dovizRes.data) {
      Object.entries(dovizRes.data).forEach(([code, item]) => {
        newRates[code] = {
          alis: parseFloat(item.alis) || 0,
          satis: parseFloat(item.satis) || 0,
          degisim: parseFloat(item.degisim) || 0,
          oran: item.oran || '0.00',
          yon: item.yon || 'moneyNat'
        };
      });
    }

    // Ensure all defined assets have at least a fallback rate
    Object.keys(ASSET_REGISTRY).forEach(id => {
      if (!newRates[id] || !newRates[id].satis) {
        const fallback = ASSET_REGISTRY[id].defaultPrice;
        newRates[id] = {
          alis: fallback * 0.985,
          satis: fallback,
          degisim: 0,
          oran: '0.00',
          yon: 'moneyNat'
        };
      }
    });

    state.liveRates = newRates;
    state.lastUpdated = new Date();
    localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(newRates));

    updateStatusBadge();
    renderAll();
    showToast('Kurlar başarıyla güncellendi', 'fa-arrows-rotate');
  } catch (err) {
    console.error('Rate update error:', err);
    showToast('Canlı kurlar alınamadı, kayıtlı fiyatlar kullanılıyor', 'fa-triangle-exclamation');
  } finally {
    state.isFetchingRates = false;
    if (refreshBtn) refreshBtn.classList.remove('spinning');
  }
};

// Get current price of an asset (checking custom override first, then live rate)
const getAssetRate = (assetId) => {
  if (state.customRates[assetId]) {
    return {
      alis: state.customRates[assetId],
      satis: state.customRates[assetId],
      degisim: 0,
      isCustom: true
    };
  }
  if (state.liveRates[assetId]) {
    return state.liveRates[assetId];
  }
  const fallback = ASSET_REGISTRY[assetId]?.defaultPrice || 0;
  return {
    alis: fallback * 0.985,
    satis: fallback,
    degisim: 0
  };
};

/**
 * PORTFOLIO CALCULATION ENGINE
 * Calculates holdings, weighted average cost, realized and unrealized profit/loss.
 */
const calculatePortfolio = () => {
  // Sort transactions chronologically
  const sortedTx = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Asset holdings map
  const assetMap = {};
  let totalRealizedProfit = 0;

  // Initialize all known assets
  Object.keys(ASSET_REGISTRY).forEach(id => {
    assetMap[id] = {
      assetId: id,
      holdings: 0,
      totalCost: 0,
      avgCost: 0,
      realizedProfit: 0,
      txCount: 0
    };
  });

  // Replay transactions to calculate accurate weighted average cost & realized P/L
  sortedTx.forEach(tx => {
    const item = assetMap[tx.assetId];
    if (!item) return;

    item.txCount++;

    if (tx.type === 'BUY') {
      const newHoldings = item.holdings + tx.amount;
      const newCost = item.totalCost + tx.totalPrice;
      item.avgCost = newHoldings > 0 ? newCost / newHoldings : 0;
      item.holdings = newHoldings;
      item.totalCost = newCost;
      tx.realizedProfit = null; // No realized profit on purchase
    } else if (tx.type === 'SELL') {
      const soldCost = tx.amount * item.avgCost;
      const profit = tx.totalPrice - soldCost;

      item.realizedProfit += profit;
      totalRealizedProfit += profit;
      tx.realizedProfit = profit; // Store profit for this specific sale

      const remainingHoldings = Math.max(0, item.holdings - tx.amount);
      if (remainingHoldings <= 0.00001) {
        item.holdings = 0;
        item.totalCost = 0;
        item.avgCost = 0;
      } else {
        item.holdings = remainingHoldings;
        item.totalCost = remainingHoldings * item.avgCost;
      }
    }
  });

  // Calculate market value & unrealized P/L for open holdings
  let totalPortfolioValue = 0;
  let totalPortfolioCost = 0;
  let activeHoldingsList = [];

  Object.values(assetMap).forEach(item => {
    if (item.holdings > 0.00001) {
      const rate = getAssetRate(item.assetId);
      // For portfolio valuation, use current sell price (satis) or alis
      // In Turkish gold/currency market, your holdings can be cashed out at 'alis' (buying rate of bank/jeweler)
      const liquidationPrice = rate.alis || rate.satis || item.avgCost;

      const currentValue = item.holdings * liquidationPrice;
      const cost = item.totalCost;
      const unrealizedProfit = currentValue - cost;
      const profitPercent = cost > 0 ? (unrealizedProfit / cost) * 100 : 0;

      totalPortfolioValue += currentValue;
      totalPortfolioCost += cost;

      activeHoldingsList.push({
        ...item,
        currentPrice: liquidationPrice,
        satisPrice: rate.satis,
        alisPrice: rate.alis,
        degisim: rate.degisim,
        currentValue,
        unrealizedProfit,
        profitPercent
      });
    }
  });

  // Sort active holdings by current value descending
  activeHoldingsList.sort((a, b) => b.currentValue - a.currentValue);

  const totalUnrealizedProfit = totalPortfolioValue - totalPortfolioCost;
  const totalReturnPercent = totalPortfolioCost > 0 ? (totalUnrealizedProfit / totalPortfolioCost) * 100 : 0;
  const netTotalProfit = totalUnrealizedProfit + totalRealizedProfit;

  return {
    holdings: activeHoldingsList,
    totalPortfolioValue,
    totalPortfolioCost,
    totalUnrealizedProfit,
    totalReturnPercent,
    totalRealizedProfit,
    netTotalProfit,
    assetMap
  };
};

// Render Functions
const updateStatusBadge = () => {
  const badge = document.getElementById('liveStatus');
  if (!badge) return;
  if (state.lastUpdated) {
    const timeStr = state.lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    badge.innerHTML = `<span class="live-dot"></span> <span>Canlı Piyasa (${timeStr})</span>`;
  } else {
    badge.innerHTML = `<span class="live-dot"></span> <span>Canlı Piyasa</span>`;
  }
};

const renderHero = (portfolioData) => {
  const heroBalance = document.getElementById('heroBalance');
  const heroProfitBadge = document.getElementById('heroProfitBadge');
  const statCost = document.getElementById('statCost');
  const statUnrealized = document.getElementById('statUnrealized');
  const statRealized = document.getElementById('statRealized');

  if (!heroBalance) return;

  heroBalance.innerHTML = `<span class="currency-sym">₺</span> ${state.privacyMode ? '••••••' : formatNumber(portfolioData.totalPortfolioValue, 2)}`;

  const isPositive = portfolioData.totalUnrealizedProfit >= 0;
  const profitSign = isPositive ? '+' : '';
  const badgeClass = portfolioData.totalPortfolioCost === 0 ? 'neutral' : (isPositive ? 'positive' : 'negative');
  const iconClass = isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

  if (portfolioData.totalPortfolioCost === 0) {
    heroProfitBadge.className = 'profit-badge neutral';
    heroProfitBadge.innerHTML = `<i class="fa-solid fa-minus"></i> <span>0,00 ₺ (% 0,0)</span>`;
  } else {
    heroProfitBadge.className = `profit-badge ${badgeClass}`;
    heroProfitBadge.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${profitSign}${formatCurrency(portfolioData.totalUnrealizedProfit)} (% ${profitSign}${portfolioData.totalReturnPercent.toFixed(2)})</span>`;
  }

  if (statCost) statCost.textContent = formatCurrency(portfolioData.totalPortfolioCost);

  if (statUnrealized) {
    statUnrealized.textContent = `${profitSign}${formatCurrency(portfolioData.totalUnrealizedProfit)}`;
    statUnrealized.className = `stat-val ${portfolioData.totalUnrealizedProfit >= 0 ? 'gain' : 'loss'}`;
  }

  if (statRealized) {
    const rPositive = portfolioData.totalRealizedProfit >= 0;
    const rSign = rPositive ? '+' : '';
    statRealized.textContent = `${rSign}${formatCurrency(portfolioData.totalRealizedProfit)}`;
    statRealized.className = `stat-val ${rPositive ? 'gain' : 'loss'}`;
  }
};

const renderPortfolioTab = (portfolioData) => {
  const container = document.getElementById('portfolioList');
  const emptyState = document.getElementById('portfolioEmpty');
  const countBadge = document.getElementById('portfolioCount');

  if (!container) return;

  let filtered = portfolioData.holdings;
  if (state.portfolioFilter === 'gold') {
    filtered = filtered.filter(h => ASSET_REGISTRY[h.assetId]?.category === 'gold' || ASSET_REGISTRY[h.assetId]?.category === 'silver');
  } else if (state.portfolioFilter === 'forex') {
    filtered = filtered.filter(h => ASSET_REGISTRY[h.assetId]?.category === 'forex');
  }

  if (countBadge) countBadge.textContent = `${filtered.length} Varlık`;

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = filtered.map(item => {
    const asset = ASSET_REGISTRY[item.assetId] || { name: item.assetId, unit: 'adet', category: 'gold' };
    const isGold = asset.category === 'gold';
    const isSilver = asset.category === 'silver';
    const avatarClass = isGold ? 'avatar-gold' : (isSilver ? 'avatar-silver' : 'avatar-curr');
    const avatarIcon = isGold ? 'fa-coins' : (isSilver ? 'fa-gem' : 'fa-money-bill-wave');

    const isPositive = item.unrealizedProfit >= 0;
    const profitColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
    const profitSign = isPositive ? '+' : '';

    return `
      <div class="asset-card">
        <div class="asset-header-row">
          <div class="asset-identity">
            <div class="asset-avatar ${avatarClass}">
              <i class="fa-solid ${avatarIcon}"></i>
            </div>
            <div class="asset-names">
              <h3>${asset.name}</h3>
              <p>${formatNumber(item.holdings, 4)} ${asset.unit}</p>
            </div>
          </div>
          <div class="asset-value-block">
            <div class="asset-total-val">${formatCurrency(item.currentValue)}</div>
            <div class="asset-profit-pill" style="color: ${profitColor};">
              ${profitSign}${formatCurrency(item.unrealizedProfit)} (% ${profitSign}${item.profitPercent.toFixed(2)})
            </div>
          </div>
        </div>

        <div class="asset-details-grid">
          <div class="detail-col">
            <span class="detail-label">Ort. Maliyet</span>
            <span class="detail-val">${formatCurrency(item.avgCost)}</span>
          </div>
          <div class="detail-col">
            <span class="detail-label">Güncel Kur</span>
            <span class="detail-val">${formatCurrency(item.currentPrice)}</span>
          </div>
          <div class="detail-col">
            <span class="detail-label">Yatırılan</span>
            <span class="detail-val">${formatCurrency(item.totalCost)}</span>
          </div>
        </div>

        <div class="asset-actions">
          <button class="btn-card-action quick-buy" onclick="openBuyModal('${item.assetId}')">
            <i class="fa-solid fa-plus"></i> Alış Yap
          </button>
          <button class="btn-card-action quick-sell" onclick="openSellModal('${item.assetId}')">
            <i class="fa-solid fa-minus"></i> Satış Yap
          </button>
        </div>
      </div>
    `;
  }).join('');
};

const renderMarketsTab = () => {
  const container = document.getElementById('marketList');
  if (!container) return;

  const searchQuery = (document.getElementById('marketSearch')?.value || '').toLowerCase().trim();

  let assetKeys = Object.keys(ASSET_REGISTRY);

  if (state.marketFilter === 'gold') {
    assetKeys = assetKeys.filter(id => ASSET_REGISTRY[id].category === 'gold' || ASSET_REGISTRY[id].category === 'silver');
  } else if (state.marketFilter === 'forex') {
    assetKeys = assetKeys.filter(id => ASSET_REGISTRY[id].category === 'forex');
  }

  if (searchQuery) {
    assetKeys = assetKeys.filter(id => {
      const meta = ASSET_REGISTRY[id];
      return meta.name.toLowerCase().includes(searchQuery) ||
             meta.short.toLowerCase().includes(searchQuery) ||
             id.toLowerCase().includes(searchQuery);
    });
  }

  container.innerHTML = assetKeys.map(id => {
    const asset = ASSET_REGISTRY[id];
    const rate = getAssetRate(id);
    const isGold = asset.category === 'gold';
    const isSilver = asset.category === 'silver';
    const avatarClass = isGold ? 'avatar-gold' : (isSilver ? 'avatar-silver' : 'avatar-curr');
    const avatarIcon = isGold ? 'fa-coins' : (isSilver ? 'fa-gem' : 'fa-money-bill-wave');

    const degisim = rate.degisim || 0;
    const isUp = degisim >= 0;
    const changeClass = isUp ? 'profit-badge positive' : 'profit-badge negative';
    const changeSign = isUp ? '+' : '';

    return `
      <div class="market-item" onclick="openBuyModal('${id}')">
        <div class="market-info">
          <div class="asset-avatar ${avatarClass}" style="width:36px; height:36px; font-size:15px;">
            <i class="fa-solid ${avatarIcon}"></i>
          </div>
          <div>
            <h4 style="font-size:14px; color:#fff; font-weight:700;">${asset.name}</h4>
            <span style="font-size:11px; color:var(--text-dim);">${id} • ${asset.unit}</span>
          </div>
        </div>

        <div class="market-prices">
          <div class="price-box">
            <span class="price-type">Alış</span>
            <span class="price-num">${formatNumber(rate.alis, 2)} ₺</span>
          </div>
          <div class="price-box">
            <span class="price-type">Satış</span>
            <span class="price-num">${formatNumber(rate.satis, 2)} ₺</span>
          </div>
          <div class="${changeClass}" style="font-size:11px; padding: 3px 8px;">
            ${changeSign}${degisim.toFixed(2)}%
          </div>
        </div>
      </div>
    `;
  }).join('');
};

const renderHistoryTab = () => {
  const container = document.getElementById('historyList');
  const emptyState = document.getElementById('historyEmpty');
  if (!container) return;

  let list = [...state.transactions];

  if (state.historyFilter === 'BUY') {
    list = list.filter(t => t.type === 'BUY');
  } else if (state.historyFilter === 'SELL') {
    list = list.filter(t => t.type === 'SELL');
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);

  if (list.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // We re-compute realized profit for each sell transaction
  const { assetMap } = calculatePortfolio();

  container.innerHTML = list.map(tx => {
    const asset = ASSET_REGISTRY[tx.assetId] || { name: tx.assetId, unit: 'adet' };
    const isBuy = tx.type === 'BUY';
    const badgeClass = isBuy ? 'tx-badge tx-buy' : 'tx-badge tx-sell';
    const badgeIcon = isBuy ? 'fa-arrow-down' : 'fa-arrow-up';
    const typeLabel = isBuy ? 'Alış' : 'Satış';

    let profitHtml = '';
    if (!isBuy && tx.realizedProfit !== undefined && tx.realizedProfit !== null) {
      const isProfitable = tx.realizedProfit >= 0;
      const pColor = isProfitable ? 'var(--accent-green)' : 'var(--accent-red)';
      const pSign = isProfitable ? '+' : '';
      profitHtml = `<span class="tx-profit-tag" style="color: ${pColor};">Kâr: ${pSign}${formatCurrency(tx.realizedProfit)}</span>`;
    }

    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="${badgeClass}">
            <i class="fa-solid ${badgeIcon}"></i>
          </div>
          <div class="tx-details">
            <h4>${asset.name} <span style="font-size:11px; font-weight:normal; color:var(--text-dim);">(${typeLabel})</span></h4>
            <div class="tx-sub">${formatDate(tx.date)} • ${formatNumber(tx.amount, 4)} ${asset.unit} @ ${formatCurrency(tx.pricePerUnit)}</div>
            ${tx.note ? `<div class="tx-note"><i class="fa-solid fa-tag"></i> ${tx.note}</div>` : ''}
          </div>
        </div>

        <div class="tx-right">
          <div class="tx-amount">${formatCurrency(tx.totalPrice)}</div>
          ${profitHtml}
          <div class="tx-actions">
            <button class="btn-tx-del" onclick="deleteTransaction('${tx.id}')" title="İşlemi Sil">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

const renderAnalyticsTab = (portfolioData) => {
  const canvas = document.getElementById('portfolioChart');
  const summaryBox = document.getElementById('analyticsSummary');
  if (!canvas || !summaryBox) return;

  const holdings = portfolioData.holdings;
  if (holdings.length === 0) {
    summaryBox.innerHTML = `<p style="text-align:center; color:var(--text-dim); padding:20px;">Portföyünüzde henüz açık varlık bulunmuyor.</p>`;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Draw smooth HTML5 Canvas Donut Chart
  const ctx = canvas.getContext('2d');
  const size = 240;
  canvas.width = size * window.devicePixelRatio;
  canvas.height = size * window.devicePixelRatio;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const colors = [
    '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
    '#06b6d4', '#eab308', '#f97316', '#64748b'
  ];

  const total = portfolioData.totalPortfolioValue;
  let startAngle = -Math.PI / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 100;
  const innerRadius = 65;

  ctx.clearRect(0, 0, size, size);

  holdings.forEach((item, index) => {
    const sliceAngle = (item.currentValue / total) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center Text in donut
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Toplam Değer', centerX, centerY - 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(state.privacyMode ? '••••' : `₺${formatNumber(total, 0)}`, centerX, centerY + 14);

  // Render breakdown table
  summaryBox.innerHTML = `
    <h4 style="font-size:14px; color:#fff; font-weight:700; margin-bottom:12px;">Varlık Dağılımı</h4>
    ${holdings.map((item, index) => {
      const asset = ASSET_REGISTRY[item.assetId] || { name: item.assetId };
      const pct = total > 0 ? ((item.currentValue / total) * 100).toFixed(1) : 0;
      const color = colors[index % colors.length];
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:12px; height:12px; border-radius:3px; background:${color}; display:inline-block;"></span>
            <span style="font-size:13px; color:#fff; font-weight:600;">${asset.name}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-size:13px; color:#fff; font-weight:700;">${formatCurrency(item.currentValue)}</span>
            <span style="font-size:11px; color:var(--text-dim); margin-left:6px;">(% ${pct})</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
};

const renderAll = () => {
  const portfolioData = calculatePortfolio();
  renderHero(portfolioData);
  renderPortfolioTab(portfolioData);
  renderMarketsTab();
  renderHistoryTab();
  renderAnalyticsTab(portfolioData);
};

// Modals Handling
const openBuyModal = (assetId = 'GA') => {
  const modal = document.getElementById('buyModal');
  const select = document.getElementById('buyAssetSelect');
  const dateInput = document.getElementById('buyDate');
  const priceInput = document.getElementById('buyPrice');
  const amountInput = document.getElementById('buyAmount');
  const totalInput = document.getElementById('buyTotal');
  const noteInput = document.getElementById('buyNote');

  // Fill asset options
  select.innerHTML = Object.keys(ASSET_REGISTRY).map(id => {
    return `<option value="${id}">${ASSET_REGISTRY[id].name}</option>`;
  }).join('');

  select.value = assetId;

  // Default date to today (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  // Prefill price from live rates (satis = buying from market)
  const rate = getAssetRate(assetId);
  priceInput.value = rate.satis || ASSET_REGISTRY[assetId].defaultPrice;
  amountInput.value = '';
  totalInput.value = '';
  if (noteInput) noteInput.value = '';

  updateBuyUnitLabel();

  modal.classList.add('open');
};

const updateBuyUnitLabel = () => {
  const select = document.getElementById('buyAssetSelect');
  const unitLabel = document.getElementById('buyUnitLabel');
  const asset = ASSET_REGISTRY[select.value];
  if (unitLabel && asset) {
    unitLabel.textContent = `Miktar (${asset.unit})`;
  }
};

const closeBuyModal = () => {
  document.getElementById('buyModal')?.classList.remove('open');
};

const openSellModal = (assetId = null) => {
  const modal = document.getElementById('sellModal');
  const select = document.getElementById('sellAssetSelect');
  const dateInput = document.getElementById('sellDate');
  const priceInput = document.getElementById('sellPrice');
  const amountInput = document.getElementById('sellAmount');
  const totalInput = document.getElementById('sellTotal');
  const hint = document.getElementById('sellBalanceHint');
  const noteInput = document.getElementById('sellNote');

  const { assetMap } = calculatePortfolio();

  // Filter only assets that user actually owns
  const ownedAssets = Object.values(assetMap).filter(item => item.holdings > 0.00001);

  if (ownedAssets.length === 0) {
    showToast('Satış yapabilmek için önce portföyünüze alım eklemelisiniz', 'fa-circle-exclamation');
    return;
  }

  select.innerHTML = ownedAssets.map(item => {
    const meta = ASSET_REGISTRY[item.assetId];
    return `<option value="${item.assetId}">${meta.name} (Elinizde: ${formatNumber(item.holdings, 4)} ${meta.unit})</option>`;
  }).join('');

  if (assetId && ownedAssets.some(o => o.assetId === assetId)) {
    select.value = assetId;
  } else {
    select.value = ownedAssets[0].assetId;
  }

  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  const currentAssetId = select.value;
  const rate = getAssetRate(currentAssetId);
  // When selling, you cash out at 'alis' (buying rate of jeweler/bank)
  priceInput.value = rate.alis || rate.satis || ASSET_REGISTRY[currentAssetId].defaultPrice;

  amountInput.value = '';
  totalInput.value = '';
  if (noteInput) noteInput.value = '';

  updateSellHint();

  modal.classList.add('open');
};

const updateSellHint = () => {
  const select = document.getElementById('sellAssetSelect');
  const hint = document.getElementById('sellBalanceHint');
  const unitLabel = document.getElementById('sellUnitLabel');
  const { assetMap } = calculatePortfolio();

  const assetId = select.value;
  const holding = assetMap[assetId]?.holdings || 0;
  const meta = ASSET_REGISTRY[assetId];

  if (hint && meta) {
    hint.innerHTML = `Mevcut Bakiye: <strong style="color:var(--accent-gold);">${formatNumber(holding, 4)} ${meta.unit}</strong> <button type="button" onclick="setSellMaxAmount(${holding})" style="background:none; border:none; color:var(--accent-blue); cursor:pointer; text-decoration:underline; font-size:11px; margin-left:6px;">Tümünü Seç</button>`;
  }
  if (unitLabel && meta) {
    unitLabel.textContent = `Satılacak Miktar (${meta.unit})`;
  }
};

const setSellMaxAmount = (val) => {
  const amountInput = document.getElementById('sellAmount');
  if (amountInput) {
    amountInput.value = val;
    onSellAmountChange();
  }
};

const closeSellModal = () => {
  document.getElementById('sellModal')?.classList.remove('open');
};

// Dynamic Input Calculation Handlers
const onBuyAmountChange = () => {
  const amount = parseFloat(document.getElementById('buyAmount').value) || 0;
  const price = parseFloat(document.getElementById('buyPrice').value) || 0;
  document.getElementById('buyTotal').value = amount && price ? (amount * price).toFixed(2) : '';
};

const onBuyTotalChange = () => {
  const total = parseFloat(document.getElementById('buyTotal').value) || 0;
  const price = parseFloat(document.getElementById('buyPrice').value) || 0;
  if (total && price) {
    document.getElementById('buyAmount').value = (total / price).toFixed(4);
  }
};

const onSellAmountChange = () => {
  const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
  const price = parseFloat(document.getElementById('sellPrice').value) || 0;
  document.getElementById('sellTotal').value = amount && price ? (amount * price).toFixed(2) : '';
  updateSellProfitPreview();
};

const onSellTotalChange = () => {
  const total = parseFloat(document.getElementById('sellTotal').value) || 0;
  const price = parseFloat(document.getElementById('sellPrice').value) || 0;
  if (total && price) {
    document.getElementById('sellAmount').value = (total / price).toFixed(4);
    updateSellProfitPreview();
  }
};

const updateSellProfitPreview = () => {
  const preview = document.getElementById('sellProfitPreview');
  if (!preview) return;

  const select = document.getElementById('sellAssetSelect');
  const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
  const price = parseFloat(document.getElementById('sellPrice').value) || 0;

  if (!amount || !price) {
    preview.style.display = 'none';
    return;
  }

  const { assetMap } = calculatePortfolio();
  const item = assetMap[select.value];
  if (!item || item.holdings === 0) {
    preview.style.display = 'none';
    return;
  }

  const cost = amount * item.avgCost;
  const totalSale = amount * price;
  const profit = totalSale - cost;
  const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
  const isGain = profit >= 0;
  const sign = isGain ? '+' : '';

  preview.style.display = 'block';
  preview.className = isGain ? 'profit-badge positive' : 'profit-badge negative';
  preview.style.width = '100%';
  preview.style.justifyContent = 'center';
  preview.style.padding = '8px';
  preview.innerHTML = `Tahmini Kâr/Zarar: <strong>${sign}${formatCurrency(profit)} (% ${sign}${profitPct.toFixed(2)})</strong> (Ort. Maliyet: ${formatCurrency(item.avgCost)})`;
};

// Form Submissions
const handleBuySubmit = (e) => {
  e.preventDefault();
  const assetId = document.getElementById('buyAssetSelect').value;
  const date = document.getElementById('buyDate').value;
  const amount = parseFloat(document.getElementById('buyAmount').value);
  const pricePerUnit = parseFloat(document.getElementById('buyPrice').value);
  const totalPrice = parseFloat(document.getElementById('buyTotal').value) || (amount * pricePerUnit);
  const note = document.getElementById('buyNote')?.value.trim() || '';

  if (!assetId || !date || isNaN(amount) || amount <= 0 || isNaN(pricePerUnit) || pricePerUnit <= 0) {
    showToast('Lütfen miktar ve fiyat bilgilerini eksiksiz girin', 'fa-circle-exclamation');
    return;
  }

  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type: 'BUY',
    assetId,
    date,
    amount,
    pricePerUnit,
    totalPrice,
    note,
    createdAt: Date.now()
  };

  state.transactions.push(newTx);
  saveState();
  syncWithServer();
  closeBuyModal();
  renderAll();
  showToast('Alış işlemi başarıyla kaydedildi!', 'fa-circle-check');
};

const handleSellSubmit = (e) => {
  e.preventDefault();
  const assetId = document.getElementById('sellAssetSelect').value;
  const date = document.getElementById('sellDate').value;
  const amount = parseFloat(document.getElementById('sellAmount').value);
  const pricePerUnit = parseFloat(document.getElementById('sellPrice').value);
  const totalPrice = parseFloat(document.getElementById('sellTotal').value) || (amount * pricePerUnit);
  const note = document.getElementById('sellNote')?.value.trim() || '';

  const { assetMap } = calculatePortfolio();
  const currentHoldings = assetMap[assetId]?.holdings || 0;

  if (!assetId || !date || isNaN(amount) || amount <= 0 || isNaN(pricePerUnit) || pricePerUnit <= 0) {
    showToast('Lütfen miktar ve fiyat bilgilerini eksiksiz girin', 'fa-circle-exclamation');
    return;
  }

  if (amount > currentHoldings + 0.00001) {
    showToast(`Maksimum satabileceğiniz miktar: ${formatNumber(currentHoldings, 4)}`, 'fa-circle-exclamation');
    return;
  }

  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type: 'SELL',
    assetId,
    date,
    amount,
    pricePerUnit,
    totalPrice,
    note,
    createdAt: Date.now()
  };

  state.transactions.push(newTx);
  saveState();
  syncWithServer();
  closeSellModal();
  renderAll();
  showToast('Satış işlemi kaydedildi ve kâr/zarar hesabınıza yansıtıldı!', 'fa-circle-check');
};

const deleteTransaction = (id) => {
  if (confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    syncWithServer();
    renderAll();
    showToast('İşlem silindi', 'fa-trash');
  }
};

// Navigation Tab Switching
const setTab = (tabName) => {
  state.activeTab = tabName;

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  const targetNav = document.getElementById(`nav-${tabName}`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Backup & Restore
const exportDataJSON = () => {
  const data = {
    version: 2,
    exportDate: new Date().toISOString(),
    transactions: state.transactions,
    customRates: state.customRates
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfoy_yedek_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Yedek dosyası indirildi', 'fa-download');
};

const importDataJSON = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.transactions)) {
        state.transactions = data.transactions;
        if (data.customRates) state.customRates = data.customRates;
        saveState();
        renderAll();
        showToast('Yedek başarıyla yüklendi!', 'fa-circle-check');
      } else {
        showToast('Geçersiz yedek dosyası biçimi', 'fa-triangle-exclamation');
      }
    } catch (err) {
      showToast('Dosya okunurken hata oluştu', 'fa-triangle-exclamation');
    }
  };
  reader.readAsText(file);
};

const exportDataCSV = () => {
  if (state.transactions.length === 0) {
    showToast('Dışa aktarılacak işlem bulunamadı', 'fa-info-circle');
    return;
  }

  let csv = 'Islem_ID;Tip;Varlik;Tarih;Miktar;Birim_Fiyat;Toplam_Tutar;Not\n';
  state.transactions.forEach(t => {
    const meta = ASSET_REGISTRY[t.assetId] || { name: t.assetId };
    csv += `"${t.id}";"${t.type}";"${meta.name}";"${t.date}";"${t.amount}";"${t.pricePerUnit}";"${t.totalPrice}";"${t.note || ''}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfoy_islemler_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Excel/CSV dosyası indirildi', 'fa-file-excel');
};

const loadDemoData = () => {
  if (state.transactions.length > 0 && !confirm('Mevcut işlemleriniz silinecek ve örnek işlemler yüklenecek. Onaylıyor musunuz?')) {
    return;
  }

  // 3 sample realistic transactions
  state.transactions = [
    {
      id: 'demo_1',
      type: 'BUY',
      assetId: 'GA',
      date: '2026-09-10',
      amount: 15.0,
      pricePerUnit: 5850.00,
      totalPrice: 87750.00,
      note: 'Kuyumcu Alımı (Eylül)',
      createdAt: Date.now() - 50000000
    },
    {
      id: 'demo_2',
      type: 'BUY',
      assetId: 'USD',
      date: '2026-09-20',
      amount: 1200,
      pricePerUnit: 44.50,
      totalPrice: 53400.00,
      note: 'Döviz Bürosu',
      createdAt: Date.now() - 40000000
    },
    {
      id: 'demo_3',
      type: 'BUY',
      assetId: 'C',
      date: '2026-10-05',
      amount: 4,
      pricePerUnit: 9600.00,
      totalPrice: 38400.00,
      note: 'Yatırımlık Çeyrek',
      createdAt: Date.now() - 30000000
    },
    {
      id: 'demo_4',
      type: 'SELL',
      assetId: 'GA',
      date: '2026-10-28',
      amount: 5.0,
      pricePerUnit: 6450.00,
      totalPrice: 32250.00,
      note: 'Nakit İhtiyacı Satışı',
      createdAt: Date.now() - 10000000
    }
  ];

  saveState();
  syncWithServer();
  renderAll();
  setTab('portfolio');
  showToast('Örnek yatırım verileri yüklendi!', 'fa-wand-magic-sparkles');
};

const resetAllData = () => {
  if (confirm('DİKKAT: Tüm yatırım ve işlem kayıtlarınız kalıcı olarak silinecek. Emin misiniz?')) {
    state.transactions = [];
    state.customRates = {};
    saveState();
    syncWithServer();
    renderAll();
    showToast('Tüm veriler sıfırlandı', 'fa-trash');
  }
};

const togglePrivacy = () => {
  state.privacyMode = !state.privacyMode;
  saveState();
  renderAll();
  const eyeIcon = document.getElementById('privacyIcon');
  if (eyeIcon) {
    eyeIcon.className = state.privacyMode ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  }
};

// ==========================================
// SECURITY & PIN AUTHENTICATION ENGINE
// ==========================================

const initAuth = async () => {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      authState.isServerMode = true;
      authState.pinSet = !!data.pinSet;
      if (!authState.pinSet) {
        authState.mode = 'SETUP_1';
        setPinScreenText('Yeni PIN Belirleyin', 'Portföyünüzü korumak için 4 haneli bir Güvenlik PIN kodu tuşlayın');
      } else {
        authState.mode = 'VERIFY';
        setPinScreenText('Portföyüm', 'Lütfen 4 haneli Güvenlik PIN kodunuzu girin');
      }
      return;
    }
  } catch (err) {
    // server unreachable
  }

  // Pure Web / Vercel mode
  authState.isServerMode = false;
  fallbackLocalAuth();
};

const fallbackLocalAuth = () => {
  const localPin = localStorage.getItem('local_pin_hash');
  if (!localPin) {
    authState.mode = 'SETUP_1';
    setPinScreenText('Yeni PIN Belirleyin', 'Portföyünüzü korumak için 4 haneli bir Güvenlik PIN kodu tuşlayın');
  } else {
    authState.mode = 'VERIFY';
    setPinScreenText('Portföyüm', 'Lütfen 4 haneli Güvenlik PIN kodunuzu girin');
  }
};

const setPinScreenText = (title, subtitle) => {
  const t = document.getElementById('pinTitle');
  const s = document.getElementById('pinSubtitle');
  if (t) t.textContent = title;
  if (s) s.textContent = subtitle;
  hidePinError();
};

const pressPinDigit = (digit) => {
  if (authState.enteredPin.length >= 4) return;
  authState.enteredPin += digit.toString();
  updatePinDots();
  hidePinError();

  if (authState.enteredPin.length === 4) {
    setTimeout(handlePinComplete, 140);
  }
};

const deletePinDigit = () => {
  if (authState.enteredPin.length > 0) {
    authState.enteredPin = authState.enteredPin.slice(0, -1);
    updatePinDots();
    hidePinError();
  }
};

const clearPin = () => {
  authState.enteredPin = '';
  updatePinDots();
  hidePinError();
};

const updatePinDots = () => {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (dot) {
      if (i < authState.enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    }
  }
};

const showPinError = (msg) => {
  const errEl = document.getElementById('pinError');
  const dotsContainer = document.getElementById('pinDots');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add('show');
  }
  if (dotsContainer) {
    dotsContainer.classList.add('shake');
    for (let i = 0; i < 4; i++) {
      document.getElementById(`dot-${i}`)?.classList.add('error');
    }
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => {
      dotsContainer.classList.remove('shake');
      for (let i = 0; i < 4; i++) {
        document.getElementById(`dot-${i}`)?.classList.remove('error');
      }
      clearPin();
    }, 600);
  }
};

const hidePinError = () => {
  document.getElementById('pinError')?.classList.remove('show');
};

const handlePinComplete = async () => {
  const pin = authState.enteredPin;

  // Step 1: Initial PIN entry during first-time setup
  if (authState.mode === 'SETUP_1') {
    authState.tempPin = pin;
    authState.enteredPin = '';
    authState.mode = 'SETUP_2';
    updatePinDots();
    setPinScreenText('PIN\'i Doğrulayın', 'Belirlediğiniz 4 haneli PIN kodunu tekrar girin');
    return;
  }

  // Step 2: Confirming PIN during first-time setup
  if (authState.mode === 'SETUP_2') {
    if (pin !== authState.tempPin) {
      showPinError('PIN kodları eşleşmedi! Lütfen baştan girin.');
      authState.mode = 'SETUP_1';
      authState.tempPin = '';
      setTimeout(() => {
        setPinScreenText('Yeni PIN Belirleyin', 'Portföyünüzü korumak için 4 haneli bir Güvenlik PIN kodu tuşlayın');
      }, 700);
      return;
    }

    if (authState.isServerMode) {
      try {
        const res = await fetch('/api/setup-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            authState.verifiedPin = pin;
            unlockApp();
            showToast('Güvenlik PIN kodunuz başarıyla oluşturuldu!', 'fa-shield-halved');
            syncWithServer();
            return;
          }
        }
      } catch (e) {
        // fallback to browser
      }
    }

    // Web / Vercel browser storage
    const hashed = await hashPinBrowser(pin);
    localStorage.setItem('local_pin_hash', hashed);
    authState.verifiedPin = pin;
    unlockApp();
    showToast('Güvenlik PIN kodunuz başarıyla oluşturuldu!', 'fa-shield-halved');
    return;
  }

  // Verification: Standard unlock
  if (authState.mode === 'VERIFY') {
    if (authState.isServerMode) {
      try {
        const res = await fetch('/api/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            authState.verifiedPin = pin;
            if (result.data) {
              if (Array.isArray(result.data.transactions) && result.data.transactions.length > 0) {
                state.transactions = result.data.transactions;
                saveState();
              } else if (state.transactions.length > 0) {
                syncWithServer();
              }
              if (result.data.customRates) {
                state.customRates = result.data.customRates;
              }
            }
            unlockApp();
            renderAll();
            showToast('Giriş başarılı!', 'fa-lock-open');
            return;
          } else {
            showPinError(result.message || 'Hatalı PIN kodu, tekrar deneyin');
            return;
          }
        }
      } catch (err) {
        // fallback
      }
    }

    // Web / Vercel verification
    const storedHash = localStorage.getItem('local_pin_hash');
    const inputHash = await hashPinBrowser(pin);
    if (storedHash && storedHash === inputHash) {
      authState.verifiedPin = pin;
      unlockApp();
      renderAll();
      showToast('Giriş başarılı!', 'fa-lock-open');
    } else {
      showPinError('Hatalı PIN kodu, tekrar deneyin');
    }
  }
};

const unlockApp = () => {
  authState.isUnlocked = true;
  document.getElementById('pinScreen')?.classList.add('hidden');
  clearPin();
};

const lockApp = () => {
  authState.isUnlocked = false;
  clearPin();
  authState.mode = 'VERIFY';
  setPinScreenText('Portföyüm', 'Lütfen 4 haneli Güvenlik PIN kodunuzu girin');
  document.getElementById('pinScreen')?.classList.remove('hidden');
};

const syncWithServer = async () => {
  if (!authState.verifiedPin || !authState.isServerMode) return;
  try {
    await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: authState.verifiedPin,
        transactions: state.transactions,
        customRates: state.customRates
      })
    });
  } catch (err) {
    console.warn('Server sync error:', err);
  }
};

// Change PIN Modal Handlers
const openChangePinModal = () => {
  document.getElementById('oldPinInput').value = '';
  document.getElementById('newPinInput').value = '';
  document.getElementById('confirmNewPinInput').value = '';
  document.getElementById('changePinModal')?.classList.add('open');
};

const closeChangePinModal = () => {
  document.getElementById('changePinModal')?.classList.remove('open');
};

const handleChangePinSubmit = async (e) => {
  e.preventDefault();
  const oldPin = document.getElementById('oldPinInput').value.trim();
  const newPin = document.getElementById('newPinInput').value.trim();
  const confirmPin = document.getElementById('confirmNewPinInput').value.trim();

  if (newPin.length < 4) {
    showToast('Yeni PIN 4 haneli olmalıdır', 'fa-circle-exclamation');
    return;
  }

  if (newPin !== confirmPin) {
    showToast('Yeni PIN kodları eşleşmiyor!', 'fa-circle-exclamation');
    return;
  }

  if (authState.isServerMode) {
    try {
      const res = await fetch('/api/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          authState.verifiedPin = newPin;
          closeChangePinModal();
          showToast('PIN kodunuz başarıyla değiştirildi!', 'fa-circle-check');
          return;
        } else {
          showToast(data.message || 'Mevcut PIN hatalı', 'fa-circle-exclamation');
          return;
        }
      }
    } catch (err) {
      // fallback
    }
  }

  // Web / Vercel mode PIN change
  const currentHash = localStorage.getItem('local_pin_hash');
  const oldHash = await hashPinBrowser(oldPin);
  if (currentHash && currentHash !== oldHash) {
    showToast('Mevcut PIN hatalı!', 'fa-circle-exclamation');
    return;
  }
  const newHash = await hashPinBrowser(newPin);
  localStorage.setItem('local_pin_hash', newHash);
  authState.verifiedPin = newPin;
  closeChangePinModal();
  showToast('PIN kodunuz başarıyla değiştirildi!', 'fa-circle-check');
};
      showToast(data.message || 'Mevcut PIN hatalı', 'fa-circle-exclamation');
    }
  } catch (err) {
    showToast('Sunucu ile iletişim kurulamadı', 'fa-circle-exclamation');
  }
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initAuth();

  // Physical Keyboard Listener for PIN
  window.addEventListener('keydown', (e) => {
    if (!authState.isUnlocked && document.getElementById('pinScreen') && !document.getElementById('pinScreen').classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') {
        pressPinDigit(e.key);
      } else if (e.key === 'Backspace') {
        deletePinDigit();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        clearPin();
      }
    }
  });

  // Auto-lock when phone screen turns off or app is minimized
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && authState.isUnlocked) {
      lockApp();
    }
  });

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
  }

  // Setup form listeners
  document.getElementById('buyForm')?.addEventListener('submit', handleBuySubmit);
  document.getElementById('sellForm')?.addEventListener('submit', handleSellSubmit);

  // Asset change listeners to auto-fill price
  document.getElementById('buyAssetSelect')?.addEventListener('change', (e) => {
    const rate = getAssetRate(e.target.value);
    document.getElementById('buyPrice').value = rate.satis || ASSET_REGISTRY[e.target.value].defaultPrice;
    updateBuyUnitLabel();
    onBuyAmountChange();
  });

  document.getElementById('sellAssetSelect')?.addEventListener('change', (e) => {
    const rate = getAssetRate(e.target.value);
    document.getElementById('sellPrice').value = rate.alis || rate.satis || ASSET_REGISTRY[e.target.value].defaultPrice;
    updateSellHint();
    onSellAmountChange();
  });

  // Calculate totals on typing
  document.getElementById('buyAmount')?.addEventListener('input', onBuyAmountChange);
  document.getElementById('buyPrice')?.addEventListener('input', onBuyAmountChange);
  document.getElementById('buyTotal')?.addEventListener('input', onBuyTotalChange);

  document.getElementById('sellAmount')?.addEventListener('input', onSellAmountChange);
  document.getElementById('sellPrice')?.addEventListener('input', onSellAmountChange);
  document.getElementById('sellTotal')?.addEventListener('input', onSellTotalChange);

  // Market search
  document.getElementById('marketSearch')?.addEventListener('input', renderMarketsTab);

  // Initial fetch and render
  fetchLiveRates();
  renderAll();

  // Auto refresh rates every 60 seconds
  setInterval(fetchLiveRates, 60000);
});
