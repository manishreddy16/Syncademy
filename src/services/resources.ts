// Resources service
// Manages PDF uploads, downloads, offline storage, and sync

import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, getStorage, getDownloadURL } from 'firebase/storage';
import { getOfflineItemsByPrefix, setOfflineItem, removeOfflineItem, savePending } from '../utils/offlineStorage';

const resourcesCollection = collection(db, 'resources');
const storage = getStorage();

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const base64ToBlob = (dataURI: string): Blob => {
  const [prefix, base64] = dataURI.split(',');
  const byteString = atob(base64);
  const mimeString = prefix.split(':')[1].split(';')[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
};

export interface Resource {
  id?: string;
  name: string;
  description?: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt?: number;
  schoolId: string;
  url?: string;
  synced?: boolean;
  base64Data?: string;
  offline?: boolean;
  offlineKey?: string;
}

export const uploadResource = async (
  file: File,
  schoolId: string,
  uid: string,
  description: string = '',
  onProgress?: (progress: number) => void
): Promise<Resource> => {
  try {
    // Validate file type and size
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }

    const storageRef = ref(storage, `resources/${schoolId}/${uid}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const resource: Resource = {
      name: file.name,
      description,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: uid,
      uploadedAt: Date.now(),
      schoolId,
      url: downloadURL,
      synced: true,
    };

    const docRef = await addDoc(resourcesCollection, {
      fileName: file.name,
      downloadURL,
      uploadedBy: uid,
      schoolId,
      fileSize: file.size,
      fileType: file.type,
      description,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...resource,
    };
  } catch (error) {
    console.error('Error uploading resource:', error);
    throw error;
  }
};

export const uploadResourceOffline = async (
  file: File,
  schoolId: string,
  uid: string,
  description: string = ''
): Promise<void> => {
  // Validate file type and size
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File size must be less than 10MB');
  }

  const key = `resource_${uid}_${Date.now()}`;
  const base64 = await blobToBase64(file);
  const resource: Resource = {
    name: file.name,
    description,
    fileSize: file.size,
    fileType: file.type,
    uploadedBy: uid,
    uploadedAt: Date.now(),
    schoolId,
    synced: false,
    base64Data: base64,
    offlineKey: key,
  };

  await setOfflineItem(key, resource, true);
  await savePending('resources', {
    fileName: file.name,
    downloadURL: '', // Will be set when synced
    uploadedBy: uid,
    schoolId,
    fileSize: file.size,
    fileType: file.type,
    description,
    base64Data: base64,
    offlineKey: key,
    key,
  });
};

export const downloadResourceForOffline = async (resourceId: string, resource: Resource): Promise<void> => {
  try {
    if (!resource.url) {
      throw new Error('Resource URL not found');
    }

    const storageRef = ref(storage, resource.url);
    const fileBytes = await getBytes(storageRef);
    const fileBlob = new Blob([fileBytes], { type: resource.fileType });
    const base64 = await blobToBase64(fileBlob);

    await setOfflineItem(`resource_${resourceId}`, {
      ...resource,
      base64Data: base64,
      downloadedAt: Date.now(),
      offline: true,
    });
  } catch (error) {
    console.error('Error downloading resource:', error);
    throw error;
  }
};

export const getSchoolResources = async (schoolId: string): Promise<Resource[]> => {
  try {
    const q = query(resourcesCollection, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);

    const onlineResources = snapshot.docs
      .map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          name: data.fileName,
          description: data.description || '',
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedBy: data.uploadedBy,
          uploadedAt: data.createdAt?.toMillis() || Date.now(),
          schoolId: data.schoolId,
          url: data.downloadURL,
          synced: true,
        } as Resource;
      })
      .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

    const offlineResources = (await getOfflineItemsByPrefix('resource_'))
      .map((item) => item.value as Resource)
      .filter((resource) => resource.schoolId === schoolId)
      .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

    return [...offlineResources, ...onlineResources];
  } catch (error) {
    console.error('Error getting resources:', error);

    const offlineResources = (await getOfflineItemsByPrefix('resource_'))
      .map((item) => item.value as Resource)
      .filter((resource) => resource.schoolId === schoolId)
      .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

    return offlineResources;
  }
};

export const syncOfflineResource = async (resourceData: any): Promise<void> => {
  try {
    const blob = base64ToBlob(resourceData.base64Data || '');
    const storageRef = ref(storage, `resources/${resourceData.schoolId}/${resourceData.uploadedBy}/${Date.now()}_${resourceData.fileName || resourceData.name}`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    await addDoc(resourcesCollection, {
      fileName: resourceData.fileName || resourceData.name,
      downloadURL,
      uploadedBy: resourceData.uploadedBy,
      schoolId: resourceData.schoolId,
      fileSize: resourceData.fileSize,
      fileType: resourceData.fileType,
      description: resourceData.description || '',
      createdAt: serverTimestamp(),
    });

    if (resourceData.offlineKey || resourceData.key) {
      await removeOfflineItem(resourceData.offlineKey || resourceData.key);
    }
  } catch (error) {
    console.error('Error syncing offline resource:', error);
    throw error;
  }
};

export const getPendingUploads = async (schoolId: string): Promise<any[]> => {
  try {
    const pendingItems = await getOfflineItemsByPrefix('resource_');
    return pendingItems
      .map((item) => item.value)
      .filter((resource: any) => resource.schoolId === schoolId && !resource.synced)
      .sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
  } catch (error) {
    console.error('Error getting pending uploads:', error);
    return [];
  }
};

export const deleteResource = async (resourceId: string, url: string): Promise<void> => {
  try {
    await deleteDoc(doc(resourcesCollection, resourceId));

    if (url) {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    }

    await removeOfflineItem(`resource_${resourceId}`);
  } catch (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
};
