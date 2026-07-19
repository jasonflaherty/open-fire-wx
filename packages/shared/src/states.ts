export type UsStateView = {
  code: string;
  name: string;
  center: [number, number];
  zoom: number;
};

/** Approximate map views for each US state (lat, lng). */
export const US_STATE_VIEWS: UsStateView[] = [
  { code: 'AL', name: 'Alabama', center: [32.8, -86.8], zoom: 7 },
  { code: 'AK', name: 'Alaska', center: [64.2, -153.0], zoom: 4 },
  { code: 'AZ', name: 'Arizona', center: [34.3, -111.7], zoom: 7 },
  { code: 'AR', name: 'Arkansas', center: [34.8, -92.2], zoom: 7 },
  { code: 'CA', name: 'California', center: [37.2, -119.5], zoom: 6 },
  { code: 'CO', name: 'Colorado', center: [39.0, -105.5], zoom: 7 },
  { code: 'CT', name: 'Connecticut', center: [41.6, -72.7], zoom: 9 },
  { code: 'DE', name: 'Delaware', center: [39.0, -75.5], zoom: 9 },
  { code: 'FL', name: 'Florida', center: [27.8, -81.7], zoom: 7 },
  { code: 'GA', name: 'Georgia', center: [32.7, -83.4], zoom: 7 },
  { code: 'HI', name: 'Hawaii', center: [20.8, -156.3], zoom: 7 },
  { code: 'ID', name: 'Idaho', center: [44.4, -114.6], zoom: 6 },
  { code: 'IL', name: 'Illinois', center: [40.0, -89.2], zoom: 7 },
  { code: 'IN', name: 'Indiana', center: [39.9, -86.3], zoom: 7 },
  { code: 'IA', name: 'Iowa', center: [42.0, -93.5], zoom: 7 },
  { code: 'KS', name: 'Kansas', center: [38.5, -98.3], zoom: 7 },
  { code: 'KY', name: 'Kentucky', center: [37.5, -85.3], zoom: 7 },
  { code: 'LA', name: 'Louisiana', center: [31.0, -92.0], zoom: 7 },
  { code: 'ME', name: 'Maine', center: [45.3, -69.2], zoom: 7 },
  { code: 'MD', name: 'Maryland', center: [39.0, -76.7], zoom: 8 },
  { code: 'MA', name: 'Massachusetts', center: [42.3, -71.8], zoom: 8 },
  { code: 'MI', name: 'Michigan', center: [44.3, -85.5], zoom: 6 },
  { code: 'MN', name: 'Minnesota', center: [46.3, -94.3], zoom: 6 },
  { code: 'MS', name: 'Mississippi', center: [32.7, -89.7], zoom: 7 },
  { code: 'MO', name: 'Missouri', center: [38.4, -92.5], zoom: 7 },
  { code: 'MT', name: 'Montana', center: [46.9, -110.0], zoom: 6 },
  { code: 'NE', name: 'Nebraska', center: [41.5, -99.8], zoom: 7 },
  { code: 'NV', name: 'Nevada', center: [39.3, -116.6], zoom: 6 },
  { code: 'NH', name: 'New Hampshire', center: [43.7, -71.6], zoom: 8 },
  { code: 'NJ', name: 'New Jersey', center: [40.1, -74.6], zoom: 8 },
  { code: 'NM', name: 'New Mexico', center: [34.4, -106.1], zoom: 7 },
  { code: 'NY', name: 'New York', center: [42.9, -75.5], zoom: 7 },
  { code: 'NC', name: 'North Carolina', center: [35.6, -79.8], zoom: 7 },
  { code: 'ND', name: 'North Dakota', center: [47.4, -100.5], zoom: 7 },
  { code: 'OH', name: 'Ohio', center: [40.3, -82.8], zoom: 7 },
  { code: 'OK', name: 'Oklahoma', center: [35.5, -97.5], zoom: 7 },
  { code: 'OR', name: 'Oregon', center: [44.0, -120.5], zoom: 7 },
  { code: 'PA', name: 'Pennsylvania', center: [40.9, -77.6], zoom: 7 },
  { code: 'RI', name: 'Rhode Island', center: [41.7, -71.6], zoom: 10 },
  { code: 'SC', name: 'South Carolina', center: [33.9, -80.9], zoom: 7 },
  { code: 'SD', name: 'South Dakota', center: [44.4, -100.2], zoom: 7 },
  { code: 'TN', name: 'Tennessee', center: [35.8, -86.3], zoom: 7 },
  { code: 'TX', name: 'Texas', center: [31.5, -99.3], zoom: 6 },
  { code: 'UT', name: 'Utah', center: [39.3, -111.7], zoom: 7 },
  { code: 'VT', name: 'Vermont', center: [44.1, -72.7], zoom: 8 },
  { code: 'VA', name: 'Virginia', center: [37.5, -78.9], zoom: 7 },
  { code: 'WA', name: 'Washington', center: [47.4, -120.5], zoom: 7 },
  { code: 'WV', name: 'West Virginia', center: [38.6, -80.6], zoom: 7 },
  { code: 'WI', name: 'Wisconsin', center: [44.6, -89.7], zoom: 7 },
  { code: 'WY', name: 'Wyoming', center: [43.0, -107.5], zoom: 7 },
];

export const DEFAULT_STATE_CODE = 'OR';

export function getStateView(code: string): UsStateView {
  return (
    US_STATE_VIEWS.find((s) => s.code === code.toUpperCase()) ??
    US_STATE_VIEWS.find((s) => s.code === DEFAULT_STATE_CODE)!
  );
}
