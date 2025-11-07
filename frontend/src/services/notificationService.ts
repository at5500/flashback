/**
 * Notification Service
 * Handles browser notifications and permission management
 */

export class NotificationService {
  private static instance: NotificationService;
  private permissionGranted: boolean = false;

  private constructor() {
    this.checkPermission();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if browser supports notifications
   */
  public isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check current permission status
   */
  private checkPermission(): void {
    if (this.isSupported()) {
      this.permissionGranted = Notification.permission === 'granted';
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission was denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show a notification
   */
  public async show(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported');
      return;
    }

    // Request permission if not yet granted
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        ...options,
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show a message notification
   */
  public async showMessageNotification(
    senderName: string,
    message: string,
    conversationId?: string
  ): Promise<void> {
    await this.show(`New message from ${senderName}`, {
      body: message,
      tag: conversationId || 'message',
      requireInteraction: false,
    });
  }

  /**
   * Get permission status
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Check if permission is granted
   */
  public hasPermission(): boolean {
    return this.permissionGranted;
  }
}

export default NotificationService.getInstance();