/**
 * Sound Service
 * Handles notification sounds
 */

export class SoundService {
  private static instance: SoundService;
  private audio: HTMLAudioElement | null = null;

  // Simple notification sound as data URL (short beep)
  private readonly NOTIFICATION_SOUND =
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHF2S57OihUQwMUKfk77RgGwU7k9f0y3krBSl+zPDckEELFGCz6OyoVRYKRp/h8sFuJAUuf9Dx2Yk1Bxdmuevom1AOC1Km5O+zXxsGPJPY9Mx5KgYnfczw3Y9CCxRhtOjrp1UYCkef4vLBbiQFMIHR89mINQcYZ7nq5ptRDAlPpuPwsl4bBT2T2PTLeSoGJ37L8NuQQgsUYbTo7KdVGAlHn+Lzv24kBSyBzvLYiDQHGGS56+ecUA0LTqXj8bJeGwU+lNr0yXkpBCZ8y/DckUMMFGC05+yoVhoLR5/i88FuIwYtgs/z2ogzBhhku+vmnFAMCU6k5O+xXRsFPZLY9ct6LAUmfczx3JBDCxRgtOjsp1YaCUee4vPAbSMFLYHP89qINAcZZbvs6JtQCwhMo+XvsFwcBT2T2fTJeiwGJ33M8dySRAsPXrPp7KlXGwpJoOLzwWwhBSuBzvLaiTUIF2W76+icUQwJS6Pk77BeHAU9k9n0ynosBSh+zPLckMMLE160B63YrxwGOZPW9Np5LAYB33N8dyXFwZtRDApMpeTusV0bBT2U2vXKeS4HKX/N8tySQwsUYrTo7KdVGgpIoOHz';

  private constructor() {
    this.initAudio();
  }

  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  /**
   * Initialize audio element
   */
  private initAudio(): void {
    try {
      this.audio = new Audio(this.NOTIFICATION_SOUND);
      this.audio.volume = 0.5; // Set volume to 50%
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  /**
   * Play notification sound
   */
  public async play(): Promise<void> {
    if (!this.audio) {
      console.warn('[Sound] Audio not initialized');
      return;
    }

    try {
      // Reset audio to beginning
      this.audio.currentTime = 0;

      console.log('[Sound] Playing notification sound...');

      // Play the sound
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        await playPromise;
        console.log('[Sound] Notification sound played successfully');
      }
    } catch (error) {
      // Log autoplay policy errors for debugging
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
          console.warn('[Sound] Browser blocked autoplay. User interaction required first.');
        } else {
          console.error('[Sound] Failed to play notification sound:', error);
        }
      }
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  public setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Test the notification sound
   */
  public async test(): Promise<void> {
    await this.play();
  }
}

export default SoundService.getInstance();