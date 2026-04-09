const audioContext = new (window.AudioContext)();

function playTone({ type = "sine", freq = 400, duration = 0.1, volume = 0.1 }) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

const sounds = {
  a:      () => playTone({ type: "sine",     freq: 600,  duration: 0.05 }),
  button: () => playTone({ type: "square",   freq: 1200, duration: 0.03 }),
  _doc:   () => playTone({ type: "sine",     freq: 200,  duration: 0.1  }),
};

document.addEventListener("click", (e) => {
  const tag = e.target.tagName.toLowerCase();
  const handler = sounds[tag] ?? sounds._doc;
  handler();
});

/*
  ┌──────────────────┬──────────┬──────┬──────────┐                                                                                           
  │      Estilo      │   type   │ freq │ duración │                                                                                           
  ├──────────────────┼──────────┼──────┼──────────┤                                                                                           
  │ Click UI suave   │ sine     │ 800  │ 0.05s    │                                                                                           
  ├──────────────────┼──────────┼──────┼──────────┤                                                                                           
  │ Teclado mecánico │ square   │ 1200 │ 0.03s    │                                                                                           
  ├──────────────────┼──────────┼──────┼──────────┤                                                                                           
  │ Retro/8-bit      │ square   │ 440  │ 0.08s    │                                                                                           
  ├──────────────────┼──────────┼──────┼──────────┤                                                                                           
  │ Bip agudo        │ triangle │ 3000 │ 0.06s    │                                                                                           
  └──────────────────┴──────────┴──────┴──────────┘                  
*/