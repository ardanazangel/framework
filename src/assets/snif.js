const ua = navigator.userAgent.toLowerCase()
const vendor = navigator.vendor ?? ''

export const snif = {
  isMobile:
    navigator.userAgentData?.mobile ??
    (/mobi|android|iphone|ipad|ipod/i.test(ua) || navigator.maxTouchPoints > 1),

  isSafari:
    vendor === 'Apple Computer, Inc.' &&
    ua.includes('safari/') &&
    !ua.includes('chrome/') &&
    !ua.includes('chromium/') &&
    !ua.includes('crios/') &&
    !ua.includes('fxios/') &&
    !ua.includes('edgios/'),

  isChromium:
    ua.includes('chrome/') ||
    ua.includes('chromium/') ||
    ua.includes('crios/') ||
    ua.includes('edg/'),

  isFirefox: ua.includes('firefox/'),
}
