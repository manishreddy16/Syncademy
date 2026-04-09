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
import { ref, uploadBytes, getBytes, deleteObject, getStorage } from 'firebase/storage';
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
  description: string = ''
): Promise<Resource> => {
  try {
    const storageRef = ref(storage, `resources/${schoolId}/${uid}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);

    const resource: Resource = {
      name: file.name,
      description,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: uid,
      uploadedAt: Date.now(),
      schoolId,
      url: snapshot.ref.fullPath,
    };

    const docRef = await addDoc(resourcesCollection, {
      ...resource,
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
    ...resource,
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
      .map((docItem) => ({ id: docItem.id, ...docItem.data() } as Resource))
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

export const syncOfflineResource = async (resourceData: Resource): Promise<void> => {
  try {
    const blob = base64ToBlob(resourceData.base64Data || '');
    const storageRef = ref(storage, `resources/${resourceData.schoolId}/${resourceData.uploadedBy}/${Date.now()}_${resourceData.name}`);
    await uploadBytes(storageRef, blob);

    await addDoc(resourcesCollection, {
      schoolId: resourceData.schoolId,
      name: resourceData.name,
      description: resourceData.description || '',
      fileSize: resourceData.fileSize,
      fileType: resourceData.fileType,
      uploadedBy: resourceData.uploadedBy,
      uploadedAt: Date.now(),
      url: storageRef.fullPath,
      synced: true,
      offlineKey: resourceData.offlineKey,
      createdAt: serverTimestamp(),
    });

    if (resourceData.offlineKey) {
      await removeOfflineItem(resourceData.offlineKey);
    }
  } catch (error) {
    console.error('Error syncing offline resource:', error);
    throw error;
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
