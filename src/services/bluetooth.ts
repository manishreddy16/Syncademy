// Bluetooth & Nearby Sharing service
// Enables file sharing between nearby devices

export interface ShareableFile {
  name: string;
  type: 'assignment' | 'resource' | 'payment_info';
  data: any;
  timestamp: number;
}

// Check if Web Bluetooth is available
export const isBluetoothAvailable = (): boolean => {
  return 'bluetooth' in navigator;
};

// Check if Web Share API is available
export const isWebShareAvailable = (): boolean => {
  return 'share' in navigator;
};

// Check if Nearby Connections API is available
export const isNearbyConnectionsAvailable = (): boolean => {
  return 'share' in navigator; // Using Web Share as a fallback
};

// Share file via Web Bluetooth (simplified approach using native navigation)
export const shareViaBluetoothNavigation = async (file: ShareableFile): Promise<void> => {
  if (!isWebShareAvailable()) {
    throw new Error('Web Share API is not available on this device');
  }

  try {
    const shareData = {
      title: `Syncademy - ${file.type}`,
      text: `Shared from Syncademy: ${file.name}`,
      url: window.location.href, // In production, this should be a specific share link
    };

    if ('share' in navigator) {
      await navigator.share(shareData);
    } else {
      throw new Error('Share not available');
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
      throw error;
    }
  }
};

// Simulate Bluetooth file transfer
export const simulateBluetoothTransfer = async (file: ShareableFile, deviceName: string): Promise<void> => {
  // In production, this would use Web Bluetooth API to:
  // 1. Request device
  // 2. Connect to GATT server
  // 3. Find the service
  // 4. Write data to characteristics

  try {
    console.log(`Simulating Bluetooth transfer to ${deviceName}...`);

    // Simulate data preparation
    const jsonData = JSON.stringify(file);
    const chunkSize = 20; // Max BLE packet size
    const chunks = [];

    for (let i = 0; i < jsonData.length; i += chunkSize) {
      chunks.push(jsonData.slice(i, i + chunkSize));
    }

    console.log(`Would send ${chunks.length} chunks to ${deviceName}`);

    // In production, this would actually send the chunks:
    // const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['service-uuid'] }] });
    // const server = await device.gatt.connect();
    // const service = await server.getPrimaryService('service-uuid');
    // const characteristic = await service.getCharacteristic('characteristic-uuid');
    // for (const chunk of chunks) {
    //   await characteristic.writeValue(new TextEncoder().encode(chunk));
    // }

    // Simulate success
    console.log(`Successfully sent ${file.name} to ${deviceName}`);
  } catch (error) {
    console.error('Bluetooth transfer failed:', error);
    throw error;
  }
};

// Get available nearby devices (simulated)
export const getNearbyDevices = async (): Promise<string[]> => {
  // In production, this would use:
  // - Nearby Connections API
  // - Web Bluetooth scanning
  // - Network service discovery

  try {
    // Simulated list of nearby devices
    // In production, this would be discovered dynamically
    return [
      'Student Tablet 1',
      'Student Tablet 2',
      'Teacher Laptop',
      'School Server',
    ];
  } catch (error) {
    console.error('Error getting nearby devices:', error);
    return [];
  }
};

// Prepare file for sharing
export const createShareableFile = (
  name: string,
  type: 'assignment' | 'resource' | 'payment_info',
  data: any
): ShareableFile => {
  return {
    name,
    type,
    data,
    timestamp: Date.now(),
  };
};

// Deep link for sharing (for OS-level sharing)
export const generateShareLink = (file: ShareableFile): string => {
  const encoded = btoa(JSON.stringify(file));
  return `${window.location.origin}?shared=${encoded}`;
};

// Handle incoming shared files
export const handleIncomingShare = (shareData: string): ShareableFile | null => {
  try {
    const decoded = atob(shareData);
    return JSON.parse(decoded) as ShareableFile;
  } catch (error) {
    console.error('Error decoding share data:', error);
    return null;
  }
};

// Request permissions for Bluetooth (if needed)
export const requestBluetoothPermission = async (): Promise<boolean> => {
  try {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'bluetooth' } as PermissionDescriptor);
      return result.state === 'granted' || result.state === 'prompt';
    }
    return true;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};
