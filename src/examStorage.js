const DATABASE_NAME = 'imbs-cbt-drafts';
const DATABASE_VERSION = 1;
const sessionKeys = new Map();
let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve,reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Browser ini tidak menyediakan IndexedDB.'));
    const request = indexedDB.open(DATABASE_NAME,DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('sessions')) database.createObjectStore('sessions',{keyPath:'sessionId'});
      if (!database.objectStoreNames.contains('answers')) {
        const answers = database.createObjectStore('answers',{keyPath:'key'});
        answers.createIndex('sessionId','sessionId',{unique:false});
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {databasePromise=null;reject(request.error || new Error('IndexedDB tidak dapat dibuka.'));};
    request.onblocked = () => {databasePromise=null;reject(new Error('IndexedDB sedang dipakai tab lain. Tutup tab ujian duplikat lalu buka ulang halaman.'));};
  });
  return databasePromise;
}

function transactionResult(transaction,request) {
  return new Promise((resolve,reject) => {
    let result;
    request.onsuccess = () => {result=request.result;};
    request.onerror = () => reject(request.error || new Error('Operasi IndexedDB gagal.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Transaksi IndexedDB gagal.'));
    transaction.onabort = () => reject(transaction.error || new Error('Transaksi IndexedDB dibatalkan.'));
  });
}

export async function verifyEncryptedStorage() {
  if (!globalThis.crypto?.subtle) throw new Error('Browser tidak mendukung enkripsi Web Crypto yang diperlukan untuk draf lokal.');
  const database = await openDatabase();
  const sessionId = `probe-${crypto.randomUUID?.() || Date.now()}`;
  const key = await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  try {
    const tx = database.transaction('sessions','readwrite');
    const store = tx.objectStore('sessions');
    store.put({sessionId,key,sequence:0});
    const stored = await transactionResult(tx,store.get(sessionId));
    if (!stored?.key || stored.key.algorithm?.name !== 'AES-GCM') throw new Error('Browser tidak dapat menyimpan kunci enkripsi secara lokal.');
  } finally {
    const tx = database.transaction('sessions','readwrite');
    tx.objectStore('sessions').delete(sessionId);
    await new Promise((resolve,reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Gagal membersihkan pemeriksaan penyimpanan.'));
      tx.onabort = () => reject(tx.error || new Error('Pembersihan pemeriksaan penyimpanan dibatalkan.'));
    });
  }
}

async function getSessionKey(sessionId) {
  const id = String(sessionId);
  if (sessionKeys.has(id)) return sessionKeys.get(id);
  const database = await openDatabase();
  const tx = database.transaction('sessions','readonly');
  const existing = await transactionResult(tx,tx.objectStore('sessions').get(id));
  if (existing?.key) {
    sessionKeys.set(id,existing.key);
    return existing.key;
  }
  const key = await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const saveTx = database.transaction('sessions','readwrite');
  saveTx.objectStore('sessions').put({sessionId:id,key,sequence:0});
  await new Promise((resolve,reject) => {
    saveTx.oncomplete = resolve;
    saveTx.onerror = () => reject(saveTx.error || new Error('Gagal menyimpan kunci draf ujian.'));
  });
  sessionKeys.set(id,key);
  return key;
}

export async function saveDraft(sessionId,questionId,answer) {
  const id = String(sessionId);
  const qid = String(questionId);
  const key = await getSessionKey(id);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(String(answer ?? ''));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plaintext);
  const database = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = database.transaction(['sessions','answers'],'readwrite');
    const sessions = tx.objectStore('sessions');
    const request = sessions.get(id);
    let sequence;
    request.onsuccess = () => {
      const session = request.result || {sessionId:id,key,sequence:0};
      sequence = Number(session.sequence || 0) + 1;
      sessions.put({...session,sequence});
      tx.objectStore('answers').put({
        key:`${id}:${qid}`,sessionId:id,questionId:qid,iv:[...iv],ciphertext,sequence,dirty:true,
      });
    };
    request.onerror = () => tx.abort();
    tx.oncomplete = () => resolve(sequence);
    tx.onerror = () => reject(tx.error || new Error('Gagal menyimpan jawaban terenkripsi.'));
    tx.onabort = () => reject(tx.error || new Error('Penyimpanan jawaban dibatalkan.'));
  });
}

export async function getDrafts(sessionId) {
  const id = String(sessionId);
  const key = await getSessionKey(id);
  const database = await openDatabase();
  const tx = database.transaction('answers','readonly');
  const records = await transactionResult(tx,tx.objectStore('answers').index('sessionId').getAll(id));
  return Promise.all(records.map(async record => {
    const plaintext = await crypto.subtle.decrypt(
      {name:'AES-GCM',iv:new Uint8Array(record.iv)},key,record.ciphertext,
    );
    return {
      questionId:record.questionId,
      answer:new TextDecoder().decode(plaintext),
      sequence:record.sequence,
      dirty:Boolean(record.dirty),
    };
  }));
}

export async function markDraftSynced(sessionId,questionId,sequence) {
  const id = String(sessionId);
  const database = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = database.transaction('answers','readwrite');
    const store = tx.objectStore('answers');
    const key = `${id}:${String(questionId)}`;
    const request = store.get(key);
    request.onsuccess = () => {
      const record = request.result;
      if (record && record.sequence === sequence) store.put({...record,dirty:false});
    };
    request.onerror = () => tx.abort();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Status sinkronisasi draf gagal diperbarui.'));
    tx.onabort = () => reject(tx.error || new Error('Pembaruan status draf dibatalkan.'));
  });
}

export async function deleteSessionDrafts(sessionId) {
  const id = String(sessionId);
  const database = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = database.transaction(['sessions','answers'],'readwrite');
    const answers = tx.objectStore('answers');
    const request = answers.index('sessionId').getAllKeys(id);
    request.onsuccess = () => request.result.forEach(key => answers.delete(key));
    tx.objectStore('sessions').delete(id);
    request.onerror = () => tx.abort();
    tx.oncomplete = () => {sessionKeys.delete(id);resolve();};
    tx.onerror = () => reject(tx.error || new Error('Gagal menghapus draf sesi yang selesai.'));
    tx.onabort = () => reject(tx.error || new Error('Penghapusan draf dibatalkan.'));
  });
}
