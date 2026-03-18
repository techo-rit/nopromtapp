// src/routes/geocode.js
/**
 * Server-side proxy for Google Maps Geocoding API.
 * Keeps the GOOGLE_MAPS_API_KEY on the backend — never exposed to the client.
 */

export async function geocodeHandler(req, res) {
  const { lat, lng } = req.query;

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return res.status(400).json({ error: 'lat and lng query params are required and must be numbers' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Graceful fallback: return coordinates only when key is not configured
    return res.json({ address: null, lat: Number(lat), lng: Number(lng) });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const result = selectMostDetailedGeocodeResult(data.results);
      // Extract structured components
      const components = result.address_components || [];
      const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
      const latNum = Number(lat);
      const lngNum = Number(lng);

      let address = result.formatted_address;
      if (shouldEnrichAddress(result)) {
        const enriched = await getNearbyLandmarkAddress(latNum, lngNum, address, apiKey);
        if (enriched) {
          address = enriched;
        }
      }

      return res.json({
        address,
        city: get('locality') || get('administrative_area_level_2'),
        state: get('administrative_area_level_1'),
        pincode: get('postal_code'),
        country: get('country'),
        lat: latNum,
        lng: lngNum,
      });
    }

    return res.json({ address: null, lat: Number(lat), lng: Number(lng) });
  } catch (err) {
    console.error('Geocode proxy error:', err.message);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
}

function shouldEnrichAddress(result) {
  if (!result) return false;

  const formatted = String(result.formatted_address || '').trim();
  const types = Array.isArray(result.types) ? result.types : [];
  const plusCodePattern = /\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b/;
  const commaParts = formatted.split(',').map((x) => x.trim()).filter(Boolean);

  const looksLikePlusCode = types.includes('plus_code') || plusCodePattern.test(formatted);
  const tooShort = formatted.length < 55;
  const notGranular = !types.some((t) => ['street_address', 'premise', 'subpremise', 'route'].includes(t));
  const notSegmentedEnough = commaParts.length < 4;

  return looksLikePlusCode || (tooShort && notGranular) || notSegmentedEnough;
}

async function getNearbyLandmarkAddress(lat, lng, baseAddress, apiKey) {
  try {
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&rankby=distance&key=${apiKey}`;
    const response = await fetch(nearbyUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      return null;
    }

    const best = data.results.find((place) => {
      const name = String(place?.name || '').trim();
      if (!name) return false;

      // Skip generic placeholders that do not improve specificity.
      const generic = /^(Unnamed Road|Road|Street|Route)$/i;
      return !generic.test(name);
    });

    if (!best?.name) return null;

    const placeName = String(best.name).trim();
    if (!placeName || String(baseAddress || '').toLowerCase().includes(placeName.toLowerCase())) {
      return null;
    }

    return `${placeName}, ${baseAddress}`;
  } catch {
    return null;
  }
}

function selectMostDetailedGeocodeResult(results) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const hasType = (types, candidate) => Array.isArray(types) && types.includes(candidate);
  const plusCodePattern = /\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b/;

  const score = (result) => {
    const types = result?.types || [];
    const components = result?.address_components || [];
    const formatted = String(result?.formatted_address || '');

    let s = 0;

    // Favor addresses with richer component breakdown and longer, descriptive text.
    s += components.length * 6;
    s += Math.min(formatted.length, 180) * 0.2;

    if (hasType(types, 'street_address')) s += 60;
    if (hasType(types, 'premise')) s += 55;
    if (hasType(types, 'subpremise')) s += 45;
    if (hasType(types, 'route')) s += 35;
    if (hasType(types, 'neighborhood')) s += 30;
    if (hasType(types, 'sublocality')) s += 25;
    if (hasType(types, 'sublocality_level_1')) s += 20;

    if (hasType(types, 'plus_code') || plusCodePattern.test(formatted)) s -= 40;

    return s;
  };

  return results
    .slice()
    .sort((a, b) => score(b) - score(a))[0];
}

/**
 * Forward autocomplete / place search requests (for interactive map search bar)
 * GET /api/places/autocomplete?input=...&sessiontoken=...
 */
export async function placesAutocompleteHandler(req, res) {
  const { input, sessiontoken } = req.query;

  if (!input) {
    return res.status(400).json({ error: 'input query param is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.json({ predictions: [] });
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:in`;
    if (sessiontoken) url += `&sessiontoken=${encodeURIComponent(sessiontoken)}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('Places autocomplete proxy error:', err.message);
    return res.status(502).json({ error: 'Places service unavailable' });
  }
}

/**
 * Get place details (lat/lng) from a place_id
 * GET /api/places/details?place_id=...
 */
export async function placeDetailsHandler(req, res) {
  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id query param is required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.json({ location: null });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=geometry,formatted_address,address_components&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      const { geometry, formatted_address, address_components } = data.result;
      const components = address_components || [];
      const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';

      return res.json({
        address: formatted_address,
        lat: geometry?.location?.lat,
        lng: geometry?.location?.lng,
        city: get('locality') || get('administrative_area_level_2'),
        state: get('administrative_area_level_1'),
        pincode: get('postal_code'),
        country: get('country'),
      });
    }

    return res.json({ location: null });
  } catch (err) {
    console.error('Place details proxy error:', err.message);
    return res.status(502).json({ error: 'Place details service unavailable' });
  }
}
