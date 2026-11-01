// 站台設定。部署前請依序填寫（說明見 readme.txt）。
window.KARAOKE_CONFIG = {
  // YouTube 代理伺服器（Cloudflare Worker）網址，例如 https://karaoke-proxy.你的帳號.workers.dev
  // 留空 = 「自備金鑰」模式（使用者要在設定裡貼自己的 YouTube API 金鑰；適合自己或朋友使用，不適合上架）
  // 升級碼系統也需要這個網址（升級碼由 Worker 驗證）。
  apiBase: '',

  // 搜尋結果最低觀看次數
  minViews: 100000,

  // 免費試用天數。試用結束後，每次開啟程式都會先出現「等待畫面」，升級後就不會再出現
  trialDays: 7,
  gateSeconds: 10,

  // 升級價格的顯示文字，以及網頁版購買連結（例如 Stripe Payment Link / Lemon Squeezy / Ko-fi 商品頁）
  priceText: 'US$2.99 一次付費・永久不用等待',
  checkoutUrl: '',

  // 上架版（Google Play / App Store 打包）請設為 true：不顯示外部購買連結（商店規定要用商店內購買）
  storeBuild: false
};
