import { supabase } from '../supabase';

let realtimeRefreshTimer;
let realtimeUserId;

const api = async (path, options = {}) => {
  const response = await fetch(`/api/eco-exchange${path}`, {
    credentials: 'include',
    ...options,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const details = import.meta.env.DEV && data.details ? ` ${data.details}` : '';
    const requestId = data.requestId ? ` (reference: ${data.requestId})` : '';
    throw new Error(`${data.error || 'The Eco Exchange request could not be completed.'}${details}${requestId}`);
  }
  return data;
};

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const ecoExchangeService = {
  listListings: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    return api(`/listings?${query.toString()}`);
  },
  getListing: (id) => api(`/listings/${encodeURIComponent(id)}`),
  createListing: (formData) => api('/listings', { method: 'POST', body: formData }),
  updateListing: (id, patch) => api(`/listings/${encodeURIComponent(id)}`, json('PATCH', patch)),
  deleteListing: (id) => api(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  startConversation: (listingId) => api(`/listings/${encodeURIComponent(listingId)}/conversations`, { method: 'POST' }),
  listConversations: () => api('/conversations'),
  sendMessage: (conversationId, body) => api(`/conversations/${encodeURIComponent(conversationId)}/messages`, json('POST', { body })),
  shareExactLocation: (conversationId) => api(`/conversations/${encodeURIComponent(conversationId)}/share-location`, { method: 'POST' }),
  reportConversation: (conversationId, reason) => api(`/conversations/${encodeURIComponent(conversationId)}/report`, json('POST', { reason })),
  blockConversationUser: (conversationId) => api(`/conversations/${encodeURIComponent(conversationId)}/block`, { method: 'POST' }),
  unblockConversationUser: (conversationId) => api(`/conversations/${encodeURIComponent(conversationId)}/block`, { method: 'DELETE' }),
  createOffer: (listingId, offer) => api(`/listings/${encodeURIComponent(listingId)}/offers`, { method: 'POST', body: offer }),
  listOffers: (listingId) => api(`/listings/${encodeURIComponent(listingId)}/offers`),
  listMyOffers: () => api('/offers/mine'),
  updateOffer: (offerId, action) => api(`/offers/${encodeURIComponent(offerId)}`, json('PATCH', { action })),
  startOfferConversation: (offerId) => api(`/offers/${encodeURIComponent(offerId)}/conversation`, { method: 'POST' }),
  getUnreadCount: () => api('/notifications/unread-count'),
  markNotificationsRead: () => api('/notifications/read', { method: 'POST' }),
  async setRealtimeUser(userId) {
    if (!userId) return;
    const { token } = await api('/realtime-token');
    await supabase.realtime.setAuth(token);
    if (realtimeUserId !== userId) {
      window.clearInterval(realtimeRefreshTimer);
      realtimeUserId = userId;
      realtimeRefreshTimer = window.setInterval(async () => {
        try {
          const response = await api('/realtime-token');
          await supabase.realtime.setAuth(response.token);
        } catch (error) {
          console.error('[Eco Exchange] Unable to refresh the Realtime token:', error);
        }
      }, 8 * 60 * 1000);
    }
  },
  clearRealtimeUser() {
    window.clearInterval(realtimeRefreshTimer);
    realtimeRefreshTimer = undefined;
    realtimeUserId = undefined;
  },
  subscribeToMessages(conversationId, onChange, onStatus) {
    return supabase.channel(`eco-messages-${conversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`,
      }, onChange)
      .subscribe(onStatus);
  },
  subscribeToOffers(listingId, onChange) {
    return supabase.channel(`eco-offers-${listingId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'exchange_offers', filter: `listing_id=eq.${listingId}`,
      }, onChange)
      .subscribe();
  },
  subscribeToNotifications(userId, onChange) {
    return supabase.channel(`eco-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'eco_exchange_notifications', filter: `user_id=eq.${userId}`,
      }, onChange)
      .subscribe();
  },
  removeChannel: (channel) => supabase.removeChannel(channel),
};

export const EXCHANGE_CATEGORIES = [
  { id: 'plant_pots', label: 'Plant Pots' },
  { id: 'plants_seeds', label: 'Seeds & Saplings' },
  { id: 'recycled_crafts', label: 'Recycled Crafts' },
  { id: 'coconut_products', label: 'Coconut Crafts' },
  { id: 'compost_bins', label: 'Compost Bins' },
  { id: 'gardening_tools', label: 'Gardening Tools' },
  { id: 'reusable_items', label: 'Reusable Items' },
  { id: 'other', label: 'Other' },
];

export const SALE_NOTICE = 'Terra AI only connects people. Meet in a public place. Meet, pay and exchange at your own risk and free will. Terra AI does not handle payment or delivery.';
