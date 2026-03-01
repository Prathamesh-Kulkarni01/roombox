if (!self.define) {
  let e,
    c = {};
  const s = (s, n) => (
    (s = new URL(s + ".js", n).href),
    c[s] ||
      new Promise((c) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = s), (e.onload = c), document.head.appendChild(e);
        } else (e = s), importScripts(s), c();
      }).then(() => {
        let e = c[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, i) => {
    const t =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (c[t]) return;
    let a = {};
    const r = (e) => s(e, t),
      u = { module: { uri: t }, exports: a, require: r };
    c[t] = Promise.all(n.map((e) => u[e] || r(e))).then((e) => (i(...e), a));
  };
}
define(["./workbox-3c9d0171"], function (e) {
  "use strict";
  importScripts("/fallback-ce627215c0e4a9af.js"),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/chunks/1069-a9dbb2915ebbc951.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/1303-c0ad228d2117d5b8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/1679-98546ae5c0b19510.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2140-6376bc926b62e4ea.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2222-4b4f782ddd51a4ce.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2397-960fded654617bc2.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2587-f2879a291f6a54fc.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2594-8470a85cf884de5e.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2684-dececa421edca5ec.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/2947-115066c611551f65.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/349d079f-8e5f391744266302.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/3516-3a6036ad4027de25.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/3645-fb5d45eb1f53ef8f.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/405-19d6478536de0db5.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/4402-b004256fa4d9b148.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/4432-d9ecc40c9f372e9d.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/45-fa103371688dfad8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/5391-d3fda607788d184d.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/6386-42cf8ebf8730e97b.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/6732-fcc8f364651b81d8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/6997-25611d7f3796900e.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/7149-8f73489e97a993c3.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/7397-21b162db078156fd.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/7bcb3702-9f7887ed248e9fa1.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/8162-a736ac7e77280f4a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/8184-51a2ac1e5dc0e38a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/8584-57b89ecbc8663700.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/8959-4102acba02d1183b.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/9029-454bab29bd50902c.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/9870-a436d8da90ac9cdb.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/9926-398e08f7c7812833.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/9937-45ef773b2e7928bb.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-d34b2559b8b102eb.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/complete-profile/page-5fda8b9d3b90e0ff.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/complaints/page-a1c19434b0c392ac.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/expense/page-ef658703ab412723.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/food/page-99a734793efd4231.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/layout-dd1e7718437be118.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/page-bd30907ecaaae8e8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/pg-management/%5BpgId%5D/page-246e447d84a4e571.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/pg-management/page-bd54c0a695804587.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/seo-generator/page-47853069d1b13f97.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/settings/page-50cad472a7c50b1d.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/staff/page-461204173ae5f417.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/tenant-management/%5BguestId%5D/page-6bbd704c18585bdf.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/dashboard/tenant-management/page-34f4b2fd9c25538a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/layout-8a66148fbaa564e0.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/login/page-204beb5033928e57.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/login/verify/page-a66fa910770fd555.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/offline/page-ec92a55c9cadc2e8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/page-2a2e8718f256fcfd.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/pg/%5Bid%5D/page-900504d31e1b732a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/robots.txt/route-068e58fae9f65562.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/signup/page-edf38893d871184d.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/sitemap.xml/route-395830cc6374a3a5.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/chatbot/page-db55a253abdcbf29.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/complaints/page-89200e6b0eb23fb5.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/food/page-84efe1933b4692cc.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/kyc/page-30cbced5cab3f24a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/layout-b65485a256d51eea.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/my-pg/page-013cb6015f63b3dc.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/app/tenants/profile/page-cfe7e9c4d9f5f22a.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/b1dc8190-4df667d873699ddc.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/framework-f2abd9fce659bef8.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/main-6fa346ad86795555.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/main-app-09e9744002aa7937.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/pages/_app-023039e41641ca61.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/pages/_error-c953d255db2f202d.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-28f8572753092fde.js",
          revision: "e2ecdulplTckmwO2wqM-f",
        },
        {
          url: "/_next/static/css/fca5921352e244fa.css",
          revision: "fca5921352e244fa",
        },
        {
          url: "/_next/static/e2ecdulplTckmwO2wqM-f/_buildManifest.js",
          revision: "bd2e98c06bcde2e333c9a422b038889f",
        },
        {
          url: "/_next/static/e2ecdulplTckmwO2wqM-f/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/fallback-ce627215c0e4a9af.js",
          revision: "2bf9b2eaa321e47785e445893f3d084b",
        },
        {
          url: "/firebase-messaging-sw.js",
          revision: "b421bead0e4ee80b74029f84a58e5595",
        },
        {
          url: "/firebase-messaging-sw.js.template",
          revision: "e66d9eeae72e7da22a099193bd37aeaa",
        },
        {
          url: "/icons/icon-128x128.png",
          revision: "e0739cde17698d3e6b8565e93b876f57",
        },
        {
          url: "/icons/icon-144x144.png",
          revision: "49e716461f848fd9f6c841221820c449",
        },
        {
          url: "/icons/icon-152x152.png",
          revision: "ed7d76323816c70c1fe7b4c720c1f446",
        },
        {
          url: "/icons/icon-192x192.png",
          revision: "cead88ba4e407872fffc9eef6079fe7d",
        },
        {
          url: "/icons/icon-256x256.png",
          revision: "831d1fd7ef824f7b131e25f3eddb5f9e",
        },
        {
          url: "/icons/icon-384x384.png",
          revision: "06252b06702168fc281e98092167a3b2",
        },
        {
          url: "/icons/icon-48x48.png",
          revision: "38f19e17fb3c8f946c7e76fd3059ae31",
        },
        {
          url: "/icons/icon-512x512.png",
          revision: "37cdccd5b663d41a1ba656c0a3ce2b0e",
        },
        {
          url: "/icons/icon-72x72.png",
          revision: "0e29a73ebc7c764e4f64f5fac1cf1233",
        },
        {
          url: "/icons/icon-96x96.png",
          revision: "7d83250bcfdc459c5c376764f68f0e8d",
        },
        { url: "/manifest.json", revision: "839969a18222df4f7b137cd70be0e12d" },
        { url: "/offline", revision: "e2ecdulplTckmwO2wqM-f" },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: function (e) {
              return _ref.apply(this, arguments);
            },
          },
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      function (e) {
        var c = e.sameOrigin,
          s = e.url.pathname;
        return !(
          !c ||
          s.startsWith("/api/auth/callback") ||
          !s.startsWith("/api/")
        );
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      function (e) {
        var c = e.request,
          s = e.url.pathname,
          n = e.sameOrigin;
        return (
          "1" === c.headers.get("RSC") &&
          "1" === c.headers.get("Next-Router-Prefetch") &&
          n &&
          !s.startsWith("/api/")
        );
      },
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      function (e) {
        var c = e.request,
          s = e.url.pathname,
          n = e.sameOrigin;
        return "1" === c.headers.get("RSC") && n && !s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      function (e) {
        var c = e.url.pathname;
        return e.sameOrigin && !c.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      function (e) {
        return !e.sameOrigin;
      },
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
          {
            handlerDidError: function (e) {
              return _ref.apply(this, arguments);
            },
          },
        ],
      }),
      "GET"
    );
});
