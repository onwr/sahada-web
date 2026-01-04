// Turnuva yardımcı fonksiyonları

// Round Robin maç eşleştirmelerini oluştur
// Her katılımcı diğerleriyle bir kez oynar
// N katılımcı için N*(N-1)/2 maç oluşturulur
export const generateRoundRobinMatches = (participants) => {
  if (!participants || participants.length < 2) {
    return [];
  }
  
  const matches = [];
  let matchNumber = 1;
  
  // Her katılımcı diğerleriyle eşleşir
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        round: 1,
        matchNumber: matchNumber++,
        participant1Id: participants[i].participantId || participants[i].id,
        participant2Id: participants[j].participantId || participants[j].id,
        participant1Name: participants[i].participantName || participants[i].name || '',
        participant2Name: participants[j].participantName || participants[j].name || ''
      });
    }
  }
  
  return matches;
};

// Puan hesaplama (galibiyet/beraberlik/mağlubiyet)
export const calculatePoints = (score1, score2, settings = {}) => {
  const pointsWin = settings.pointsWin || 3;
  const pointsDraw = settings.pointsDraw || 1;
  const pointsLoss = settings.pointsLoss || 0;
  const allowDraw = settings.allowDraw !== false;
  
  let points1 = pointsLoss;
  let points2 = pointsLoss;
  
  if (score1 > score2) {
    points1 = pointsWin;
  } else if (score2 > score1) {
    points2 = pointsWin;
  } else if (allowDraw) {
    points1 = pointsDraw;
    points2 = pointsDraw;
  }
  
  return { points1, points2 };
};

// Kazanan belirleme
export const determineWinner = (score1, score2, participant1Id, participant2Id) => {
  if (score1 > score2) {
    return participant1Id;
  } else if (score2 > score1) {
    return participant2Id;
  }
  return null; // Beraberlik
};

// Puan durumu sıralama
export const sortStandings = (standings) => {
  return [...standings].sort((a, b) => {
    // 1. Puan
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    
    // 2. Gol averajı
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    
    // 3. Atılan gol
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    
    // 4. Oynanan maç sayısı (daha az maç oynayan üstte)
    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }
    
    return 0;
  });
};

// Turnuva durumu kontrolü
export const canRegister = (tournament) => {
  console.log('🔐 canRegister kontrolü başladı:', {
    tournamentId: tournament?.id,
    tournamentName: tournament?.name,
    status: tournament?.status,
    registrationDeadline: tournament?.registrationDeadline
  });
  
  if (tournament.status !== 'registration_open') {
    console.log('❌ Kayıt kapalı - Status:', tournament.status);
    return false;
  }
  
  if (tournament.registrationDeadline) {
    const deadlineRaw = tournament.registrationDeadline;
    const deadlineDate = deadlineRaw.toDate ? 
      deadlineRaw.toDate() : 
      new Date(deadlineRaw);
    
    // Deadline'ı gün sonuna ayarla (23:59:59.999)
    const deadline = new Date(deadlineDate);
    deadline.setHours(23, 59, 59, 999);
    
    const now = new Date();
    const isPassed = now > deadline;
    
    console.log('📅 Deadline kontrolü:', {
      deadlineRaw,
      deadlineOriginal: deadlineDate.toISOString(),
      deadlineEndOfDay: deadline.toISOString(),
      now: now.toISOString(),
      isPassed,
      deadlineType: deadlineRaw?.toDate ? 'Firebase Timestamp' : typeof deadlineRaw
    });
    
    if (isPassed) {
      console.log('❌ Kayıt kapalı - Deadline geçmiş');
      return false;
    }
  }
  
  console.log('✅ Kayıt yapılabilir');
  return true;
};

// Turnuva başlangıç tarihi kontrolü
export const isTournamentStarted = (tournament) => {
  if (!tournament.startDate) {
    return false;
  }
  
  const startDate = tournament.startDate.toDate ? 
    tournament.startDate.toDate() : 
    new Date(tournament.startDate);
  
  return new Date() >= startDate;
};

// Turnuva bitiş tarihi kontrolü
export const isTournamentEnded = (tournament) => {
  if (!tournament.endDate) {
    return false;
  }
  
  const endDate = tournament.endDate.toDate ? 
    tournament.endDate.toDate() : 
    new Date(tournament.endDate);
  
  return new Date() > endDate;
};

// Katılımcı sayısı kontrolü
export const isTournamentFull = (tournament, participantCount) => {
  const max = tournament.type === 'team' ? 
    (tournament.maxTeams || 0) : 
    (tournament.maxParticipants || 0);
  
  return participantCount >= max;
};

// Format tarih (görüntüleme için)
export const formatTournamentDate = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format tarih ve saat
export const formatTournamentDateTime = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Turnuva durum etiketi
export const getTournamentStatusLabel = (status) => {
  const labels = {
    'draft': 'Taslak',
    'registration_open': 'Kayıtlar Açık',
    'registration_closed': 'Kayıtlar Kapalı',
    'ongoing': 'Devam Ediyor',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi'
  };
  
  return labels[status] || status;
};

// Turnuva durum rengi
export const getTournamentStatusColor = (status) => {
  const colors = {
    'draft': 'gray',
    'registration_open': 'green',
    'registration_closed': 'yellow',
    'ongoing': 'blue',
    'completed': 'purple',
    'cancelled': 'red'
  };
  
  return colors[status] || 'gray';
};

// Ödül dağıtım hesaplama
export const calculatePrizeDistribution = (prizePool, prizeDistribution) => {
  if (!prizePool || !prizeDistribution || prizeDistribution.length === 0) {
    return [];
  }
  
  return prizeDistribution.map(rule => ({
    rank: rule.rank,
    percentage: rule.percentage,
    amount: (prizePool * rule.percentage) / 100
  }));
};

// Skor formatı (görüntüleme için)
export const formatScore = (score1, score2) => {
  if (score1 === null || score2 === null) {
    return '-';
  }
  return `${score1} - ${score2}`;
};

// Skor girişlerini karşılaştır
export const compareScoreEntries = (scoreEntries) => {
  if (!scoreEntries || scoreEntries.length < 2) {
    return {
      match: false,
      needsVerification: true,
      scores: null
    };
  }
  
  const scores = scoreEntries.map(e => ({ score1: e.score1, score2: e.score2 }));
  const firstScore = scores[0];
  const allMatch = scores.every(s => s.score1 === firstScore.score1 && s.score2 === firstScore.score2);
  
  if (allMatch) {
    return {
      match: true,
      needsVerification: false,
      scores: firstScore
    };
  } else {
    return {
      match: false,
      needsVerification: true,
      scores: null,
      conflictingScores: scores
    };
  }
};

// Maç durumu etiketi
export const getMatchStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Planlandı',
    'ongoing': 'Devam Ediyor',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi'
  };
  
  return labels[status] || status;
};

