# Хянагч харагдахгүй байгаа асуудлыг шалгах

## Шалгах алхамууд:

### 1. Browser Console-ийг нээж алдаа шалгах
- Mobile апп дээр F12 дарж Developer Tools нээнэ үү
- Console таб руу очоод ямар нэгэн улаан алдаа байгаа эсэхийг шалгана уу
- Ялангуяа "index" эсвэл "permission" гэсэн үгтэй алдаа байвал надад хуваалцана уу

### 2. Firestore-ийн өгөгдлийг шалгах
Dashboard дээр баримтын хуудас руу орж, Browser Console дээр дараах кодыг ажиллуулна уу:

```javascript
// Баримтын мэдээллийг харах
const docId = window.location.pathname.split('/').pop();
console.log('Document ID:', docId);

// Firestore-ээс баримтыг татах
const { getFirestore, doc, getDoc } = await import('firebase/firestore');
const db = getFirestore();
const docRef = doc(db, 'er_documents', docId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('Document data:', {
        status: data.status,
        reviewers: data.reviewers,
        approvalStatus: data.approvalStatus
    });
} else {
    console.log('Document not found!');
}
```

### 3. Хянагчаар сонгосон ажилтны мэдээллийг шалгах
Mobile апп дээр нэвтэрсэн ажилтны мэдээллийг шалгах:

```javascript
// Mobile апп дээр Console-д ажиллуулах
const { getAuth } = await import('firebase/auth');
const { getFirestore, doc, getDoc } = await import('firebase/firestore');

const auth = getAuth();
const db = getFirestore();
const user = auth.currentUser;

console.log('Current User UID:', user?.uid);

if (user) {
    const empRef = doc(db, 'employees', user.uid);
    const empSnap = await getDoc(empRef);
    
    if (empSnap.exists()) {
        const empData = empSnap.data();
        console.log('Employee data:', {
            id: empSnap.id,
            firstName: empData.firstName,
            lastName: empData.lastName,
            positionId: empData.positionId
        });
    }
}
```

### 4. Шүүлтүүрийн логикийг шалгах
Mobile апп дээр баримтуудыг татаж байгаа query-г шалгах:

```javascript
// Mobile апп дээр
const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
const { getAuth } = await import('firebase/auth');

const db = getFirestore();
const auth = getAuth();
const user = auth.currentUser;

if (user) {
    const empRef = doc(db, 'employees', user.uid);
    const empSnap = await getDoc(empRef);
    const empData = empSnap.data();
    
    const reviewerIds = [user.uid];
    if (empData?.positionId) reviewerIds.push(empData.positionId);
    
    console.log('Searching with reviewer IDs:', reviewerIds);
    
    const q = query(
        collection(db, 'er_documents'),
        where('reviewers', 'array-contains-any', reviewerIds),
        where('status', '==', 'IN_REVIEW')
    );
    
    const snapshot = await getDocs(q);
    console.log('Found documents:', snapshot.size);
    snapshot.forEach(doc => {
        console.log('Doc:', doc.id, doc.data());
    });
}
```

## Надад хэрэгтэй мэдээлэл:

Эдгээр кодуудыг ажиллуулж, дараах мэдээллийг надад өгнө үү:

1. **Dashboard дээр баримтын мэдээлэл:**
   - Document ID
   - status
   - reviewers массив
   - approvalStatus объект

2. **Mobile апп дээр ажилтны мэдээлэл:**
   - User UID
   - Employee ID
   - Position ID
   - Нэр

3. **Query-н үр дүн:**
   - Олдсон баримтын тоо
   - Ямар алдаа гарсан эсэх

4. **Console-ийн алдаа:**
   - Улаан өнгөтэй алдааны мэдээлэл байвал бүгдийг нь
