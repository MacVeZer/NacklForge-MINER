// NacklForge i18n — 10 languages
// EN, RU, FA, ID, FR, UK, TR, AR, ES, ZH

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'fa', name: 'Persian', native: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳', dir: 'ltr' },
];

export const translations = {
  en: {
    status_idle: 'Idle', status_mining: 'Mining', status_waiting: 'Waiting', status_starting: 'Starting', status_error: 'Error',
    total_mined: 'Total Mined', pending: 'Pending', lifetime: 'Lifetime', block: 'Block', last_epoch: 'Last Epoch', rate: 'Rate/min',
    not_connected: 'Not connected', ready_to_mine: 'Ready to mine', waiting_epoch: 'Waiting for next epoch', preparing_session: 'Preparing next session...', mining_error: 'Mining error',
    current_epoch: 'Current Epoch', sessions_epoch: 'Sessions this epoch', active_session: 'Active session', taps: 'taps', sessions: 'sessions',
    epoch_ends: 'Epoch ends:', session_taps: 'Session', next_session: 'Next', next_claim: 'Next claim', active: 'Active', session: 'Session', epoch: 'epoch',
    auto_mine: 'Auto Mine', settings: 'Settings',
    onboarding_title: 'NacklForge', onboarding_desc: 'Mine Nackl on-chain. Connect your Acki Nacki wallet to start earning rewards.',
    connect_wallet: 'Connect AN Wallet', connect_title: 'Connect AN Wallet', connect_desc: 'Authorize NacklForge to mine on your behalf. Your keys stay on your device.',
    step1: 'Open AN Wallet via deep link', step2: 'Confirm connection in AN Wallet', step3: 'Approve mining keys registration', step4: 'Mining starts automatically',
    try_demo: 'Try Demo Mode', logout_reset: 'Logout / Reset', demo_badge: 'DEMO',
    demo_started: 'Demo mode started', demo_features: 'All features work', demo_active: 'Demo Mode active',
    exit_demo: 'Exit demo mode?', exit_demo_short: 'Exit demo?',
    loading_wasm: 'Loading WASM...', wasm_loaded: 'WASM loaded', wasm_failed: 'WASM failed',
    creating_session: 'Creating session...', session_created: 'Session created', opening_wallet: 'Opening AN Wallet...',
    waiting_wallet: 'Waiting for wallet...', wallet_connected: 'Wallet connected', generating_keys: 'Generating keys...',
    keys_generated: 'Keys generated', requesting_approval: 'Requesting approval...', keys_sent: 'Keys sent',
    waiting_approval: 'Waiting for approval...', keys_approved: 'Keys approved', starting_mining: 'Starting mining...',
    miner_connected: 'Miner connected', session_started: 'Session started', tap: 'Tap', session_finished: 'Session',
    new_epoch: 'New epoch', next_session: 'Next session', epoch_full_wait: 'Epoch full',
    worker_computing: 'Computing...', worker_submitting: 'Submitting...', waiting_seed: 'Waiting for seed...',
    claiming: 'Claiming', claimed: 'Claimed', claim_failed: 'Claim failed', mining_stopped: 'Mining stopped',
    auto_enabled: 'Auto-mine enabled', auto_disabled: 'Auto-mine disabled', chain_poll_failed: 'Chain poll failed',
    backgrounded: 'Backgrounded', foregrounded: 'Foregrounded', network_offline: 'Network offline', network_restored: 'Network restored',
    network_lost: 'NETWORK ERROR', restoring_session: 'Restoring session', session_restored: 'Session restored', restore_failed: 'Restore failed',
    ready: 'NacklForge ready. Connect AN Wallet to start mining.',
    logout_confirm: 'Logout and clear account?', connected_started: 'Connected — mining started', logged_out: 'Logged out',
    dapp_id_required: 'Dapp ID required', dapp_id_title: 'Dapp ID Required', dapp_id_desc: 'Enter your registered Dapp ID to continue.',
    dapp_id_hint: 'Format: 0x + 64 hex chars', dapp_id_save: 'Save', dapp_id_saved: 'Dapp ID saved',
    mining_settings: 'Mining Settings', settings_desc: 'Configure mining parameters.',
    setting_taps: 'Taps per session (1-7)', setting_sessions: 'Sessions per epoch (1-10)', setting_cooldown: 'Session cooldown (sec)',
    setting_throttle: 'Performance mode', throttle_off: 'High Performance', throttle_eco: 'Eco (recommended)',
    throttle_warning: 'High Performance may warm your phone. System auto-switches to Eco if needed. Device is safe.', throttle_info: 'Eco mode mines efficiently while keeping phone cool. Rewards are the same.',
    auto_eco_activated: 'Auto-switched to Eco', auto_eco_notification: 'Switched to Eco to prevent overheating',
    settings_save: 'Save', settings_saved: 'Settings saved', settings_reset: 'Reset to Defaults', settings_reset_done: 'Settings reset',
    donate_title: 'Thank the Developer', donate_desc: 'Send NACKL to support development', donate_recipient: 'Recipient:',
    donate_send: 'Send NACKL', donate_top: 'Top Donators', donate_invalid: 'Enter valid amount',
    donate_login_first: 'Login first', donate_demo_sent: 'Demo donation sent', donate_sending: 'Sending donation', donate_open_wallet: 'Open AN Wallet',
    background_throttle: 'Background throttle active', just_now: 'just now',
  },
  ru: {
    status_idle: 'Ожидание', status_mining: 'Майнинг', status_waiting: 'Ожидание', status_starting: 'Запуск', status_error: 'Ошибка',
    total_mined: 'Всего намайнено', pending: 'Ожидает', lifetime: 'За всё время', block: 'Блок', last_epoch: 'За эпоху', rate: 'Скорость/мин',
    not_connected: 'Не подключено', ready_to_mine: 'Готов к майнингу', waiting_epoch: 'Ожидание эпохи', preparing_session: 'Подготовка сессии...', mining_error: 'Ошибка майнинга',
    current_epoch: 'Текущая эпоха', sessions_epoch: 'Сессий в эпохе', active_session: 'Активная сессия', taps: 'тапов', sessions: 'сессий',
    epoch_ends: 'Конец эпохи:', session_taps: 'Сессия', next_session: 'Далее', next_claim: 'Заявка через', active: 'Активно', session: 'Сессия', epoch: 'эпоха',
    auto_mine: 'Авто-майнинг', settings: 'Настройки',
    onboarding_title: 'NacklForge', onboarding_desc: 'Майнинг Nackl on-chain. Подключите кошелёк Acki Nacki.',
    connect_wallet: 'Подключить AN Wallet', connect_title: 'Подключить AN Wallet', connect_desc: 'Авторизуйте NacklForge для майнинга. Ключи на вашем устройстве.',
    step1: 'Открыть AN Wallet', step2: 'Подтвердить подключение', step3: 'Одобрить ключи', step4: 'Майнинг запустится',
    try_demo: 'Демо-режим', logout_reset: 'Выйти / Сбросить', demo_badge: 'ДЕМО',
    demo_started: 'Демо-режим запущен', demo_features: 'Все функции работают', demo_active: 'Демо-режим активен',
    exit_demo: 'Выйти из демо?', exit_demo_short: 'Выйти из демо?',
    loading_wasm: 'Загрузка WASM...', wasm_loaded: 'WASM загружен', wasm_failed: 'WASM не загружен',
    creating_session: 'Создание сессии...', session_created: 'Сессия создана', opening_wallet: 'Открытие AN Wallet...',
    waiting_wallet: 'Ожидание кошелька...', wallet_connected: 'Кошелёк подключён', generating_keys: 'Генерация ключей...',
    keys_generated: 'Ключи сгенерированы', requesting_approval: 'Запрос одобрения...', keys_sent: 'Ключи отправлены',
    waiting_approval: 'Ожидание одобрения...', keys_approved: 'Ключи одобрены', starting_mining: 'Запуск майнинга...',
    miner_connected: 'Майнер подключён', session_started: 'Сессия начата', tap: 'Тап', session_finished: 'Сессия',
    new_epoch: 'Новая эпоха', next_session: 'Следующая сессия', epoch_full_wait: 'Эпоха заполнена',
    worker_computing: 'Вычисление...', worker_submitting: 'Отправка...', waiting_seed: 'Ожидание seed...',
    claiming: 'Заявка', claimed: 'Получено', claim_failed: 'Заявка не удалась', mining_stopped: 'Майнинг остановлен',
    auto_enabled: 'Авто-майнинг включён', auto_disabled: 'Авто-майнинг выключен', chain_poll_failed: 'Опрос сети не удался',
    backgrounded: 'В фоне', foregrounded: 'На экране', network_offline: 'Сеть недоступна', network_restored: 'Сеть восстановлена',
    network_lost: 'ОШИБКА СЕТИ', restoring_session: 'Восстановление сессии', session_restored: 'Сессия восстановлена', restore_failed: 'Восстановление не удалось',
    ready: 'NacklForge готов. Подключите AN Wallet.',
    logout_confirm: 'Выйти и очистить аккаунт?', connected_started: 'Подключено — майнинг запущен', logged_out: 'Вы вышли',
    dapp_id_required: 'Требуется Dapp ID', dapp_id_title: 'Требуется Dapp ID', dapp_id_desc: 'Введите зарегистрированный Dapp ID.',
    dapp_id_hint: 'Формат: 0x + 64 hex', dapp_id_save: 'Сохранить', dapp_id_saved: 'Dapp ID сохранён',
    mining_settings: 'Настройки майнинга', settings_desc: 'Настройте параметры майнинга.',
    setting_taps: 'Тапов за сессию (1-7)', setting_sessions: 'Сессий за эпоху (1-10)', setting_cooldown: 'Пауза (сек)',
    setting_throttle: 'Режим производительности', throttle_off: 'Высокая', throttle_eco: 'Эко (рекомендуется)',
    throttle_warning: 'Высокая производительность может нагреть телефон. Система автоматически переключит на Эко. Устройство в безопасности.', throttle_info: 'Эко-режим добывает эффективно, сохраняя телефон холодным. Награды те же.',
    auto_eco_activated: 'Авто-переключение на Эко', auto_eco_notification: 'Переключено на Эко для защиты от перегрева',
    settings_save: 'Сохранить', settings_saved: 'Настройки сохранены', settings_reset: 'Сбросить к умолчанию', settings_reset_done: 'Настройки сброшены',
    donate_title: 'Отблагодарить разработчика', donate_desc: 'Отправьте NACKL для поддержки разработки', donate_recipient: 'Получатель:',
    donate_send: 'Отправить NACKL', donate_top: 'Топ донатеров', donate_invalid: 'Введите корректную сумму',
    donate_login_first: 'Сначала войдите', donate_demo_sent: 'Демо-донат отправлен', donate_sending: 'Отправка доната', donate_open_wallet: 'Откройте AN Wallet',
    background_throttle: 'Фоновый режим активен', just_now: 'только что',
  },
};

// Auto-generate other 8 languages by copying EN as base with language-specific overrides
// This ensures all keys exist for all languages
const baseKeys = translations.en;
for (const lang of ['fa','id','fr','uk','tr','ar','es','zh']) {
  if (!translations[lang]) translations[lang] = {};
  for (const key in baseKeys) {
    if (!translations[lang][key]) translations[lang][key] = baseKeys[key];
  }
}

// Language-specific overrides for key UI elements
const overrides = {
  fa: { status_idle:'بیکار',status_mining:'استخراج',auto_mine:'استخراج خودکار',settings:'تنظیمات',connect_wallet:'اتصال کیف پول AN',try_demo:'حالت دمو',donate_title:'تشکر از توسعه‌دهنده',mining_settings:'تنظیمات استخراج' },
  id: { status_idle:'Diam',status_mining:'Menambang',auto_mine:'Auto Mine',settings:'Pengaturan',connect_wallet:'Hubungkan AN Wallet',try_demo:'Mode Demo',donate_title:'Terima Kasih',mining_settings:'Pengaturan' },
  fr: { status_idle:'Inactif',status_mining:'Minage',auto_mine:'Auto Mine',settings:'Paramètres',connect_wallet:'Connecter AN Wallet',try_demo:'Mode Démo',donate_title:'Remercier',mining_settings:'Paramètres' },
  uk: { status_idle:'Очікування',status_mining:'Майнінг',auto_mine:'Авто-майнінг',settings:'Налаштування',connect_wallet:'Підключити AN Wallet',try_demo:'Демо-режим',donate_title:'Подякувати',mining_settings:'Налаштування' },
  tr: { status_idle:'Boşta',status_mining:'Madencilik',auto_mine:'Otomatik',settings:'Ayarlar',connect_wallet:'AN Cüzdan Bağla',try_demo:'Demo Modu',donate_title:'Teşekkür Et',mining_settings:'Ayarlar' },
  ar: { status_idle:'خامل',status_mining:'تعدين',auto_mine:'تعدين تلقائي',settings:'الإعدادات',connect_wallet:'ربط محفظة AN',try_demo:'الوضع التجريبي',donate_title:'اشكر المطور',mining_settings:'الإعدادات' },
  es: { status_idle:'Inactivo',status_mining:'Minando',auto_mine:'Auto Minar',settings:'Configuración',connect_wallet:'Conectar AN Wallet',try_demo:'Modo Demo',donate_title:'Agradecer',mining_settings:'Configuración' },
  zh: { status_idle:'空闲',status_mining:'挖矿中',auto_mine:'自动挖矿',settings:'设置',connect_wallet:'连接 AN 钱包',try_demo:'演示模式',donate_title:'感谢开发者',mining_settings:'挖矿设置' },
};
for (const lang in overrides) {
  Object.assign(translations[lang], overrides[lang]);
}

export function detectLanguage() {
  const lang = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
  const supported = LANGUAGES.map(l => l.code);
  return supported.includes(lang) ? lang : 'en';
}

export function detectTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getLang() {
  try { return localStorage.getItem('nacklforge_lang') || detectLanguage(); } catch(_) { return 'en'; }
}

export function setLang(code) {
  try { localStorage.setItem('nacklforge_lang', code); } catch(_) {}
}

export function t(key) {
  const lang = getLang();
  const tr = translations[lang] || translations.en;
  return tr[key] || translations.en[key] || key;
}

export function getLangDir() {
  const lang = getLang();
  const langInfo = LANGUAGES.find(l => l.code === lang);
  return langInfo ? langInfo.dir : 'ltr';
}
