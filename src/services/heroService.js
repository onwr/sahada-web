import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDoc,
    doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Mock Data for Fallback
const DEFAULT_SLIDES = [
  {
    id: '1',
    title: 'Maç Eksik Olmasın.',
    subtitle: "İster saha kirala, ister eksik oyuncunu bul. Türkiye'nin en büyük sporcu topluluğu ile sahaya çıkmaya hazırsın.",
    buttonText: 'Hemen Başla',
    buttonLink: '/facilities',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2070&auto=format&fit=crop',
    isActive: true,
    order: 1
  },
  {
    id: '2',
    title: 'Rakip Bul, Maç Yap',
    subtitle: "Kendi seviyende rakiplerle karşılaşmak için hemen ilan oluştur veya mevcut maçlara katıl.",
    buttonText: 'Maç Bul',
    buttonLink: '/find-player',
    imageUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=2540&auto=format&fit=crop',
    isActive: true,
    order: 2
  }
];

export const getHeroContent = async () => {
    const content = {
        slides: DEFAULT_SLIDES,
        match: null,
        facility: null,
        player: null,
        tournament: null
    };

    try {
        // 1. Fetch Slides
        const slidesQuery = query(collection(db, 'hero_slides'), where('isActive', '==', true), orderBy('order', 'asc'));
        const slidesSnap = await getDocs(slidesQuery);
        if (!slidesSnap.empty) {
            content.slides = slidesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // 2. Fetch One Urgent Match
        // Assuming 'openMatches' has 'date' and possibly a 'missingPlayers' count
        const matchQuery = query(collection(db, 'openMatches'), orderBy('date', 'asc'), limit(1));
        const matchSnap = await getDocs(matchQuery);
        if (!matchSnap.empty) {
            const data = matchSnap.docs[0].data();
            content.match = {
                id: matchSnap.docs[0].id,
                title: data.title || 'Maç',
                missing: data.missingPlayers || 1, // Fallback
                date: data.date?.toDate ? data.date.toDate() : new Date(),
                location: data.location || 'Konum Belirtilmedi',
                type: data.sportType || 'Futbol' // For icon logic
            };
        } else {
             // Mock fallback if DB is empty
             content.match = {
                id: 'mock_match',
                title: 'Vadi İstanbul Maçı',
                missing: 2,
                date: new Date(),
                location: 'Vadi İstanbul',
                type: 'Basketbol'
             };
        }

        // 3. Fetch One Featured Facility
        const facilityQuery = query(collection(db, 'facilities'), orderBy('rating', 'desc'), limit(1));
        const facilitySnap = await getDocs(facilityQuery);
        if (!facilitySnap.empty) {
            const data = facilitySnap.docs[0].data();
            content.facility = {
                id: facilitySnap.docs[0].id,
                name: data.name,
                rating: data.rating || 5.0,
                district: data.district || 'İstanbul',
                city: data.city || '',
                type: data.type || 'Spor Tesisi'
            };
        } else {
            content.facility = {
                id: 'mock_facility',
                name: 'Arena Mega',
                rating: 4.8,
                district: 'Şişli',
                city: 'İstanbul',
                type: 'Futbol'
            };
        }

        // 4. Fetch One Featured Player
        const playerQuery = query(collection(db, 'users'), where('role', '==', 'player'), limit(1)); // Simple limit 1
        const playerSnap = await getDocs(playerQuery);
        if (!playerSnap.empty) {
            const data = playerSnap.docs[0].data();
            content.player = {
                id: playerSnap.docs[0].id,
                name: data.displayName || data.name || 'Sporcu',
                position: data.position || 'Oyuncu',
                quote: data.bio || "Sahada olmayı seviyorum.",
                initials: (data.displayName || 'X').substring(0,2).toUpperCase()
            };
        } else {
             content.player = {
                id: 'mock_player',
                name: 'Burak Yılmaz',
                position: 'Profesyonel Forvet',
                quote: "Hafta içi akşam maçlarına çağırabilirsiniz. Kondisyonum yerinde.",
                initials: 'BY'
            };
        }

        // 5. Fetch One Tournament
        const tournamentQuery = query(collection(db, 'tournaments'), where('status', '==', 'active'), limit(1));
        const tournamentSnap = await getDocs(tournamentQuery);
        if (!tournamentSnap.empty) {
            const data = tournamentSnap.docs[0].data();
            content.tournament = {
                id: tournamentSnap.docs[0].id,
                name: data.name,
                status: 'Kayıtlar Başladı', // Or derive from dates
                percentFull: 75 // Mock or calc
            };
        } else {
             content.tournament = {
                id: 'mock_tournament',
                name: 'Kış Kupası 2024',
                status: 'Kayıtlar Başladı',
                percentFull: 75
            };
        }

    } catch (error) {
        console.error("Hero content fetch error:", error);
        // Fallback to mocks is already handled by initial values or individual else blocks, 
        // but explicit error handling helps keep the UI stable.
    }

    return content;
};
