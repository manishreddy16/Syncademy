import { useState, useEffect } from 'react';
import {
  isBluetoothAvailable,
  isWebShareAvailable,
  shareViaBluetoothNavigation,
  getNearbyDevices,
  simulateBluetoothTransfer,
  createShareableFile,
} from '../services/bluetooth';

interface FileSharingComponentProps {
  fileName: string;
  fileType: 'assignment' | 'resource' | 'payment_info';
  fileData: any;
}

export const FileSharingComponent = ({ fileName, fileType, fileData }: FileSharingComponentProps) => {
  const [isBluetoothAvail, setIsBluetoothAvail] = useState(false);
  const [isWebShareAvail, setIsWebShareAvail] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState<string[]>([]);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    setIsBluetoothAvail(isBluetoothAvailable());
    setIsWebShareAvail(isWebShareAvailable());

    const loadNearbyDevices = async () => {
      const devices = await getNearbyDevices();
      setNearbyDevices(devices);
    };

    if (isBluetoothAvailable()) {
      loadNearbyDevices();
    }
  }, []);

  const handleShare = async () => {
    if (!isWebShareAvail && !isBluetoothAvail) {
      alert('Sharing is not supported on this device');
      return;
    }

    try {
      const shareFile = createShareableFile(fileName, fileType, fileData);
      await shareViaBluetoothNavigation(shareFile);
    } catch (error) {
      console.error('Sharing failed:', error);
      alert('Sharing failed. Please try again.');
    }
  };

  const handleBluetoothShare = async (device: string) => {
    try {
      setSharing(true);
      const shareFile = createShareableFile(fileName, fileType, fileData);
      await simulateBluetoothTransfer(shareFile, device);
      setShowDeviceList(false);
      setSelectedDevice(null);
    } catch (error) {
      console.error('Bluetooth transfer failed:', error);
      alert('Transfer failed. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      {isWebShareAvail && (
        <button
          onClick={handleShare}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition"
          title="Share via native share"
        >
          📤 Share
        </button>
      )}

      {isBluetoothAvail && (
        <div className="relative">
          <button
            onClick={() => setShowDeviceList(!showDeviceList)}
            className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition"
            title="Share via Bluetooth"
            disabled={sharing}
          >
            🔵 {sharing ? 'Sending...' : 'Bluetooth'}
          </button>

          {showDeviceList && !sharing && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
              <div className="p-2">
                {nearbyDevices.length === 0 ? (
                  <p className="text-slate-400 text-xs p-2">No nearby devices found</p>
                ) : (
                  <div className="space-y-1">
                    {nearbyDevices.map((device) => (
                      <button
                        key={device}
                        onClick={() => handleBluetoothShare(device)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded transition"
                      >
                        📱 {device}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileSharingComponent;
