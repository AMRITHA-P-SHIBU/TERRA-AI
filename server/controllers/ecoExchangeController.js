import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../supabase.js';

const BUCKET = 'eco-listings';
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const categories = new Set([
  'plant_pots', 'plants_seeds', 'recycled_crafts', 'coconut_products',
  'compost_bins', 'gardening_tools', 'reusable_items', 'other',
]);
const conditions = new Set(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'UPCYCLED']);
const listingStatuses = new Set(['AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'COMPLETED']);
const SCOPE = process.env.ECO_EXCHANGE_SCOPE === 'scoped' ? 'scoped' : 'global';

function requireSupabase(res) {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Supabase marketplace storage is not configured on the server.' });
    return false;
  }
  return true;
}

function fail(res, error, status = 400) {
  const requestId = crypto.randomUUID();
  const details = error instanceof Error ? error.message : String(error);
  console.error(`[Eco Exchange ${requestId}]`, error);
  return res.status(status).json({
    error: 'The marketplace request could not be completed.',
    requestId,
    ...(process.env.NODE_ENV !== 'production' ? { details } : {}),
  });
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function containsPhoneNumber(value) {
  return /\+?\d[\d\s().-]{6,}\d/.test(value || '');
}

function validCoordinates(lat, lng) {
  return lat !== null && lat !== undefined && String(lat).trim() !== ''
    && lng !== null && lng !== undefined && String(lng).trim() !== ''
    && Number.isFinite(Number(lat)) && Number(lat) >= -90 && Number(lat) <= 90
    && Number.isFinite(Number(lng)) && Number(lng) >= -180 && Number(lng) <= 180;
}

function optionalCoordinates(lat, lng) {
  const latMissing = lat === null || lat === undefined || String(lat).trim() === '';
  const lngMissing = lng === null || lng === undefined || String(lng).trim() === '';
  if (latMissing && lngMissing) return { lat: null, lng: null };
  if (!validCoordinates(lat, lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

function manualAreaLabel(address) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1].slice(0, 120) : 'Area provided';
}

function approximateCoordinate(value, precision = 2) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(precision)) : null;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function userProfile(userId) {
  const [user, individual, organization] = await Promise.all([
    supabaseAdmin.from('users').select('id, full_name, account_type').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('individual_users').select('avatar_url, location').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('organization_users').select('avatar_url, organization_id, status').eq('id', userId).maybeSingle(),
  ]);
  if (user.error || individual.error || organization.error) {
    throw new Error(user.error?.message || individual.error?.message || organization.error?.message);
  }
  if (!user.data) return null;
  return {
    id: user.data.id,
    full_name: user.data.full_name,
    avatar_url: individual.data?.avatar_url || organization.data?.avatar_url || null,
    account_type: user.data.account_type,
    organization_id: organization.data?.organization_id || null,
  };
}

async function checkListingScope(ownerId, viewerId) {
  if (SCOPE === 'global' || ownerId === viewerId) return true;
  const [ownerProfile, viewerProfile] = await Promise.all([userProfile(ownerId), userProfile(viewerId)]);
  if (!ownerProfile || !viewerProfile) return false;
  const ownerIsIndividual = !ownerProfile.organization_id;
  const viewerIsIndividual = !viewerProfile.organization_id;
  return ownerIsIndividual && viewerIsIndividual
    || (!ownerIsIndividual && !viewerIsIndividual && ownerProfile.organization_id === viewerProfile.organization_id);
}

async function decorateListing(row, viewerId, viewerCoordinates = null, includeExact = false) {
  const owner = await userProfile(row.owner_id);
  const canSeeExact = includeExact || row.owner_id === viewerId;
  return {
    ...row,
    location_lat: canSeeExact ? row.location_lat : approximateCoordinate(row.location_lat),
    location_lng: canSeeExact ? row.location_lng : approximateCoordinate(row.location_lng),
    location_address: canSeeExact ? row.location_address : null,
    owner: owner ? { id: owner.id, full_name: owner.full_name, avatar_url: owner.avatar_url } : null,
    distance_km: viewerCoordinates && validCoordinates(viewerCoordinates.lat, viewerCoordinates.lng)
      && validCoordinates(row.location_lat, row.location_lng)
      ? Number(distanceKm(viewerCoordinates.lat, viewerCoordinates.lng, row.location_lat, row.location_lng).toFixed(1))
      : null,
    exact_location_available: canSeeExact,
  };
}

function approximateOffer(offer) {
  return {
    ...offer,
    location_lat: approximateCoordinate(offer.location_lat),
    location_lng: approximateCoordinate(offer.location_lng),
    location_address: null,
  };
}

async function uploadImages(userId, files) {
  if (!files.length || files.length > 5) throw new Error('Choose between 1 and 5 photos.');
  const uploaded = [];
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.mimetype) || file.size > 5 * 1024 * 1024) {
      throw new Error('Photos must be JPEG, PNG, or WebP and no larger than 5 MB each.');
    }
    const extension = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) throw new Error(`Unable to upload photo: ${error.message}`);
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

async function notify(userId, kind, listingId, conversationId = null) {
  const { error } = await supabaseAdmin.from('eco_exchange_notifications').insert({
    user_id: userId, kind, listing_id: listingId, conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

async function usersBlocked(firstUserId, secondUserId) {
  const { data, error } = await supabaseAdmin.from('eco_exchange_blocks').select('id')
    .or(`and(blocker_id.eq.${firstUserId},blocked_id.eq.${secondUserId}),and(blocker_id.eq.${secondUserId},blocked_id.eq.${firstUserId})`)
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function listListings(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const mine = req.query.mine === 'true';
    const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
    const { data, error } = await supabaseAdmin.from('eco_listings')
      .select('*')
      .eq(mine ? 'owner_id' : 'status', mine ? req.user.id : 'AVAILABLE')
      .order('created_at', { ascending: false })
      .range(offset, offset + (mine ? 99 : 19));
    if (error) throw new Error(error.message);
    const visible = [];
    for (const listing of data || []) {
      if (await checkListingScope(listing.owner_id, req.user.id)) {
        visible.push(await decorateListing(listing, req.user.id, {
          lat: req.query.lat, lng: req.query.lng,
        }));
      }
    }
    return res.json({ listings: visible, scope: SCOPE });
  } catch (error) { return fail(res, error, 500); }
}

export async function createListing(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const title = cleanText(req.body.title, 100);
    const description = cleanText(req.body.description, 2000);
    const category = cleanText(req.body.category, 40);
    const condition = cleanText(req.body.condition, 20);
    const listingType = cleanText(req.body.listing_type, 10);
    const address = cleanText(req.body.location_address, 300);
    const coordinates = optionalCoordinates(req.body.location_lat, req.body.location_lng);
    const area = coordinates?.lat === null ? manualAreaLabel(address) : cleanText(req.body.area_label, 120);
    const wanted = cleanText(req.body.wanted_in_return, 300);
    const price = req.body.price === '' || req.body.price == null ? null : Number(req.body.price);
    if (title.length < 3 || description.length < 10 || !categories.has(category) || !conditions.has(condition)) {
      return res.status(400).json({ error: 'Check the title, description, category, and item condition.' });
    }
    if (containsPhoneNumber(title) || containsPhoneNumber(description) || containsPhoneNumber(wanted)) {
      return res.status(400).json({ error: 'Phone numbers are not allowed in Eco Exchange listings.' });
    }
    if (!['EXCHANGE', 'SALE'].includes(listingType) || !coordinates
      || address.length < 3 || area.length < 2) {
      return res.status(400).json({ error: 'Choose a listing type and enter a valid city, landmark, or address.' });
    }
    if (listingType === 'SALE' && (!Number.isFinite(price) || price < 0 || price > 10000000)) {
      return res.status(400).json({ error: 'Enter a valid sale price.' });
    }
    const images = await uploadImages(req.user.id, req.files || []);
    const { data, error } = await supabaseAdmin.from('eco_listings').insert({
      owner_id: req.user.id,
      title, description, category, condition,
      listing_type: listingType,
      price: listingType === 'SALE' ? price : null,
      wanted_in_return: listingType === 'EXCHANGE' ? wanted || null : null,
      images,
      location_lat: coordinates.lat,
      location_lng: coordinates.lng,
      location_address: address,
      area_label: area,
      status: 'AVAILABLE',
    }).select('*').single();
    if (error) throw new Error(error.message);
    return res.status(201).json({ listing: await decorateListing(data, req.user.id) });
  } catch (error) { return fail(res, error, 400); }
}

export async function updateListing(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const id = req.params.id;
    const { data: existing, error: existingError } = await supabaseAdmin.from('eco_listings')
      .select('*').eq('id', id).eq('owner_id', req.user.id).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) return res.status(404).json({ error: 'Listing not found.' });
    const patch = {};
    for (const field of ['title', 'description', 'category', 'condition']) {
      if (req.body[field] !== undefined) patch[field] = cleanText(req.body[field], field === 'description' ? 2000 : 100);
    }
    if (containsPhoneNumber(patch.title) || containsPhoneNumber(patch.description)
      || containsPhoneNumber(cleanText(req.body.wanted_in_return, 300))) {
      return res.status(400).json({ error: 'Phone numbers are not allowed in Eco Exchange listings.' });
    }
    if (patch.category && !categories.has(patch.category)) return res.status(400).json({ error: 'Invalid category.' });
    if (patch.condition && !conditions.has(patch.condition)) return res.status(400).json({ error: 'Invalid condition.' });
    if (req.body.listing_type !== undefined) {
      if (!['EXCHANGE', 'SALE'].includes(req.body.listing_type)) return res.status(400).json({ error: 'Invalid listing type.' });
      patch.listing_type = req.body.listing_type;
      patch.price = patch.listing_type === 'SALE' ? Number(req.body.price) : null;
      patch.wanted_in_return = patch.listing_type === 'EXCHANGE' ? cleanText(req.body.wanted_in_return, 300) || null : null;
      if (patch.listing_type === 'SALE' && (!Number.isFinite(patch.price) || patch.price < 0)) {
        return res.status(400).json({ error: 'Enter a valid sale price.' });
      }
    } else {
      if (req.body.price !== undefined) patch.price = Number(req.body.price);
      if (req.body.wanted_in_return !== undefined) patch.wanted_in_return = cleanText(req.body.wanted_in_return, 300) || null;
    }
    if (req.body.location_lat !== undefined || req.body.location_lng !== undefined
      || req.body.location_address !== undefined || req.body.area_label !== undefined) {
      const coordinates = optionalCoordinates(req.body.location_lat, req.body.location_lng);
      const address = cleanText(req.body.location_address, 300);
      const area = coordinates?.lat === null ? manualAreaLabel(address) : cleanText(req.body.area_label, 120);
      if (!coordinates || address.length < 3 || area.length < 2) {
        return res.status(400).json({ error: 'Enter a valid city, landmark, or address.' });
      }
      patch.location_lat = coordinates.lat;
      patch.location_lng = coordinates.lng;
      patch.location_address = address;
      patch.area_label = area;
    }
    if (req.body.status !== undefined) {
      if (!listingStatuses.has(req.body.status)) return res.status(400).json({ error: 'Invalid listing status.' });
      patch.status = req.body.status;
    }
    if (req.files?.length) patch.images = [...existing.images, ...(await uploadImages(req.user.id, req.files))].slice(0, 5);
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('eco_listings').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return res.json({ listing: await decorateListing(data, req.user.id) });
  } catch (error) { return fail(res, error, 400); }
}

export async function deleteListing(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data, error } = await supabaseAdmin.from('eco_listings').delete()
      .eq('id', req.params.id).eq('owner_id', req.user.id).select('id').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ error: 'Listing not found.' });
    return res.json({ success: true });
  } catch (error) { return fail(res, error, 500); }
}

export async function getListing(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data, error } = await supabaseAdmin.from('eco_listings')
      .select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || (data.status !== 'AVAILABLE' && data.owner_id !== req.user.id)) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    if (!(await checkListingScope(data.owner_id, req.user.id))) return res.status(404).json({ error: 'Listing not found.' });
    let exact = data.owner_id === req.user.id;
    if (!exact) {
      const { data: conversation } = await supabaseAdmin.from('conversations').select('id')
        .eq('listing_id', data.id).eq('initiator_id', req.user.id).maybeSingle();
      exact = Boolean(conversation);
    }
    return res.json({ listing: await decorateListing(data, req.user.id, null, exact) });
  } catch (error) { return fail(res, error, 500); }
}

export async function createConversation(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
      .select('id, owner_id, status').eq('id', req.params.id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing || listing.status !== 'AVAILABLE') return res.status(409).json({ error: 'This listing is not accepting new conversations.' });
    if (listing.owner_id === req.user.id) return res.status(400).json({ error: 'You cannot message yourself.' });
    if (!(await checkListingScope(listing.owner_id, req.user.id))) return res.status(404).json({ error: 'Listing not found.' });
    if (await usersBlocked(listing.owner_id, req.user.id)) return res.status(403).json({ error: 'Messaging is unavailable for this account.' });
    const { data: conversation, error } = await supabaseAdmin.from('conversations').upsert({
      listing_id: listing.id, initiator_id: req.user.id, buyer_id: req.user.id, owner_id: listing.owner_id,
    }, { onConflict: 'listing_id,initiator_id' }).select('*').single();
    if (error) throw new Error(error.message);
    return res.json({ conversation });
  } catch (error) { return fail(res, error, 400); }
}

export async function createOfferConversation(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: offer, error: offerError } = await supabaseAdmin.from('exchange_offers').select('*')
      .eq('id', req.params.offerId).maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!offer || ![offer.offerer_id].includes(req.user.id)) {
      const { data: listing } = offer
        ? await supabaseAdmin.from('eco_listings').select('owner_id').eq('id', offer.listing_id).maybeSingle()
        : { data: null };
      if (!offer || listing?.owner_id !== req.user.id) return res.status(404).json({ error: 'Offer not found.' });
    }
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
      .select('owner_id').eq('id', offer.listing_id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (await usersBlocked(listing.owner_id, offer.offerer_id)) return res.status(403).json({ error: 'Messaging is unavailable for this account.' });
    const { data: conversation, error } = await supabaseAdmin.from('conversations').upsert({
      listing_id: offer.listing_id, initiator_id: offer.offerer_id,
      buyer_id: offer.offerer_id, owner_id: listing.owner_id,
    }, { onConflict: 'listing_id,initiator_id' }).select('*').single();
    if (error) throw new Error(error.message);
    return res.json({ conversation });
  } catch (error) { return fail(res, error, 400); }
}

export async function listConversations(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const [{ data, error }, { data: blockRows, error: blockError }] = await Promise.all([
      supabaseAdmin.from('conversations').select('*')
        .or(`initiator_id.eq.${req.user.id},owner_id.eq.${req.user.id}`).order('created_at', { ascending: false }),
      supabaseAdmin.from('eco_exchange_blocks').select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`),
    ]);
    if (error || blockError) throw new Error(error?.message || blockError?.message);
    const blockedByMe = new Set((blockRows || [])
      .filter((block) => block.blocker_id === req.user.id)
      .map((block) => block.blocked_id));
    const blockedMe = new Set((blockRows || [])
      .filter((block) => block.blocked_id === req.user.id)
      .map((block) => block.blocker_id));
    const conversations = await Promise.all((data || []).map(async (conversation) => {
      const otherUserId = conversation.initiator_id === req.user.id ? conversation.owner_id : conversation.initiator_id;
      const [listingResult, messagesResult, otherUser, acceptedOffer] = await Promise.all([
        conversation.listing_id
          ? supabaseAdmin.from('eco_listings').select('id, title, images, area_label, listing_type, price, status, location_lat, location_lng').eq('id', conversation.listing_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabaseAdmin.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true }),
        userProfile(conversation.initiator_id === req.user.id ? conversation.owner_id : conversation.initiator_id),
        conversation.listing_id
          ? supabaseAdmin.from('exchange_offers').select('id').eq('listing_id', conversation.listing_id)
            .eq('offerer_id', conversation.initiator_id).eq('status', 'ACCEPTED').maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (listingResult.error || messagesResult.error || acceptedOffer.error) throw new Error(listingResult.error?.message || messagesResult.error?.message || acceptedOffer.error?.message);
      const messages = messagesResult.data || [];
      const unread = messages.filter((message) => message.sender_id !== req.user.id && !message.read_at).length;
      if (unread) {
        const { error: readError } = await supabaseAdmin.from('messages').update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversation.id).neq('sender_id', req.user.id).is('read_at', null);
        if (readError) throw new Error(readError.message);
      }
      return {
        ...conversation,
        listing: listingResult.data,
        other_user: otherUser,
        messages,
        unread_count: unread,
        has_accepted_offer: Boolean(acceptedOffer.data),
        blocked_by_me: blockedByMe.has(otherUserId),
        blocked_me: blockedMe.has(otherUserId),
      };
    }));
    return res.json({ conversations });
  } catch (error) { return fail(res, error, 500); }
}

export async function createMessage(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const body = cleanText(req.body.body, 2000);
    if (!body) return res.status(400).json({ error: 'Write a message before sending.' });
    if (containsPhoneNumber(body)) return res.status(400).json({ error: 'Phone numbers cannot be shared in Eco Exchange messages.' });
    const { data: conversation, error: conversationError } = await supabaseAdmin.from('conversations')
      .select('id, initiator_id, owner_id, listing_id').eq('id', req.params.id).maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation || ![conversation.initiator_id, conversation.owner_id].includes(req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    if (!conversation.listing_id) return res.status(409).json({ error: 'This listing was deleted. The conversation is read-only.' });
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
      .select('status').eq('id', conversation.listing_id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing || ['UNAVAILABLE', 'COMPLETED'].includes(listing.status)) {
      return res.status(409).json({ error: 'This listing is not accepting new messages. Existing messages remain available.' });
    }
    if (await usersBlocked(conversation.initiator_id, conversation.owner_id)) {
      return res.status(403).json({ error: 'Messaging is blocked for this conversation.' });
    }
    const { data: message, error } = await supabaseAdmin.from('messages').insert({
      conversation_id: conversation.id, sender_id: req.user.id, body,
    }).select('*').single();
    if (error) throw new Error(error.message);
    const recipient = req.user.id === conversation.owner_id ? conversation.initiator_id : conversation.owner_id;
    await notify(recipient, 'MESSAGE', conversation.listing_id, conversation.id);
    return res.status(201).json({ message });
  } catch (error) { return fail(res, error, 400); }
}

export async function shareExactLocation(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: conversation, error: conversationError } = await supabaseAdmin.from('conversations').select('*')
      .eq('id', req.params.id).maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation || ![conversation.initiator_id, conversation.owner_id].includes(req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    if (await usersBlocked(conversation.initiator_id, conversation.owner_id)) {
      return res.status(403).json({ error: 'Messaging is blocked for this conversation.' });
    }
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings').select('*')
      .eq('id', conversation.listing_id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) return res.status(404).json({ error: 'Listing is no longer available for location sharing.' });
    if (['UNAVAILABLE', 'COMPLETED'].includes(listing.status)) {
      return res.status(409).json({ error: 'This listing is not accepting location shares.' });
    }
    let location = { lat: listing.location_lat, lng: listing.location_lng, address: listing.location_address };
    if (req.user.id === conversation.initiator_id) {
      const { data: offer, error: offerError } = await supabaseAdmin.from('exchange_offers')
        .select('location_lat, location_lng, location_address')
        .eq('listing_id', listing.id).eq('offerer_id', req.user.id).eq('status', 'ACCEPTED').maybeSingle();
      if (offerError) throw new Error(offerError.message);
      if (!offer) return res.status(403).json({ error: 'Your exact location is shared only after an offer is accepted.' });
      location = { lat: offer.location_lat, lng: offer.location_lng, address: offer.location_address };
    }
    const body = `__EXACT_LOCATION__${JSON.stringify(location)}`;
    const { data: message, error } = await supabaseAdmin.from('messages').insert({
      conversation_id: conversation.id, sender_id: req.user.id, body,
    }).select('*').single();
    if (error) throw new Error(error.message);
    const recipient = req.user.id === conversation.owner_id ? conversation.initiator_id : conversation.owner_id;
    await notify(recipient, 'MESSAGE', conversation.listing_id, conversation.id);
    return res.status(201).json({ message });
  } catch (error) { return fail(res, error, 400); }
}

export async function createOffer(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
      .select('id, owner_id, listing_type, status, location_lat, location_lng')
      .eq('id', req.params.id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing || listing.listing_type !== 'EXCHANGE' || listing.status !== 'AVAILABLE') {
      return res.status(409).json({ error: 'This exchange listing is not accepting offers.' });
    }
    if (listing.owner_id === req.user.id) return res.status(400).json({ error: 'You cannot offer on your own listing.' });
    if (!(await checkListingScope(listing.owner_id, req.user.id))) return res.status(404).json({ error: 'Listing not found.' });
    if (await usersBlocked(listing.owner_id, req.user.id)) return res.status(403).json({ error: 'Offers are unavailable for this account.' });
    const title = cleanText(req.body.offered_title, 100);
    const description = cleanText(req.body.offered_description, 1000);
    const address = cleanText(req.body.location_address, 300);
    const coordinates = optionalCoordinates(req.body.location_lat, req.body.location_lng);
    const area = coordinates?.lat === null ? manualAreaLabel(address) : cleanText(req.body.area_label, 120);
    let imageUrls;
    try { imageUrls = JSON.parse(req.body.images || '[]'); }
    catch { return res.status(400).json({ error: 'Invalid offered-item photos.' }); }
    if (title.length < 2 || description.length < 5 || !coordinates
      || address.length < 3 || area.length < 2 || !Array.isArray(imageUrls) || imageUrls.length > 5) {
      return res.status(400).json({ error: 'Complete the offered-item and location details.' });
    }
    if (containsPhoneNumber(title) || containsPhoneNumber(description) || containsPhoneNumber(cleanText(req.body.message, 1000))) {
      return res.status(400).json({ error: 'Phone numbers are not allowed in Eco Exchange offers.' });
    }
    if (!req.body.offered_listing_id && !req.files?.length) {
      return res.status(400).json({ error: 'Add a photo for your quick offer item.' });
    }
    let offeredListing = null;
    if (req.body.offered_listing_id) {
      const { data, error } = await supabaseAdmin.from('eco_listings').select('id, owner_id, status, title, description, images')
        .eq('id', req.body.offered_listing_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || data.owner_id !== req.user.id || data.status !== 'AVAILABLE') {
        return res.status(400).json({ error: 'Choose one of your available listings.' });
      }
      offeredListing = data;
    }
    const uploadedImages = req.files?.length ? await uploadImages(req.user.id, req.files) : [];
    const { data: offer, error } = await supabaseAdmin.from('exchange_offers').insert({
      listing_id: listing.id, offerer_id: req.user.id,
      offered_listing_id: req.body.offered_listing_id || null,
      offered_title: offeredListing?.title || title,
      offered_description: offeredListing?.description || description,
      offered_images: [...(offeredListing?.images || imageUrls), ...uploadedImages].slice(0, 5),
      message: cleanText(req.body.message, 1000) || null,
      location_lat: coordinates.lat, location_lng: coordinates.lng,
      location_address: address, area_label: area,
    }).select('*').single();
    if (error) throw new Error(error.message);
    await notify(listing.owner_id, 'OFFER', listing.id);
    return res.status(201).json({ offer });
  } catch (error) { return fail(res, error, 400); }
}

export async function listOffers(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
      .select('id, owner_id, location_lat, location_lng').eq('id', req.params.id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    const isOwner = listing.owner_id === req.user.id;
    const { data, error } = await supabaseAdmin.from('exchange_offers').select('*')
      .eq('listing_id', listing.id).eq(isOwner ? 'listing_id' : 'offerer_id', isOwner ? listing.id : req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const offers = await Promise.all((data || []).map(async (offer) => {
      const profile = await userProfile(offer.offerer_id);
      return {
        ...approximateOffer(offer),
        offerer: profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url } : null,
        distance_km: isOwner && validCoordinates(listing.location_lat, listing.location_lng)
          && validCoordinates(offer.location_lat, offer.location_lng)
          ? Number(distanceKm(listing.location_lat, listing.location_lng, offer.location_lat, offer.location_lng).toFixed(1))
          : null,
      };
    }));
    return res.json({ offers });
  } catch (error) { return fail(res, error, 500); }
}

export async function listMyOffers(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data, error } = await supabaseAdmin.from('exchange_offers').select('*')
      .eq('offerer_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const offers = await Promise.all((data || []).map(async (offer) => {
      const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings')
        .select('id, title, images, area_label, status').eq('id', offer.listing_id).maybeSingle();
      if (listingError) throw new Error(listingError.message);
      return { ...approximateOffer(offer), listing };
    }));
    return res.json({ offers });
  } catch (error) { return fail(res, error, 500); }
}

export async function updateOffer(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const action = req.body.action;
    const { data: offer, error: offerError } = await supabaseAdmin.from('exchange_offers').select('*')
      .eq('id', req.params.offerId).maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!offer) return res.status(404).json({ error: 'Offer not found.' });
    const { data: listing, error: listingError } = await supabaseAdmin.from('eco_listings').select('*')
      .eq('id', offer.listing_id).maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (action === 'WITHDRAW' && offer.offerer_id === req.user.id && offer.status === 'PENDING') {
      const { data, error } = await supabaseAdmin.from('exchange_offers').update({ status: 'WITHDRAWN' })
        .eq('id', offer.id).select('*').single();
      if (error) throw new Error(error.message);
      return res.json({ offer: data });
    }
    if (listing?.owner_id !== req.user.id || offer.status !== 'PENDING' || !['ACCEPTED', 'DECLINED'].includes(action)) {
      return res.status(403).json({ error: 'You cannot change this offer.' });
    }
    let data;
    let otherOffererIds = [];
    if (action === 'ACCEPTED') {
      const declineOtherOffers = process.env.ECO_EXCHANGE_DECLINE_OTHER_OFFERS !== 'false';
      if (declineOtherOffers) {
        const { data: otherOffers, error: otherOffersError } = await supabaseAdmin.from('exchange_offers')
          .select('offerer_id').eq('listing_id', listing.id).eq('status', 'PENDING').neq('id', offer.id);
        if (otherOffersError) throw new Error(otherOffersError.message);
        otherOffererIds = (otherOffers || []).map((otherOffer) => otherOffer.offerer_id);
      }
      const { error: acceptError } = await supabaseAdmin.rpc('eco_exchange_accept_offer', {
        p_offer_id: offer.id,
        p_owner_id: req.user.id,
        p_decline_other_offers: declineOtherOffers,
      });
      if (acceptError) throw new Error(acceptError.message);
      const { data: accepted, error } = await supabaseAdmin.from('exchange_offers').select('*').eq('id', offer.id).single();
      if (error) throw new Error(error.message);
      data = accepted;
    } else {
      const { data: declined, error } = await supabaseAdmin.from('exchange_offers').update({ status: 'DECLINED' })
        .eq('id', offer.id).eq('status', 'PENDING').select('*').maybeSingle();
      if (error) throw new Error(error.message);
      if (!declined) return res.status(409).json({ error: 'This offer has already changed.' });
      data = declined;
    }
    await notify(offer.offerer_id, action === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED', listing.id);
    await Promise.all(otherOffererIds.map((offererId) => notify(offererId, 'OFFER_DECLINED', listing.id)));
    let conversation = null;
    if (action === 'ACCEPTED') {
      const { data, error: conversationError } = await supabaseAdmin.from('conversations').upsert({
        listing_id: listing.id, initiator_id: offer.offerer_id, buyer_id: offer.offerer_id, owner_id: listing.owner_id,
      }, { onConflict: 'listing_id,initiator_id' }).select('*').single();
      if (conversationError) throw new Error(conversationError.message);
      conversation = data;
      const sharedLocations = [
        { sender_id: listing.owner_id, lat: listing.location_lat, lng: listing.location_lng, address: listing.location_address },
        { sender_id: offer.offerer_id, lat: offer.location_lat, lng: offer.location_lng, address: offer.location_address },
      ];
      const { error: locationMessageError } = await supabaseAdmin.from('messages').insert(sharedLocations.map((location) => ({
        conversation_id: conversation.id,
        sender_id: location.sender_id,
        body: `__EXACT_LOCATION__${JSON.stringify({ lat: location.lat, lng: location.lng, address: location.address })}`,
      })));
      if (locationMessageError) throw new Error(locationMessageError.message);
    }
    return res.json({ offer: data, conversation });
  } catch (error) { return fail(res, error, 400); }
}

export async function reportConversation(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: conversation, error: conversationError } = await supabaseAdmin.from('conversations').select('*')
      .eq('id', req.params.id).maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation || ![conversation.initiator_id, conversation.owner_id].includes(req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    const { error } = await supabaseAdmin.from('eco_exchange_reports').insert({
      conversation_id: conversation.id, reporter_id: req.user.id,
      reported_user_id: req.user.id === conversation.owner_id ? conversation.initiator_id : conversation.owner_id,
      reason: cleanText(req.body.reason, 1000),
    });
    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true });
  } catch (error) { return fail(res, error, 400); }
}

export async function blockConversationUser(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: conversation, error } = await supabaseAdmin.from('conversations').select('*')
      .eq('id', req.params.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation || ![conversation.initiator_id, conversation.owner_id].includes(req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    const blockedId = req.user.id === conversation.owner_id ? conversation.initiator_id : conversation.owner_id;
    const { error: blockError } = await supabaseAdmin.from('eco_exchange_blocks').upsert({
      blocker_id: req.user.id, blocked_id: blockedId,
    }, { onConflict: 'blocker_id,blocked_id' });
    if (blockError) throw new Error(blockError.message);
    return res.status(201).json({ success: true });
  } catch (error) { return fail(res, error, 400); }
}

export async function unblockConversationUser(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data: conversation, error } = await supabaseAdmin.from('conversations').select('*')
      .eq('id', req.params.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation || ![conversation.initiator_id, conversation.owner_id].includes(req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    const blockedId = req.user.id === conversation.owner_id ? conversation.initiator_id : conversation.owner_id;
    const { error: unblockError } = await supabaseAdmin.from('eco_exchange_blocks').delete()
      .eq('blocker_id', req.user.id).eq('blocked_id', blockedId);
    if (unblockError) throw new Error(unblockError.message);
    return res.json({ success: true });
  } catch (error) { return fail(res, error, 400); }
}

export async function getEcoExchangeReports(_req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { data, error } = await supabaseAdmin.from('eco_exchange_reports')
      .select('id, conversation_id, reporter_id, reported_user_id, reason, created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return res.json({ reports: data || [] });
  } catch (error) { return fail(res, error, 500); }
}

export async function getRealtimeToken(req, res) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return res.status(503).json({ error: 'Realtime token signing is not configured. Set SUPABASE_JWT_SECRET on the server.' });
  const token = jwt.sign({
    sub: req.user.id, role: 'authenticated', aud: 'authenticated', iss: 'supabase',
  }, secret, { algorithm: 'HS256', expiresIn: '10m' });
  return res.json({ token });
}

export async function getUnreadCount(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { count, error } = await supabaseAdmin.from('eco_exchange_notifications')
      .select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).is('read_at', null);
    if (error) throw new Error(error.message);
    return res.json({ count: count || 0 });
  } catch (error) { return fail(res, error, 500); }
}

export async function markNotificationsRead(req, res) {
  try {
    if (!requireSupabase(res)) return;
    const { error } = await supabaseAdmin.from('eco_exchange_notifications')
      .update({ read_at: new Date().toISOString() }).eq('user_id', req.user.id).is('read_at', null);
    if (error) throw new Error(error.message);
    return res.json({ success: true });
  } catch (error) { return fail(res, error, 500); }
}
