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
      const result = data.results[0];
      // Extract structured components
      const components = result.address_components || [];
      const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';

      return res.json({
        address: result.formatted_address,
        city: get('locality') || get('administrative_area_level_2'),
        state: get('administrative_area_level_1'),
        pincode: get('postal_code'),
        country: get('country'),
        lat: Number(lat),
        lng: Number(lng),
      });
    }

    return res.json({ address: null, lat: Number(lat), lng: Number(lng) });
  } catch (err) {
    console.error('Geocode proxy error:', err.message);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
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
