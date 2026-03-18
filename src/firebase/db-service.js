import { db } from './config';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { getCurrentWeekId } from '../utils/week-helpers';

const toArray = (snapshot) => snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

export function listenToTemptations(uid, callback) {
    return onSnapshot(collection(db, `users/${uid}/temptations`), (snapshot) => {
        callback(toArray(snapshot));
    });
}

export function listenToDeposits(uid, callback) {
    return onSnapshot(collection(db, `users/${uid}/deposits`), (snapshot) => {
        callback(toArray(snapshot));
    });
}

export function listenToSettings(uid, callback) {
    return onSnapshot(doc(db, `users/${uid}/settings/preferences`), (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            callback(null);
        }
    });
}

export async function addTemptation(uid, item) {
    const { id: _discarded, ...itemData } = item;
    return addDoc(collection(db, `users/${uid}/temptations`), {
        ...itemData,
        weekId: getCurrentWeekId(),
        createdAt: new Date().toISOString()
    });
}

export async function updateUserSettings(uid, settings) {
    return setDoc(doc(db, `users/${uid}/settings/preferences`), settings, { merge: true });
}

export async function processConfirmation(uid, amount, items, interestRate = 0.045) {
    const batch = writeBatch(db);

    // Add deposit
    const depositRef = doc(collection(db, `users/${uid}/deposits`));
    batch.set(depositRef, {
        amount,
        confirmedAt: new Date().toISOString(),
        items: items.map(i => ({
            name: i.name,
            price: i.price,
            purchased: !!i.purchased,
            taxAmount: i.taxAmount || (i.price * 0.1) // fallback
        })),
        interestRate: interestRate // Lock in the rate at time of deposit
    });

    // Clear temptations
    items.forEach(item => {
        const itemRef = doc(db, `users/${uid}/temptations`, item.id);
        batch.delete(itemRef);
    });

    return batch.commit();
}

export async function deleteTemptation(uid, itemId) {
    return deleteDoc(doc(db, `users/${uid}/temptations`, itemId));
}

export async function resetData(uid) {
    const deleteInBatches = async (colPath) => {
        const snap = await getDocs(collection(db, colPath));
        const docs = snap.docs;

        for (let i = 0; i < docs.length; i += 500) {
            const chunk = docs.slice(i, i + 500);
            const batch = writeBatch(db);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    };

    await Promise.all([
        deleteInBatches(`users/${uid}/temptations`),
        deleteInBatches(`users/${uid}/deposits`)
    ]);
}
