// ============================================================================
// ASTRO RPC CLIENT BRIDGE (Independent Backend Communication)
// Menghubungkan frontend Astro secara mandiri ke endpoint Backend Lokal (/api/rpc & Supabase)
// ============================================================================

class RpcRunner {
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

// Fungsi utama pengeksekusi request HTTP ke Endpoint Backend Astro (/api/rpc)
async function executeRpcCall(functionName, args) {
  try {
    const payload = { action: functionName, args: args || [] };
    
    const response = await fetch('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      throw new Error(errBody?.message || `HTTP Server Error: status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[Astro Server RPC Error] pada method ${functionName}:`, error);
    throw error;
  }
}

// Proxy dinamis untuk method RPC (misal: rpc.getDashboardStats(), rpc.login(), dll)
const runnerPrototypeProxy = new Proxy({}, {
  get(target, propKey, receiver) {
    return (...args) => {
      executeRpcCall(propKey, args)
        .then(res => {
          if (receiver.successHandler) receiver.successHandler(res);
        })
        .catch(err => {
          if (receiver.failureHandler) receiver.failureHandler(err);
        });
    };
  }
});

Object.setPrototypeOf(RpcRunner.prototype, runnerPrototypeProxy);

// Objek Runner Proxy utama
const rpcProxy = new Proxy({}, {
  get(target, propKey) {
    if (propKey === 'withSuccessHandler') {
      return (handler) => new RpcRunner().withSuccessHandler(handler);
    }
    if (propKey === 'withFailureHandler') {
      return (handler) => new RpcRunner().withFailureHandler(handler);
    }
    
    // Jika method dipanggil langsung tanpa chaining handler
    return (...args) => {
      return executeRpcCall(propKey, args);
    };
  }
});

// Ekspor ke window global untuk seluruh script frontend
window.executeRpcCall = executeRpcCall;
window.executeGASCall = executeRpcCall;
window.rpc = rpcProxy;
window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = rpcProxy;
