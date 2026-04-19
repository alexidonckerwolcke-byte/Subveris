(function() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }

  const hash = window.location.hash;
  const search = window.location.search;
  const currentUrl = new URL(window.location.href);
  const reloadAttempts = Number(sessionStorage.getItem('staleBuildReloadAttempts') || '0');
  const hasReloadedFresh = currentUrl.searchParams.has('fresh');
  const isDevPort = window.location.port === '5173';

  const clearStaleCaches = async () => {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.info('[SW] cleared stale browser caches:', cacheNames);
    } catch (error) {
      console.warn('[SW] failed to clear browser caches:', error);
    }
  };

  const reloadFresh = () => {
    if (reloadAttempts >= 5) {
      console.warn('[SW] stale build recovery already attempted five times, not reloading again');
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('fresh', String(Date.now()));
    const reloadUrl = nextUrl.toString();

    sessionStorage.setItem('staleBuildReloadAttempts', String(reloadAttempts + 1));
    console.warn('[SW] forcing fresh reload on dev port 5173:', reloadUrl);

    const doReload = async () => {
      await clearStaleCaches();
      window.location.replace(reloadUrl);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().then((success) => {
              console.info('[SW] unregistered stale service worker:', registration.scope, success);
            }).catch((error) => {
              console.warn('[SW] failed to unregister service worker:', error);
            });
          });
        })
        .catch((error) => {
          console.warn('[SW] failed to get service worker registrations:', error);
        })
        .finally(doReload);
    } else {
      doReload();
    }
  };

  const handleStaleAssetLoad = (event) => {
    const target = event.target;
    if (
      target instanceof HTMLScriptElement &&
      target.src.includes('/assets/index-') &&
      isDevPort &&
      !hasReloadedFresh
    ) {
      console.warn('[SW] detected stale production asset load on dev port 5173:', target.src);
      event.preventDefault();
      reloadFresh();
    }
  };

  window.addEventListener('error', handleStaleAssetLoad, true);

  window.addEventListener('DOMContentLoaded', () => {
    if (!hasReloadedFresh && isDevPort) {
      const buildAssetScript = document.querySelector('script[src^="/assets/index-"]');
      if (buildAssetScript) {
        console.warn('[SW] detected stale build HTML on dev port 5173 after DOMContentLoaded');
        reloadFresh();
      }
    }
  });

  if ((hash.includes('access_token') || hash.includes('error') || search.includes('code')) && window.location.pathname !== '/auth/callback') {
    window.location.replace('/auth/callback' + hash + search);
    return;
  }

  const fallback = document.getElementById('fallback-root');
  const hideFallback = () => {
    if (fallback) {
      fallback.style.display = 'none';
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            console.info('[SW] unregistered service worker:', registration.scope, success);
          });
        });
      })
      .catch((error) => {
        console.warn('[SW] failed to get service worker registrations:', error);
      });
  }

  const reloadIfControlledBySW = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.info('[SW] unregistered active controller registration:', registration.scope);
      }
      console.warn('[SW] active service worker controller present, reloading page');
      window.location.reload();
    }
  };

  window.addEventListener('load', hideFallback);
  window.addEventListener('error', hideFallback);
  window.addEventListener('unhandledrejection', hideFallback);
  setTimeout(hideFallback, 5000);
  setTimeout(reloadIfControlledBySW, 2000);
})();
