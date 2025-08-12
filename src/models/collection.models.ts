export interface Collection {
  id: string;
  storeId: string;
  name: string;
  imageUrl: string;
  createdAt: string; // ISO 8601 date string (Firestore Timestamp converted)
}