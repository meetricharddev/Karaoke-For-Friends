/* 方案與廣告
   - 免費版：首次使用起 trialDays 天免廣告，之後在播放器「外面」的版位顯示廣告
   - 升級版：輸入授權碼（由 Worker /license 驗證）後永久／到期前免廣告
   - 限制：試用期記錄在本機，清除瀏覽器資料或重新安裝可重新試用；要防止需改成帳號制（見上架指南） */
(function () {
  const C = window.KARAOKE_CONFIG || {}, A = C.ads || {}, DAY = 864e5;
  const PROXY = (C.apiBase || '').replace(/\/+$/, '');
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 時鐘只會往前：避免把系統日期調回去來延長試用
  const clock = () => { const t = Date.now(), last = +ls.get('klast') || 0, n = Math.max(t, last); ls.set('klast', String(n)); return n; };
  let start = +ls.get('ktrial') || 0;
  if (!start) { start = clock(); ls.set('ktrial', String(start)); }
  const getLic = () => { try { return JSON.parse(ls.get('klic') || 'null'); } catch (e) { return null; } };

  function status() {
    const t = clock(), l = getLic();
    if (l && l.ok) {
      const exp = l.exp ? Date.parse(l.exp) : Infinity;
      const fresh = (t - (l.checked || 0)) < 14 * DAY;       // 超過 14 天沒連線驗證，暫時視為未升級
      if (exp > t && fresh) return { plan: 'premium', exp: l.exp || null };
    }
    const left = Math.ceil((start + (C.trialDays || 7) * DAY - t) / DAY);
    return left > 0 ? { plan: 'trial', daysLeft: left } : { plan: 'free' };
  }

  async function verify(key) {
    if (!PROXY) throw new Error('此版本沒有設定授權伺服器');
    const r = await fetch(PROXY + '/license?key=' + encodeURIComponent(key));
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || '驗證失敗，請稍後再試');
    return j;
  }

  function renderAds() {
    const s = status(), slot = $('adSlot'), btn = $('planBtn');
    if (btn) btn.textContent = s.plan === 'premium' ? '👑 已升級' : s.plan === 'trial' ? '🎁 免費試用剩 ' + s.daysLeft + ' 天' : '👑 升級去廣告';
    if (!slot) return;
    const show = s.plan === 'free' && A.mode && A.mode !== 'off';
    slot.style.display = show ? 'block' : 'none';
    if (!show) { slot.innerHTML = ''; slot.dataset.mode = ''; return; }
    if (slot.dataset.mode === A.mode && slot.firstChild) return;
    slot.dataset.mode = A.mode;
    if (A.mode === 'adsense' && A.adsenseClient && A.adsenseSlot) {
      slot.innerHTML = '<small>廣告</small><ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(A.adsenseClient) +
        '" data-ad-slot="' + esc(A.adsenseSlot) + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      if (!$('adsJs')) {
        const sc = document.createElement('script');
        sc.id = 'adsJs'; sc.async = true; sc.crossOrigin = 'anonymous';
        sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(A.adsenseClient);
        document.head.appendChild(sc);
      }
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    } else {
      slot.innerHTML = '<small>廣告（測試版位）</small><div class="house">🎤 這裡會顯示廣告<br><button class="btn" onclick="openPlan()">升級去廣告</button></div>';
    }
  }

  function planText() {
    const s = status();
    if (s.plan === 'premium') return '✅ 目前方案：升級版（免廣告）' + (s.exp ? '，到期日 ' + s.exp.slice(0, 10) : '，永久');
    if (s.plan === 'trial') return '🎁 免費試用中：還剩 ' + s.daysLeft + ' 天免廣告。試用結束後為免費版（含廣告）。';
    return '目前方案：免費版（含廣告）。升級後可永久去除廣告。';
  }
  window.openPlan = function () {
    $('planStatus').textContent = planText();
    $('planMsg').textContent = '';
    const buy = $('planBuy');
    const canBuy = C.checkoutUrl && !C.storeBuild;
    buy.style.display = canBuy ? 'inline-block' : 'none';
    if (canBuy) buy.href = C.checkoutUrl;
    $('planNote').textContent = C.storeBuild ? 'App 版請透過商店的「訂閱／購買」升級；已購買的授權碼也可以在這裡輸入。' : (C.checkoutUrl ? '' : '尚未設定購買連結。');
    $('planModal').classList.add('show');
  };
  window.closePlan = function () { $('planModal').classList.remove('show'); };
  window.activateLicense = async function () {
    const key = $('planKey').value.trim(), msg = $('planMsg');
    if (!key) { msg.textContent = '請輸入授權碼'; return; }
    msg.textContent = '驗證中…';
    try {
      const j = await verify(key);
      if (!j.ok) { msg.textContent = '授權碼無效或已過期'; return; }
      ls.set('klic', JSON.stringify({ ok: true, exp: j.exp || null, key, checked: clock() }));
      msg.textContent = '✅ 已升級！'; $('planKey').value = '';
      $('planStatus').textContent = planText(); renderAds();
    } catch (e) { msg.textContent = e.message; }
  };
  window.initAds = function () {
    renderAds();
    const l = getLic();   // 已升級者：每 3 天重新驗證一次（授權可能到期或被停用）
    if (l && l.ok && l.key && PROXY && (clock() - (l.checked || 0)) > 3 * DAY) {
      verify(l.key).then(j => {
        if (j.ok) ls.set('klic', JSON.stringify({ ok: true, exp: j.exp || null, key: l.key, checked: clock() }));
        else ls.del('klic');
        renderAds();
      }).catch(() => {});
    }
    setInterval(renderAds, 3600e3);
  };
})();
