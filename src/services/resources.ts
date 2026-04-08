// Resources service
// Manages PDF uploads, downloads, and offline storage

import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, getStorage } from 'firebase/storage';
import { setOfflineItem, getOfflineItem, removeOfflineItem } from '../utils/offlineStorage';

const resourcesCollection = collection(db, 'resources');
const storage = getStorage();

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
}

// Upload PDF resource
export const uploadResource = async (
  file: File,
  schoolId: string,
  uid: string,
  description: string = ''
): Promise<Resource> => {
  try {
    // Upload to Firebase Storage
    const storageRef = ref(storage, `resources/${schoolId}/${uid}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);

    // Save metadata to Firestore
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

    const docRef = await addDoc(resourcesCollection, resource);

    return {
      id: docRef.id,
      ...resource,
    };
  } catch (error) {
    console.error('Error uploading resource:', error);
    throw error;
  }
};

// Upload PDF resource offline (store locally and sync later)
export const uploadResourceOffline = async (
  file: File,
  schoolId: string,
  uid: string,
  description: string = ''
): Promise<void> => {
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
  };

  const key = `resource_${uid}_${Date.now()}`;
  await setOfflineItem(key, resource, true); // Mark for sync
};

// Download resource for offline use
export const downloadResourceForOffline = async (resourceId: string, resource: Resource): Promise<void> => {
  try {
    if (!resource.url) {
      throw new Error('Resource URL not found');
    }

    const storageRef = ref(storage, resource.url);
    const fileBytes = await getBytes(storageRef);

    // Store in offline storage
    const key = `resource_${resourceId}`;
    const blob = new Blob([fileBytes], { type: resource.fileType });
    const base64 = await blobToBase64(blob);

    await setOfflineItem(key, {
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

// Get all resources for a school
export const getSchoolResources = async (schoolId: string): Promise<Resource[]> => {
  try {
    const q = query(resourcesCollection, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Resource));
  } catch (error) {
    console.error('Error getting resources:', error);
    return [];
  }
};

// Get offline resources
export const getOfflineResources = async (schoolId: string): Promise<Resource[]> => {
  try {
    // Get all offline resources
    const offlineResources: Resource[] = [];
    
    // This is a simplified approach - in production, you might want to store a list
    // For now, we'll just return what's requested
    
    return offlineResources;
  } catch (error) {
    console.error('Error getting offline resources:', error);
    return [];
  }
};

// Delete resource
export const deleteResource = async (resourceId: string, url: string): Promise<void> => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(resourcesCollection, resourceId));

    // Delete from Storage
    if (url) {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    }

    // Delete offline copy
    await removeOfflineItem(`resource_${resourceId}`);
  } catch (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
};
