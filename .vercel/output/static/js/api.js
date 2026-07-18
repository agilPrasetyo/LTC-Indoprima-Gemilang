// Bersihkan objek `google` buatan ekstensi browser (seperti Google Translate) jika bukan dalam lingkungan Google Apps Script sesungguhnya
if (typeof window.google !== 'undefined' && (!window.google.script || !window.google.script.run)) {
  try {
    delete window.google;
  } catch (e) {
    window.google = undefined;
  }
}

// API penengah (Bridge) untuk menghubungkan Astro frontend dengan Google Sheets backend via Web App URL
const GAS_URL = window.PUBLIC_GAS_WEB_APP_URL || '';

if (typeof google === 'undefined' || typeof google.script === 'undefined') {
  class GASRunner {
    constructor() {
      this.successHandler = () => {};
      this.failureHandler = () => {};
    }
    
    withSuccessHandler(handler) {
      this.successHandler = handler;
      return this;
    }
    
    withFailureHandler(handler) {
      this.failureHandler = handler;
      return this;
    }
  }

  // Intercept pemanggilan method dinamis pada instance builder
  const runnerPrototypeProxy = new Proxy({}, {
    get(target, propKey, receiver) {
      return (...args) => {
        executeGASCall(propKey, args)
          .then(res => {
            if (receiver.successHandler) receiver.successHandler(res);
          })
          .catch(err => {
            if (receiver.failureHandler) receiver.failureHandler(err);
          });
      };
    }
  });
  
  Object.setPrototypeOf(GASRunner.prototype, runnerPrototypeProxy);

  // Buat mock objek `google.script.run` menggunakan Proxy
  const runProxy = new Proxy({}, {
    get(target, propKey) {
      if (propKey === 'withSuccessHandler') {
        return (handler) => new GASRunner().withSuccessHandler(handler);
      }
      if (propKey === 'withFailureHandler') {
        return (handler) => new GASRunner().withFailureHandler(handler);
      }
      
      // Jika dipanggil langsung tanpa chaining handler
      return (...args) => {
        executeGASCall(propKey, args);
      };
    }
  });

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = runProxy;
}

// Fungsi utama pengeksekusi request HTTP ke Google Apps Script Web App
// Fungsi utama pengeksekusi request HTTP ke Backend Astro API (Vercel)
async function executeGASCall(functionName, args) {
  try {
    const payload = { action: functionName, args: args };
    
    // Arahkan semua request ke endpoint Astro API lokal
    const response = await fetch('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`[Astro Supabase Error] pada method ${functionName}:`, error);
    throw error;
  }
}
