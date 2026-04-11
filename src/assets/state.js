const ua = navigator.userAgent
export const isMobile =
  navigator.userAgentData?.mobile ??
  (/Mobi|Android|iPhone|iPad|iPod/i.test(ua) || navigator.maxTouchPoints > 1)

export const state = {
  route: {
    current: null,
    previous: null,
  },
}
