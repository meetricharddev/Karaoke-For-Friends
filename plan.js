/* 方案與升級碼
   - 免費版：每次開啟程式，先出現 gateSeconds 秒的「等待畫面」，倒數完自動進入
   - 升級：輸入升級碼（產生後 24 小時內有效、只能用一次）→ 這台裝置永久不再出現等待畫面
   - 限制：「已升級」狀態記在本機；清除瀏覽器資料後會消失（已升級者可聯絡開發者，用「裝置代碼」找回，見 readme） */
(function () {
  const C = window.KARAOKE_CONFIG || {}, DAY = 864e5;
  const PROXY = (C.apiBase || '').replace(/\/+$/, '');
  const GATE = Math.max(3, +C.gateSeconds || 10);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const $ = id => document.getElementById(id);

  function devId() {
    let d = ls.get('kdev');
    if (!/^[a-z0-9]{16,40}$/.test(d || '')) {
      const a = new Uint8Array(20); crypto.getRandomValues(a);
      d = Array.from(a, x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); ls.set('kdev', d);
    }
    return d;
  }
  const isPaid = () => ls.get('kpaid') === '1';
  async function api(path, params) {
    if (!PROXY) throw new Error('此版本沒有設定升級碼伺服器（config.js 的 apiBase）');
    const r = await fetch(PROXY + path + '?' + new URLSearchParams(params));
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || '連線失敗，請稍後再試');
    return j;
  }

  // ---------- 開啟時的等待畫面（免費版，每次開啟程式一次） ----------
  let gateTimer = null;
  function hideGate() {
    clearInterval(gateTimer); gateTimer = null;
    const g = $('gate'); if (g) g.style.display = 'none';
    if (window.planGateActive) {
      window.planGateActive = false;
      document.dispatchEvent(new Event('plangate-done'));   // 讓主程式接著開始播放（例如重新開啟時已有佇列）
    }
  }
  function showGate() {
    const g = $('gate'); if (!g) return;
    window.planGateActive = true;
    $('gatePrice').textContent = C.priceText || '';
    let n = GATE; $('gateCnt').textContent = n; g.style.display = 'flex';
    clearInterval(gateTimer);
    gateTimer = setInterval(() => { n--; $('gateCnt').textContent = n > 0 ? n : '✓'; if (n <= 0) hideGate(); }, 1000);
  }

  function renderPlan() {
    const btn = $('planBtn');
    if (btn) btn.textContent = isPaid() ? '👑 已升級' : '👑 升級（跳過等待）';
    if (isPaid() && window.planGateActive) hideGate();
  }
  const planText = () => isPaid() ? '✅ 目前方案：升級版（永久不用等待）'
    : '目前方案：免費版（每次開啟程式需先等待 ' + GATE + ' 秒）。升級後永久不用等待。';

  // ---------- 升級視窗 ----------
  window.openPlan = function () {
    $('planStatus').textContent = planText();
    $('planMsg').textContent = '';
    $('planDev').textContent = devId();
    $('planPrice').textContent = isPaid() ? '' : (C.priceText || '');
    const buy = $('planBuy'), canBuy = C.checkoutUrl && !C.storeBuild && !isPaid();
    buy.style.display = canBuy ? 'inline-block' : 'none';
    if (canBuy) buy.href = C.checkoutUrl;
    $('planNote').textContent = isPaid() ? '' : C.storeBuild
      ? 'App 版請透過商店的購買功能升級；已取得升級碼的人也可以在這裡輸入。'
      : (C.checkoutUrl ? '付款後，賣家會在 24 小時內寄給你升級碼；收到後請在 24 小時內輸入。' : '尚未設定購買連結（config.js 的 checkoutUrl）。');
    $('planModal').classList.add('show');
  };
  window.closePlan = function () { $('planModal').classList.remove('show'); };
  window.copyDev = function () { try { navigator.clipboard.writeText(devId()); $('planMsg').textContent = '已複製裝置代碼'; } catch (e) {} };
  window.activateCode = async function () {
    const code = $('planKey').value.trim(), msg = $('planMsg');
    if (!code) { msg.textContent = '請輸入升級碼'; return; }
    msg.textContent = '驗證中…';
    try {
      const j = await api('/redeem', { code, dev: devId() });
      if (!j.ok) { msg.textContent = j.error || '升級碼無效'; return; }
      ls.set('kpaid', '1'); ls.set('kchk', String(Date.now()));
      $('planKey').value = ''; msg.textContent = '✅ 升級成功！這台裝置已永久不用等待，謝謝支持。';
      $('planStatus').textContent = planText(); $('planPrice').textContent = ''; renderPlan();
    } catch (e) { msg.textContent = e.message; }
  };

  // ---------- 啟動：顯示等待畫面、還原／重新確認升級狀態 ----------
  window.initPlan = function () {
    renderPlan();
    if (!isPaid()) showGate();
    if (!PROXY) return;
    if (!isPaid()) {                 // 例如開發者用「裝置代碼」手動授權、或曾在此裝置升級過
      api('/entitlement', { dev: devId() }).then(j => { if (j.paid) { ls.set('kpaid', '1'); ls.set('kchk', String(Date.now())); renderPlan(); } }).catch(() => {});
    } else if (Date.now() - (+ls.get('kchk') || 0) > 3 * DAY) {   // 已升級：每 3 天確認一次，只有伺服器明確回報「未升級」才取消
      api('/entitlement', { dev: devId() }).then(j => { ls.set('kchk', String(Date.now())); if (j.paid === false) { ls.set('kpaid', '0'); renderPlan(); } }).catch(() => {});
    }
  };
})();
