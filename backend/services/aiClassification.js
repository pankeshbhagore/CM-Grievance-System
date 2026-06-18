/**
 * AI Complaint Classification Service
 * Keyword-based NLP for MVP — interface is designed so a real ML model
 * (DistilBERT etc.) can be swapped in later without changing callers.
 */

const CATEGORY_KEYWORDS = {
  water_supply: ['water', 'pipe', 'supply', 'leakage', 'leak', 'drinking water', 'tap', 'borewell', 'tanker', 'shortage'],
  sewage: ['sewage', 'sewer', 'drain blocked', 'manhole', 'waste water', 'overflow', 'gutter', 'nali'],
  roads_potholes: ['pothole', 'road', 'highway', 'broken road', 'crater', 'divider', 'footpath', 'pavement', 'speed breaker'],
  street_lights: ['street light', 'streetlight', 'lamp post', 'dark', 'lighting', 'bulb', 'electricity pole', 'no light'],
  garbage_sanitation: ['garbage', 'trash', 'waste', 'dustbin', 'litter', 'cleanliness', 'sanitation', 'sweeper', 'dumping'],
  electricity: ['electricity', 'power cut', 'blackout', 'wire', 'transformer', 'meter', 'billing', 'current'],
  traffic: ['traffic', 'signal', 'jam', 'congestion', 'parking', 'vehicle', 'road rage', 'accident'],
  encroachment: ['encroachment', 'illegal construction', 'hawker', 'vendor', 'occupied', 'unauthorized'],
  pollution: ['pollution', 'smoke', 'factory', 'noise', 'air quality', 'dust', 'chemical', 'smell', 'odor'],
  park_maintenance: ['park', 'garden', 'playground', 'tree', 'grass', 'bench', 'green area'],
  building_safety: ['building', 'collapse', 'crack', 'unsafe structure', 'demolish', 'dangerous building'],
  drainage: ['flood', 'waterlogging', 'stagnant water', 'drainage', 'rain water', 'clogged drain'],
  public_transport: ['bus', 'transport', 'metro', 'auto', 'route', 'stop', 'timing'],
  noise_complaint: ['noise', 'loud music', 'construction noise', 'disturbance', 'loudspeaker']
};

const CRITICAL_KEYWORDS = [
  'collapse', 'fire', 'explosion', 'gas leak', 'electrocution', 'flood',
  'life threatening', 'emergency', 'urgent', 'danger', 'dead body', 'death',
  'injured', 'hospital emergency', 'sewage overflow school', 'building collapse',
  'child missing', 'major accident'
];

const PRIORITY_SIGNALS = {
  critical: ['life threatening', 'emergency', 'collapse', 'fire', 'explosion', 'death', 'injured'],
  high: ['school', 'hospital', 'market', 'main road', 'waterlogging', 'multiple families', 'weeks'],
  medium: ['days', 'area', 'colony', 'society'],
  low: ['minor', 'small', 'once']
};

function classifyComplaint(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  let bestCategory = 'other';
  let maxScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  const matchedCritical = CRITICAL_KEYWORDS.find((kw) => text.includes(kw));
  const isCritical = Boolean(matchedCritical);

  let priority = 'low';
  for (const [level, signals] of Object.entries(PRIORITY_SIGNALS)) {
    if (signals.some((s) => text.includes(s))) {
      priority = level;
      break;
    }
  }
  if (isCritical) priority = 'critical';

  const confidence = maxScore > 0 ? Math.min(0.95, 0.5 + maxScore * 0.1) : 0.3;

  return {
    category: bestCategory,
    priority,
    isCritical,
    criticalReason: matchedCritical || null,
    confidence: parseFloat(confidence.toFixed(2))
  };
}

async function detectDuplicate(Complaint, title, description, location) {
  const words = `${title} ${description}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return null;

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const query = { createdAt: { $gte: recentCutoff }, status: { $nin: ['resolved', 'rejected'] } };

  if (location?.coordinates?.length === 2) {
    query.location = {
      $near: { $geometry: { type: 'Point', coordinates: location.coordinates }, $maxDistance: 200 }
    };
  }

  const nearby = await Complaint.find(query).limit(15).lean();
  return nearby.find((c) => {
    const cText = `${c.title} ${c.description}`.toLowerCase();
    const common = words.filter((w) => cText.includes(w));
    return common.length >= 3;
  }) || null;
}

function calculateSLA(category, priority) {
  const baseSLA = { critical: 4, high: 24, medium: 72, low: 168 };
  return baseSLA[priority] || 72;
}

module.exports = { classifyComplaint, detectDuplicate, calculateSLA };
