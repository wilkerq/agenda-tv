'use server';

import type { ReschedulingSuggestion } from './types';
import { logAction } from './audit-log';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';


const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

let adminApp: App;

function initializeAdminApp() {
    if (!getApps().length) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        adminApp = getApps()[0]!;
    }
}
initializeAdminApp();

const adminDb = getFirestore(adminApp);

/**
 * Executes rescheduling changes in Firestore after user approval.
 */
export async function reallocateConflictingEvents(
    suggestions: ReschedulingSuggestion[],
    adminUserEmail: string
): Promise<{ success: boolean; message: string; updatedIds: string[] }> {
    
    if (!adminDb) {
        throw new Error("A conexão com o banco de dados do administrador não está disponível.");
    }

    if (!suggestions || suggestions.length === 0) {
        return { success: false, message: "Nenhuma sugestão fornecida.", updatedIds: [] };
    }

    const batch = adminDb.batch();
    const updatedEventIds: string[] = [];
    const batchId = `reallocate-${Date.now()}`;

    try {
        for (const sug of suggestions) {
            const eventRef = adminDb.collection('events').doc(sug.conflictingEventId);
            
            const fieldToUpdate = sug.role;
            const replacementValue = sug.suggestedReplacement || null;

            batch.update(eventRef, {
                [fieldToUpdate]: replacementValue
            });

            updatedEventIds.push(sug.conflictingEventId);
            
            await logAction({
                action: 'reallocate',
                collectionName: 'events',
                documentId: sug.conflictingEventId,
                userEmail: adminUserEmail,
                details: {
                    originalPerson: sug.personToMove,
                    newPerson: replacementValue,
                    role: fieldToUpdate,
                    reason: 'Travel conflict resolution.'
                },
                batchId,
            });
        }

        await batch.commit();

        return {
            success: true,
            message: `Reescalonamento concluído. ${updatedEventIds.length} eventos foram atualizados.`,
            updatedIds: updatedEventIds,
        };

    } catch (error) {
        console.error("Erro ao reescalonar eventos no Firestore:", error);
        return {
            success: false,
            message: "Falha ao executar o reescalonamento no banco de dados.",
            updatedIds: [],
        };
    }
}
