import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
const portal = registerPlugin('LichHocPortal');
const origin = 'https://schedule-information.vercel.app';
// API cookies use the native HTTP cookie jar; never store tokens in localStorage.
window.LHNative = {
  available: () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LichHocPortal'),
  async request(route, method = 'GET', data) {
    if (!/^[a-z][a-z0-9/-]*$/.test(route)) throw new Error('Invalid API route');
    const response = await CapacitorHttp.request({
      url: origin + '/api/' + route, method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc', Origin: origin },
      ...(data === undefined ? {} : { data }), responseType: 'json', disableRedirects: true,
      connectTimeout: 15000, readTimeout: 60000
    });
    return { status: response.status, payload: response.data };
  },
  read: options => portal.read(options)
};
