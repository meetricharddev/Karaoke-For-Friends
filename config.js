// 站台設定。部署前請依序填寫（說明見 readme.txt）。
window.KARAOKE_CONFIG = {
  // YouTube 代理伺服器（Cloudflare Worker）網址，例如 https://karaoke-proxy.你的帳號.workers.dev
  // 留空 = 「自備金鑰」模式（使用者要在設定裡貼自己的 YouTube API 金鑰；適合自己或朋友使用，不適合上架）
  apiBase: '',

  // 搜尋結果最低觀看次數
  minViews: 100000,

  // 免費試用天數（試用期內免廣告）
  trialDays: 7,

  // 廣告：mode = 'off'（不顯示）｜'house'（測試用假版位）｜'adsense'（網頁版 Google AdSense）
  // 注意：廣告只會出現在播放器「外面」，不會蓋在 YouTube 影片上。
  ads: { mode: 'house', adsenseClient: '', adsenseSlot: '' },

  // 網頁版購買連結（例如 Stripe Payment Link）。上架版請留空並改用商店內購買。
  checkoutUrl: '',

  // 上架版（Google Play / App Store 打包）請設為 true：不顯示外部購買連結
  storeBuild: false
};
