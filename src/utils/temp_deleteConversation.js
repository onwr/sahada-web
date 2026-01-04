
// Konuşmayı sil (Sadece kullanıcı için gizler veya tamamen siler - şimdilik soft delete yapalım)
export const deleteConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Konuşmayı tamamen silmek yerine 'deletedBy' arrayine ekleyebiliriz
    // Veya kullanıcıya özel 'deleted' flag'i
    
    // Şimdilik basitçe 'deletedBy' alanına ekleyelim
    // Eğer alan yoksa arrayUnion oluşturur
    await updateDoc(conversationRef, {
      [`deletedBy.${userId}`]: true,
      // deletedBy: arrayUnion(userId) // Firestore array union da kullanılabilir
    });

    return { success: true };
  } catch (error) {
    console.error('Konuşma silme hatası:', error);
    return { success: false, error: error.message };
  }
};
