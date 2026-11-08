import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, Check, ChevronRight, Edit3, Filter, LoaderCircle, MapPin, MessageCircle, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BackButton from './BackButton';
import LocationPicker from './LocationPicker';
import { ecoExchangeService, EXCHANGE_CATEGORIES, SALE_NOTICE } from '../services/ecoExchangeService';

const CONDITIONS = [
  ['NEW', 'New'], ['LIKE_NEW', 'Like new'], ['GOOD', 'Good'], ['FAIR', 'Fair'], ['UPCYCLED', 'Upcycled'],
];
const PAGE_SIZE = 20;
const readLastLocation = () => {
  try { return JSON.parse(localStorage.getItem('ecoExchangeLastLocation') || 'null'); }
  catch { return null; }
};
const saveLastLocation = (location) => {
  if (location?.address?.trim()) {
    localStorage.setItem('ecoExchangeLastLocation', JSON.stringify(location));
  }
};
const hasCoordinates = (location) => location?.lat != null && location?.lng != null
  && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng));

const emptyForm = () => ({
  title: '', description: '', category: 'other', condition: 'GOOD',
  listing_type: 'EXCHANGE', price: '', wanted_in_return: '',
});
const distance = (km) => km == null ? '' : `${km < 1 ? '<1' : Math.round(km)} km away`;
const amount = (price) => `₹${Number(price || 0).toLocaleString('en-IN')}`;
const categoryLabel = (id) => EXCHANGE_CATEGORIES.find((category) => category.id === id)?.label || 'Other';

function ListingEditor({ listing, onClose, onSaved }) {
  const [form, setForm] = useState(listing ? {
    title: listing.title, description: listing.description, category: listing.category,
    condition: listing.condition, listing_type: listing.listing_type,
    price: listing.price ?? '', wanted_in_return: listing.wanted_in_return || '',
  } : emptyForm());
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(listing ? {
    lat: listing.location_lat, lng: listing.location_lng,
    address: listing.location_address, area: listing.area_label,
  } : readLastLocation());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!location?.address?.trim() || location.address.trim().length < 3) {
      setError('Enter a city, landmark, or address.');
      return;
    }
    if (!listing && (photos.length < 1 || photos.length > 5)) {
      setError('Choose between 1 and 5 photos.');
      return;
    }
    setBusy(true);
    try {
      if (listing) {
        await ecoExchangeService.updateListing(listing.id, {
          ...form,
          price: form.listing_type === 'SALE' ? Number(form.price) : null,
          wanted_in_return: form.listing_type === 'EXCHANGE' ? form.wanted_in_return : null,
          location_lat: hasCoordinates(location) ? Number(location.lat) : null,
          location_lng: hasCoordinates(location) ? Number(location.lng) : null,
          location_address: location.address,
          area_label: location.area || 'Area provided',
        });
      } else {
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.set(key, value));
        data.set('price', form.listing_type === 'SALE' ? form.price : '');
        data.set('location_lat', hasCoordinates(location) ? String(location.lat) : '');
        data.set('location_lng', hasCoordinates(location) ? String(location.lng) : '');
        data.set('location_address', location.address);
        data.set('area_label', location.area || 'Area provided');
        photos.forEach((photo) => data.append('photos', photo));
        await ecoExchangeService.createListing(data);
      }
      saveLastLocation(location);
      onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setPhotoFiles = (files) => {
    const chosen = Array.from(files || []);
    if (chosen.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('Photos must be JPEG, PNG, or WebP and no larger than 5 MB each.');
      return;
    }
    setError('');
    setPhotos(chosen.slice(0, 5));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="listing-form-title">
      <form onSubmit={submit} className="max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div><h2 id="listing-form-title" className="text-xl font-extrabold text-slate-900">{listing ? 'Edit listing' : 'List an Eco Item'}</h2><p className="mt-1 text-sm text-slate-500">Share something useful with your community.</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Title
          <input required minLength={3} maxLength={100} value={form.title} onChange={(event) => setField('title', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Category
            <select value={form.category} onChange={(event) => setField('category', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
              {EXCHANGE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Condition
            <select value={form.condition} onChange={(event) => setField('condition', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
              {CONDITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Description
          <textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        {!listing && <label className="block text-sm font-semibold text-slate-700">Photos (1–5, JPEG/PNG/WebP, up to 5 MB each)
          <input required multiple accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setPhotoFiles(event.target.files)} className="mt-1.5 block w-full rounded-xl border border-slate-200 p-2 text-sm font-normal" />
          {photos.length > 0 && <span className="mt-1 block text-xs text-slate-500">{photos.length} photo{photos.length === 1 ? '' : 's'} selected</span>}
        </label>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Listing type
            <select value={form.listing_type} onChange={(event) => setField('listing_type', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
              <option value="EXCHANGE">Exchange (swap)</option><option value="SALE">For Sale</option>
            </select>
          </label>
          {form.listing_type === 'SALE'
            ? <label className="text-sm font-semibold text-slate-700">Price (₹)
              <input required type="number" min="0" max="10000000" step="0.01" value={form.price} onChange={(event) => setField('price', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            : <label className="text-sm font-semibold text-slate-700">What I'd like in return (optional)
              <input maxLength={300} value={form.wanted_in_return} onChange={(event) => setField('wanted_in_return', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
            </label>}
        </div>
        <div className="space-y-1.5"><p className="text-sm font-semibold text-slate-700">Location (required)</p><p className="text-xs text-slate-500">Enter a city, landmark, or address. Selecting a location on the map is optional.</p><LocationPicker value={location} onChange={(value) => { setLocation(value); saveLastLocation(value); }} /></div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{listing ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}

function OfferForm({ listing, onClose, onSubmitted, ownListings }) {
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(readLastLocation());
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = ownListings.find((item) => item.id === selectedId);

  const submit = async (event) => {
    event.preventDefault();
    const offerTitle = selected?.title || title.trim();
    const offerDescription = selected?.description || description.trim();
    if (!location?.address?.trim() || location.address.trim().length < 3 || !offerTitle || !offerDescription) {
      setError('Add the offered item and enter your city, landmark, or address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      const fields = {
        offered_listing_id: selected?.id || null,
        offered_title: offerTitle,
        offered_description: offerDescription,
        images: JSON.stringify(selected?.images || []),
        message, location_lat: hasCoordinates(location) ? location.lat : '',
        location_lng: hasCoordinates(location) ? location.lng : '',
        location_address: location.address, area_label: location.area || 'Area provided',
      };
      Object.entries(fields).forEach(([key, value]) => data.set(key, String(value ?? '')));
      if (photo) data.append('photos', photo);
      await ecoExchangeService.createOffer(listing.id, data);
      saveLastLocation(location);
      onSubmitted();
      onClose();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl bg-white p-6">
      <div className="flex justify-between"><div><h2 className="text-xl font-extrabold">Make an offer</h2><p className="text-sm text-slate-500">Choose one of your listings or describe a quick item.</p></div><button type="button" onClick={onClose}><X /></button></div>
      {ownListings.length > 0 && <label className="block text-sm font-semibold">Offer one of my listings
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 w-full rounded-xl border p-2.5"><option value="">Add a quick item instead</option>{ownListings.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      </label>}
      {!selected && <>
        <label className="block text-sm font-semibold">Item title<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border p-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Description<textarea required minLength={5} maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-xl border p-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold">Item photo<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            setError('Photo must be JPEG, PNG, or WebP and no larger than 5 MB.');
            event.target.value = '';
            return;
          }
          setPhoto(file || null);
          setError('');
        }} className="mt-1 w-full rounded-xl border p-2.5 text-sm font-normal" /></label>
      </>}
      <label className="block text-sm font-semibold">Optional message<textarea maxLength={1000} rows={2} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border p-2.5 font-normal" /></label>
      <div><p className="mb-1 text-sm font-semibold">Your location (required)</p><p className="mb-1 text-xs text-slate-500">Enter a city, landmark, or address. Map selection is optional.</p><LocationPicker value={location} onChange={(value) => { setLocation(value); saveLastLocation(value); }} /></div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2">Cancel</button><button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send offer'}</button></div>
    </form>
  </div>;
}

export default function EcoExchange() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('hub');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [maxDistance, setMaxDistance] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [offerListing, setOfferListing] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [viewerLocation, setViewerLocation] = useState(null);

  const refresh = useCallback(async (nextPage = 0) => {
    setError('');
    try {
      const locationParams = viewerLocation ? { lat: viewerLocation.lat, lng: viewerLocation.lng } : {};
      const [publicResponse, myResponse, offersResponse] = await Promise.all([
        ecoExchangeService.listListings({ ...locationParams, offset: nextPage * PAGE_SIZE }),
        ecoExchangeService.listListings({ mine: true, offset: 0 }),
        ecoExchangeService.listMyOffers(),
      ]);
      setListings((current) => nextPage === 0 ? publicResponse.listings : [...current, ...publicResponse.listings]);
      setMyListings(myResponse.listings);
      setMyOffers(offersResponse.offers);
      setHasMore(publicResponse.listings.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [viewerLocation]);

  useEffect(() => {
    if (!selected || selected.owner_id !== user.id || selected.listing_type !== 'EXCHANGE') return undefined;
    let active = true;
    let channel;
    const refreshOffers = () => ecoExchangeService.listOffers(selected.id)
      .then(({ offers: rows }) => { if (active) setOffers(rows); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    refreshOffers();
    ecoExchangeService.setRealtimeUser(user.id).then(() => {
      if (active) channel = ecoExchangeService.subscribeToNotifications(user.id, refreshOffers);
    }).catch((requestError) => { if (active) setError(requestError.message); });
    const timer = window.setInterval(refreshOffers, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (channel) ecoExchangeService.removeChannel(channel);
    };
  }, [selected, user.id]);

  useEffect(() => {
    const initialRequest = window.setTimeout(() => refresh(0), 0);
    const timer = window.setInterval(() => refresh(0), 15000);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const visibleListings = useMemo(() => {
    const source = tab === 'mine' ? myListings : listings;
    const normalized = query.trim().toLowerCase();
    return source.filter((item) => (category === 'all' || item.category === category)
      && (type === 'all' || item.listing_type === type)
      && (tab !== 'hub' || !viewerLocation || maxDistance === 'all' || item.distance_km <= Number(maxDistance))
      && (!normalized || `${item.title} ${item.description} ${item.area_label}`.toLowerCase().includes(normalized)))
      .sort((a, b) => sort === 'nearest' ? (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
        : new Date(b.created_at) - new Date(a.created_at));
  }, [category, listings, maxDistance, myListings, query, sort, tab, type, viewerLocation]);

  const openDetail = async (item) => {
    setError('');
    try {
      const response = await ecoExchangeService.getListing(item.id);
      setSelected(response.listing);
      if (response.listing.owner_id === user.id && response.listing.listing_type === 'EXCHANGE') {
        setOffersLoading(true);
        ecoExchangeService.listOffers(item.id).then((result) => setOffers(result.offers)).catch((err) => setError(err.message)).finally(() => setOffersLoading(false));
      } else setOffers([]);
    } catch (requestError) { setError(requestError.message); }
  };

  const beginMessage = async (item) => {
    try {
      const { conversation } = await ecoExchangeService.startConversation(item.id);
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (requestError) { setError(requestError.message); }
  };

  const messageOffer = async (offer) => {
    try {
      const { conversation } = await ecoExchangeService.startOfferConversation(offer.id);
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (requestError) { setError(requestError.message); }
  };

  const updateStatus = async (status) => {
    try {
      await ecoExchangeService.updateListing(selected.id, { status });
      setSelected((current) => ({ ...current, status }));
      setNotice(`Listing set to ${status.toLowerCase()}.`);
      await refresh(0);
    } catch (requestError) { setError(requestError.message); }
  };

  const removeListing = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await ecoExchangeService.deleteListing(selected.id);
      setSelected(null);
      await refresh(0);
      setNotice('Listing deleted.');
    } catch (requestError) { setError(requestError.message); }
  };

  const updateCardStatus = async (item, status) => {
    try {
      await ecoExchangeService.updateListing(item.id, { status });
      setMyListings((current) => current.map((listing) => listing.id === item.id ? { ...listing, status } : listing));
      await refresh(0);
    } catch (requestError) { setError(requestError.message); }
  };

  const decideOffer = async (offer, action) => {
    try {
      const result = await ecoExchangeService.updateOffer(offer.id, action);
      const { offers: refreshedOffers } = await ecoExchangeService.listOffers(selected.id);
      setOffers(refreshedOffers);
      await refresh(0);
      if (result.conversation) navigate(`/messages?conversation=${result.conversation.id}`);
    } catch (requestError) { setError(requestError.message); }
  };

  const withdrawOffer = async (offer) => {
    try {
      await ecoExchangeService.updateOffer(offer.id, 'WITHDRAW');
      setMyOffers((current) => current.map((item) => item.id === offer.id ? { ...item, status: 'WITHDRAWN' } : item));
    } catch (requestError) { setError(requestError.message); }
  };

  const requestViewerLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => setViewerLocation({ lat: coords.latitude, lng: coords.longitude }), () => {
      setNotice('Location permission was not granted; distance sorting is unavailable.');
    }, { timeout: 10000 });
  };

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
    <div className="mb-4"><BackButton fallback="/dashboard/individual" label="Back to Dashboard" /></div>
    <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-emerald-800 to-green-900 p-6 text-white shadow-xl md:p-8">
      <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="max-w-2xl"><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/20 px-3 py-1 text-xs font-semibold text-teal-100"><ArrowDownUp className="h-4 w-4" />Circular economy marketplace</span><h1 className="text-2xl font-extrabold sm:text-3xl">Eco Exchange Hub</h1><p className="mt-2 text-sm leading-relaxed text-emerald-50">Give useful things a second life. Exchange or sell eco-friendly goods in your community.</p></div>
        <button onClick={() => setEditing({})} className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow hover:bg-emerald-50"><Plus className="h-5 w-5" />List an Eco Item</button>
      </div>
    </section>
    <aside className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Marketplace safety:</strong> {SALE_NOTICE}</aside>
    {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="h-4 w-4" />{notice}<button onClick={() => setNotice('')} className="ml-auto" aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
    {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
    <div className="mb-4 flex gap-2 border-b border-slate-200">
      {['hub', 'mine', 'offers'].map((value) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-bold capitalize ${tab === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}>{value === 'hub' ? 'Marketplace' : value === 'mine' ? 'My Listings' : 'My Offers'} {value === 'mine' && myListings.length > 0 && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{myListings.length}</span>}</button>)}
    </div>
    <section className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items or areas" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div>
        <button onClick={requestViewerLocation} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><MapPin className="h-4 w-4" />{viewerLocation ? 'Location enabled' : 'Use my location'}</button>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm"><Filter className="h-4 w-4 text-slate-500" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-white py-2"><option value="all">All categories</option>{EXCHANGE_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Listing type" value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All types</option><option value="EXCHANGE">Exchange</option><option value="SALE">For Sale</option></select>
        <select aria-label="Sort listings" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="newest">Newest</option><option value="nearest">Nearest</option></select>
        <select aria-label="Maximum distance" value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)} disabled={!viewerLocation || tab !== 'hub'} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"><option value="all">Any distance</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option><option value="50">Within 50 km</option><option value="100">Within 100 km</option></select>
      </div>
    </section>
    {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-3xl bg-slate-100" />)}</div>
      : tab === 'offers' ? myOffers.length === 0
        ? <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-600">You haven't made any offers yet.</div>
        : <div className="space-y-3">{myOffers.map((offer) => <article key={offer.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><img src={offer.offered_images?.[0]} alt="" className="h-20 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="font-bold">{offer.offered_title}</p><p className="text-sm text-slate-600">For: {offer.listing?.title || 'Listing unavailable'}</p><p className="text-xs text-slate-500">{offer.area_label} · {offer.status}</p></div>{offer.status === 'PENDING' && <button onClick={() => withdrawOffer(offer)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Withdraw</button>}</article>)}</div>
        : visibleListings.length === 0 ? <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center"><ShoppingBag className="mx-auto mb-4 h-12 w-12 text-emerald-300" /><h2 className="text-xl font-bold text-slate-800">{tab === 'hub' && !query && category === 'all' && type === 'all' ? 'No items yet. Be the first to list an eco item!' : 'No items match your filters'}</h2>{tab === 'hub' && <button onClick={() => setEditing({})} className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white">List an Eco Item</button>}</div>
      : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleListings.map((item) => <article key={item.id} onClick={() => openDetail(item)} className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative aspect-[4/3] bg-slate-100"><img src={item.images?.[0]} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /><span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${item.listing_type === 'EXCHANGE' ? 'bg-blue-600 text-white' : 'bg-amber-400 text-amber-950'}`}>{item.listing_type === 'EXCHANGE' ? 'Exchange' : amount(item.price)}</span></div>
        <div className="p-4"><p className="text-xs font-bold text-emerald-700">{categoryLabel(item.category)}</p><h2 className="mt-1 line-clamp-2 font-bold text-slate-900">{item.title}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{item.description}</p><div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="truncate">{item.area_label || 'Nearby'}</span><span className="shrink-0">{distance(item.distance_km)}</span></div>{tab === 'mine' && <label onClick={(event) => event.stopPropagation()} className="mt-3 block text-xs font-semibold text-slate-600">Availability<select value={item.status} onChange={(event) => updateCardStatus(item, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs">{['AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'COMPLETED'].map((status) => <option key={status}>{status}</option>)}</select></label>}<button onClick={(event) => { event.stopPropagation(); beginMessage(item); }} disabled={item.owner_id === user.id} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 disabled:hidden"><MessageCircle className="h-4 w-4" />Message</button></div>
      </article>)}</div>}
    {tab === 'hub' && hasMore && <div className="mt-7 flex justify-center"><button onClick={() => refresh(page + 1)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-800"><ChevronRight className="h-4 w-4" />Load more listings</button></div>}

    {editing && <ListingEditor listing={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setNotice(editing.id ? 'Listing updated.' : 'Your listing is now live.'); refresh(0); }} />}
    {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true"><div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="flex justify-end p-3"><button onClick={() => setSelected(null)} aria-label="Close detail" className="rounded-full bg-slate-100 p-2"><X className="h-4 w-4" /></button></div>
      <div className="grid md:grid-cols-2"><div className="px-5 pb-5 md:px-7"><div className="relative"><img src={selected.images?.[0]} alt={selected.title} className="aspect-[4/3] w-full rounded-2xl object-cover" /><span className="absolute left-3 top-3 rounded-full bg-emerald-800 px-3 py-1 text-xs font-bold text-white">{selected.listing_type === 'EXCHANGE' ? 'Exchange' : `For Sale · ${amount(selected.price)}`}</span></div>{selected.images?.length > 1 && <div className="mt-2 flex gap-2">{selected.images.slice(1).map((src) => <img key={src} src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>}</div>
        <div className="px-5 pb-6 md:px-7"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{categoryLabel(selected.category)} · {selected.condition}</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{selected.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{selected.description}</p>{selected.wanted_in_return && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><strong>Would like in return:</strong> {selected.wanted_in_return}</p>}<p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" />Approximate area: {selected.area_label}</p>{hasCoordinates(selected) ? <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200"><iframe title="Approximate listing location" className="h-40 w-full" loading="lazy" src={`https://www.google.com/maps?q=${selected.location_lat},${selected.location_lng}&z=12&output=embed`} referrerPolicy="no-referrer-when-downgrade" /><div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/30 blur-xl ring-8 ring-emerald-300/25" /><span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-[10px] text-slate-600">Approximate pin for privacy</span></div> : <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">The owner provided an address without selecting a map pin.</p>}<div className="mt-3 flex items-center gap-2">{selected.owner?.avatar_url ? <img src={selected.owner.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{selected.owner?.full_name?.[0] || 'T'}</span>}<p className="text-sm font-semibold text-slate-700">{selected.owner?.full_name || 'Terra member'}</p></div>
          {selected.owner_id === user.id ? (
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-semibold">Availability
                <select value={selected.status} onChange={(event) => updateStatus(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5">
                  {['AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'COMPLETED'].map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(selected); setSelected(null); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-bold"><Edit3 className="h-4 w-4" />Edit</button>
                <button onClick={removeListing} className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-700"><Trash2 className="h-4 w-4" /></button>
              </div>
              {selected.listing_type === 'EXCHANGE' && <section className="rounded-2xl border border-slate-200 p-3">
                <h3 className="font-bold">Offers {offersLoading ? '…' : `(${offers.length})`}</h3>
                {!offersLoading && offers.length === 0 && <p className="mt-2 text-xs text-slate-500">No offers received yet.</p>}
                {offers.map((offer) => <div key={offer.id} className="mt-3 border-t pt-3">
                  {offer.offered_images?.[0] && <img src={offer.offered_images[0]} alt={offer.offered_title} className="mb-2 h-28 w-full rounded-xl object-cover" />}
                  <p className="font-semibold">{offer.offered_title} · {offer.offerer?.full_name}</p>
                  <p className="text-xs text-slate-500">{offer.area_label} · {distance(offer.distance_km)} · {offer.status}</p>
                  {offer.message && <p className="mt-1 text-sm">{offer.message}</p>}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => decideOffer(offer, 'ACCEPTED')} disabled={offer.status !== 'PENDING'} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Accept</button>
                    <button onClick={() => decideOffer(offer, 'DECLINED')} disabled={offer.status !== 'PENDING'} className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40">Decline</button>
                    <button onClick={() => messageOffer(offer)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Message</button>
                  </div>
                </div>)}
              </section>}
            </div>
          ) : <div className="mt-5 space-y-2">
            <button onClick={() => beginMessage(selected)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Message owner</button>
            {selected.listing_type === 'EXCHANGE' && <button onClick={() => setOfferListing(selected)} className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-800">Make an Offer</button>}
          </div>}
        </div>
      </div><div className="mx-5 mb-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 md:mx-7"><strong>Safety notice:</strong> {SALE_NOTICE}</div>
    </div></div>}
    {offerListing && <OfferForm listing={offerListing} ownListings={myListings.filter((item) => item.status === 'AVAILABLE')} onClose={() => setOfferListing(null)} onSubmitted={() => { setNotice('Your offer was sent.'); if (selected) ecoExchangeService.listOffers(selected.id).then((result) => setOffers(result.offers)).catch((err) => setError(err.message)); }} />}
  </div>;
}
