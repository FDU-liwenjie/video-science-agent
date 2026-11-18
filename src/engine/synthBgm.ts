export async function createAmbientBgm(duration: number, sampleRate = 44100): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate)
  const chords = [
    [130.81, 164.81, 196.0],
    [98.0, 123.47, 146.83],
    [110.0, 130.81, 164.81],
    [87.31, 110.0, 130.81],
  ]
  const block = 4
  const blocks = Math.ceil(duration / block)

  for (let b = 0; b < blocks; b++) {
    const chord = chords[b % chords.length]
    const start = b * block
    for (const freq of chord) {
      for (const detune of [-3, 3]) {
        const osc = offline.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.detune.value = detune
        const gain = offline.createGain()
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.05, start + 1.2)
        gain.gain.setValueAtTime(0.05, start + block - 1.2)
        gain.gain.linearRampToValueAtTime(0, start + block)
        osc.connect(gain).connect(offline.destination)
        osc.start(start)
        osc.stop(start + block + 0.05)
      }
    }
  }

  return offline.startRendering()
}
