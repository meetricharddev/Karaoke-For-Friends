/* 方案、升級碼與廣告
   - 試用：首次使用起 trialDays 天免廣告
   - 免費版（試用結束、未升級）：開始時與每唱 everySongs 首，顯示一次廣告（seconds 秒），廣告出現在播放器「外面」
   - 升級：輸入升級碼（產生後 24 小時內有效、只能用一次）→ 這台裝置永久免廣告
   - 限制：試用天數與「已升級」記在本機；清除瀏覽器資料後試用會重算、升級狀態會消失
     （已升級者可聯絡開發者，用「裝置代碼」找回，見 readme） */
(function () {
  const C = window.KARAOKE_CONFIG || {}, A = C.ads || {}, DAY = 864e5;
  const PROXY = (C.apiBase || '').replace(/\/+$/, '');
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 時鐘只會往前：避免把系統日期調回去來延長試用
  const clock = () => { const t = Date.now(), last = +ls.get('klast') || 0, n = Math.max(t, last); ls.set('klast', String(n)); return n; };
  let start = +ls.get('ktrial') || 0;
  if (!start) { start = clock(); ls.set('ktrial', String(start)); }

  function devId() {
    let d = ls.get('kdev');
    if (!/^[a-z0-9]{16,40}$/.test(d || '')) {
      const a = new Uint8Array(20); crypto.getRandomValues(a);
      d = Array.from(a, x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); ls.set('kdev', d);
    }
    return d;
  }
  const isPaid = () => ls.get('kpaid') === '1';
  function status() {
    if (isPaid()) return { plan: 'premium' };
    const left = Math.ceil((start + (C.trialDays || 7) * DAY - clock()) / DAY);
    return left > 0 ? { plan: 'trial', daysLeft: left } : { plan: 'free' };
  }
  async function api(path, params) {
    if (!PROXY) throw new Error('此版本沒有設定升級碼伺服器（config.js 的 apiBase）');
    const r = await fetch(PROXY + path + '?' + new URLSearchParams(params));
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || '連線失敗，請稍後再試');
    return j;
  }

  function renderPlan() {
    const s = status(), btn = $('planBtn');
    if (btn) btn.textContent = s.plan === 'premium' ? '👑 已升級' : s.plan === 'trial' ? '🎁 免費試用剩 ' + s.daysLeft + ' 天' : '👑 升級去廣告';
  }
  function planText() {
    const s = status();
    if (s.plan === 'premium') return '✅ 目前方案：升級版（永久免廣告）';
    if (s.plan === 'trial') return '🎁 免費試用中：還剩 ' + s.daysLeft + ' 天免廣告。試用結束後為免費版（開始時與每唱 ' + (A.everySongs || 5) + ' 首會出現廣告）。';
    return '目前方案：免費版（開始時與每唱 ' + (A.everySongs || 5) + ' 首會出現廣告）。升級後永久免廣告。';
  }

  // ---------- 廣告時段 ----------
  const active = () => status().plan === 'free' && A.mode && A.mode !== 'off';
  window.adBreakDue = since => active() && since >= (A.everySongs || 5);
  let breakTimer = null;
  window.startAdBreak = function (onDone) {
    const box = $('adBreak'), secs = Math.max(3, A.seconds || 10);
    let adHtml;
    if (A.mode === 'adsense' && A.adsenseClient && A.adsenseSlot) {
      adHtml = '<small>廣告</small><ins class="adsbygoogle" style="display:block;min-height:90px" data-ad-client="' + esc(A.adsenseClient) +
        '" data-ad-slot="' + esc(A.adsenseSlot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    } else {
      adHtml = '<div class="house">🎤 謝謝你使用卡拉OK點歌機！<br>升級只要 <b>' + esc(C.priceText || '一次付費') + '</b>，就能永久免廣告。</div>';
    }
    box.innerHTML = '<div class="abMain">' + adHtml + '</div><div class="abSide"><small>下一首即將開始</small><div class="abCnt" id="abCnt">' + secs +
      '</div><button class="btn alt" onclick="openPlan()">升級去廣告</button></div>';
    box.style.display = 'flex';
    if (A.mode === 'adsense' && A.adsenseClient && A.adsenseSlot) {
      if (!$('adsJs')) {
        const sc = document.createElement('script');
        sc.id = 'adsJs'; sc.async = true; sc.crossOrigin = 'anonymous';
        sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(A.adsenseClient);
        document.head.appendChild(sc);
      }
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
    let n = secs; clearInterval(breakTimer);
    breakTimer = setInterval(() => {
      n--; const c = $('abCnt'); if (c) c.textContent = n > 0 ? n : '✓';
      if (n <= 0) { clearInterval(breakTimer); breakTimer = null; box.style.display = 'none'; box.innerHTML = ''; onDone(); }
    }, 1000);
  };

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
      ls.set('kpaid', '1'); ls.set('kchk', String(clock()));
      $('planKey').value = ''; msg.textContent = '✅ 升級成功！這台裝置已永久免廣告，謝謝支持。';
      $('planStatus').textContent = planText(); $('planPrice').textContent = ''; renderPlan();
    } catch (e) { msg.textContent = e.message; }
  };

  // ---------- 啟動：還原／重新確認升級狀態 ----------
  window.initAds = function () {
    renderPlan();
    if (!PROXY) return;
    const t = clock();
    if (!isPaid()) {                 // 例如開發者用「裝置代碼」手動授權、或曾在此裝置升級過
      api('/entitlement', { dev: devId() }).then(j => { if (j.paid) { ls.set('kpaid', '1'); ls.set('kchk', String(clock())); renderPlan(); } }).catch(() => {});
    } else if (t - (+ls.get('kchk') || 0) > 3 * DAY) {   // 已升級：每 3 天確認一次，只有伺服器明確回報「未升級」才取消
      api('/entitlement', { dev: devId() }).then(j => { ls.set('kchk', String(clock())); if (j.paid === false) { ls.set('kpaid', '0'); renderPlan(); } }).catch(() => {});
    }
    setInterval(renderPlan, 3600e3);
  };
})();
