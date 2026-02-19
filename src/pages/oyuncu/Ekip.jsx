import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayerTeams, createTeam, addTeamMember, removeTeamMember, deleteTeam, getUserByEmail, getPlayerReservations, sendTeamInvitation, getUserByPhone, searchUserByName, searchUsers, respondToTeamInvitation } from '../../services/firestoreService';
import { uploadTeamImage } from '../../services/cdnService';
import { doc, getDoc, collection, query, onSnapshot, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OyuncuSidebar from '../../components/OyuncuSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import { 
  Users, 
  Plus, 
  Trophy, 
  Calendar, 
  Search, 
  X, 
  Save, 
  Mail,
  Phone,
  Crown,
  UserPlus,
  TrendingUp,
  Camera,
  Clock,
  MapPin,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import toast from '../../utils/toast';

const Ekip = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMatches, setTeamMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const fileInputRef = useRef(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Autocomplete states
  const [matchingUsers, setMatchingUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInvitee, setSelectedInvitee] = useState(null);
  const [teamForm, setTeamForm] = useState({ 
    name: '', 
    description: '',
    sport: 'football',
    maxMembers: 22
  });
  const [teamImageFile, setTeamImageFile] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(null);
  const [addingMember, setAddingMember] = useState(false);

  const cleanMessage = (msg) => {
    if (!msg || typeof msg !== 'string') return '';
    
    // Fix UTF-8 encoding issues (Mojibake)
    let cleaned = msg
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã§/g, 'ç')
      .replace(/ÅŸ/g, 'ş')
      .replace(/ÄŸ/g, 'ğ')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ä±/g, 'ı')
      .replace(/Ä°/g, 'İ')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Åž/g, 'Ş')
      .replace(/Äž/g, 'Ğ')
      .replace(/Ãœ/g, 'Ü');

    return cleaned;
  };

  useEffect(() => {
    if (!user) return;
    
    loadTeams();
    const cleanup = setupRealtimeListener();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const setupRealtimeListener = () => {
    if (!user) return;

    const teamsQuery = query(
      collection(db, 'teams'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = [];
      snapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error('Ekip listener hatası:', error);
      setLoading(false);
    });

    // Invitation Listener
    const invQ = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid), 
        where('type', '==', 'team_invitation'), 
        where('status', '==', 'pending')
    );
    const unsubscribeInv = onSnapshot(invQ, (snapshot) => {
        setInvitations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
        unsubscribe();
        unsubscribeInv();
    };
  };

  const loadTeams = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getPlayerTeams(user.uid);
      if (result.success) {
        setTeams(result.data);
      }
    } catch (err) {
      console.error('Ekipler yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!user || !teamForm.name) {
         toast.error("Lütfen takım adı giriniz.");
         return;
    }

    if (creating) return;
    setCreating(true);
    
    const toastId = toast.loading('Ekip oluşturuluyor...');
    try {
      const result = await createTeam({
        name: teamForm.name,
        description: teamForm.description,
        captainId: user.uid,
        members: [user.uid],
        sport: teamForm.sport,
        maxMembers: teamForm.maxMembers,
        status: 'active',
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesDrawn: 0,
        photoURL: null
      });
      
      if (result.success) {
        let photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(teamForm.name)}&background=10b981&color=fff&size=200`;
        
        if (teamImageFile) {
            try {
                const uploadResult = await uploadTeamImage(teamImageFile, result.id);
                if (uploadResult.success) {
                    photoURL = uploadResult.data?.url || uploadResult.data?.display_url || uploadResult.data;
                } else {
                    console.warn('Resim yüklenemedi:', uploadResult.error);
                    toast.error('Resim yüklenemedi, varsayılan görsel kullanılacak');
                }
            } catch (uploadErr) {
                console.error('Resim yükleme hatası:', uploadErr);
            }
        }
        
        await updateDoc(doc(db, 'teams', result.id), { photoURL });
        toast.dismiss(toastId);
        
        toast.success('Takım başarıyla oluşturuldu');
        setShowCreateModal(false);
        setTeamForm({ name: '', description: '', sport: 'football', maxMembers: 22 });
        setTeamImageFile(null);
        loadTeams();
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || 'Ekip oluşturulamadı');
      }
    } catch (err) {
      console.error('Ekip oluşturma hatası:', err);
      toast.dismiss(toastId);
      toast.error('Ekip oluşturulurken hata oluştu: ' + err.message);
    } finally {
        setCreating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTeamForm(prev => ({ ...prev, [name]: value }));
  };

  const loadTeamMembers = async (team) => {
    if (!team || !team.members) return;
    
    setLoadingMembers(true);
    try {
      const membersData = [];
      for (const memberId of team.members) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            membersData.push({
              id: memberId,
              fullName: userData.fullName || userData.displayName || 'Bilinmeyen',
              email: userData.email || '',
              phone: userData.phone || '',
              photoURL: userData.photoURL || null,
              position: userData.position || '',
              level: userData.level || ''
            });
          } else {
            membersData.push({
              id: memberId,
              fullName: 'Bilinmeyen Kullanıcı',
              email: '',
              phone: '',
              photoURL: null
            });
          }
        } catch (err) {
          console.error('Üye bilgisi yükleme hatası:', err);
        }
      }
      setTeamMembers(membersData);
    } catch (err) {
      console.error('Ekip üyeleri yükleme hatası:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadTeamMatches = async (team) => {
    if (!team || !team.members) return;
    
    try {
      // Tüm ekip üyelerinin rezervasyonlarını getir
      const allReservations = [];
      for (const memberId of team.members) {
        const result = await getPlayerReservations(memberId);
        if (result.success) {
          allReservations.push(...result.data);
        }
      }
      
      // Ekip üyelerinin birlikte oynadığı maçları bul
      const teamMatchesData = [];
      const matchGroups = new Map();
      
      allReservations.forEach(res => {
        if (res.players && Array.isArray(res.players)) {
          const teamPlayersInRes = res.players.filter(p => team.members.includes(p));
          if (teamPlayersInRes.length >= 2) {
            const key = `${res.tesisId}_${res.date}_${res.timeSlot}`;
            if (!matchGroups.has(key)) {
              matchGroups.set(key, {
                reservation: res,
                teamPlayers: teamPlayersInRes
              });
            }
          }
        }
      });
      
      teamMatchesData.push(...Array.from(matchGroups.values()).map(g => g.reservation));
      teamMatchesData.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      
      setTeamMatches(teamMatchesData);
    } catch (err) {
      console.error('Ekip maçları yükleme hatası:', err);
    }
  };

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam);
      loadTeamMatches(selectedTeam);
    }
  }, [selectedTeam]);

  const handleAddMember = async () => {
    if (!selectedTeam || !memberEmail.trim()) {
      toast.error('Lütfen email, telefon veya kullanıcı adı girin');
      return;
    }

    if (addingMember) return;
    setAddingMember(true);
    const toastId = toast.loading('Kullanıcı aranıyor...');

    try {
      let invitedUser = selectedInvitee;

      // Eğer listeden seçilmediyse manuel arama yap
      if (!invitedUser) {
        let userResult;
        // Email kontrolü
        if (memberEmail.includes('@')) {
             userResult = await getUserByEmail(memberEmail);
        } else {
             // Önce telefon numarası olarak dene
             userResult = await getUserByPhone(memberEmail);
             
             // Bulunamazsa isim olarak dene
             if (!userResult.success) {
                 userResult = await searchUserByName(memberEmail);
             }
        }

        if (!userResult.success) {
          toast.dismiss(toastId);
          toast.error(userResult.error || 'Kullanıcı bulunamadı');
          return;
        }
        invitedUser = userResult.data;
      }
      
      // Zaten ekipte mi kontrol et
      if (selectedTeam.members && selectedTeam.members.includes(invitedUser.id)) {
        toast.dismiss(toastId);
        toast.error('Bu kullanıcı zaten ekipte');
        return;
      }
      
      // Davet gönder
      const result = await sendTeamInvitation(selectedTeam.id, user.uid, invitedUser.id);
      
      toast.dismiss(toastId);
      if (result.success) {
        toast.success(`${invitedUser.fullName || invitedUser.displayName || 'Kullanıcı'} adlı kişiye davet gönderildi`);
        setShowAddMemberModal(false);
        setMemberEmail('');
        setSelectedInvitee(null);
        setMatchingUsers([]);
        setShowDropdown(false);
      } else {
        toast.error(result.error || 'Davet gönderilemedi');
      }
    } catch (err) {
      console.error('Üye ekleme hatası:', err);
      toast.dismiss(toastId);
      toast.error('Hata oluştu: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedTeam) return;
    
    if (!confirm('Bu üyeyi ekipten çıkarmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const result = await removeTeamMember(selectedTeam.id, memberId);
      if (result.success) {
        loadTeams();
        setSelectedTeam(prev => ({
          ...prev,
          members: prev.members.filter(id => id !== memberId)
        }));
      } else {
        alert(result.error || 'Üye çıkarılamadı');
      }
    } catch (err) {
      console.error('Üye çıkarma hatası:', err);
      alert('Hata oluştu');
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    // Double check confirmation even though modal handles it
    if (!window.confirm(`"${selectedTeam.name}" ekibini kalıcı olarak silmek istediğinizden emin misiniz?`)) return;

    try {
      const result = await deleteTeam(selectedTeam.id);
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedTeam(null);
        loadTeams();
        toast.success('Ekip başarıyla silindi');
      } else {
        toast.error(result.error || 'Ekip silinemedi');
      }
    } catch (err) {
      console.error('Ekip silme hatası:', err);
      toast.error('Ekip silinirken hata oluştu');
    }
  };

  const handleTeamImageUpdate = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeam) return;

    // Sadece kaptan değiştirebilir
    if (selectedTeam.captainId !== user.uid) {
        toast.error('Sadece takım kaptanı resmi değiştirebilir');
        return;
    }

    try {
        toast.loading('Takım resmi güncelleniyor...');
        const uploadResult = await uploadTeamImage(file, selectedTeam.id);
        
        if (uploadResult.success) {
             const imageUrl = uploadResult.data?.url || uploadResult.data; // Handle cdnService return structure
             
             await updateDoc(doc(db, 'teams', selectedTeam.id), {
                 photoURL: imageUrl,
                 updatedAt: new Date()
             });
             
             // Update local state
             setSelectedTeam(prev => ({
                 ...prev,
                 photoURL: imageUrl
             }));
             
             // Update in list
             setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, photoURL: imageUrl } : t));
             
             toast.dismiss();
             toast.success('Takım resmi güncellendi');
        } else {
            toast.dismiss();
            toast.error('Resim yüklenemedi: ' + uploadResult.error);
        }
    } catch (error) {
        console.error('Resim güncelleme hatası:', error);
        toast.dismiss();
        toast.error('Hata oluştu');
    }
  };



  const handleEditClick = () => {
    if (!selectedTeam) return;
    setTeamForm({
      name: selectedTeam.name || '',
      description: selectedTeam.description || '',
      sport: selectedTeam.sport || 'football',
      maxMembers: selectedTeam.maxMembers || 22
    });
    setShowEditModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !teamForm.name) {
      toast.error("Lütfen takım adı giriniz.");
      return;
    }

    try {
      const teamRef = doc(db, 'teams', selectedTeam.id);
      
      const updateData = {
        name: teamForm.name,
        description: teamForm.description,
        sport: teamForm.sport,
        maxMembers: parseInt(teamForm.maxMembers),
        updatedAt: new Date()
      };

      await updateDoc(teamRef, updateData);
      
      // Update local state
      setSelectedTeam(prev => ({ ...prev, ...updateData }));
      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, ...updateData } : t));
      
      toast.success('Takım bilgileri güncellendi');
      setShowEditModal(false);
    } catch (error) {
      console.error('Takım güncelleme hatası:', error);
      toast.error('Güncelleme sırasında hata oluştu');
    }
  };

  const handleInvitation = async (invitationId, action) => {
      setInviteLoading(invitationId);
      try {
          const result = await respondToTeamInvitation(invitationId, action, user.uid);
          if (result.success) {
              toast.success(action === 'accept' ? 'Davet kabul edildi' : 'Davet reddedildi');
          } else {
              toast.error(result.error);
          }
      } catch (err) {
          console.error(err);
          toast.error('İşlem başarısız');
      } finally {
          setInviteLoading(null);
      }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <OyuncuSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader title="Ekip/Takım Yönetimi">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Ekip Oluştur</span>
            </button>
        </DashboardHeader>

        <div className="flex-1 overflow-hidden">
          {/* Davetler */}
          {invitations.length > 0 && !selectedTeam && (
            <div className="p-6 pb-0">
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Bekleyen Davetler ({invitations.length})
                  </h3>
                  <div className="space-y-3">
                      {invitations.map(inv => (
                          <div key={inv.id} className="bg-white p-3 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div>
                                  <p className="font-medium text-gray-900 text-sm">{cleanMessage(inv.message)}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                      {inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString('tr-TR') : 'Yeni'}
                                  </p>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <button 
                                    onClick={() => handleInvitation(inv.id, 'accept')} 
                                    disabled={inviteLoading === inv.id}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
                                  >
                                      {inviteLoading === inv.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div> : <Check className="w-4 h-4" />}
                                      Kabul Et
                                  </button>
                                  <button 
                                    onClick={() => handleInvitation(inv.id, 'reject')} 
                                    disabled={inviteLoading === inv.id}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                                  >
                                      {inviteLoading === inv.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div> : <X className="w-4 h-4" />}
                                      Reddet
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
               </div>
            </div>
          )}

          {/* Ekip Listesi ve Detay Görünümü */}
          {!selectedTeam ? (
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.length > 0 ? (
                  teams.map((team) => (
                    <div 
                      key={team.id} 
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          team.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {team.status === 'active' ? 'Aktif' : team.status}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h3>
                      <p className="text-gray-600 mb-4 text-sm line-clamp-2">{team.description}</p>
                      
                      {/* İstatistikler */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">{team.members?.length || 0}</div>
                          <div className="text-xs text-gray-600">Üye</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">{team.matchesWon || 0}</div>
                          <div className="text-xs text-gray-600">Kazan</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">{team.matchesPlayed || 0}</div>
                          <div className="text-xs text-gray-600">Maç</div>
                        </div>
                      </div>

                      <button 
                        className="w-full px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeam(team);
                        }}
                      >
                        Detayları Gör
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Ekip Yok</h3>
                      <p className="text-gray-600 mb-6">Bir ekip oluşturarak başlayın ve arkadaşlarınızla oynayın</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        İlk Ekibinizi Oluşturun
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Ekip Detay Sayfası */
            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
              {/* Sol Panel - Üye Listesi */}
              <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-6 shrink-0 md:h-full md:overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={() => setSelectedTeam(null)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">{selectedTeam.name}</h2>
                  <div className="w-8"></div>
                </div>

                <div className="mb-6">
                  <div className="relative group">
                    <img 
                      src={selectedTeam.photoURL || `https://via.placeholder.com/200x200?text=${selectedTeam.name.slice(0, 2).toUpperCase()}`}
                      alt={selectedTeam.name}
                      className="w-full h-48 object-cover rounded-xl mb-4"
                    />
                    {selectedTeam.captainId === user.uid && (
                        <>
                            <div className="absolute inset-0 bg-black/20 bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-xl cursor-pointer flex items-center justify-center mb-4" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 pointer-events-none" />
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleTeamImageUpdate}
                            />
                        </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{selectedTeam.description}</p>
                  <button 
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mb-3"
                    onClick={() => setShowAddMemberModal(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Üye Ekle</span>
                  </button>
                  <button 
                    onClick={handleEditClick}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 mb-2"
                  >
                    Düzenle
                  </button>
                  <button 
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Ekip Sil
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Üyeler ({selectedTeam.members?.length || 0})</h3>
                  <div className="space-y-3">
                    {loadingMembers ? (
                      <div className="text-center py-4">
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : teamMembers.length > 0 ? (
                      teamMembers.map((member, index) => (
                        <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                          <div className="flex items-center space-x-3 flex-1">
                            {member.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-green-800">
                                  {member.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{member.fullName}</span>
                                {member.id === selectedTeam.captainId && (
                                  <Crown className="w-4 h-4 text-yellow-500 ml-1" />
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {member.email && (
                                  <span className="flex items-center">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {member.email}
                                  </span>
                                )}
                                {member.position && (
                                  <span>• {member.position}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {member.id !== selectedTeam.captainId && selectedTeam.captainId === user.uid && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">Üye bulunamadı</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sağ Panel - İstatistikler ve Geçmiş */}
              <div className="flex-1 p-6 w-full md:h-full md:overflow-y-auto">
                {/* İstatistik Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Oynanan</div>
                      <Trophy className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{selectedTeam.matchesPlayed || 0}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Kazandı</div>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600">{selectedTeam.matchesWon || 0}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Kaybetti</div>
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-3xl font-bold text-red-600">{selectedTeam.matchesLost || 0}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Berabere</div>
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="text-3xl font-bold text-yellow-600">{selectedTeam.matchesDrawn || 0}</div>
                  </div>
                </div>

                {/* Maç Geçmişi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Son Maçlar</h3>
                  {teamMatches.filter(m => {
                    const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
                    return matchDate < new Date() && (m.status === 'completed' || m.status === 'confirmed');
                  }).length > 0 ? (
                    <div className="space-y-3">
                      {teamMatches
                        .filter(m => {
                          const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
                          return matchDate < new Date() && (m.status === 'completed' || m.status === 'confirmed');
                        })
                        .slice(0, 5)
                        .map((match) => {
                          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
                          return (
                            <div key={match.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{match.tesisName || 'Saha'}</p>
                                  <p className="text-sm text-gray-600">
                                    {matchDate.toLocaleDateString('tr-TR')} • {match.timeSlot}
                                  </p>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  ₺{match.totalAmount || match.price || 0}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Henüz maç geçmişi yok</p>
                    </div>
                  )}
                </div>

                {/* Planlanmış Maçlar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Planlanmış Maçlar</h3>
                  {teamMatches.filter(m => {
                    const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
                    return matchDate >= new Date() && (m.status === 'confirmed' || m.status === 'pending');
                  }).length > 0 ? (
                    <div className="space-y-3">
                      {teamMatches
                        .filter(m => {
                          const matchDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
                          return matchDate >= new Date() && (m.status === 'confirmed' || m.status === 'pending');
                        })
                        .slice(0, 5)
                        .map((match) => {
                          const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
                          return (
                            <div key={match.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{match.tesisName || 'Saha'}</p>
                                  <p className="text-sm text-gray-600">
                                    {matchDate.toLocaleDateString('tr-TR')} • {match.timeSlot}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  match.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {match.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Henüz planlanmış maç yok</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Yeni Ekip Oluştur</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ekip Adı</label>
                  <input
                    type="text"
                    name="name"
                    value={teamForm.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Örn: Şampiyonlar Takımı"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spor Türü</label>
                  <select
                    name="sport"
                    value={teamForm.sport}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="football">Futbol</option>
                    <option value="basketball">Basketbol</option>
                    <option value="volleyball">Voleybol</option>
                    <option value="tennis">Tenis</option>
                    <option value="swimming">Yüzme</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maksimum Üye Sayısı</label>
                  <input
                    type="number"
                    name="maxMembers"
                    value={teamForm.maxMembers}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="2"
                    max="50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ekip Fotoğrafı</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {teamImageFile ? (
                           <div className="text-sm text-green-600 font-semibold">{teamImageFile.name} seçildi</div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="text-sm text-gray-500">Fotoğraf yüklemek için tıklayın</p>
                            </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setTeamImageFile(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <textarea
                    name="description"
                    value={teamForm.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Ekip hakkında bilgi..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCreateTeam}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>Oluştur</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Ekibi Düzenle</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ekip Adı</label>
                  <input
                    type="text"
                    name="name"
                    value={teamForm.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Örn: Şampiyonlar Takımı"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spor Türü</label>
                  <select
                    name="sport"
                    value={teamForm.sport}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="football">Futbol</option>
                    <option value="basketball">Basketbol</option>
                    <option value="volleyball">Voleybol</option>
                    <option value="tennis">Tenis</option>
                    <option value="swimming">Yüzme</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maksimum Üye Sayısı</label>
                  <input
                    type="number"
                    name="maxMembers"
                    value={teamForm.maxMembers}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="2"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <textarea
                    name="description"
                    value={teamForm.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Ekip hakkında bilgi..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleUpdateTeam}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>Güncelle</span>
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Üye Ekle</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Bilgisi</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={memberEmail}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setMemberEmail(val);
                        setSelectedInvitee(null); // Reset selection on typing
                        
                        if (val.length >= 3) {
                            setIsSearching(true);
                            const res = await searchUsers(val);
                            if (res.success) {
                                setMatchingUsers(res.data);
                                setShowDropdown(true);
                            } else {
                                setMatchingUsers([]);
                                setShowDropdown(false);
                            }
                            setIsSearching(false);
                        } else {
                            setMatchingUsers([]);
                            setShowDropdown(false);
                            setIsSearching(false);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Email, telefon veya kullanıcı adı..."
                    />
                    
                    {/* Dropdown Results */}
                    {showDropdown && matchingUsers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {matchingUsers.map(u => (
                                <div 
                                    key={u.id}
                                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center space-x-3 border-b border-gray-100 last:border-0"
                                    onClick={() => {
                                        setMemberEmail(u.email || u.phone || u.displayName || u.fullName);
                                        setSelectedInvitee(u);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold shrink-0">
                                        {(u.displayName || u.fullName || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{u.displayName || u.fullName}</div>
                                        <div className="text-xs text-gray-500 truncate">{u.email || u.phone}</div>
                                    </div>
                                    {selectedTeam?.members?.includes(u.id) && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Ekipte</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                  {isSearching && <p className="text-xs text-gray-500 mt-1">Aranıyor...</p>}
                  {!isSearching && memberEmail.length < 3 && (
                    <p className="text-xs text-gray-500 mt-1">Email, telefon veya kullanıcı adına göre aranacak (En az 3 karakter)</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddMember}
                    disabled={addingMember}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {addingMember ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>İşleniyor...</span></>
                    ) : 'Ekle'}
                  </button>
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Team Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Ekip Sil</h3>
                <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-600">
                  <strong>{selectedTeam?.name}</strong> adlı ekibi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeleteTeam}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Evet, Sil
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ekip;
