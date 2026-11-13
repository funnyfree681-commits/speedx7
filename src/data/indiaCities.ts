export interface IndianLandmark {
  name: string;
  lat: number;
  lng: number;
}

export interface IndianCity {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
  landmarks: IndianLandmark[];
}

export const INDIA_OVERVIEW_CENTER: [number, number] = [22.5937, 78.9629];
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [5.5, 66.5],
  [37.5, 98.5],
];

export function getCityBounds(city: IndianCity): [[number, number], [number, number]] {
  const [lat, lng] = city.center;
  const latDelta = 0.28;
  const lngDelta = 0.32;
  return [
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  ];
}

export function getCityViewbox(city: IndianCity): string {
  const [lat, lng] = city.center;
  const latDelta = 0.25;
  const lngDelta = 0.28;
  // Nominatim viewbox order: left,top,right,bottom (west,north,east,south)
  return `${lng - lngDelta},${lat + latDelta},${lng + lngDelta},${lat - latDelta}`;
}

export const INDIAN_CITIES: IndianCity[] = [
  {
    id: 'delhi',
    name: 'New Delhi / NCR',
    state: 'Delhi',
    center: [28.6139, 77.2090],
    zoom: 12,
    landmarks: [
      { name: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
      { name: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
      { name: 'IGI Airport T3, Delhi', lat: 28.5562, lng: 77.1000 },
      { name: 'New Delhi Railway Station', lat: 28.6429, lng: 77.2191 },
      { name: 'CyberHub, Gurugram', lat: 28.4950, lng: 77.0895 },
      { name: 'Sector 18, Noida', lat: 28.5708, lng: 77.3261 },
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    center: [19.0760, 72.8777],
    zoom: 12,
    landmarks: [
      { name: 'Chhatrapati Shivaji Terminus (CSMT)', lat: 18.9398, lng: 72.8355 },
      { name: 'Bandra-Kurla Complex (BKC)', lat: 19.0653, lng: 72.8682 },
      { name: 'Mumbai Airport T2, Andheri', lat: 19.0896, lng: 72.8656 },
      { name: 'Gateway of India, Colaba', lat: 18.9220, lng: 72.8347 },
      { name: 'Dadar TT Circle', lat: 19.0178, lng: 72.8478 },
    ],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    center: [12.9716, 77.5946],
    zoom: 12,
    landmarks: [
      { name: 'MG Road Metro Station', lat: 12.9756, lng: 77.6066 },
      { name: 'Koramangala 4th Block', lat: 12.9352, lng: 77.6245 },
      { name: 'Indiranagar 100 Ft Road', lat: 12.9784, lng: 77.6408 },
      { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
      { name: 'Kempegowda International Airport', lat: 13.1986, lng: 77.7066 },
    ],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    center: [17.3850, 78.4867],
    zoom: 12,
    landmarks: [
      { name: 'HITEC City, Madhapur', lat: 17.4435, lng: 78.3772 },
      { name: 'Charminar, Old City', lat: 17.3616, lng: 78.4747 },
      { name: 'Banjara Hills Road No. 1', lat: 17.4156, lng: 78.4347 },
      { name: 'Secunderabad Railway Station', lat: 17.4344, lng: 78.5013 },
    ],
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    center: [18.5204, 73.8567],
    zoom: 12,
    landmarks: [
      { name: 'Shivajinagar', lat: 18.5308, lng: 73.8475 },
      { name: 'Hinjewadi IT Park Phase 1', lat: 18.5913, lng: 73.7389 },
      { name: 'Koregaon Park', lat: 18.5362, lng: 73.8940 },
      { name: 'Pune Junction Station', lat: 18.5289, lng: 73.8744 },
    ],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    center: [26.9124, 75.7873],
    zoom: 12,
    landmarks: [
      { name: 'Hawa Mahal, Badi Choupad', lat: 26.9239, lng: 75.8267 },
      { name: 'MI Road, Panch Batti', lat: 26.9154, lng: 75.8087 },
      { name: 'Jaipur Junction Railway Station', lat: 26.9196, lng: 75.7880 },
      { name: 'Malviya Nagar', lat: 26.8549, lng: 75.8243 },
    ],
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    center: [13.0827, 80.2707],
    zoom: 12,
    landmarks: [
      { name: 'T. Nagar Panagal Park', lat: 13.0418, lng: 80.2341 },
      { name: 'Chennai Central Station', lat: 13.0827, lng: 80.2755 },
      { name: 'Marina Beach', lat: 13.0500, lng: 80.2824 },
      { name: 'OMR Thoraipakkam', lat: 12.9416, lng: 80.2362 },
    ],
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    center: [22.5726, 88.3639],
    zoom: 12,
    landmarks: [
      { name: 'Park Street', lat: 22.5513, lng: 88.3526 },
      { name: 'Howrah Junction', lat: 22.5839, lng: 88.3426 },
      { name: 'Salt Lake Sector V', lat: 22.5735, lng: 88.4331 },
      { name: 'Victoria Memorial', lat: 22.5448, lng: 88.3426 },
    ],
  },
  // Madhya Pradesh (M.P.)
  {
    id: 'indore',
    name: 'Indore',
    state: 'Madhya Pradesh (M.P.)',
    center: [22.7196, 75.8577],
    zoom: 12,
    landmarks: [
      { name: 'Rajwada Palace, Indore', lat: 22.7186, lng: 75.8557 },
      { name: 'Vijay Nagar Square', lat: 22.7533, lng: 75.8937 },
      { name: 'Indore Junction Railway Station', lat: 22.7165, lng: 75.8687 },
      { name: 'Bhawarkuan Square', lat: 22.6924, lng: 75.8676 },
      { name: 'Devi Ahilyabai Holkar Airport', lat: 22.7218, lng: 75.8011 },
    ],
  },
  {
    id: 'bhopal',
    name: 'Bhopal',
    state: 'Madhya Pradesh (M.P.)',
    center: [23.2599, 77.4126],
    zoom: 12,
    landmarks: [
      { name: 'MP Nagar Zone 1', lat: 23.2332, lng: 77.4343 },
      { name: 'Rani Kamalapati Railway Station', lat: 23.2294, lng: 77.4384 },
      { name: 'Upper Lake (Bada Talab)', lat: 23.2500, lng: 77.3860 },
      { name: 'New Market, TT Nagar', lat: 23.2356, lng: 77.4004 },
      { name: 'Raja Bhoj Airport, Bhopal', lat: 23.2875, lng: 77.3374 },
    ],
  },
  {
    id: 'gwalior',
    name: 'Gwalior',
    state: 'Madhya Pradesh (M.P.)',
    center: [26.2183, 78.1828],
    zoom: 12,
    landmarks: [
      { name: 'Gwalior Junction Station', lat: 26.2156, lng: 78.1822 },
      { name: 'Maharaj Bada, Lashkar', lat: 26.2036, lng: 78.1586 },
      { name: 'City Centre, Patel Nagar', lat: 26.2087, lng: 78.1916 },
      { name: 'Gwalior Fort', lat: 26.2313, lng: 78.1695 },
    ],
  },
  {
    id: 'jabalpur',
    name: 'Jabalpur',
    state: 'Madhya Pradesh (M.P.)',
    center: [23.1815, 79.9864],
    zoom: 12,
    landmarks: [
      { name: 'Jabalpur Junction Station', lat: 23.1656, lng: 79.9510 },
      { name: 'Civic Centre, Marhatal', lat: 23.1652, lng: 79.9328 },
      { name: 'Sadar Bazaar, Jabalpur', lat: 23.1538, lng: 79.9488 },
      { name: 'Bhedaghat Marble Rocks', lat: 23.1303, lng: 79.8012 },
    ],
  },
  // Uttar Pradesh (U.P.)
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh (U.P.)',
    center: [26.8467, 80.9462],
    zoom: 12,
    landmarks: [
      { name: 'Hazratganj, Lucknow', lat: 26.8505, lng: 80.9462 },
      { name: 'Gomti Nagar, Vibhuti Khand', lat: 26.8542, lng: 81.0033 },
      { name: 'Charbagh Railway Station', lat: 26.8318, lng: 80.9212 },
      { name: 'Alambagh Bus Terminal', lat: 26.8126, lng: 80.9001 },
      { name: 'Amausi Airport (CCS), Lucknow', lat: 26.7606, lng: 80.8893 },
    ],
  },
  {
    id: 'kanpur',
    name: 'Kanpur',
    state: 'Uttar Pradesh (U.P.)',
    center: [26.4499, 80.3319],
    zoom: 12,
    landmarks: [
      { name: 'Kanpur Central Railway Station', lat: 26.4539, lng: 80.3512 },
      { name: 'Civil Lines, Kanpur', lat: 26.4730, lng: 80.3490 },
      { name: 'Swaroop Nagar', lat: 26.4810, lng: 80.3125 },
      { name: 'IIT Kanpur, Kalyanpur', lat: 26.5123, lng: 80.2329 },
    ],
  },
  {
    id: 'varanasi',
    name: 'Varanasi',
    state: 'Uttar Pradesh (U.P.)',
    center: [25.3176, 82.9739],
    zoom: 12,
    landmarks: [
      { name: 'Varanasi Junction (Cantt)', lat: 25.3268, lng: 82.9863 },
      { name: 'Dashashwamedh Ghat', lat: 25.3068, lng: 83.0104 },
      { name: 'Banaras Hindu University (BHU)', lat: 25.2677, lng: 82.9913 },
      { name: 'Sigra, Varanasi', lat: 25.3119, lng: 82.9868 },
      { name: 'LBS Airport, Babatpur', lat: 25.4524, lng: 82.8593 },
    ],
  },
  {
    id: 'agra',
    name: 'Agra',
    state: 'Uttar Pradesh (U.P.)',
    center: [27.1767, 78.0081],
    zoom: 12,
    landmarks: [
      { name: 'Taj Mahal East Gate', lat: 27.1702, lng: 78.0510 },
      { name: 'Agra Cantt Railway Station', lat: 27.1578, lng: 77.9896 },
      { name: 'Sanjay Place, Agra', lat: 27.1995, lng: 78.0063 },
      { name: 'Sadar Bazaar, Agra', lat: 27.1636, lng: 78.0121 },
    ],
  },
  {
    id: 'prayagraj',
    name: 'Prayagraj',
    state: 'Uttar Pradesh (U.P.)',
    center: [25.4358, 81.8463],
    zoom: 12,
    landmarks: [
      { name: 'Civil Lines, Prayagraj', lat: 25.4518, lng: 81.8358 },
      { name: 'Prayagraj Junction Station', lat: 25.4446, lng: 81.8256 },
      { name: 'Triveni Sangam Area', lat: 25.4304, lng: 81.8833 },
    ],
  },
];
